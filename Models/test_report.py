import json
import joblib
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from sklearn.metrics import precision_score, recall_score, f1_score, roc_auc_score

# ---------- Load everything ----------
test_df = pd.read_csv("data/test_features.csv")
TARGET = "is_fraud"
ID_COLS = ["transaction_id"]
feature_cols = [c for c in test_df.columns if c != TARGET and c not in ID_COLS]
X_test = test_df[feature_cols]
y_test = test_df[TARGET].values

meta_learner = joblib.load("models/meta_learner.joblib")
base_models = joblib.load("models/base_models_refit.joblib")
with open("models/cost_model.json") as f:
    cost_config = json.load(f)
with open("models/decision_config.json") as f:
    decision_config = json.load(f)

test_base_preds = {name: pipe.predict_proba(X_test)[:, 1] for name, pipe in base_models.items()}
X_meta_test = pd.DataFrame(test_base_preds)
ensemble_probs = meta_learner.predict_proba(X_meta_test)[:, 1]

# ---------- (a) Ensemble test metrics ----------
ensemble_preds_05 = (ensemble_probs >= 0.5).astype(int)
ensemble_test_metrics = {
    "precision": round(precision_score(y_test, ensemble_preds_05), 4),
    "recall": round(recall_score(y_test, ensemble_preds_05), 4),
    "f1": round(f1_score(y_test, ensemble_preds_05), 4),
    "roc_auc": round(roc_auc_score(y_test, ensemble_probs), 4),
}
print("=== (a) Ensemble test-set metrics ===")
print(json.dumps(ensemble_test_metrics, indent=2))

# ---------- (b) Ablation: single XGBoost vs full ensemble ----------
xgb_probs = test_base_preds["xgboost"]
xgb_preds = (xgb_probs >= 0.5).astype(int)
xgb_test_metrics = {
    "precision": round(precision_score(y_test, xgb_preds), 4),
    "recall": round(recall_score(y_test, xgb_preds), 4),
    "f1": round(f1_score(y_test, xgb_preds), 4),
    "roc_auc": round(roc_auc_score(y_test, xgb_probs), 4),
}
print("\n=== (b) Ablation: single XGBoost vs ensemble ===")
print("XGBoost alone:", json.dumps(xgb_test_metrics, indent=2))
print("Ensemble:     ", json.dumps(ensemble_test_metrics, indent=2))

# ---------- (c) Adversarial test ----------
with open("models/anomaly_metrics.json") as f:
    anomaly_metrics = json.load(f)
print("\n=== (c) Adversarial test (from Hour 5) ===")
print(json.dumps(anomaly_metrics, indent=2))

# ---------- (d) Calibration reliability diagram ----------
n_bins = 10
bin_edges = np.linspace(0, 1, n_bins + 1)
bin_indices = np.digitize(ensemble_probs, bin_edges) - 1
bin_indices = np.clip(bin_indices, 0, n_bins - 1)

bin_actual_rates = []
bin_predicted_avg = []
bin_counts = []
for b in range(n_bins):
    mask = bin_indices == b
    count = mask.sum()
    if count > 0:
        bin_actual_rates.append(y_test[mask].mean())
        bin_predicted_avg.append(ensemble_probs[mask].mean())
        bin_counts.append(int(count))
    else:
        bin_actual_rates.append(np.nan)
        bin_predicted_avg.append(np.nan)
        bin_counts.append(0)

plt.figure(figsize=(6, 6))
plt.plot([0, 1], [0, 1], "k--", label="Perfect calibration")
plt.plot(bin_predicted_avg, bin_actual_rates, "o-", label="Ensemble")
plt.xlabel("Predicted probability")
plt.ylabel("Actual fraud rate")
plt.title("Calibration Reliability Diagram")
plt.legend()
plt.tight_layout()
plt.savefig("models/reliability_diagram.png")
print("\n=== (d) Calibration ===")
print("Saved models/reliability_diagram.png")

# ---------- (e) Cost backtest on TEST set ----------
def total_cost(y_true, y_pred, fn_cost=100, fp_cost=5, tp_cost=2, tn_cost=0):
    tp = np.sum((y_pred == 1) & (y_true == 1))
    fp = np.sum((y_pred == 1) & (y_true == 0))
    fn = np.sum((y_pred == 0) & (y_true == 1))
    tn = np.sum((y_pred == 0) & (y_true == 0))
    return int(tp * tp_cost + fp * fp_cost + fn * fn_cost + tn * tn_cost)

cost_tuned_t = cost_config["cost_tuned_threshold"]["threshold"]
cost_tuned_preds = (ensemble_probs >= cost_tuned_t).astype(int)
naive_preds = (ensemble_probs >= 0.5).astype(int)

cost_tuned_cost = total_cost(y_test, cost_tuned_preds)
naive_cost = total_cost(y_test, naive_preds)
cost_reduction_pct = round((1 - cost_tuned_cost / naive_cost) * 100, 2)

print("\n=== (e) Cost backtest (test set) ===")
print(f"Cost-tuned (t={cost_tuned_t}): {cost_tuned_cost}")
print(f"Naive 0.5:                  {naive_cost}")
print(f"Reduction: {cost_reduction_pct}%")

# ---------- Save full report ----------
test_report = {
    "ensemble_test_metrics": ensemble_test_metrics,
    "ablation_xgboost_alone": xgb_test_metrics,
    "adversarial_test": anomaly_metrics,
    "calibration_bins": {
        "predicted_avg": [round(float(x), 4) if not np.isnan(x) else None for x in bin_predicted_avg],
        "actual_rate": [round(float(x), 4) if not np.isnan(x) else None for x in bin_actual_rates],
        "counts": bin_counts,
    },
    "cost_backtest_test_set": {
        "cost_tuned_threshold": cost_tuned_t,
        "cost_tuned_total_cost": cost_tuned_cost,
        "naive_threshold_cost": naive_cost,
        "cost_reduction_pct": cost_reduction_pct,
    },
}

with open("models/test_report.json", "w") as f:
    json.dump(test_report, f, indent=2)

print("\nSaved: models/test_report.json, models/reliability_diagram.png")