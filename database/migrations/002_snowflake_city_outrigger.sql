-- Migration: 002_snowflake_city_outrigger.sql
-- Description: Create normalized dim_city dimension table and link to dim_store via city_key foreign key for Snowflake Schema modeling

CREATE TABLE IF NOT EXISTS dim_city (
    city_key SERIAL PRIMARY KEY,
    city_name VARCHAR(100) NOT NULL UNIQUE,
    region VARCHAR(50) NOT NULL
);

INSERT INTO dim_city (city_name, region)
VALUES 
    ('Mumbai', 'West'),
    ('Pune', 'West'),
    ('Ahmedabad', 'West'),
    ('Bengaluru', 'South')
ON CONFLICT (city_name) DO NOTHING;

DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'dim_store' AND column_name = 'city_key'
    ) THEN 
        ALTER TABLE dim_store ADD COLUMN city_key INTEGER REFERENCES dim_city(city_key);
    END IF;
END $$;

UPDATE dim_store 
SET city_key = (SELECT city_key FROM dim_city WHERE dim_city.city_name = dim_store.city) 
WHERE city_key IS NULL;
