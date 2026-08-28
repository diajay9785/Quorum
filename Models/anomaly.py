"""
Day 2, Hour 5: Isolation Forest anomaly layer.
Trained only on non-fraud training rows (models "normal" behavior).
Tested against holdout_unseen_patterns.csv -- a fraud shape NEVER shown
to any model during training. High flag rate here = proof the system
catches novel fraud, not just memorized patterns.
"""

import sys
import os
import json
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest

sys.path.append(os.path.join(os.getcwd(), "features"))
from features import engineer_features  # reused from Day 1, Hour 5

# ---------- 1. Load train/val features ----------
train_df = pd.read_csv("data/train_features.csv")
val_df = pd.read_csv("data/val_features.csv")
TARGET = "is_fraud"
feature_cols = [c for c in train_df.columns if c != TARGET]

X_train_normal = train_df[train_df[TARGET] == 0][feature_cols]
X_val = val_df[feature_cols]
y_val = val_df[TARGET].values

print(f"Training Isolation Forest on {len(X_train_normal)} normal-only rows...")

# ---------- 2. Train Isolation Forest ----------
iso_forest = IsolationForest(
    n_estimators=200,
    contamination=0.025,  # matches Day 1's ~2.5% base fraud rate
    random_state=42,
)
iso_forest.fit(X_train_normal)

# ---------- 3. Sanity check on validation set ----------
# predict() returns -1 for anomaly, 1 for normal
val_preds = iso_forest.predict(X_val)
val_anomaly_flags = (val_preds == -1)

val_fraud_flagged_rate = np.sum(val_anomaly_flags & (y_val == 1)) / max(np.sum(y_val == 1), 1)
val_false_alarm_rate = np.sum(val_anomaly_flags & (y_val == 0)) / max(np.sum(y_val == 0), 1)

print(f"On validation set: {val_fraud_flagged_rate*100:.1f}% of real fraud flagged as anomaly, "
      f"{val_false_alarm_rate*100:.1f}% of legit transactions falsely flagged")

# ---------- 4. THE REAL TEST: holdout_unseen_patterns.csv ----------
holdout_raw = pd.read_csv("data/holdout_unseen_patterns.csv")

with open("features/category_stats.json") as f:
    category_stats = json.load(f)

holdout_features = engineer_features(holdout_raw, category_stats)
# align columns exactly to what the model expects, in case of any mismatch
holdout_features = holdout_features.reindex(columns=feature_cols, fill_value=0)

holdout_preds = iso_forest.predict(holdout_features)
holdout_anomaly_flags = (holdout_preds == -1)
holdout_catch_rate = np.mean(holdout_anomaly_flags) * 100

print(f"\n=== ADVERSARIAL TEST ===")
print(f"holdout_unseen_patterns.csv: {holdout_catch_rate:.1f}% flagged as anomalous "
      f"({np.sum(holdout_anomaly_flags)} of {len(holdout_raw)} rows)")

if holdout_catch_rate < 50:
    print("WARNING: catch rate is low. The anomaly layer may not be picking up "
          "the unseen fraud shape. Flag this before moving on.")
else:
    print("Good -- the anomaly layer catches most of the unseen fraud pattern "
          "without ever being trained on it.")

# ---------- 5. Save ----------
joblib.dump(iso_forest, "models/isolation_forest.joblib")

anomaly_metrics = {
    "validation_fraud_flagged_rate": round(float(val_fraud_flagged_rate), 4),
    "validation_false_alarm_rate": round(float(val_false_alarm_rate), 4),
    "holdout_unseen_pattern_catch_rate_pct": round(float(holdout_catch_rate), 2),
    "holdout_rows_tested": len(holdout_raw),
    "holdout_rows_flagged": int(np.sum(holdout_anomaly_flags)),
}
with open("models/anomaly_metrics.json", "w") as f:
    json.dump(anomaly_metrics, f, indent=2)

print("\nSaved: models/isolation_forest.joblib, models/anomaly_metrics.json")