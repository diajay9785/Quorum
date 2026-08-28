import json
import joblib
import numpy as np
import pandas as pd

val_df = pd.read_csv("data/val_features.csv")

TARGET = "is_fraud"
ID_COLS = ["transaction_id"]
feature_cols = [c for c in val_df.columns if c != TARGET and c not in ID_COLS]

X_val = val_df[feature_cols]
y_val = val_df[TARGET]

meta_learner = joblib.load("models/meta_learner.joblib")
base_models = joblib.load("models/base_models_refit.joblib")

val_preds = {}

for name, pipe in base_models.items():
    val_preds[name] = pipe.predict_proba(X_val)[:, 1]

X_meta_val = pd.DataFrame(val_preds)

ensemble_probs = meta_learner.predict_proba(X_meta_val)[:, 1]

COST_FALSE_NEGATIVE = 100
COST_FALSE_POSITIVE = 5
COST_TRUE_POSITIVE = 2
COST_TRUE_NEGATIVE = 0


def total_cost(y_true, y_pred):
    tp = np.sum((y_pred == 1) & (y_true == 1))
    fp = np.sum((y_pred == 1) & (y_true == 0))
    fn = np.sum((y_pred == 0) & (y_true == 1))
    tn = np.sum((y_pred == 0) & (y_true == 0))

    return (
        tp * COST_TRUE_POSITIVE
        + fp * COST_FALSE_POSITIVE
        + fn * COST_FALSE_NEGATIVE
        + tn * COST_TRUE_NEGATIVE
    )


thresholds = np.arange(0.01, 1.00, 0.01)
rows = []

for t in thresholds:
    preds = (ensemble_probs >= t).astype(int)

    tp = np.sum((preds == 1) & (y_val == 1))
    fp = np.sum((preds == 1) & (y_val == 0))
    fn = np.sum((preds == 0) & (y_val == 1))

    precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0

    cost = total_cost(y_val, preds)

    rows.append({
        "threshold": round(float(t), 2),
        "precision": round(float(precision), 4),
        "recall": round(float(recall), 4),
        "total_cost": int(cost)
    })

sweep_df = pd.DataFrame(rows)

best_row = sweep_df.loc[sweep_df["total_cost"].idxmin()]
best_threshold = float(best_row["threshold"])

naive_preds = (ensemble_probs >= 0.5).astype(int)
naive_cost = int(total_cost(y_val, naive_preds))

naive_row = sweep_df[sweep_df["threshold"] == 0.50].iloc[0]

print("=== Cost-tuned threshold ===")
print(best_row.to_dict())

print("\n=== Naive 0.5 threshold ===")
print(naive_row.to_dict())

print(
    f"\nCost reduction vs naive: "
    f"{naive_cost - int(best_row['total_cost'])} units "
    f"({(1 - best_row['total_cost'] / naive_cost) * 100:.1f}% lower)"
)

sweep_df.to_csv("models/threshold_sweep.csv", index=False)

cost_model_summary = {
    "cost_assumptions": {
        "false_negative": COST_FALSE_NEGATIVE,
        "false_positive": COST_FALSE_POSITIVE,
        "true_positive": COST_TRUE_POSITIVE,
        "true_negative": COST_TRUE_NEGATIVE
    },
    "cost_tuned_threshold": best_row.to_dict(),
    "naive_threshold_0.5": naive_row.to_dict(),
    "cost_reduction_pct": round(
        (1 - best_row["total_cost"] / naive_cost) * 100,
        2
    )
}

with open("models/cost_model.json", "w") as f:
    json.dump(cost_model_summary, f, indent=2)

print("\nSaved: models/threshold_sweep.csv, models/cost_model.json")