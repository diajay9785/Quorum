import sys, os, json
from pathlib import Path
from fastapi import FastAPI, Query
from pydantic import BaseModel
from typing import Dict, Any, Optional

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.pipeline import predict, record_feedback

app = FastAPI(title="Quorum Risk Manager API")

MODELS_DIR = Path(__file__).resolve().parent.parent / "models"

# Temporary in-memory store for scored transactions.
# This gets replaced by real Supabase storage in Hour 4-5 today — for now it just
# lets /transactions show you what /score has produced during this session.
scored_transactions = []


class FeedbackRequest(BaseModel):
    transaction_id: int
    transaction: Dict[str, Any]
    confirmed_label: int


@app.get("/")
def root():
    return {"status": "Quorum API is running"}


@app.post("/score")
def score_transaction(transaction: Dict[str, Any]):
    result = predict(transaction)
    scored_transactions.append({**transaction, **result})
    return result


@app.get("/transactions")
def list_transactions(band: Optional[str] = Query(None), anomaly_flag: Optional[bool] = Query(None)):
    results = scored_transactions
    if band is not None:
        results = [t for t in results if t.get("band") == band]
    if anomaly_flag is not None:
        results = [t for t in results if t.get("anomaly_flag") == anomaly_flag]
    return results


@app.get("/stats")
def get_stats():
    with open(MODELS_DIR / "test_report.json") as f:
        test_report = json.load(f)
    with open(MODELS_DIR / "cost_model.json") as f:
        cost_model = json.load(f)
    with open(MODELS_DIR / "decision_config.json") as f:
        decision_config = json.load(f)
    return {
        "test_report": test_report,
        "cost_model": cost_model,
        "decision_config": decision_config,
    }


@app.post("/feedback")
def submit_feedback(feedback: FeedbackRequest):
    record_feedback(feedback.transaction_id, feedback.transaction, feedback.confirmed_label)
    return {"status": "feedback recorded"}