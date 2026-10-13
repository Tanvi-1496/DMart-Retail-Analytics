import logging
from typing import Dict, Any, List, Optional
from ..db import db_manager

logger = logging.getLogger("dmart.dashboard")

def get_dashboard_kpis(filters: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Computes all executive dashboard KPIs and charts directly from the warehouse with optional filters."""
    filters = filters or {}
    category = filters.get("category")
    customer_type = filters.get("customer_type")
    month = filters.get("month")
    start_date = filters.get("start_date")
    end_date = filters.get("end_date")

    where_clauses = ["1=1"]
    params: List[Any] = []

    if category and category != "All categories":
        where_clauses.append("c.category_name = ?")
        params.append(category)
    if customer_type and customer_type != "All customer types":
        where_clauses.append("cust.customer_type = ?")
        params.append(customer_type)
    if month and month != "All months":
        try:
            m_int = int(month)
            where_clauses.append("d.month = ?")
            params.append(m_int)
        except ValueError:
            pass
    if start_date:
        where_clauses.append("d.full_date >= ?")
        params.append(start_date)
    if end_date:
        where_clauses.append("d.full_date <= ?")
        params.append(end_date)

    where_sql = " AND ".join(where_clauses)
    param_tuple = tuple(params)

    try:
        # Check sales summary with joins
        count_sql = f"""
            SELECT COUNT(*) AS total_txns,
                   SUM(s.total_amount) AS total_rev,
                   AVG(s.total_amount) AS avg_ticket,
                   SUM(s.quantity) AS total_qty
            FROM fact_sales s
            JOIN dim_category c ON s.category_key = c.category_key
            JOIN dim_customer cust ON s.customer_key = cust.customer_key
            JOIN dim_date d ON s.date_key = d.date_key
            WHERE {where_sql};
        """
        count_res = db_manager.query_df(count_sql, param_tuple)
        if count_res.empty or int(count_res.iloc[0]["total_txns"] or 0) == 0:
            return _empty_dashboard()

        row = count_res.iloc[0]
        total_txns = int(row["total_txns"] or 0)
        total_rev = float(row["total_rev"] or 0.0)
        avg_ticket = round(float(row["avg_ticket"] or 0.0), 2)
        total_qty = int(row["total_qty"] or 0)

        # Unique customers
        cust_sql = f"""
            SELECT COUNT(DISTINCT s.customer_key) AS unique_custs
            FROM fact_sales s
            JOIN dim_category c ON s.category_key = c.category_key
            JOIN dim_customer cust ON s.customer_key = cust.customer_key
            JOIN dim_date d ON s.date_key = d.date_key
            WHERE {where_sql};
        """
        cust_res = db_manager.query_df(cust_sql, param_tuple)
        unique_custs = int(cust_res.iloc[0]["unique_custs"]) if not cust_res.empty else 0

        # Top category
        top_cat_sql = f"""
            SELECT c.category_name, SUM(s.total_amount) as rev
            FROM fact_sales s
            JOIN dim_category c ON s.category_key = c.category_key
            JOIN dim_customer cust ON s.customer_key = cust.customer_key
            JOIN dim_date d ON s.date_key = d.date_key
            WHERE {where_sql}
            GROUP BY c.category_name
            ORDER BY rev DESC LIMIT 1;
        """
        top_cat_res = db_manager.query_df(top_cat_sql, param_tuple)
        top_cat_name = str(top_cat_res.iloc[0]["category_name"]) if not top_cat_res.empty else "N/A"
        top_cat_rev = float(top_cat_res.iloc[0]["rev"]) if not top_cat_res.empty else 0.0
        top_cat_pct = round((top_cat_rev / total_rev * 100), 1) if total_rev > 0 else 0.0

        # Format KPI values
        rev_cr = f"₹{total_rev / 10000000:.2f} Cr" if total_rev >= 10000000 else f"₹{total_rev:,.0f}"

        kpis = [
            {"label": "Total Revenue", "value": rev_cr, "change": f"Filtered revenue · {total_txns:,} txns", "trend": "up"},
            {"label": "Transactions", "value": f"{total_txns:,}", "change": "Verified warehouse records", "trend": "up"},
            {"label": "Avg Transaction Value", "value": f"₹{avg_ticket:,.0f}", "change": "Per order average", "trend": "up"},
            {"label": "Total Quantity", "value": f"{total_qty / 1000000:.2f}M" if total_qty >= 1000000 else f"{total_qty:,}", "change": "Units sold across orders", "trend": "up"},
            {"label": "Unique Customers", "value": f"{unique_custs:,}", "change": "Distinct shopper entities", "trend": "up"},
            {"label": "Top Category", "value": top_cat_name, "change": f"{top_cat_pct}% of filtered revenue", "trend": "neutral"},
        ]

        # Monthly Revenue series
        month_sql = f"""
            SELECT d.month, d.month_name, SUM(s.total_amount) as rev
            FROM fact_sales s
            JOIN dim_category c ON s.category_key = c.category_key
            JOIN dim_customer cust ON s.customer_key = cust.customer_key
            JOIN dim_date d ON s.date_key = d.date_key
            WHERE {where_sql}
            GROUP BY d.month, d.month_name
            ORDER BY d.month;
        """
        month_res = db_manager.query_df(month_sql, param_tuple)
        monthly_revenue = []
        if not month_res.empty:
            for _, r in month_res.iterrows():
                val_cr = round(float(r["rev"]) / 10000000, 2)
                short_m = str(r["month_name"])[:3]
                monthly_revenue.append({"name": short_m, "value": val_cr if val_cr > 0 else round(float(r["rev"]) / 1000, 1)})

        # Category Revenue series
        cat_sql = f"""
            SELECT c.category_name, SUM(s.total_amount) as rev
            FROM fact_sales s
            JOIN dim_category c ON s.category_key = c.category_key
            JOIN dim_customer cust ON s.customer_key = cust.customer_key
            JOIN dim_date d ON s.date_key = d.date_key
            WHERE {where_sql}
            GROUP BY c.category_name
            ORDER BY rev DESC;
        """
        cat_res = db_manager.query_df(cat_sql, param_tuple)
        category_revenue = []
        for _, r in cat_res.iterrows():
            val = round(float(r["rev"]) / 10000000, 2) if total_rev >= 10000000 else round(float(r["rev"]), 2)
            category_revenue.append({"name": str(r["category_name"]), "value": val})

        # Customer Types series
        cust_type_sql = f"""
            SELECT cust.customer_type, COUNT(s.sales_key) as txns
            FROM fact_sales s
            JOIN dim_category c ON s.category_key = c.category_key
            JOIN dim_customer cust ON s.customer_key = cust.customer_key
            JOIN dim_date d ON s.date_key = d.date_key
            WHERE {where_sql}
            GROUP BY cust.customer_type;
        """
        cust_type_res = db_manager.query_df(cust_type_sql, param_tuple)
        customer_types = []
        for _, r in cust_type_res.iterrows():
            pct = round((r["txns"] / total_txns * 100), 1) if total_txns > 0 else 0
            customer_types.append({"name": str(r["customer_type"]), "value": pct})

        # Top 10 Customers
        top_cust_sql = f"""
            SELECT cust.full_name, cust.customer_type, COUNT(s.sales_key) as txns, SUM(s.total_amount) as rev, AVG(s.total_amount) as avg_val
            FROM fact_sales s
            JOIN dim_category c ON s.category_key = c.category_key
            JOIN dim_customer cust ON s.customer_key = cust.customer_key
            JOIN dim_date d ON s.date_key = d.date_key
            WHERE {where_sql}
            GROUP BY cust.customer_key, cust.full_name, cust.customer_type
            ORDER BY rev DESC
            LIMIT 10;
        """
        top_cust_res = db_manager.query_df(top_cust_sql, param_tuple)
        top_customers = []
        for i, (_, r) in enumerate(top_cust_res.iterrows()):
            top_customers.append({
                "rank": i + 1,
                "customer_id": str(r["full_name"]),
                "type": str(r["customer_type"]),
                "transactions": int(r["txns"]),
                "revenue": f"₹{float(r['rev']):,.0f}",
                "avg_value": f"₹{float(r['avg_val']):,.0f}",
            })

        return {
            "kpis": kpis,
            "monthlyRevenue": monthly_revenue,
            "categoryRevenue": category_revenue,
            "customerTypes": customer_types,
            "topCustomers": top_customers,
        }

    except Exception as e:
        logger.exception(f"Error computing dashboard: {e}")
        return _empty_dashboard()

def _empty_dashboard():
    return {
        "kpis": [
            {"label": "Total Revenue", "value": "₹0", "change": "No matching records found", "trend": "neutral"},
            {"label": "Transactions", "value": "0", "change": "No records for selected filter", "trend": "neutral"},
            {"label": "Avg Transaction Value", "value": "₹0", "change": "N/A", "trend": "neutral"},
            {"label": "Total Quantity", "value": "0", "change": "N/A", "trend": "neutral"},
            {"label": "Unique Customers", "value": "0", "change": "N/A", "trend": "neutral"},
            {"label": "Top Category", "value": "N/A", "change": "N/A", "trend": "neutral"},
        ],
        "monthlyRevenue": [],
        "categoryRevenue": [],
        "customerTypes": [],
        "topCustomers": [],
    }
