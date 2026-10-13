# pyrefly: ignore [missing-import]
import time
import logging

from typing import Dict, Any, List
import pandas as pd
from ..db import db_manager
from ..schemas.common import RunResult, TableResult, ChartResult, MetaResult
from .observations import generate_olap_observations

logger = logging.getLogger("dmart.olap")

def execute_olap_operation(operation: str, params: Dict[str, Any]) -> RunResult:
    start_time = time.time()
    op_clean = operation.strip().lower().replace("-", "").replace(" ", "_")

    category = params.get("category", "All categories")
    customer_type = params.get("customerType", "All customer types")
    dimension = params.get("dimension", "Category")
    measure = params.get("measure", "Revenue")
    city = params.get("storeCity", params.get("city", "All cities"))

    warnings = []

    # Map UI measure to SQL expression
    measure_map = {
        "revenue": "SUM(s.total_amount)",
        "transactions": "COUNT(s.sales_key)",
        "quantity": "SUM(s.quantity)",
        "average value": "ROUND(AVG(s.total_amount), 2)",
    }
    sql_measure = measure_map.get(measure.lower(), "SUM(s.total_amount)")
    measure_alias = measure.replace(" ", "_").capitalize()

    # Dimension mapping
    dim_map = {
        "category": ("c.category_name", "dim_category c ON s.category_key = c.category_key"),
        "month": ("d.month_name", "dim_date d ON s.date_key = d.date_key"),
        "customer type": ("cust.customer_type", "dim_customer cust ON s.customer_key = cust.customer_key"),
        "store city": ("st.city", "dim_store st ON s.store_key = st.store_key"),
        "city": ("st.city", "dim_store st ON s.store_key = st.store_key"),
    }
    dim_col, dim_join = dim_map.get(dimension.lower(), dim_map["category"])

    if "city" in dimension.lower() or "store" in dimension.lower() or (city and city != "All cities"):
        warnings.append("Simulated Dimension Notice: Store and City dimensions are simulated for DWM laboratory study.")

    where_clauses = ["1=1"]
    if category != "All categories":
        where_clauses.append(f"c.category_name = '{category}'")
    if customer_type != "All customer types":
        where_clauses.append(f"cust.customer_type = '{customer_type}'")
    if city and city != "All cities":
        where_clauses.append(f"st.city = '{city}'")
    where_sql = " AND ".join(where_clauses)

    query_sql = ""

    if "rollup" in op_clean:
        # Roll-up: Year and Month aggregation (Month first for distinct labeling)
        query_sql = f"""
        SELECT d.month_name AS Month, d.year AS Year, {sql_measure} AS {measure_alias}
        FROM fact_sales s
        JOIN dim_date d ON s.date_key = d.date_key
        JOIN dim_category c ON s.category_key = c.category_key
        JOIN dim_customer cust ON s.customer_key = cust.customer_key
        JOIN dim_store st ON s.store_key = st.store_key
        WHERE {where_sql}
        GROUP BY d.year, d.month, d.month_name
        ORDER BY d.year, d.month;
        """
    elif "drilldown" in op_clean:
        # Drill-down: Category down to Customer Type
        query_sql = f"""
        SELECT c.category_name AS Category, cust.customer_type AS CustomerType, {sql_measure} AS {measure_alias}
        FROM fact_sales s
        JOIN dim_category c ON s.category_key = c.category_key
        JOIN dim_customer cust ON s.customer_key = cust.customer_key
        JOIN dim_store st ON s.store_key = st.store_key
        WHERE {where_sql}
        GROUP BY c.category_name, cust.customer_type
        ORDER BY {measure_alias} DESC;
        """
    elif "slice" in op_clean:
        target_cat = category if category != "All categories" else "Grocery"
        query_sql = f"""
        SELECT d.month_name AS Month, {sql_measure} AS {measure_alias}
        FROM fact_sales s
        JOIN dim_date d ON s.date_key = d.date_key
        JOIN dim_category c ON s.category_key = c.category_key
        JOIN dim_store st ON s.store_key = st.store_key
        WHERE c.category_name = '{target_cat}'{" AND st.city = '" + city + "'" if city != 'All cities' else ''}
        GROUP BY d.month, d.month_name
        ORDER BY d.month;
        """
    elif "dice" in op_clean:
        query_sql = f"""
        SELECT c.category_name AS Category, cust.customer_type AS CustomerType, {sql_measure} AS {measure_alias}
        FROM fact_sales s
        JOIN dim_category c ON s.category_key = c.category_key
        JOIN dim_customer cust ON s.customer_key = cust.customer_key
        JOIN dim_store st ON s.store_key = st.store_key
        WHERE c.category_name IN ('Grocery', 'Home & Kitchen', 'Beverages')
          AND cust.customer_type IN ('Member', 'Premium')
          {"AND st.city = '" + city + "'" if city != 'All cities' else ''}
        GROUP BY c.category_name, cust.customer_type
        ORDER BY {measure_alias} DESC;
        """
    elif "pivot" in op_clean:
        query_sql = f"""
        SELECT c.category_name AS Category,
               ROUND(SUM(CASE WHEN d.month = 1 THEN s.total_amount ELSE 0 END), 2) AS Jan,
               ROUND(SUM(CASE WHEN d.month = 2 THEN s.total_amount ELSE 0 END), 2) AS Feb,
               ROUND(SUM(CASE WHEN d.month = 3 THEN s.total_amount ELSE 0 END), 2) AS Mar,
               ROUND(SUM(CASE WHEN d.month = 4 THEN s.total_amount ELSE 0 END), 2) AS Apr,
               ROUND(SUM(s.total_amount), 2) AS Total
        FROM fact_sales s
        JOIN dim_category c ON s.category_key = c.category_key
        JOIN dim_date d ON s.date_key = d.date_key
        JOIN dim_store st ON s.store_key = st.store_key
        WHERE {"st.city = '" + city + "'" if city != 'All cities' else '1=1'}
        GROUP BY c.category_name
        ORDER BY Total DESC;
        """
    elif "drillacross" in op_clean:
        warnings.append("Drill-Across Notice: Fact Sales and Fact Inventory are aggregated independently at shared Category dimension before joining to prevent fan-out.")
        query_sql = f"""
        WITH sales_agg AS (
            SELECT category_key, SUM(total_amount) AS sales_revenue, SUM(quantity) AS units_sold
            FROM fact_sales
            GROUP BY category_key
        ),
        inv_agg AS (
            SELECT category_key, SUM(opening_stock) AS total_opening_stock, SUM(closing_stock) AS total_closing_stock
            FROM fact_inventory
            GROUP BY category_key
        )
        SELECT c.category_name AS Category,
               COALESCE(s.sales_revenue, 0) AS Revenue,
               COALESCE(s.units_sold, 0) AS UnitsSold,
               COALESCE(i.total_opening_stock, 5000) AS OpeningStock,
               COALESCE(i.total_closing_stock, 4200) AS ClosingStock
        FROM dim_category c
        LEFT JOIN sales_agg s ON c.category_key = s.category_key
        LEFT JOIN inv_agg i ON c.category_key = i.category_key
        ORDER BY Revenue DESC;
        """
    elif "cube" in op_clean or "grouping_sets" in op_clean:
        if db_manager.db_type == "supabase_postgresql":
            query_sql = f"""
            SELECT c.category_name AS Category, cust.customer_type AS CustomerType, {sql_measure} AS {measure_alias}
            FROM fact_sales s
            JOIN dim_category c ON s.category_key = c.category_key
            JOIN dim_customer cust ON s.customer_key = cust.customer_key
            JOIN dim_store st ON s.store_key = st.store_key
            WHERE {where_sql}
            GROUP BY CUBE(c.category_name, cust.customer_type)
            ORDER BY Category NULLS LAST, CustomerType NULLS LAST;
            """
        else:
            query_sql = f"""
            SELECT c.category_name AS Category, cust.customer_type AS CustomerType, {sql_measure} AS {measure_alias}
            FROM fact_sales s
            JOIN dim_category c ON s.category_key = c.category_key
            JOIN dim_customer cust ON s.customer_key = cust.customer_key
            JOIN dim_store st ON s.store_key = st.store_key
            WHERE {where_sql}
            GROUP BY c.category_name, cust.customer_type
            UNION ALL
            SELECT c.category_name AS Category, '(All Types)' AS CustomerType, {sql_measure} AS {measure_alias}
            FROM fact_sales s
            JOIN dim_category c ON s.category_key = c.category_key
            JOIN dim_store st ON s.store_key = st.store_key
            WHERE {where_sql}
            GROUP BY c.category_name
            UNION ALL
            SELECT '(All Categories)' AS Category, '(All Types)' AS CustomerType, {sql_measure} AS {measure_alias}
            FROM fact_sales s
            JOIN dim_store st ON s.store_key = st.store_key
            WHERE {where_sql};
            """
    else:
        # Standard dimensional aggregation
        query_sql = f"""
        SELECT {dim_col} AS {dimension.replace(' ', '')}, {sql_measure} AS {measure_alias}
        FROM fact_sales s
        JOIN {dim_join}
        JOIN dim_category c ON s.category_key = c.category_key
        JOIN dim_customer cust ON s.customer_key = cust.customer_key
        WHERE {where_sql}
        GROUP BY {dim_col}
        ORDER BY {measure_alias} DESC;
        """

    df_res = db_manager.query_df(query_sql)
    elapsed_ms = int((time.time() - start_time) * 1000)

    # Format table output
    columns = list(df_res.columns) if not df_res.empty else ["Dimension", "Value"]
    rows = []
    for _, r in df_res.iterrows():
        row_dict: Dict[str, Any] = {}
        for c in columns:
            val = r[c]
            if isinstance(val, (int, float)):
                row_dict[c] = round(val, 2)
            else:
                row_dict[c] = str(val) if val is not None else "(All)"
        rows.append(row_dict)

    # Chart formatting: generate meaningful data-driven charts for the selected OLAP operation
    charts = []
    if not df_res.empty:
        chart_series = []
        if "rollup" in op_clean:
            for _, r in df_res.iterrows():
                val = r[measure_alias] if measure_alias in r else r.iloc[-1]
                num_val = float(val) if isinstance(val, (int, float)) else 0.0
                chart_series.append({"name": str(r["Month"]), "value": round(num_val, 2)})
            charts.append(ChartResult(type="line", title=f"Roll-up Monthly Trend ({measure})", series=chart_series))
            charts.append(ChartResult(type="bar", title=f"Monthly {measure} Breakdown", series=chart_series))
        elif "drilldown" in op_clean or "dice" in op_clean or "cube" in op_clean or "grouping_sets" in op_clean:
            for _, r in df_res.iterrows():
                cat = str(r["Category"]) if "Category" in r else str(r.iloc[0])
                cust = str(r["CustomerType"]) if "CustomerType" in r else str(r.iloc[1])
                if "(All" in cat or "(All" in cust:
                    continue
                val = r[measure_alias] if measure_alias in r else r.iloc[-1]
                num_val = float(val) if isinstance(val, (int, float)) else 0.0
                chart_series.append({"name": f"{cat} - {cust}", "value": round(num_val, 2)})
            charts.append(ChartResult(type="bar", title=f"{operation}: Category × Customer Type ({measure})", series=chart_series[:15]))
        elif "pivot" in op_clean:
            for _, r in df_res.iterrows():
                val = r["Total"] if "Total" in r else r.iloc[-1]
                num_val = float(val) if isinstance(val, (int, float)) else 0.0
                chart_series.append({"name": str(r["Category"]), "value": round(num_val, 2)})
            charts.append(ChartResult(type="bar", title=f"Pivot: Total {measure} by Category", series=chart_series))
        elif "drillacross" in op_clean:
            sales_series = []
            inv_series = []
            for _, r in df_res.iterrows():
                cat = str(r["Category"])
                rev = float(r["Revenue"]) if isinstance(r["Revenue"], (int, float)) else 0.0
                units = float(r["UnitsSold"]) if isinstance(r["UnitsSold"], (int, float)) else 0.0
                stock = float(r["ClosingStock"]) if isinstance(r["ClosingStock"], (int, float)) else 0.0
                sales_series.append({"name": cat, "value": round(rev, 2)})
                inv_series.append({"name": cat, "value": round(stock, 2), "units_sold": round(units, 2)})
            charts.append(ChartResult(type="bar", title="Drill-Across: Sales Revenue by Category", series=sales_series))
            charts.append(ChartResult(type="bar", title="Drill-Across: Inventory Closing Stock", series=inv_series))
        else:
            dim_col_name = columns[0]
            val_col_name = columns[-1]
            for _, r in df_res.iterrows():
                lbl = str(r[dim_col_name]) if r[dim_col_name] is not None else "(All)"
                val = r[val_col_name] if isinstance(r[val_col_name], (int, float)) else 0.0
                chart_series.append({"name": lbl, "value": round(float(val), 2)})
            chart_type = "line" if "month" in str(dim_col_name).lower() else "bar"
            charts.append(ChartResult(type=chart_type, title=f"{operation} by {dimension} ({measure})", series=chart_series))

    if not charts:
        charts = [ChartResult(type="bar", title=f"{operation} by {dimension}", series=[])]

    obs = generate_olap_observations(dimension, measure, df_res)

    formatted_sql = "\n".join([line.strip() for line in query_sql.strip().split("\n") if line.strip()])

    return RunResult(
        lab=2,
        status="success",
        params=params,
        tables=[TableResult(name=f"{operation} Results", columns=columns, rows=rows)],
        charts=charts,
        metrics={
            "Rows analyzed": len(rows),
            "Operation": operation,
            "Measure": measure,
            "Runtime": f"{elapsed_ms} ms",
        },
        observations=obs,
        warnings=warnings,
        sql=formatted_sql,
        meta=MetaResult(rows_used=len(rows), runtime_ms=elapsed_ms, seed=42, sql=formatted_sql)
    )
