import requests
import pandas as pd

API_URL = "http://127.0.0.1:8000"
EMAIL = "diatest1@gmail.com"
PASSWORD = "TestPassword123!"

# Log in to get a real auth token
login_response = requests.post(f"{API_URL}/auth/login", json={"email": EMAIL, "password": PASSWORD})
login_response.raise_for_status()
token = login_response.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}

# Load 200 normal rows (fixed seed so this is reproducible)
transactions_df = pd.read_csv("data/transactions.csv")
sample_df = transactions_df.drop(columns=["is_fraud"]).sample(n=200, random_state=42)

# Load 10 unseen-pattern rows to prove the anomaly layer catches them too
holdout_df = pd.read_csv("data/holdout_unseen_patterns.csv")
holdout_sample = holdout_df.drop(columns=[c for c in ["is_fraud"] if c in holdout_df.columns]).head(10)

all_rows = pd.concat([sample_df, holdout_sample], ignore_index=True)

success_count = 0
fail_count = 0

for _, row in all_rows.iterrows():
    payload = row.to_dict()
    response = requests.post(f"{API_URL}/score", json=payload, headers=headers)
    if response.status_code == 200:
        success_count += 1
    else:
        fail_count += 1
        print(f"Failed on transaction_id {payload.get('transaction_id')}: {response.status_code} {response.text}")

print(f"\nDone. Succeeded: {success_count}, Failed: {fail_count}")