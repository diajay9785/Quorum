import pandas as pd
import numpy as np
import json
import os

CATEGORY_LIST = ["grocery", "electronics", "travel", "fuel", "dining",
                  "utilities", "online_retail", "jewelry", "pharmacy", "entertainment"]

STATS_PATH = "features/category_stats.json"


def compute_category_stats(train_df):
    """Compute mean/std of amount per merchant category, using TRAIN data only."""
    stats = {}
    for cat in CATEGORY_LIST:
        cat_amounts = train_df.loc[train_df["merchant_category"] == cat, "amount"]
        stats[cat] = {
            "mean": float(cat_amounts.mean()) if len(cat_amounts) > 0 else 0.0,
            "std": float(cat_amounts.std()) if len(cat_amounts) > 1 else 1.0
        }
    os.makedirs("features", exist_ok=True)
    with open(STATS_PATH, "w") as f:
        json.dump(stats, f, indent=2)
    return stats


def load_category_stats():
    with open(STATS_PATH, "r") as f:
        return json.load(f)


def engineer_features(df, stats):
    """
    Reusable feature engineering — works on a full dataframe (train/val/test)
    OR a single-row dataframe (one live transaction from the API later).
    """
    df = df.copy()

    # Amount z-score relative to that merchant category's typical spend
    def zscore_row(row):
        cat_stats = stats.get(row["merchant_category"], {"mean": 0.0, "std": 1.0})
        std = cat_stats["std"] if cat_stats["std"] > 0 else 1.0
        return (row["amount"] - cat_stats["mean"]) / std

    df["amount_zscore"] = df.apply(zscore_row, axis=1)

    # Simple derived flags
    df["high_velocity_flag"] = (df["user_txn_count_30d"] > 30).astype(int)
    df["rapid_txn_flag"] = (df["time_since_last_txn_min"] < 5).astype(int)

    # One-hot encode merchant category (fixed column order, so live scoring matches training)
    for cat in CATEGORY_LIST:
        df[f"cat_{cat}"] = (df["merchant_category"] == cat).astype(int)

    df = df.drop(columns=["merchant_category"])
    return df


if __name__ == "__main__":
    train_df = pd.read_csv("data/train.csv")
    val_df = pd.read_csv("data/val.csv")
    test_df = pd.read_csv("data/test.csv")

    stats = compute_category_stats(train_df)

    train_feat = engineer_features(train_df, stats)
    val_feat = engineer_features(val_df, stats)
    test_feat = engineer_features(test_df, stats)

    train_feat.to_csv("data/train_features.csv", index=False)
    val_feat.to_csv("data/val_features.csv", index=False)
    test_feat.to_csv("data/test_features.csv", index=False)

    print("Train features:", train_feat.shape)
    print("Val features:  ", val_feat.shape)
    print("Test features: ", test_feat.shape)
    print("New columns added:", [c for c in train_feat.columns if c not in train_df.columns])