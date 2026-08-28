import sys, os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import FastAPI
from typing import Dict, Any
from models.pipeline import predict

app = FastAPI(title="Quorum Risk Manager API")

@app.get("/")
def root():
    return {"status": "Quorum API is running"}

@app.post("/score")
def score_transaction(transaction: Dict[str, Any]):
    result = predict(transaction)
    return result