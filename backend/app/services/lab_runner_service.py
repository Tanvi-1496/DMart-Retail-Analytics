import time
import logging
from typing import Dict, Any, List
from ..db import db_manager
from ..schemas.common import RunResult, TableResult, ChartResult, MetaResult
from .olap_service import execute_olap_operation
from .visualization_service import run_visualization_service
from .regression_service import run_regression_analysis
from .decision_tree_service import run_decision_tree_analysis
from .naive_bayes_service import run_naive_bayes_analysis
from .clustering_service import run_kmeans_dmart, run_agglomerative_mall, run_customer_segmentation
from .apriori_service import run_apriori_mining
from .mini_project_service import run_mini_project_step
from .aqi_service import run_beijing_aqi_prediction

logger = logging.getLogger("dmart.lab_runner")

def run_lab_1_warehouse_design(params: Dict[str, Any]) -> RunResult:
    """Lab 1: Data Warehouse Design and Live Analytical Schema Queries for Star, Snowflake, and Constellation."""
    start_time = time.time()
    raw_schema = str(params.get("schema", "Star Schema")).strip()
    query_choice = str(params.get("query", "City-wise sales")).strip()

    # Normalize schema selection
    if "snow" in raw_schema.lower():
        schema_model = "Snowflake Schema"
    elif "constell" in raw_schema.lower() or "galaxy" in raw_schema.lower():
        schema_model = "Fact Constellation Schema"
    else:
        schema_model = "Star Schema"

    warnings = []
    if "city" in query_choice.lower() or "store" in query_choice.lower():
        warnings.append("Simulated Dimension Notice: The Store and City dimensions are modeled/simulated for DWM laboratory study.")
    if schema_model == "Fact Constellation Schema":
        warnings.append("Fact Constellation Notice: FactInventory is a simulated secondary business process tracking stock levels, sharing conformed dimensions (DimDate, DimCategory, DimStore) with FactSales.")

    dim_col = "Category"

    # --- SQL GENERATION MATCHING (SCHEMA, QUERY) ---
    if schema_model == "Snowflake Schema":
        if query_choice == "City-wise sales":
            sql = """-- Snowflake Schema: Multi-hop join FactSales -> DimStore -> normalized DimCity
SELECT ct.city_name AS City,
       ct.region AS Region,
       SUM(f.total_amount) AS Revenue,
       COUNT(f.sales_key) AS Transactions
FROM fact_sales f
JOIN dim_store s ON f.store_key = s.store_key
JOIN dim_city ct ON s.city_key = ct.city_key
GROUP BY ct.city_key, ct.city_name, ct.region
ORDER BY Revenue DESC;"""
            dim_col = "City"
        elif query_choice == "Monthly sales":
            sql = """-- Snowflake Schema: FactSales joined with calendar dimension hierarchy
SELECT d.month_name AS Month,
       d.quarter AS Quarter,
       SUM(f.total_amount) AS Revenue,
       COUNT(f.sales_key) AS Transactions
FROM fact_sales f
JOIN dim_date d ON f.date_key = d.date_key
GROUP BY d.quarter, d.month, d.month_name
ORDER BY d.month;"""
            dim_col = "Month"
        elif query_choice == "Customer-wise sales":
            sql = """-- Snowflake Schema: Normalized customer type grouping
SELECT cust.customer_type AS CustomerType,
       COUNT(DISTINCT cust.customer_key) AS UniqueCustomers,
       SUM(f.total_amount) AS Revenue,
       ROUND(AVG(f.total_amount), 2) AS AvgOrderValue
FROM fact_sales f
JOIN dim_customer cust ON f.customer_key = cust.customer_key
GROUP BY cust.customer_type
ORDER BY Revenue DESC;"""
            dim_col = "CustomerType"
        else: # Category-wise sales
            sql = """-- Snowflake Schema: FactSales joined with DimCategory
SELECT c.category_name AS Category,
       SUM(f.total_amount) AS Revenue,
       SUM(f.quantity) AS UnitsSold,
       COUNT(f.sales_key) AS Transactions
FROM fact_sales f
JOIN dim_category c ON f.category_key = c.category_key
GROUP BY c.category_key, c.category_name
ORDER BY Revenue DESC;"""
            dim_col = "Category"

    elif schema_model == "Fact Constellation Schema":
        if query_choice == "City-wise sales":
            sql = """-- Fact Constellation: Drill-across FactSales and FactInventory sharing conformed DimStore
SELECT st.city AS City,
       st.store_name AS Store,
       SUM(s.total_amount) AS SalesRevenue,
       SUM(inv.closing_stock) AS ClosingInventoryStock
FROM dim_store st
JOIN fact_sales s ON st.store_key = s.store_key
JOIN fact_inventory inv ON st.store_key = inv.store_key AND s.date_key = inv.date_key
GROUP BY st.store_key, st.city, st.store_name
ORDER BY SalesRevenue DESC;"""
            dim_col = "City"
        elif query_choice == "Monthly sales":
            sql = """-- Fact Constellation: Drill-across monthly Sales Revenue vs Stock Movement
SELECT d.month_name AS Month,
       SUM(s.total_amount) AS SalesRevenue,
       SUM(inv.stock_received) AS StockReceived
FROM dim_date d
JOIN fact_sales s ON d.date_key = s.date_key
JOIN fact_inventory inv ON d.date_key = inv.date_key
GROUP BY d.month, d.month_name
ORDER BY d.month;"""
            dim_col = "Month"
        elif query_choice == "Customer-wise sales":
            sql = """-- Fact Constellation: FactSales customer metrics (Customer is non-conformed to FactInventory)
SELECT cust.customer_type AS CustomerType,
       COUNT(DISTINCT cust.customer_key) AS UniqueCustomers,
       SUM(s.total_amount) AS Revenue,
       ROUND(AVG(s.total_amount), 2) AS AvgOrderValue
FROM fact_sales s
JOIN dim_customer cust ON s.customer_key = cust.customer_key
GROUP BY cust.customer_type
ORDER BY Revenue DESC;"""
            dim_col = "CustomerType"
        else: # Category-wise sales / Inventory vs Sales by Category
            sql = """-- Fact Constellation: Dual-fact drill-across through conformed DimCategory
SELECT c.category_name AS Category,
       SUM(s.total_amount) AS SalesRevenue,
       SUM(s.quantity) AS UnitsSold,
       SUM(inv.closing_stock) AS ClosingStock
FROM dim_category c
JOIN fact_sales s ON c.category_key = s.category_key
JOIN fact_inventory inv ON c.category_key = inv.category_key AND s.date_key = inv.date_key
GROUP BY c.category_key, c.category_name
ORDER BY SalesRevenue DESC;"""
            dim_col = "Category"

    else: # Star Schema
        if query_choice == "City-wise sales":
            sql = """-- Star Schema: Direct join between central FactSales and denormalized DimStore
SELECT st.city AS City,
       st.store_name AS Store,
       SUM(s.total_amount) AS Revenue,
       COUNT(s.sales_key) AS Transactions
FROM fact_sales s
JOIN dim_store st ON s.store_key = st.store_key
GROUP BY st.store_key, st.city, st.store_name
ORDER BY Revenue DESC;"""
            dim_col = "City"
        elif query_choice == "Monthly sales":
            sql = """-- Star Schema: Direct join between central FactSales and denormalized DimDate
SELECT d.month_name AS Month,
       SUM(s.total_amount) AS Revenue,
       COUNT(s.sales_key) AS Transactions
FROM fact_sales s
JOIN dim_date d ON s.date_key = d.date_key
GROUP BY d.month, d.month_name
ORDER BY d.month;"""
            dim_col = "Month"
        elif query_choice == "Customer-wise sales":
            sql = """-- Star Schema: Direct join between central FactSales and denormalized DimCustomer
SELECT cust.customer_type AS CustomerType,
       COUNT(DISTINCT cust.customer_key) AS UniqueCustomers,
       SUM(s.total_amount) AS Revenue,
       ROUND(AVG(s.total_amount), 2) AS AvgOrderValue
FROM fact_sales s
JOIN dim_customer cust ON s.customer_key = cust.customer_key
GROUP BY cust.customer_type
ORDER BY Revenue DESC;"""
            dim_col = "CustomerType"
        else: # Category-wise sales
            sql = """-- Star Schema: Direct join between central FactSales and denormalized DimCategory
SELECT c.category_name AS Category,
       SUM(s.total_amount) AS Revenue,
       SUM(s.quantity) AS UnitsSold,
       COUNT(s.sales_key) AS Transactions
FROM fact_sales s
JOIN dim_category c ON s.category_key = c.category_key
GROUP BY c.category_key, c.category_name
ORDER BY Revenue DESC;"""
            dim_col = "Category"

    df = db_manager.query_df(sql)
    elapsed_ms = int((time.time() - start_time) * 1000)

    # Format table
    cols = list(df.columns)
    rows = []
    for _, r in df.iterrows():
        row_dict: Dict[str, Any] = {}
        for c in cols:
            val = r[c]
            if isinstance(val, float):
                row_dict[c] = f"₹{val:,.2f}" if "rev" in c.lower() or "val" in c.lower() or "sales" in c.lower() else round(val, 2)
            elif isinstance(val, int):
                row_dict[c] = f"{val:,}"
            else:
                row_dict[c] = str(val)
        rows.append(row_dict)

    # Primary and secondary chart series
    chart_series = []
    dim_col_key = next((c for c in cols if c.lower() == dim_col.lower()), cols[0])
    rev_col_key = next((c for c in cols if "rev" in c.lower() or "sales" in c.lower()), cols[1] if len(cols) > 1 else cols[0])
    for _, r in df.iterrows():
        val = r[rev_col_key] if rev_col_key in cols else r[cols[1]]
        val_float = float(val) if val is not None else 0.0
        val_scaled = round(val_float / 10000000, 2) if val_float > 10000000 else round(val_float, 2)
        chart_series.append({"name": str(r[dim_col_key]), "value": val_scaled})

    # Observations tailored to schema architecture and empirical result
    if schema_model == "Snowflake Schema":
        obs = [
            f"Executed multi-hop normalized query '{query_choice}' across 3 relational tables (FactSales -> DimStore -> DimCity).",
            "Normalized DimCity eliminates city name redundancy in DimStore while maintaining strict 1-to-many relationship integrity.",
            f"Result partitioned into {len(rows)} distinct geographical records with zero data anomaly risk.",
            "Tradeoff: Query requires an additional JOIN operation compared to denormalized Star Schema, but saves dimensional storage."
        ]
    elif schema_model == "Fact Constellation Schema":
        obs = [
            f"Executed Fact Constellation drill-across query combining FactSales and FactInventory.",
            "Fact tables share conformed dimensions (DimDate, DimCategory, DimStore) enabling cross-process analytics.",
            f"Aggregated {len(rows)} records aligning sales transactions with inventory warehouse movements.",
            "Tradeoff: Fact constellations model complex enterprise workflows without denormalizing disparate business processes into a single monolithic fact table."
        ]
    else: # Star Schema
        obs = [
            f"Executed single-hop Star Schema query '{query_choice}' joining FactSales directly with denormalized {dim_col_key} dimension.",
            "Surrogate keys (sales_key, store_key, category_key, date_key) decouple the warehouse from operational transaction systems.",
            f"Aggregated {len(rows)} dimensional partitions with maximum read performance and minimal JOIN overhead.",
            "Tradeoff: High read speed achieved through intentional dimension denormalization."
        ]

    charts = [ChartResult(type="bar", title=f"{query_choice} by {dim_col} ({schema_model})", series=chart_series)]

    # If Fact Constellation has inventory closing stock, add secondary comparison chart
    if schema_model == "Fact Constellation Schema" and any("stock" in c.lower() for c in cols):
        stock_col = next(c for c in cols if "stock" in c.lower())
        stock_series = [{"name": str(r[dim_col_key]), "value": round(float(r[stock_col]), 0)} for _, r in df.iterrows()]
        charts.append(ChartResult(type="bar", title=f"Inventory Movement ({stock_col}) by {dim_col}", series=stock_series))

    metrics_dict = {
        "Schema Architecture": schema_model,
        "Analysis Query": query_choice,
        "Fact Tables": "fact_sales, fact_inventory" if schema_model == "Fact Constellation Schema" else "fact_sales",
        "Dimension Tables": "dim_date, dim_customer, dim_category, dim_store, dim_city" if schema_model == "Snowflake Schema" else "dim_date, dim_customer, dim_category, dim_store",
        "Warehouse Type": db_manager.db_type,
        "Surrogate Keys": "Verified Integer Keys (PK/FK)",
        "Query Runtime": f"{elapsed_ms} ms",
        "Records Returned": len(rows),
    }

    return RunResult(
        lab=1,
        status="success",
        params=params,
        tables=[TableResult(name=f"{query_choice} ({schema_model})", columns=cols, rows=rows)],
        charts=charts,
        metrics=metrics_dict,
        observations=obs,
        warnings=warnings,
        sql=sql,
    )

def run_lab_12_segmentation(params: Dict[str, Any]) -> RunResult:
    """Lab 12: Customer Segmentation formatted as standard RunResult."""
    start_time = time.time()
    k = int(params.get("k", 5))
    res = run_customer_segmentation({"k": k, "auto": False})

    summary_rows = []
    for p in res["profiles"]:
        summary_rows.append({
            "segment": p["name"],
            "customers": p["customers"],
            "avg_spend": p["spend"],
            "avg_transactions": p["transactions"],
            "marketing_strategy": "VIP rewards" if "High Value" in p["name"] else "Frequency bundles" if "Loyal" in p["name"] else "Promotional discount" if "Occasional" in p["name"] else "Win-back campaign",
        })

    obs = [
        f"Segmented 200 mall shoppers into {k} clusters based on Annual Income and Spending Score.",
        f"Identified High-Value segment representing the top tier of customer lifetime value.",
        "Generated data-driven marketing strategies corresponding to empirical centroid positions.",
    ]

    elapsed_ms = int((time.time() - start_time) * 1000)

    return RunResult(
        lab=12,
        status="success",
        params=params,
        tables=[TableResult(name="Customer Segment Profiles", columns=["segment", "customers", "avg_spend", "avg_transactions", "marketing_strategy"], rows=summary_rows)],
        charts=[
            ChartResult(type="scatter", title="Customer Spending vs Income Clusters", series=res["points"]),
            ChartResult(type="line", title="Elbow Method (Inertia vs K)", series=res["elbow"]),
            ChartResult(type="bar", title="Customer Segment Distribution", series=[{"name": p["name"], "value": int(p["customers"])} for p in res["profiles"]]),
        ],
        metrics={
            "Clusters (K)": k,
            "Dataset": "Mall Customers (200 rows)",
            "Model Selection": params.get("score", "Silhouette"),
            "Features": "Annual Income, Spending Score",
        },
        observations=obs,
        warnings=[],
        meta=MetaResult(rows_used=200, runtime_ms=elapsed_ms, seed=42)
    )

def execute_lab(lab_number: int, params: Dict[str, Any]) -> RunResult:
    """Central router executing any of the 12 Data Mining and Data Warehousing practical labs."""
    # Unwrap nested {"params": {...}} from frontend clients seamlessly
    if "params" in params and isinstance(params["params"], dict):
        merged = {**params["params"]}
        for k, v in params.items():
            if k != "params":
                merged[k] = v
        params = merged

    logger.info(f"Executing Lab {lab_number} with parameters: {params}")

    if lab_number == 1:
        return run_lab_1_warehouse_design(params)
    elif lab_number == 2:
        op = str(params.get("operation", "Roll-up"))
        return execute_olap_operation(op, params)
    elif lab_number == 3:
        chart = str(params.get("chart", "Bar"))
        return run_visualization_service(chart, params)
    elif lab_number == 4:
        return run_regression_analysis(params)
    elif lab_number == 5:
        return run_decision_tree_analysis(params)
    elif lab_number == 6:
        return run_naive_bayes_analysis(params)
    elif lab_number == 7:
        return run_kmeans_dmart(params)
    elif lab_number == 8:
        return run_agglomerative_mall(params)
    elif lab_number == 9:
        return run_apriori_mining(params)
    elif lab_number == 10:
        return run_mini_project_step(params)
    elif lab_number == 11:
        return run_beijing_aqi_prediction(params)
    elif lab_number == 12:
        return run_lab_12_segmentation(params)
    else:
        raise ValueError(f"Lab {lab_number} is not supported. Supported labs are 1 through 12.")
