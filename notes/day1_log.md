# Day 1 Log — Data + AI Pipeline Foundation

## Dataset
- 20,000 synthetic transactions, ~2.5% base fraud rate, with ~1.5% random label noise added to simulate real-world disputed/misfiled cases
- 150 held-back 'unseen pattern' transactions (velocity-spike fraud shape never shown in training)
- Stratified 70/15/15 train/val/test split, fixed random seed 42

## Features engineered
- amount_zscore (vs. merchant category norm)
- high_velocity_flag, rapid_txn_flag
- One-hot encoded merchant category (10 categories)

## Baseline model results (validation set, default 0.5 threshold, after SMOTEENN resampling)
- Random Forest: precision 0.5816, recall 0.4831, F1 0.5278, ROC-AUC 0.7799
- Extra Trees: precision 0.7681, recall 0.4492, F1 0.5668, ROC-AUC 0.7752
- XGBoost: precision 0.5377, recall 0.4831, F1 0.5089, ROC-AUC 0.7609
- LightGBM: precision 0.5263, recall 0.5085, F1 0.5172, ROC-AUC 0.7638
- Strongest by F1: Extra Trees
- Weakest by F1: XGBoost

## Top features (Random Forest — Extra Trees was close in ranking)
1. user_txn_count_30d
2. time_since_last_txn_min
3. amount_zscore
4. amount
5. hour_of_day

## Anything odd / notes for tomorrow
- First data generation attempt gave a perfect 1.0 F1/AUC across all 4 models — traced to overly separable synthetic distributions (no overlap between fraud/normal on any feature). Fixed by tightening the gap between class distributions and adding ~1.5% random label noise; final ROC-AUC now sits at a believable 0.76–0.78.
- These are default-threshold (0.5) numbers on raw baseline models — expect a meaningful jump once Day 2 stacks the ensemble and tunes the decision threshold against the actual cost model, rather than using a naive 0.5 cutoff.
- Extra Trees currently wins on precision by a wide margin (0.77 vs ~0.53–0.58 for the others) — worth watching whether it also wins after stacking, or whether it's overfitting slightly on the resampled data.