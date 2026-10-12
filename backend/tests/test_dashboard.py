import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_dashboard_and_kpis():
    response = client.get("/api/dashboard")
    assert response.status_code == 200
    data = response.json()
    assert "kpis" in data
    assert len(data["kpis"]) >= 6
    assert "monthlyRevenue" in data
    assert len(data["monthlyRevenue"]) == 12
    assert "categoryRevenue" in data
    assert len(data["categoryRevenue"]) >= 5
    assert "customerTypes" in data
    assert "topCustomers" in data

    # Verify alias endpoint
    alias_res = client.get("/api/kpis")
    assert alias_res.status_code == 200
    assert len(alias_res.json()["kpis"]) == len(data["kpis"])

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

def test_exploration_query():
    body = {
        "category": "Grocery",
        "customer_type": "Member",
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
