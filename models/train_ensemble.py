import json
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, ExtraTreesClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import StratifiedKFold, cross_val_predict
from sklearn.metrics import precision_score, recall_score, f1_score, roc_auc_score
from imblearn.combine import SMOTEENN
from imblearn.pipeline import Pipeline as ImbPipeline
from xgboost import XGBClassifier
from lightgbm import LGBMClassifier

# ---------- 1. Load data ----------
train_df = pd.read_csv("data/train_features.csv")
val_df = pd.read_csv("data/val_features.csv")

TARGET = "is_fraud"
ID_COLS = ["transaction_id"]
feature_cols = [c for c in train_df.columns if c != TARGET and c not in ID_COLS]

X_train = train_df[feature_cols]
y_train = train_df[TARGET]
X_val = val_df[feature_cols]
y_val = val_df[TARGET]

print(f"Train rows: {len(X_train)} | Val rows: {len(X_val)} | Features: {len(feature_cols)}")

# ---------- 2. Define the 4 base pipelines (SMOTEENN + classifier) ----------
random_state = 42

base_pipelines = {
    "random_forest": ImbPipeline([
        ("resample", SMOTEENN(random_state=random_state)),
        ("clf", RandomForestClassifier(random_state=random_state)),
    ]),
    "extra_trees": ImbPipeline([
        ("resample", SMOTEENN(random_state=random_state)),
        ("clf", ExtraTreesClassifier(random_state=random_state)),
    ]),
    "xgboost": ImbPipeline([
        ("resample", SMOTEENN(random_state=random_state)),
        ("clf", XGBClassifier(random_state=random_state, eval_metric="logloss")),
    ]),
    "lightgbm": ImbPipeline([
        ("resample", SMOTEENN(random_state=random_state)),
        ("clf", LGBMClassifier(random_state=random_state, verbosity=-1)),
    ]),
}

# ---------- 3. Generate out-of-fold predictions on TRAIN for meta-learner ----------
print("\nGenerating out-of-fold predictions (this trains each model 5x, may take a few minutes)...")

skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=random_state)
oof_preds = {}

for name, pipe in base_pipelines.items():
    print(f"  - {name} OOF...")
    oof_probs = cross_val_predict(
        pipe, X_train, y_train, cv=skf, method="predict_proba", n_jobs=-1
    )[:, 1]
    oof_preds[name] = oof_probs

X_meta_train = pd.DataFrame(oof_preds)

# ---------- 4. Train the meta-learner on OOF predictions ----------
print("\nTraining meta-learner (Logistic Regression)...")
meta_learner = LogisticRegression(random_state=random_state)
meta_learner.fit(X_meta_train, y_train)

# ---------- 5. Refit each base model on FULL training data ----------
print("\nRefitting base models on full training set...")
fitted_base_models = {}
for name, pipe in base_pipelines.items():
    print(f"  - fitting {name}...")
    pipe.fit(X_train, y_train)
    fitted_base_models[name] = pipe

# ---------- 6. Build meta-features for VALIDATION set ----------
val_preds = {}
for name, pipe in fitted_base_models.items():
    val_preds[name] = pipe.predict_proba(X_val)[:, 1]

X_meta_val = pd.DataFrame(val_preds)

# ---------- 7. Ensemble prediction on validation ----------
ensemble_probs = meta_learner.predict_proba(X_meta_val)[:, 1]
ensemble_preds = (ensemble_probs >= 0.5).astype(int)

ensemble_metrics = {
    "precision": precision_score(y_val, ensemble_preds),
    "recall": recall_score(y_val, ensemble_preds),
    "f1": f1_score(y_val, ensemble_preds),
    "roc_auc": roc_auc_score(y_val, ensemble_probs),
}

# ---------- 8. Compare vs best single model (Extra Trees) ----------
et_probs = val_preds["extra_trees"]
et_preds = (et_probs >= 0.5).astype(int)

extra_trees_metrics = {
    "precision": precision_score(y_val, et_preds),
    "recall": recall_score(y_val, et_preds),
    "f1": f1_score(y_val, et_preds),
    "roc_auc": roc_auc_score(y_val, et_probs),
}

print("\n=== RESULTS (validation set) ===")
print("Ensemble (meta-learner):", json.dumps(ensemble_metrics, indent=2))
print("Best single model (Extra Trees):", json.dumps(extra_trees_metrics, indent=2))

# ---------- 9. Save everything ----------
joblib.dump(meta_learner, "models/meta_learner.joblib")
joblib.dump(fitted_base_models, "models/base_models_refit.joblib")

results = {
    "ensemble": ensemble_metrics,
    "best_single_model_extra_trees": extra_trees_metrics,
    "feature_columns": feature_cols,
}

with open("models/ensemble_metrics.json", "w") as f:
    json.dump(results, f, indent=2)

print("\nSaved: models/meta_learner.joblib, models/base_models_refit.joblib, models/ensemble_metrics.json")