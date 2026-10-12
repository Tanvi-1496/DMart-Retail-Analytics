from fastapi import APIRouter, HTTPException, Query
from typing import Dict, Any, Optional
from ..services.clustering_service import run_customer_segmentation

router = APIRouter(tags=["Segmentation"])

@router.get("/api/segmentation")
@router.post("/api/segmentation/run")
def get_segmentation(k: int = Query(4, ge=2, le=8), auto: bool = Query(True)):
    try:
        return run_customer_segmentation({"k": k, "auto": auto})
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
