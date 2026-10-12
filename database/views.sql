-- =============================================================================
-- DMart Data Warehouse Analytical Views
-- Target: Supabase PostgreSQL
-- =============================================================================

-- 1. Monthly Sales Performance View
CREATE OR REPLACE VIEW v_monthly_sales AS
SELECT 
    d.year,
    d.month,
    d.month_name,
    COUNT(s.sales_key) AS transaction_count,
    SUM(s.quantity) AS total_quantity,
    SUM(s.total_amount) AS total_revenue,
    ROUND(AVG(s.total_amount), 2) AS avg_transaction_value
FROM fact_sales s
JOIN dim_date d ON s.date_key = d.date_key
GROUP BY d.year, d.month, d.month_name
ORDER BY d.year, d.month;

-- 2. Category Performance View
CREATE OR REPLACE VIEW v_category_sales AS
SELECT 
    c.category_key,
    c.category_name,
    COUNT(s.sales_key) AS transaction_count,
    SUM(s.quantity) AS total_quantity,
    SUM(s.total_amount) AS total_revenue,
    ROUND(AVG(s.total_amount), 2) AS avg_transaction_value,
    ROUND((SUM(s.total_amount) * 100.0 / NULLIF((SELECT SUM(total_amount) FROM fact_sales), 0)), 2) AS revenue_share_pct
FROM fact_sales s
JOIN dim_category c ON s.category_key = c.category_key
GROUP BY c.category_key, c.category_name
ORDER BY total_revenue DESC;

-- 3. Customer Type Distribution View
CREATE OR REPLACE VIEW v_customer_type_summary AS
SELECT 
    cust.customer_type,
    COUNT(DISTINCT cust.customer_key) AS unique_customers,
    COUNT(s.sales_key) AS transaction_count,
    SUM(s.quantity) AS total_quantity,
    SUM(s.total_amount) AS total_revenue,
    ROUND(AVG(s.total_amount), 2) AS avg_ticket_size,
    ROUND((SUM(s.total_amount) * 100.0 / NULLIF((SELECT SUM(total_amount) FROM fact_sales), 0)), 2) AS revenue_share_pct
FROM fact_sales s
JOIN dim_customer cust ON s.customer_key = cust.customer_key
GROUP BY cust.customer_type
ORDER BY total_revenue DESC;

-- 4. Store Geographic Performance (Simulated Dimension)
CREATE OR REPLACE VIEW v_store_performance AS
SELECT 
    st.store_key,
    st.store_name,
    st.city,
    st.region,
    COUNT(s.sales_key) AS transaction_count,
    SUM(s.total_amount) AS total_revenue,
    ROUND(AVG(s.total_amount), 2) AS avg_order_value,
    st.is_simulated
FROM fact_sales s
JOIN dim_store st ON s.store_key = st.store_key
GROUP BY st.store_key, st.store_name, st.city, st.region, st.is_simulated
ORDER BY total_revenue DESC;
