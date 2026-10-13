# pyrefly: ignore [missing-import]
from fastapi import APIRouter, HTTPException
from typing import Dict, Any, Optional
from ..services.apriori_service import run_apriori_mining
from ..schemas.common import RunResult

router = APIRouter(tags=["Market Basket Mining"])

@router.post("/api/market-basket/apriori", response_model=RunResult)
@router.post("/api/mining/apriori", response_model=RunResult)
@router.post("/api/market-basket", response_model=RunResult)
def run_apriori_endpoint(params: Optional[Dict[str, Any]] = None):
    try:
        return run_apriori_mining(params or {})
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
