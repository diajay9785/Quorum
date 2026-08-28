"""
Day 2, Hour 4: 3-band decision layer (approve / escalate / block).

- BLOCK_THRESHOLD: smallest probability cutoff where precision is >= 85%
  (with enough support to trust the number) -> confident enough to auto-block.
- APPROVE_THRESHOLD: chosen from a full sweep as the threshold with the
  LOWEST achievable miss rate (with enough support) -> as safe as the
  model can genuinely support, not an arbitrary target.
- Anything between the two thresholds is genuinely uncertain -> escalate
  to a human. This band should NEVER be empty in a real system.
"""

import json
import joblib
import numpy as np
import pandas as pd

# ---------- 1. Load validation data + rebuild ensemble probabilities ----------
val_df = pd.read_csv("data/val_features.csv")
TARGET = "is_fraud"
feature_cols = [c for c in val_df.columns if c != TARGET]

X_val = val_df[feature_cols]
y_val = val_df[TARGET].values

meta_learner = joblib.load("models/meta_learner.joblib")
base_models = joblib.load("models/base_models_refit.joblib")

val_preds = {}
for name, pipe in base_models.items():
    val_preds[name] = pipe.predict_proba(X_val)[:, 1]
X_meta_val = pd.DataFrame(val_preds)

probs = meta_learner.predict_proba(X_meta_val)[:, 1]

# ---------- 2. Find BLOCK_THRESHOLD ----------
TARGET_PRECISION = 0.85
MIN_SUPPORT = 15

block_threshold = None
block_precision = None
block_support = None

for t in np.arange(0.30, 0.99, 0.01):
    flagged = probs >= t
    support = flagged.sum()
    if support < MIN_SUPPORT:
        continue
    precision = np.sum(flagged & (y_val == 1)) / support
    if precision >= TARGET_PRECISION:
        block_threshold = round(float(t), 2)
        block_precision = round(float(precision), 4)
        block_support = int(support)
        break  # smallest t meeting the bar

if block_threshold is None:
    print("WARNING: no threshold hit 85% precision with enough support. "
          "Falling back to 0.70 -- REVIEW THIS MANUALLY.")
    block_threshold = 0.70

# ---------- 3. Find APPROVE_THRESHOLD via full sweep ----------
MIN_APPROVE_SUPPORT = 50

approve_sweep = []
for t in np.arange(0.01, 0.50, 0.01):
    below = probs < t
    support = below.sum()
    if support < MIN_APPROVE_SUPPORT:
        continue
    miss_rate = np.sum(below & (y_val == 1)) / support
    approve_sweep.append((round(float(t), 2), round(float(miss_rate), 5), int(support)))

print("Approve-band sweep (threshold, miss_rate, support):")
for row in approve_sweep:
    print(row)

if approve_sweep:
    # pick the threshold with the lowest miss rate available
    approve_threshold, approve_miss_rate, approve_support = min(approve_sweep, key=lambda r: r[1])
    print(f"\nBest achievable approve threshold: {approve_threshold} "
          f"(miss rate: {approve_miss_rate}, support: {approve_support})")
else:
    print("WARNING: no threshold met minimum support. Falling back to 0.05 -- REVIEW THIS MANUALLY.")
    approve_threshold, approve_miss_rate, approve_support = 0.05, None, None

if approve_threshold >= block_threshold:
    print("WARNING: approve_threshold >= block_threshold -- bands overlap. "
          "REVIEW THIS MANUALLY before continuing.")

print(f"\nAPPROVE_THRESHOLD = {approve_threshold} "
      f"(miss rate: {approve_miss_rate}, support: {approve_support})")
print(f"BLOCK_THRESHOLD   = {block_threshold} "
      f"(precision: {block_precision}, support: {block_support})")

# ---------- 4. Decision function ----------
def decide_band(prob, approve_t=approve_threshold, block_t=block_threshold):
    if prob < approve_t:
        return "approve"
    elif prob >= block_t:
        return "block"
    else:
        return "escalate"

# ---------- 5. Apply to validation set, report autonomy split ----------
bands = np.array([decide_band(p) for p in probs])

n_total = len(bands)
n_approve = np.sum(bands == "approve")
n_escalate = np.sum(bands == "escalate")
n_block = np.sum(bands == "block")

autonomy_pct = round((n_approve + n_block) / n_total * 100, 2)

# how many actual frauds land in each band (sanity check)
fraud_in_approve = int(np.sum((bands == "approve") & (y_val == 1)))
fraud_in_escalate = int(np.sum((bands == "escalate") & (y_val == 1)))
fraud_in_block = int(np.sum((bands == "block") & (y_val == 1)))

print(f"\nAutonomy split: approve={n_approve} ({n_approve/n_total*100:.1f}%), "
      f"escalate={n_escalate} ({n_escalate/n_total*100:.1f}%), "
      f"block={n_block} ({n_block/n_total*100:.1f}%)")
print(f"Auto-handled (approve+block) = {autonomy_pct}%")
print(f"Actual fraud caught: {fraud_in_approve} slipped through approve (bad), "
      f"{fraud_in_escalate} sent to human (expected), "
      f"{fraud_in_block} auto-blocked (good)")

# ---------- 6. Save ----------
decision_config = {
    "approve_threshold": approve_threshold,
    "block_threshold": block_threshold,
    "approve_band_miss_rate": approve_miss_rate,
    "block_band_precision": block_precision,
    "autonomy_pct_on_validation": autonomy_pct,
    "band_counts": {"approve": int(n_approve), "escalate": int(n_escalate), "block": int(n_block)},
    "fraud_by_band": {"approve": fraud_in_approve, "escalate": fraud_in_escalate, "block": fraud_in_block},
}

with open("models/decision_config.json", "w") as f:
    json.dump(decision_config, f, indent=2)

print("\nSaved: models/decision_config.json")