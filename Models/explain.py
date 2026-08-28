import json
import joblib
import numpy as np
import pandas as pd
import shap

# ---------- 1. Load models ----------
val_df = pd.read_csv("data/val_features.csv")
TARGET = "is_fraud"
feature_cols = [c for c in val_df.columns if c != TARGET]
X_val = val_df[feature_cols]

meta_learner = joblib.load("models/meta_learner.joblib")
base_models = joblib.load("models/base_models_refit.joblib")

# ---------- 2. Find the base model the meta-learner trusts most ----------
base_model_names = list(base_models.keys())  # same order used at training time
coefs = meta_learner.coef_[0]
dominant_idx = int(np.argmax(np.abs(coefs)))
dominant_name = base_model_names[dominant_idx]
print(f"Meta-learner weights: {dict(zip(base_model_names, coefs.round(3)))}")
print(f"Explaining via: {dominant_name}")

dominant_clf = base_models[dominant_name].named_steps["clf"]

SAMPLE_SIZE = 20
X_val_sample = X_val.iloc[:SAMPLE_SIZE].reset_index(drop=True)

explainer = shap.TreeExplainer(dominant_clf)
print(f"Computing SHAP values on {SAMPLE_SIZE} sample rows (this should take a few seconds)...")
shap_values = explainer.shap_values(X_val_sample)

# shap_values shape varies by SHAP version / model type -- normalize to
# a 2D array (rows x features) for the positive (fraud) class.
if isinstance(shap_values, list):
    shap_matrix = shap_values[1]  # older SHAP: list of arrays, one per class
elif shap_values.ndim == 3:
    shap_matrix = shap_values[:, :, 1]  # newer SHAP: (rows, features, classes)
else:
    shap_matrix = shap_values  # already 2D

print(f"shap_matrix shape: {shap_matrix.shape}")

# ---------- 4. Phrase dictionary (English now, translation-ready keys) ----------
PHRASE_TEMPLATES = {
    "amount_zscore": "the amount is unusually {direction} for this merchant category",
    "merchant_category_default": "the merchant category is a contributing factor",
    "amount": "the transaction amount was {direction}",
    "user_txn_count_30d": "the user has {direction} activity in the last 30 days",
    "time_since_last_txn_min": "this happened {direction} after the previous transaction",
    "device_change_flag": "a device change was detected",
    "ip_change_flag": "an IP address change was detected",
    "hour_of_day": "the transaction occurred at an unusual hour",
    "high_velocity_flag": "unusually high transaction velocity was detected",
    "rapid_txn_flag": "transactions happened in rapid succession",
}
def get_template(feature_name):
    if feature_name.startswith("cat_"):
        category = feature_name.replace("cat_", "").replace("_", " ")
        return f"this is an unusual merchant category ({category}) for this user"
    return PHRASE_TEMPLATES.get(feature_name, DEFAULT_TEMPLATE)

DEFAULT_TEMPLATE = "{feature} was a contributing factor"

def explain_row(row_idx, top_n=3):
    row_shap = shap_matrix[row_idx]
    top_indices = np.argsort(np.abs(row_shap))[::-1][:top_n]
    explanation_items = []
    for i in top_indices:
        feature_name = feature_cols[i]
        contribution = float(row_shap[i])
        direction = "higher" if contribution > 0 else "lower"
        template = get_template(feature_name)
        phrase = template.format(direction=direction, feature=feature_name)
        explanation_items.append({
            "feature": feature_name,
            "contribution": round(contribution, 4),
            "phrase_key": feature_name,
            "direction": direction,
            "phrase_en": phrase,
        })
    return {
        "top_features": explanation_items,
        "explanation_text_en": "Flagged mainly because " + "; ".join(
            item["phrase_en"] for item in explanation_items
        ) + ".",
    }

# ---------- 5. Demo on first 5 validation rows ----------
demo_output = [explain_row(i) for i in range(5)]
print("\n=== SAMPLE EXPLANATIONS ===")
for i, item in enumerate(demo_output):
    print(f"Row {i}: {item['explanation_text_en']}")

# ---------- 6. Save ----------
with open("models/explain_demo.json", "w") as f:
    json.dump(demo_output, f, indent=2)

joblib.dump({"dominant_model_name": dominant_name, "phrase_templates": PHRASE_TEMPLATES},
            "models/explain_config.joblib")

print("\nSaved: models/explain_demo.json, models/explain_config.joblib")