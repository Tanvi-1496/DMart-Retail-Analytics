# pyrefly: ignore [missing-import]
import pytest  # type: ignore
from fastapi.testclient import TestClient  # type: ignore

from backend.app.main import app  # type: ignore

client = TestClient(app)

def test_prediction_endpoints():
    # Regression
    reg_res = client.post("/api/prediction/regression", json={"type": "Multiple", "features": ["UnitPrice", "Quantity"]})
    assert reg_res.status_code == 200
    reg_data = reg_res.json()
    assert "MAE" in reg_data["metrics"]
    assert "R2" in reg_data["metrics"]
    assert len(reg_data["tables"][0]["rows"]) > 0

    # Classification
    cls_res = client.post("/api/prediction/classification", json={"depth": 4})
    assert cls_res.status_code == 200
    cls_data = cls_res.json()
    assert "Accuracy" in cls_data["metrics"]
    assert len(cls_data["tables"][0]["rows"]) > 0

    # Forecast
    fc_res = client.post("/api/prediction/forecast")
    assert fc_res.status_code == 200
    fc_data = fc_res.json()
    assert "forecast" in fc_data
    assert len(fc_data["forecast"]) == 6

    # GET /api/prediction/{kind} (UI screen client compatibility)
    get_reg = client.get("/api/prediction/regression")
    assert get_reg.status_code == 200
    assert "metrics" in get_reg.json()

    get_cls = client.get("/api/prediction/classification")
    assert get_cls.status_code == 200
    assert "metrics" in get_cls.json()

    get_fc = client.get("/api/prediction/forecast")
    assert get_fc.status_code == 200
    assert "forecast" in get_fc.json()

def test_segmentation_endpoint():
    res = client.get("/api/segmentation?k=4&auto=true")
    assert res.status_code == 200
    data = res.json()
    assert "elbow" in data
    assert len(data["elbow"]) >= 6
    assert "points" in data
    assert len(data["points"]) > 0
    assert "profiles" in data
    assert len(data["profiles"]) == 4

def test_market_basket_apriori():
    payload = {"support": 0.05, "confidence": 0.3}
    res = client.post("/api/market-basket/apriori", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert len(data["tables"]) == 2
    assert data["tables"][0]["name"] == "Frequent Itemsets"
    assert data["tables"][1]["name"] == "Association Rules"
    assert len(data["observations"]) > 0
    assert len(data["warnings"]) > 0
