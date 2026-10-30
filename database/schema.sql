-- =============================================================================
-- DMart Retail Analytics Data Warehouse Schema
-- Target: Supabase PostgreSQL
-- Structure: Dimensional Star Schema with Fact Constellation Extension
-- =============================================================================

-- Drop in reverse dependency order if explicitly rebuilding
-- (Production safe: use IF EXISTS)

-- 1. Dimension: Date
CREATE TABLE IF NOT EXISTS dim_date (
    date_key INT PRIMARY KEY,               -- Format: YYYYMMDD
    full_date DATE NOT NULL UNIQUE,
    day INT NOT NULL CHECK (day BETWEEN 1 AND 31),
    month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
    month_name VARCHAR(15) NOT NULL,
    quarter INT NOT NULL CHECK (quarter BETWEEN 1 AND 4),
    year INT NOT NULL CHECK (year BETWEEN 2000 AND 2100),
    day_of_week VARCHAR(15) NOT NULL,
    is_weekend BOOLEAN NOT NULL DEFAULT FALSE
);

-- 2. Dimension: Customer
CREATE TABLE IF NOT EXISTS dim_customer (
    customer_key BIGSERIAL PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    customer_type VARCHAR(50) NOT NULL CHECK (customer_type IN ('Member', 'Premium', 'Regular', 'Unknown')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_customer_name_type UNIQUE (full_name, customer_type)
);

-- 3. Dimension: Category
CREATE TABLE IF NOT EXISTS dim_category (
    category_key SERIAL PRIMARY KEY,
    category_name VARCHAR(100) NOT NULL UNIQUE
);

-- 4. Dimension: City (Normalized outrigger dimension for Snowflake Schema modeling)
CREATE TABLE IF NOT EXISTS dim_city (
    city_key SERIAL PRIMARY KEY,
    city_name VARCHAR(100) NOT NULL UNIQUE,
    region VARCHAR(50) NOT NULL
);

-- 5. Dimension: Store (Simulated dimension for DWM geographic analytics)
CREATE TABLE IF NOT EXISTS dim_store (
    store_key SERIAL PRIMARY KEY,
    store_name VARCHAR(100) NOT NULL UNIQUE,
    city VARCHAR(100) NOT NULL,
    region VARCHAR(50) NOT NULL,
    city_key INT REFERENCES dim_city(city_key),
    is_simulated BOOLEAN NOT NULL DEFAULT TRUE
);

-- 5. Fact: Sales (Primary Fact Table)
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

-- 6. Fact: Inventory (Simulated Fact Constellation Table for Drill-Across practical)
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
