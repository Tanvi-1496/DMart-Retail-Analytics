from fastapi import APIRouter
from ..services.insights_service import generate_warehouse_insights

router = APIRouter(prefix="/api/insights", tags=["Insights"])

@router.get("")
def get_insights():
    return generate_warehouse_insights()
