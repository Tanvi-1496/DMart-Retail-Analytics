-- =============================================================================
-- DMart Data Warehouse Indexes for High-Performance OLAP and Aggregations
-- Target: Supabase PostgreSQL
-- =============================================================================

-- Indexes on Fact Sales foreign keys
CREATE INDEX IF NOT EXISTS idx_fact_sales_date ON fact_sales(date_key);
CREATE INDEX IF NOT EXISTS idx_fact_sales_customer ON fact_sales(customer_key);
CREATE INDEX IF NOT EXISTS idx_fact_sales_category ON fact_sales(category_key);
CREATE INDEX IF NOT EXISTS idx_fact_sales_store ON fact_sales(store_key);

-- Composite indexes for high-frequency analytical queries
CREATE INDEX IF NOT EXISTS idx_fact_sales_cat_date ON fact_sales(category_key, date_key);
CREATE INDEX IF NOT EXISTS idx_fact_sales_store_date ON fact_sales(store_key, date_key);
CREATE INDEX IF NOT EXISTS idx_fact_sales_date_amount ON fact_sales(date_key, total_amount);

-- Indexes on Dimensions
CREATE INDEX IF NOT EXISTS idx_dim_date_month_year ON dim_date(year, month);
CREATE INDEX IF NOT EXISTS idx_dim_customer_type ON dim_customer(customer_type);
CREATE INDEX IF NOT EXISTS idx_dim_category_name ON dim_category(category_name);
CREATE INDEX IF NOT EXISTS idx_dim_store_city ON dim_store(city);

-- Indexes on Fact Inventory
CREATE INDEX IF NOT EXISTS idx_fact_inv_date_cat ON fact_inventory(date_key, category_key);
CREATE INDEX IF NOT EXISTS idx_fact_inv_store ON fact_inventory(store_key);
