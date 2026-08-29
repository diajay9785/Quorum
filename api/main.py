import sys, os, json
from pathlib import Path
from fastapi import FastAPI, Query, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, Optional

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.pipeline import predict, record_feedback
from api.supabase_client import supabase

app = FastAPI(title="Quorum Risk Manager API")

MODELS_DIR = Path(__file__).resolve().parent.parent / "models"


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

    # Write the raw transaction to the transactions table (audit log)
    txn_row = {k: v for k, v in transaction.items() if k != "is_fraud"}
    supabase.table("transactions").insert(txn_row).execute()

    # Write the decision to the decisions table
    decision_row = {
        "transaction_id": transaction.get("transaction_id"),
        "score": result["score"],
        "band": result["band"],
        "anomaly_flag": result["anomaly_flag"],
        "explanation": result["explanation"],
    }
    supabase.table("decisions").insert(decision_row).execute()

    return result


@app.get("/transactions")
def list_transactions(band: Optional[str] = Query(None), anomaly_flag: Optional[bool] = Query(None)):
    query = supabase.table("decisions").select("*")
    if band is not None:
        query = query.eq("band", band)
    if anomaly_flag is not None:
        query = query.eq("anomaly_flag", anomaly_flag)
    response = query.order("created_at", desc=True).execute()
    return response.data


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

    supabase.table("retrain_feedback").insert({
        "transaction_id": feedback.transaction_id,
        "confirmed_label": feedback.confirmed_label,
    }).execute()

    return {"status": "feedback recorded"}