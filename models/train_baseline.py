import pandas as pd
import numpy as np
import json
import joblib
import os
from imblearn.combine import SMOTEENN
from sklearn.ensemble import RandomForestClassifier, ExtraTreesClassifier
from xgboost import XGBClassifier
from lightgbm import LGBMClassifier
from sklearn.metrics import precision_score, recall_score, f1_score, roc_auc_score

train_df = pd.read_csv("data/train_features.csv")
val_df = pd.read_csv("data/val_features.csv")

X_train = train_df.drop(columns=["transaction_id", "is_fraud"])
y_train = train_df["is_fraud"]
X_val = val_df.drop(columns=["transaction_id", "is_fraud"])
y_val = val_df["is_fraud"]

print("Before SMOTEENN:", X_train.shape, "| fraud rate:", round(y_train.mean(), 4))
smoteenn = SMOTEENN(random_state=42)
X_train_res, y_train_res = smoteenn.fit_resample(X_train, y_train)
print("After SMOTEENN: ", X_train_res.shape, "| fraud rate:", round(y_train_res.mean(), 4))

models = {
    "random_forest": RandomForestClassifier(n_estimators=200, random_state=42, n_jobs=-1),
    "extra_trees": ExtraTreesClassifier(n_estimators=200, random_state=42, n_jobs=-1),
    "xgboost": XGBClassifier(random_state=42, eval_metric="logloss", n_jobs=-1),
    "lightgbm": LGBMClassifier(random_state=42, n_jobs=-1, verbose=-1),
}

results = {}
os.makedirs("models", exist_ok=True)

for name, model in models.items():
    print(f"\nTraining {name}...")
    model.fit(X_train_res, y_train_res)

    val_probs = model.predict_proba(X_val)[:, 1]
    val_preds = (val_probs >= 0.5).astype(int)

    metrics = {
        "precision": round(precision_score(y_val, val_preds), 4),
        "recall": round(recall_score(y_val, val_preds), 4),
        "f1": round(f1_score(y_val, val_preds), 4),
        "roc_auc": round(roc_auc_score(y_val, val_probs), 4),
    }
    results[name] = metrics
    print(f"{name}: {metrics}")

    joblib.dump(model, f"models/{name}.joblib")

weakest = min(results, key=lambda k: results[k]["f1"])
strongest = max(results, key=lambda k: results[k]["f1"])
results["_summary"] = {"strongest_by_f1": strongest, "weakest_by_f1": weakest}

with open("models/baseline_metrics.json", "w") as f:
    json.dump(results, f, indent=2)

print("\nSaved all models and models/baseline_metrics.json")
print("Strongest by F1:", strongest, "| Weakest by F1:", weakest)