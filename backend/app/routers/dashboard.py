from fastapi import APIRouter
from ..services.dashboard_service import get_dashboard_kpis

router = APIRouter(tags=["Dashboard"])

@router.get("/api/dashboard")
def dashboard():
    return get_dashboard_kpis()

@router.get("/api/kpis")
def kpis():
    return get_dashboard_kpis()
