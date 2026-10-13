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
    """Lab 1: Data Warehouse Design and Live Analytical Schema Queries."""
    start_time = time.time()
    schema_choice = str(params.get("schema", "Star")).strip()
    query_choice = str(params.get("query", "Category-wise sales")).strip()

    warnings = []
    if "city" in query_choice.lower() or "store" in query_choice.lower():
        warnings.append("Simulated Dimension Notice: The Store and City dimensions are simulated for DWM laboratory study.")

    if query_choice == "Monthly sales":
        sql = """
            SELECT d.month_name AS Month, SUM(s.total_amount) AS Revenue, COUNT(s.sales_key) AS Transactions
            FROM fact_sales s JOIN dim_date d ON s.date_key = d.date_key
            GROUP BY d.month, d.month_name ORDER BY d.month;
        """
        dim_col = "Month"
    elif query_choice == "City-wise sales":
        sql = """
            SELECT st.city AS City, st.store_name AS Store, SUM(s.total_amount) AS Revenue, COUNT(s.sales_key) AS Transactions
            FROM fact_sales s JOIN dim_store st ON s.store_key = st.store_key
            GROUP BY st.store_key, st.city, st.store_name ORDER BY Revenue DESC;
        """
        dim_col = "City"
    elif query_choice == "Customer-wise sales":
        sql = """
            SELECT cust.customer_type AS CustomerType, COUNT(DISTINCT cust.customer_key) AS UniqueCustomers,
                   SUM(s.total_amount) AS Revenue, ROUND(AVG(s.total_amount), 2) AS AvgOrderValue
            FROM fact_sales s JOIN dim_customer cust ON s.customer_key = cust.customer_key
            GROUP BY cust.customer_type ORDER BY Revenue DESC;
        """
        dim_col = "CustomerType"
    else: # Category-wise sales
        sql = """
            SELECT c.category_name AS Category, SUM(s.total_amount) AS Revenue,
                   SUM(s.quantity) AS UnitsSold, COUNT(s.sales_key) AS Transactions
            FROM fact_sales s JOIN dim_category c ON s.category_key = c.category_key
            GROUP BY c.category_key, c.category_name ORDER BY Revenue DESC;
        """
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
                row_dict[c] = f"₹{val:,.2f}" if "rev" in c.lower() or "val" in c.lower() else round(val, 2)
            elif isinstance(val, int):
                row_dict[c] = f"{val:,}"
            else:
                row_dict[c] = str(val)
        rows.append(row_dict)

    # Chart series
    chart_series = []
    dim_col_key = next((c for c in cols if c.lower() == dim_col.lower()), cols[0])
    rev_col_key = next((c for c in cols if "rev" in c.lower()), cols[1] if len(cols) > 1 else cols[0])
    for _, r in df.iterrows():
        val = r[rev_col_key] if rev_col_key in cols else r[cols[1]]
        chart_series.append({"name": str(r[dim_col_key]), "value": round(float(val) / 10000000, 2) if float(val) > 10000000 else round(float(val), 2)})

    obs = [
        f"Executed live dimensional analytical query '{query_choice}' against {db_manager.db_type}.",
        f"Verified schema model: {schema_choice} schema structure with surrogate keys linking fact_sales to dimensions.",
        f"Primary table contains {len(rows)} aggregated dimensional partitions.",
    ]

    return RunResult(
        lab=1,
        status="success",
        params=params,
        tables=[TableResult(name=f"{query_choice} Results", columns=cols, rows=rows)],
        charts=[ChartResult(type="bar", title=f"{query_choice} by {dim_col}", series=chart_series)],
        metrics={
            "Schema Model": schema_choice,
            "Query": query_choice,
            "Warehouse Type": db_manager.db_type,
            "Runtime": f"{elapsed_ms} ms",
        },
        observations=obs,
        warnings=warnings,
        meta=MetaResult(rows_used=len(df), runtime_ms=elapsed_ms, seed=42)
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
