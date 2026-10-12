# pyrefly: ignore [missing-import]
import pytest  # type: ignore
from fastapi.testclient import TestClient  # type: ignore

from backend.app.main import app  # type: ignore

client = TestClient(app)

def test_labs_catalog():
    res = client.get("/api/labs")
    assert res.status_code == 200
    data = res.json()
    assert data["total_labs"] == 12
    assert len(data["labs"]) == 12

    # Verify each lab info endpoint
    for lab_num in range(1, 13):
        info_res = client.get(f"/api/labs/{lab_num}")
        assert info_res.status_code == 200
        assert info_res.json()["number"] == lab_num

@pytest.mark.parametrize("lab_number,params", [
    (1, {"schema": "Star", "query": "Category-wise sales"}),
    (2, {"operation": "Roll-up", "dimension": "Category", "measure": "Revenue"}),
    (3, {"chart": "Bar", "x": "Category", "y": "Total"}),
    (4, {"type": "Multiple", "features": ["UnitPrice", "Quantity"], "test": 0.2}),
    (5, {"depth": 5, "features": ["UnitPrice", "Quantity"]}),
    (6, {"test": 0.2, "sample": 5000}),
    (7, {"k": 4}),
    (8, {"linkage": "ward", "clusters": 5}),
    (9, {"support": 0.05, "confidence": 0.3}),
    (10, {"step": "Preprocess", "classifier": "Decision Tree"}),
    (11, {"trees": 50, "exclude_pm": False}),
    (12, {"k": 5, "score": "Silhouette"}),
])
def test_all_twelve_labs_execution(lab_number, params):
    res = client.post(f"/api/labs/{lab_number}/run", json=params)
    assert res.status_code == 200, f"Lab {lab_number} failed with response: {res.text}"
    data = res.json()
    assert data["lab"] == lab_number
    assert data["status"] == "success"
    assert len(data["tables"]) > 0
    assert len(data["charts"]) > 0
    assert len(data["metrics"]) > 0
    assert len(data["observations"]) > 0
    assert "meta" in data
    assert data["meta"]["runtime_ms"] >= 0

def test_invalid_lab():
    res = client.post("/api/labs/99/run", json={})
    assert res.status_code == 400
    assert "not supported" in res.json()["detail"].lower()
