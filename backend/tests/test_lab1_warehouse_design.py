import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.lab_runner_service import run_lab_1_warehouse_design
from app.db import db_manager

client = TestClient(app)

def test_foreign_key_integrity_in_warehouse():
    """Verify that foreign keys in fact and dimension tables reference valid primary keys."""
    # Test dim_store.city_key -> dim_city.city_key
    invalid_cities = db_manager.query_df("""
        SELECT s.store_key, s.city_key 
        FROM dim_store s 
        LEFT JOIN dim_city c ON s.city_key = c.city_key 
        WHERE c.city_key IS NULL;
    """)
    assert len(invalid_cities) == 0, "dim_store contains orphaned city_key foreign keys"

    # Test fact_sales keys
    invalid_sales = db_manager.query_df("""
        SELECT f.sales_key 
        FROM fact_sales f
        LEFT JOIN dim_store s ON f.store_key = s.store_key
        LEFT JOIN dim_category c ON f.category_key = c.category_key
        LEFT JOIN dim_date d ON f.date_key = d.date_key
        LEFT JOIN dim_customer cust ON f.customer_key = cust.customer_key
        WHERE s.store_key IS NULL OR c.category_key IS NULL OR d.date_key IS NULL OR cust.customer_key IS NULL
        LIMIT 10;
    """)
    assert len(invalid_sales) == 0, "fact_sales contains orphaned foreign keys"

    # Test fact_inventory conformed keys
    invalid_inventory = db_manager.query_df("""
        SELECT inv.inventory_key 
        FROM fact_inventory inv
        LEFT JOIN dim_store s ON inv.store_key = s.store_key
        LEFT JOIN dim_category c ON inv.category_key = c.category_key
        LEFT JOIN dim_date d ON inv.date_key = d.date_key
        WHERE s.store_key IS NULL OR c.category_key IS NULL OR d.date_key IS NULL
        LIMIT 10;
    """)
    assert len(invalid_inventory) == 0, "fact_inventory contains orphaned conformed foreign keys"

def test_star_schema_city_wise_sales():
    """Star schema must join FactSales directly with DimStore."""
    res = run_lab_1_warehouse_design({"schema": "Star Schema", "query": "City-wise sales"})
    assert res.status == "success"
    assert len(res.tables) == 1
    table = res.tables[0]
    assert "City" in table.columns
    assert "Revenue" in table.columns
    assert len(table.rows) == 5
    # SQL check
    assert "dim_store" in res.sql
    assert "dim_city" not in res.sql  # Star schema must not join normalized outrigger
    assert "fact_inventory" not in res.sql
    # Metrics check
    assert res.metrics["Schema Architecture"] == "Star Schema"
    assert len(res.charts) == 1
    assert res.charts[0].type == "bar"

def test_snowflake_schema_city_wise_sales():
    """Snowflake schema must execute multi-hop join: FactSales -> DimStore -> DimCity."""
    res = run_lab_1_warehouse_design({"schema": "Snowflake Schema", "query": "City-wise sales"})
    assert res.status == "success"
    assert len(res.tables) == 1
    table = res.tables[0]
    assert "City" in table.columns
    assert "Region" in table.columns
    assert len(table.rows) == 4
    # SQL check: must contain both dim_store and dim_city
    assert "dim_store" in res.sql
    assert "dim_city" in res.sql
    assert "fact_inventory" not in res.sql
    # Metrics & observations check
    assert res.metrics["Schema Architecture"] == "Snowflake Schema"
    assert any("normalized" in obs.lower() for obs in res.observations)

def test_fact_constellation_drill_across():
    """Fact constellation schema must perform drill-across joining FactSales and FactInventory."""
    res = run_lab_1_warehouse_design({"schema": "Fact Constellation Schema", "query": "City-wise sales"})
    assert res.status == "success"
    assert len(res.tables) == 1
    table = res.tables[0]
    assert "City" in table.columns
    assert "SalesRevenue" in table.columns
    assert "ClosingInventoryStock" in table.columns
    # SQL check: must reference both facts
    assert "fact_sales" in res.sql
    assert "fact_inventory" in res.sql
    # Two charts: one for sales revenue, one for inventory movement
    assert len(res.charts) == 2
    assert res.metrics["Schema Architecture"] == "Fact Constellation Schema"
    assert "fact_sales, fact_inventory" in res.metrics["Fact Tables"]

def test_api_lab1_run_endpoint():
    """Verify POST /api/labs/1/run returns complete result matching requested parameters."""
    payload = {"schema": "Snowflake Schema", "query": "City-wise sales"}
    response = client.post("/api/labs/1/run", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["lab"] == 1
    assert data["status"] == "success"
    assert "tables" in data and len(data["tables"]) > 0
    assert "charts" in data and len(data["charts"]) > 0
    assert "sql" in data and len(data["sql"]) > 0
    assert "dim_city" in data["sql"]
    assert "observations" in data and len(data["observations"]) > 0
    assert "metrics" in data
    assert data["metrics"]["Schema Architecture"] == "Snowflake Schema"

def test_simulation_warnings_returned():
    """Verify that simulated dimension notices are explicitly returned in warnings."""
    res = run_lab_1_warehouse_design({"schema": "Fact Constellation Schema", "query": "City-wise sales"})
    assert len(res.warnings) >= 2
    assert any("simulated" in w.lower() for w in res.warnings)
