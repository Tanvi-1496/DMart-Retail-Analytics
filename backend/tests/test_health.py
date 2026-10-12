# pyrefly: ignore [missing-import]
import pytest  # type: ignore
from fastapi.testclient import TestClient  # type: ignore

from backend.app.main import app  # type: ignore

client = TestClient(app)

def test_root():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "DMart Retail Analytics" in data["message"]

def test_health():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "database" in data
    assert "warehouse" in data

def test_datasets():
    response = client.get("/api/datasets")
    assert response.status_code == 200
    data = response.json()
    assert data["total_datasets"] >= 4
    filenames = [d["filename"] for d in data["datasets"]]
    assert "dmart_sample_data.csv" in filenames
    assert "mall_customers.csv" in filenames
    assert "beijing_aqi_sample.csv" in filenames
    assert "lab10_dmart_cleaned.csv" in filenames
