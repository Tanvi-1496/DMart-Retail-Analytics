# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Query
from typing import Optional
from ..services.dashboard_service import get_dashboard_kpis

router = APIRouter(tags=["Dashboard"])

@router.get("/api/dashboard")
def dashboard(
    category: Optional[str] = Query(None),
    customer_type: Optional[str] = Query(None),
    month: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
):
    filters = {
        "category": category,
        "customer_type": customer_type,
        "month": month,
        "start_date": start_date,
        "end_date": end_date,
    }
    return get_dashboard_kpis(filters)

@router.get("/api/kpis")
def kpis(
    category: Optional[str] = Query(None),
    customer_type: Optional[str] = Query(None),
    month: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
):
    filters = {
        "category": category,
        "customer_type": customer_type,
        "month": month,
        "start_date": start_date,
        "end_date": end_date,
    }
    return get_dashboard_kpis(filters)
