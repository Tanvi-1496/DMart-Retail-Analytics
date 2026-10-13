# pyrefly: ignore [missing-import]
from fastapi import APIRouter, HTTPException, Query
from typing import Dict, Any, Optional
from ..services.clustering_service import run_customer_segmentation

router = APIRouter(tags=["Segmentation"])

@router.get("/api/segmentation")
@router.get("/api/mining/segmentation")
@router.post("/api/segmentation/run")
@router.post("/api/segmentation")
@router.post("/api/mining/segmentation")
def get_segmentation(
    k: int = Query(4, ge=2, le=8),
    auto: bool = Query(False),
    payload: Optional[Dict[str, Any]] = None,
):
    try:
        data = payload or {}
        req_k = data.get("k", k)
        req_auto = data.get("auto", auto)
        return run_customer_segmentation({"k": req_k, "auto": req_auto})
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
