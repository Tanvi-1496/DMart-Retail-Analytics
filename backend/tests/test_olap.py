# pyrefly: ignore [missing-import]
import pytest  # type: ignore
from fastapi.testclient import TestClient  # type: ignore

from backend.app.main import app  # type: ignore

client = TestClient(app)

def test_warehouse_schema_endpoints():
    res_summary = client.get("/api/dw/summary")
    assert res_summary.status_code == 200
    assert "table_counts" in res_summary.json()

    res_schema = client.get("/api/dw/schema")
    assert res_schema.status_code == 200
    assert "tables" in res_schema.json()

    res_tables = client.get("/api/dw/tables")
    assert res_tables.status_code == 200
    tables = res_tables.json()["tables"]
    assert "fact_sales" in tables
    assert "dim_date" in tables
    assert "dim_customer" in tables

    res_sample = client.get("/api/dw/tables/dim_category/sample?limit=5")
    assert res_sample.status_code == 200
    assert "sample" in res_sample.json()
    assert len(res_sample.json()["sample"]) > 0

@pytest.mark.parametrize("operation", [
    "Roll-up",
    "Drill-down",
    "Slice",
    "Dice",
    "Pivot",
    "Drill-across",
    "CUBE",
    "GROUPING SETS",
])
def test_olap_operations(operation):
    payload = {
        "category": "All categories",
        "customerType": "All customer types",
        "dimension": "Category",
        "measure": "Revenue",
    }
    response = client.post(f"/api/olap/{operation}", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert len(data["tables"]) > 0
    assert len(data["charts"]) > 0
    assert "metrics" in data
    assert "observations" in data
    assert len(data["observations"]) > 0
    assert "meta" in data
    assert data["meta"]["rows_used"] > 0
