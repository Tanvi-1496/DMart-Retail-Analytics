# pyrefly: ignore [missing-import]
from fastapi import APIRouter
from ..db import db_manager

router = APIRouter(tags=["Health"])

@router.get("/health")
@router.get("/api/health")
def health_check():
    status = db_manager.get_status()
    summary = db_manager.get_dw_summary()
    return {
        "status": "healthy",
        "service": "DMart Retail Analytics Backend",
        "version": "1.0.0",
        "database": status,
        "warehouse": summary,
    }
