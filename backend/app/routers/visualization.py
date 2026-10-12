from fastapi import APIRouter, HTTPException
from typing import Dict, Any, Optional
from ..services.visualization_service import run_visualization_service
from ..schemas.common import RunResult

router = APIRouter(prefix="/api/viz", tags=["Visualization"])

@router.post("/{chart_type}", response_model=RunResult)
def generate_chart(chart_type: str, params: Optional[Dict[str, Any]] = None):
    try:
        return run_visualization_service(chart_type, params or {})
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
