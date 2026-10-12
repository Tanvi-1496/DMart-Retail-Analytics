-- =============================================================================
-- DMart Data Warehouse Dimension Seeding
-- Target: Supabase PostgreSQL
-- =============================================================================

-- Seed Product Categories
INSERT INTO dim_category (category_name)
VALUES 
    ('Grocery'),
    ('Home & Kitchen'),
    ('Electronics'),
    ('Clothing'),
    ('Beauty & Personal Care'),
    ('Beverages')
ON CONFLICT (category_name) DO NOTHING;

-- Seed Simulated Stores for DWM Geographic Practical
INSERT INTO dim_store (store_name, city, region, is_simulated)
VALUES 
    ('DMart Thane West', 'Mumbai', 'West', TRUE),
    ('DMart Kandivali', 'Mumbai', 'West', TRUE),
    ('DMart Kothrud', 'Pune', 'West', TRUE),
    ('DMart SG Highway', 'Ahmedabad', 'West', TRUE),
    ('DMart Whitefield', 'Bengaluru', 'South', TRUE)
ON CONFLICT (store_name) DO NOTHING;
