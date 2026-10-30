import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db import db_manager
from app.services.lab_runner_service import execute_lab
from app.services.decision_tree_service import run_decision_tree_analysis

client = TestClient(app)

def test_supabase_and_snowflake_dim_city_integrity():
    """Verify that dim_city and dim_store.city_key exist and Snowflake multi-hop join runs properly."""
    db_manager.initialize()
    # Query dim_city
    cities = db_manager.query_df("SELECT * FROM dim_city ORDER BY city_key;")
    assert not cities.empty
    assert "city_name" in cities.columns
    assert len(cities) >= 4

    # Check dim_store has city_key
    stores = db_manager.query_df("SELECT store_key, store_name, city, city_key FROM dim_store;")
    assert not stores.empty
    assert "city_key" in stores.columns
    assert stores["city_key"].isnull().sum() == 0, "No orphaned city_key in dim_store"

    # Test Snowflake multi-hop join
    res = execute_lab(1, {"schema": "Snowflake Schema", "query": "City-wise sales"})
    assert res.status == "success"
    assert len(res.tables) == 1
    assert "City" in res.tables[0].columns
    assert "Region" in res.tables[0].columns
    assert "Revenue" in res.tables[0].columns

def test_lab5_tree_data_extraction():
    """Verify that Lab 5 extracts rich tree_data with nodes, conditions, and samples."""
    res = run_decision_tree_analysis({"depth": 4, "features": ["UnitPrice", "Quantity"]})
    assert res.status == "success"
    assert res.tree_data is not None
    assert "samples" in res.tree_data
    assert "depth" in res.tree_data
    assert "class" in res.tree_data
    assert res.meta.tree_data is not None

def test_case_insensitive_exploration_search():
    """Verify that searching in exploration works case-insensitively via ILIKE."""
    # Search lowercase 'grocery'
    res = client.post("/api/exploration/query", json={"search": "grocery", "page": 1, "page_size": 10})
    assert res.status_code == 200
    data = res.json()
    assert data["total_records"] > 0
    assert len(data["records"]) > 0
    for r in data["records"]:
        assert "grocery" in r["Category"].lower() or "grocery" in r["CustomerName"].lower()

def test_filter_options_has_canonical_categories():
    """Verify that the filter options endpoint reports all database categories."""
    res = client.get("/api/datasets/options")
    assert res.status_code == 200
    data = res.json()
    assert "categories" in data
    cats = data["categories"]
    assert "All categories" in cats
    assert "Grocery" in cats
    assert "Beauty & Personal Care" in cats
    assert "Home & Kitchen" in cats
    assert "Clothing" in cats
    assert "Electronics" in cats
    assert "Beverages" in cats
