-- Migration: 001_initial_schema.sql
-- Description: Create star schema tables, indexes, views, and initial seed data

-- 1. Tables
CREATE TABLE IF NOT EXISTS dim_date (
    date_key INT PRIMARY KEY,
    full_date DATE NOT NULL UNIQUE,
    day INT NOT NULL CHECK (day BETWEEN 1 AND 31),
    month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
    month_name VARCHAR(15) NOT NULL,
    quarter INT NOT NULL CHECK (quarter BETWEEN 1 AND 4),
    year INT NOT NULL CHECK (year BETWEEN 2000 AND 2100),
    day_of_week VARCHAR(15) NOT NULL,
    is_weekend BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS dim_customer (
    customer_key BIGSERIAL PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    customer_type VARCHAR(50) NOT NULL CHECK (customer_type IN ('Member', 'Premium', 'Regular', 'Unknown')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_customer_name_type UNIQUE (full_name, customer_type)
);

CREATE TABLE IF NOT EXISTS dim_category (
    category_key SERIAL PRIMARY KEY,
    category_name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS dim_store (
    store_key SERIAL PRIMARY KEY,
    store_name VARCHAR(100) NOT NULL UNIQUE,
    city VARCHAR(100) NOT NULL,
    region VARCHAR(50) NOT NULL,
    is_simulated BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS fact_sales (
    sales_key BIGSERIAL PRIMARY KEY,
    date_key INT NOT NULL REFERENCES dim_date(date_key),
    customer_key BIGINT NOT NULL REFERENCES dim_customer(customer_key),
    category_key INT NOT NULL REFERENCES dim_category(category_key),
    store_key INT NOT NULL REFERENCES dim_store(store_key),
    sale_time TIME,
    sale_hour INT CHECK (sale_hour BETWEEN 0 AND 23),
    unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0),
    quantity INT NOT NULL CHECK (quantity > 0),
    total_amount NUMERIC(12, 2) NOT NULL CHECK (total_amount >= 0),
    is_simulated BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS fact_inventory (
    inventory_key BIGSERIAL PRIMARY KEY,
    date_key INT NOT NULL REFERENCES dim_date(date_key),
    category_key INT NOT NULL REFERENCES dim_category(category_key),
    store_key INT NOT NULL REFERENCES dim_store(store_key),
    opening_stock INT NOT NULL CHECK (opening_stock >= 0),
    closing_stock INT NOT NULL CHECK (closing_stock >= 0),
    stock_received INT NOT NULL CHECK (stock_received >= 0),
    is_simulated BOOLEAN NOT NULL DEFAULT TRUE
);

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_fact_sales_date ON fact_sales(date_key);
CREATE INDEX IF NOT EXISTS idx_fact_sales_customer ON fact_sales(customer_key);
CREATE INDEX IF NOT EXISTS idx_fact_sales_category ON fact_sales(category_key);
CREATE INDEX IF NOT EXISTS idx_fact_sales_store ON fact_sales(store_key);
CREATE INDEX IF NOT EXISTS idx_fact_sales_cat_date ON fact_sales(category_key, date_key);
CREATE INDEX IF NOT EXISTS idx_dim_customer_type ON dim_customer(customer_type);

-- 3. Views
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

-- 4. Initial Seed
INSERT INTO dim_category (category_name)
VALUES ('Grocery'), ('Home & Kitchen'), ('Electronics'), ('Clothing'), ('Beauty & Personal Care'), ('Beverages')
ON CONFLICT (category_name) DO NOTHING;

INSERT INTO dim_store (store_name, city, region, is_simulated)
VALUES 
    ('DMart Thane West', 'Mumbai', 'West', TRUE),
    ('DMart Kandivali', 'Mumbai', 'West', TRUE),
    ('DMart Kothrud', 'Pune', 'West', TRUE),
    ('DMart SG Highway', 'Ahmedabad', 'West', TRUE),
    ('DMart Whitefield', 'Bengaluru', 'South', TRUE)
ON CONFLICT (store_name) DO NOTHING;
