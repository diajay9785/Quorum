import sys, os, json
from pathlib import Path
from fastapi import FastAPI, Query, HTTPException, Depends, Header
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


class AuthRequest(BaseModel):
    email: str
    password: str


def get_current_user(authorization: str = Header(None)):
    """
    Reads the 'Authorization: Bearer <token>' header, asks Supabase to verify it,
    and returns the user. Raises 401 if missing or invalid.
    """
    if authorization is None or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or malformed Authorization header")

    token = authorization.split(" ")[1]
    try:
        user_response = supabase.auth.get_user(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    if user_response is None or user_response.user is None:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    return user_response.user


@app.get("/")
def root():
    return {"status": "Quorum API is running"}


@app.post("/auth/signup")
def signup(payload: AuthRequest):
    result = supabase.auth.sign_up({"email": payload.email, "password": payload.password})
    return {"user_id": result.user.id if result.user else None}


@app.post("/auth/login")
def login(payload: AuthRequest):
    result = supabase.auth.sign_in_with_password({"email": payload.email, "password": payload.password})
    return {"access_token": result.session.access_token}


@app.post("/score")
def score_transaction(transaction: Dict[str, Any], user=Depends(get_current_user)):
    result = predict(transaction)

    txn_row = {k: v for k, v in transaction.items() if k != "is_fraud"}
    supabase.table("transactions").insert(txn_row).execute()

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
def list_transactions(
    band: Optional[str] = Query(None),
    anomaly_flag: Optional[bool] = Query(None),
    user=Depends(get_current_user),
):
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
def submit_feedback(feedback: FeedbackRequest, user=Depends(get_current_user)):
    record_feedback(feedback.transaction_id, feedback.transaction, feedback.confirmed_label)

    supabase.table("retrain_feedback").insert({
        "transaction_id": feedback.transaction_id,
        "confirmed_label": feedback.confirmed_label,
    }).execute()

    return {"status": "feedback recorded"}