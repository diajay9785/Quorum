import sys
import os
import json
import joblib
import numpy as np
import pandas as pd
import shap

sys.path.append(os.path.join(os.getcwd(), "features"))
from features import engineer_features

# ---------- Load all artifacts once ----------
meta_learner = joblib.load("models/meta_learner.joblib")
base_models = joblib.load("models/base_models_refit.joblib")
iso_forest = joblib.load("models/isolation_forest.joblib")

with open("features/category_stats.json") as f:
    CATEGORY_STATS = json.load(f)
with open("models/decision_config.json") as f:
    DECISION_CONFIG = json.load(f)

explain_config = joblib.load("models/explain_config.joblib")
DOMINANT_MODEL_NAME = explain_config["dominant_model_name"]
PHRASE_TEMPLATES = explain_config["phrase_templates"]
DEFAULT_TEMPLATE = "{feature} was a contributing factor"


def get_template(feature_name):
    if feature_name.startswith("cat_"):
        category = feature_name.replace("cat_", "").replace("_", " ")
        return f"this is an unusual merchant category ({category}) for this user"
    return PHRASE_TEMPLATES.get(feature_name, DEFAULT_TEMPLATE)


# feature column order -- pulled from training data once, at import time
_train_df = pd.read_csv("data/train_features.csv")
ID_COLS = ["transaction_id"]
FEATURE_COLS = [c for c in _train_df.columns if c != "is_fraud" and c not in ID_COLS]

_dominant_clf = base_models[DOMINANT_MODEL_NAME].named_steps["clf"]
_explainer = shap.TreeExplainer(_dominant_clf)

APPROVE_THRESHOLD = DECISION_CONFIG["approve_threshold"]
BLOCK_THRESHOLD = DECISION_CONFIG["block_threshold"]

RETRAIN_QUEUE_PATH = "data/retrain_queue.csv"


def predict(transaction: dict) -> dict:
    """
    transaction: dict with the SAME raw fields as transactions.csv
    (amount, merchant_category, device_change_flag, ip_change_flag,
    hour_of_day, user_txn_count_30d, time_since_last_txn_min, ...)
    """
    raw_df = pd.DataFrame([transaction])
    features_df = engineer_features(raw_df, CATEGORY_STATS)
    features_df = features_df.reindex(columns=FEATURE_COLS, fill_value=0)

    # base model probabilities -> meta-learner
    base_probs = {name: pipe.predict_proba(features_df)[:, 1][0] for name, pipe in base_models.items()}
    meta_input = pd.DataFrame([base_probs])
    score = float(meta_learner.predict_proba(meta_input)[:, 1][0])

    # decision band
    if score < APPROVE_THRESHOLD:
        band = "approve"
    elif score >= BLOCK_THRESHOLD:
        band = "block"
    else:
        band = "escalate"

    # anomaly flag
    anomaly_pred = iso_forest.predict(features_df)[0]
    anomaly_flag = bool(anomaly_pred == -1)

    # explanation
    shap_values = _explainer.shap_values(features_df)
    if isinstance(shap_values, list):
        shap_row = shap_values[1][0]           # older SHAP: list of arrays per class
    elif shap_values.ndim == 3:
        shap_row = shap_values[0, :, 1]         # newer SHAP: (rows, features, classes)
    else:
        shap_row = shap_values[0]               # already 2D

    top_indices = np.argsort(np.abs(shap_row))[::-1][:3]
    top_features = []
    for i in top_indices:
        feature_name = FEATURE_COLS[i]
        contribution = float(shap_row[i])
        direction = "higher" if contribution > 0 else "lower"
        template = get_template(feature_name)
        top_features.append({
            "feature": feature_name,
            "contribution": round(contribution, 4),
            "phrase_key": feature_name,
            "direction": direction,
            "phrase_en": template.format(direction=direction, feature=feature_name),
        })
    explanation_text = "Flagged mainly because " + "; ".join(
        item["phrase_en"] for item in top_features
    ) + "."

    return {
        "score": round(score, 4),
        "band": band,
        "anomaly_flag": anomaly_flag,
        "explanation": {
            "top_features": top_features,
            "text_en": explanation_text,
        },
    }


def record_feedback(transaction_id: str, transaction: dict, confirmed_label: int):
    """
    Appends a confirmed escalation outcome to the retrain queue.
    confirmed_label: 1 if it was actually fraud, 0 if it was actually legit.
    """
    row = {**transaction, "transaction_id": transaction_id, "confirmed_label": confirmed_label}
    row_df = pd.DataFrame([row])
    if os.path.exists(RETRAIN_QUEUE_PATH):
        existing_cols = pd.read_csv(RETRAIN_QUEUE_PATH, nrows=0).columns.tolist()
        row_df = row_df.reindex(columns=existing_cols)
        row_df.to_csv(RETRAIN_QUEUE_PATH, mode="a", header=False, index=False)
    else:
        row_df.to_csv(RETRAIN_QUEUE_PATH, mode="w", header=True, index=False)
    print(f"Feedback recorded for transaction {transaction_id} -> appended to {RETRAIN_QUEUE_PATH}")


# ---------- Smoke test ----------
if __name__ == "__main__":
    raw_sample = pd.read_csv("data/transactions.csv").iloc[0].to_dict()

    result = predict(raw_sample)
    print("=== Sample prediction ===")
    print(json.dumps(result, indent=2))

    record_feedback("demo_txn_001", raw_sample, confirmed_label=int(raw_sample.get("is_fraud", 0)))