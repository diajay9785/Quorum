import pandas as pd
from sklearn.model_selection import train_test_split

df = pd.read_csv("data/transactions.csv")

# First split off the test set (15%)
train_val_df, test_df = train_test_split(
    df,
    test_size=0.15,
    stratify=df["is_fraud"],
    random_state=42
)

# Then split the remaining 85% into train (70% of total) and val (15% of total)
# 0.15 / 0.85 = ~0.1765, so val is ~15% of the original total
train_df, val_df = train_test_split(
    train_val_df,
    test_size=0.1765,
    stratify=train_val_df["is_fraud"],
    random_state=42
)

train_df.to_csv("data/train.csv", index=False)
val_df.to_csv("data/val.csv", index=False)
test_df.to_csv("data/test.csv", index=False)

print("Train:", train_df.shape, "| fraud rate:", round(train_df["is_fraud"].mean(), 4))
print("Val:  ", val_df.shape, "| fraud rate:", round(val_df["is_fraud"].mean(), 4))
print("Test: ", test_df.shape, "| fraud rate:", round(test_df["is_fraud"].mean(), 4))