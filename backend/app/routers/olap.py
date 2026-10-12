from fastapi import APIRouter, HTTPException
from typing import Dict, Any, Optional
from pydantic import BaseModel
from ..db import db_manager
from ..services.olap_service import execute_olap_operation
from ..schemas.common import RunResult

router = APIRouter(tags=["OLAP & Data Warehouse"])

class OlapParamRequest(BaseModel):
    category: Optional[str] = "All categories"
    customerType: Optional[str] = "All customer types"
    dimension: Optional[str] = "Category"
    measure: Optional[str] = "Revenue"
    city: Optional[str] = "All cities"

@router.post("/api/olap/{operation}", response_model=RunResult)
def run_olap_operation(operation: str, params: Optional[Dict[str, Any]] = None):
    try:
        return execute_olap_operation(operation, params or {})
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/api/dw/summary")
def get_warehouse_summary():
    return db_manager.get_dw_summary()

@router.get("/api/dw/schema")
def get_warehouse_schema():
    tables = db_manager.get_tables()
    schema_info = {}
    for t in tables:
        schema_info[t] = db_manager.get_table_schema(t)
    return {
        "architecture": "Star Schema with Fact Constellation",
        "tables": schema_info,
    }

@router.get("/api/dw/tables")
def list_warehouse_tables():
    return {"tables": db_manager.get_tables()}

@router.get("/api/dw/tables/{table_name}/sample")
def get_table_sample(table_name: str, limit: int = 10):
    try:
        sample = db_manager.get_table_sample(table_name, limit)
        return {"table": table_name, "count": len(sample), "sample": sample}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
