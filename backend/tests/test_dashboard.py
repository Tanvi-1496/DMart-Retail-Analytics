# pyrefly: ignore [missing-import]
import pytest  # type: ignore
from fastapi.testclient import TestClient  # type: ignore

from backend.app.main import app  # type: ignore

client = TestClient(app)

def test_dashboard_and_kpis():
    response = client.get("/api/dashboard")
    assert response.status_code == 200
    data = response.json()
    assert "kpis" in data
    assert len(data["kpis"]) >= 6
    assert "monthlyRevenue" in data
    assert "categoryRevenue" in data
    assert len(data["categoryRevenue"]) >= 5
    assert "customerTypes" in data
    assert "topCustomers" in data

    # Verify alias endpoint
    alias_res = client.get("/api/kpis")
    assert alias_res.status_code == 200
    assert len(alias_res.json()["kpis"]) == len(data["kpis"])

def test_dashboard_with_filters():
    res_cat = client.get("/api/dashboard?category=Grocery&customer_type=Member")
    assert res_cat.status_code == 200
    data = res_cat.json()
    assert "kpis" in data
    assert len(data["kpis"]) >= 6

def test_filter_options():
    res = client.get("/api/datasets/options")
    assert res.status_code == 200
    data = res.json()
    assert "categories" in data
    assert "customer_types" in data
    assert "cities" in data
    assert len(data["categories"]) > 1

def test_exploration_summary():
    response = client.get("/api/exploration/summary")
    assert response.status_code == 200
    data = response.json()
    assert "overview" in data
    assert "previewRows" in data
    assert len(data["previewRows"]) > 0
    assert "dataTypes" in data
    assert "statistics" in data
    assert "distributions" in data
    assert "unitPriceHist" in data["distributions"]

def test_exploration_query():
    body = {
        "category": "Grocery",
        "customer_type": "Member",
        "search": "Sharma",
        "page": 1,
        "page_size": 10
    }
    response = client.post("/api/exploration/query", json=body)
    assert response.status_code == 200
    data = response.json()
    assert "records" in data
    assert data["page"] == 1
    assert data["page_size"] == 10

def test_insights():
    response = client.get("/api/insights")
    assert response.status_code == 200
    data = response.json()
    assert "insights" in data
    assert len(data["insights"]) >= 5
    assert "recommendations" in data
    assert len(data["recommendations"]) >= 4

def test_dw_olap_endpoint():
    res = client.post("/api/dw/olap", json={"operation": "Roll-up", "dimension": "Category", "measure": "Revenue"})
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert "tables" in data
    assert "charts" in data
    assert "sql" in data
