# Day 2 Log — Ensemble, Cost Model, Decision Layer, Anomaly, Explainability, Testing

## What was built
- Stacking ensemble (RF, Extra Trees, XGBoost, LightGBM -> Logistic Regression
  meta-learner), trained via leak-free out-of-fold stacking.
- Cost matrix + cost-tuned decision threshold (FN=100, FP=5, TP=2, TN=0).
- 3-band decision layer (approve / escalate / block), thresholds chosen from
  full sweeps rather than fixed targets.
- Isolation Forest anomaly layer, trained on normal transactions only.
- SHAP-based plain-English explanations, phrase-assembly structure
  (translation-ready for Day 4), routed through the meta-learner's
  most-weighted base model.
- Full testing protocol: test-set metrics, ablation, adversarial test,
  calibration diagram, cost backtest.
- Unified pipeline.py with predict() and record_feedback().

## Key bug caught: transaction_id leak
`transaction_id` was accidentally included in the feature set from Day 1
onward (every "feature_cols = all columns except target" line silently
included it). Discovered when it showed up as a top-3 SHAP contributing
feature in the pipeline smoke test.

Fixed by excluding it everywhere feature columns are defined, then
retrained the full pipeline in order: ensemble -> cost model -> decision
layer -> anomaly layer -> explanations -> test report -> pipeline.

Effect of the fix (validation/test numbers, before -> after):
- Ensemble F1 (validation): 0.5789 -> 0.5625
- Extra Trees F1 (validation): 0.5510 -> 0.5621 (ensemble's edge over the
  best single model nearly disappeared -- some of it was leak-driven)
- Adversarial catch rate (holdout_unseen_patterns.csv): 98.0% -> 100.0%
- Cost reduction vs naive threshold (test set): 8.2% -> 12.67%

Takeaway: the leak was inflating the ensemble's apparent advantage and
partially inflating the anomaly layer's confidence via a spurious ID
signal. Removing it produced a smaller but more honest gap between the
ensemble and the best single model, and better real numbers everywhere
that mattered (cost reduction, adversarial catch rate).

## Final test-set numbers (post-fix, clean)
- Ensemble: precision 0.8485, recall 0.4746, F1 0.6087, ROC-AUC 0.7825
- Best single model (XGBoost): precision 0.6535, recall 0.5593, F1 0.6027,
  ROC-AUC 0.7818
- Ablation: ensemble beats single model on precision and ROC-AUC; F1 gap
  is thin (0.6087 vs 0.6027) -- keep the ensemble, don't oversell the margin.
- Adversarial test: 100% of holdout_unseen_patterns.csv flagged as
  anomalous (150/150).
- Cost backtest: cost-tuned threshold reduces total cost by 12.67% vs
  naive 0.5 threshold on the test set.
- Calibration: reliability diagram shows mild under-confidence in the
  0.2-0.5 predicted-probability range, roughly on-target at the high end
  -- acceptable, no major miscalibration.

## Decision layer
- Approve threshold: 0.02 (miss rate ~1.8%, floor set by the ~1.5% label
  noise injected in Day 1 -- not a modeling gap)
- Block threshold: 0.59 (precision ~0.86)
- Autonomy split (validation): 82.4% approve, 15.5% escalate, 2.1% block
  -> 84.5% auto-handled overall

## Known minor loose ends (low priority)
- check_importance.py (Day 1) is hardcoded to load random_forest.joblib
  instead of the F1-leading model; not re-checked, no impact on Day 2 work.
- pipeline.py smoke test only demos on the first row of transactions.csv;
  fine for a sanity check, not a full validation run.

## End-of-day checkpoint
Full AI engine done and tested clean, no leaks: predict() returns
{score, band, anomaly_flag, explanation} for any transaction; feedback
stub writes to retrain_queue.csv. All code, models, and metrics committed
and pushed to GitHub. Ready for Day 3 (FastAPI + Supabase + deploy).