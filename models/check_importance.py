import joblib
import pandas as pd

model = joblib.load("models/random_forest.joblib")

# Load training data
train_df = pd.read_csv("data/train_features.csv")

# Get feature names
feature_names = train_df.drop(
    columns=["transaction_id", "is_fraud"]
).columns

# Calculate feature importance
importances = pd.Series(
    model.feature_importances_,
    index=feature_names
).sort_values(ascending=False)

# Display top 10 features
print(importances.head(10))