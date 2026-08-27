import pandas as pd
import numpy as np

np.random.seed(42)

N_TOTAL = 20000
FRAUD_RATE = 0.025  # ~2.5%
N_FRAUD = int(N_TOTAL * FRAUD_RATE)
N_NORMAL = N_TOTAL - N_FRAUD

MERCHANT_CATEGORIES = ["grocery", "electronics", "travel", "fuel", "dining",
                       "utilities", "online_retail", "jewelry", "pharmacy", "entertainment"]

def make_normal_rows(n):
    hour = np.where(np.random.rand(n) < 0.08,
                     np.random.randint(0, 6, n),
                     np.random.randint(6, 23, n))
    return pd.DataFrame({
        "amount": np.round(np.random.gamma(2.3, 50, n), 2),
        "merchant_category": np.random.choice(MERCHANT_CATEGORIES, n),
        "device_change_flag": np.random.choice([0, 1], n, p=[0.88, 0.12]),
        "ip_change_flag": np.random.choice([0, 1], n, p=[0.86, 0.14]),
        "hour_of_day": hour,
        "user_txn_count_30d": np.random.poisson(14, n),
        "time_since_last_txn_min": np.round(np.random.exponential(350, n), 1),
        "is_fraud": 0
    })

def make_fraud_rows(n):
    hour = np.where(np.random.rand(n) < 0.65,
                     np.random.randint(0, 6, n),
                     np.random.randint(6, 23, n))
    return pd.DataFrame({
        "amount": np.round(np.random.gamma(3.0, 100, n), 2),
        "merchant_category": np.random.choice(MERCHANT_CATEGORIES, n),
        "device_change_flag": np.random.choice([0, 1], n, p=[0.60, 0.40]),
        "ip_change_flag": np.random.choice([0, 1], n, p=[0.58, 0.42]),
        "hour_of_day": hour,
        "user_txn_count_30d": np.random.poisson(6, n),
        "time_since_last_txn_min": np.round(np.random.exponential(60, n), 1),
        "is_fraud": 1
    })

def make_unseen_pattern_rows(n):
    # A velocity-spike fraud shape NEVER shown to the model in training
    return pd.DataFrame({
        "amount": np.round(np.random.gamma(1.5, 30, n), 2),  # small, unremarkable amounts
        "merchant_category": np.random.choice(MERCHANT_CATEGORIES, n),
        "device_change_flag": np.zeros(n, dtype=int),        # same device — looks "normal"
        "ip_change_flag": np.zeros(n, dtype=int),            # same IP — looks "normal"
        "hour_of_day": np.random.randint(9, 18, n),          # normal daytime hours
        "user_txn_count_30d": np.random.randint(40, 80, n),  # velocity spike: way more txns than usual
        "time_since_last_txn_min": np.round(np.random.uniform(0.5, 3, n), 1),  # rapid-fire transactions
        "is_fraud": 1
    })

normal_df = make_normal_rows(N_NORMAL)
fraud_df = make_fraud_rows(N_FRAUD)

visible_df = pd.concat([normal_df, fraud_df], ignore_index=True)
visible_df = visible_df.sample(frac=1, random_state=42).reset_index(drop=True)
visible_df.insert(0, "transaction_id", range(1, len(visible_df) + 1))

holdout_df = make_unseen_pattern_rows(150)
holdout_df.insert(0, "transaction_id", range(900000, 900000 + len(holdout_df)))

# Real-world label noise: ~1.5% of labels are flipped (disputed/misfiled cases)
noise_mask = np.random.rand(len(visible_df)) < 0.015
visible_df.loc[noise_mask, "is_fraud"] = 1 - visible_df.loc[noise_mask, "is_fraud"]

visible_df.to_csv("data/transactions.csv", index=False)
holdout_df.to_csv("data/holdout_unseen_patterns.csv", index=False)

print("transactions.csv:", visible_df.shape, "| fraud rate:", round(visible_df['is_fraud'].mean(), 4))
print("holdout_unseen_patterns.csv:", holdout_df.shape)