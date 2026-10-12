# pyrefly: ignore [missing-import]
import os
import re

import datetime
import logging
from typing import Dict, Any, Optional, Tuple
import pandas as pd
# pyrefly: ignore [missing-import]
import numpy as np
from ..db import db_manager
from ..config import settings

logger = logging.getLogger("dmart.loader")

REQUIRED_COLUMNS = ["Date", "Time", "CustomerType", "ProductCategory", "UnitPrice", "Quantity", "Total", "FullName"]

def audit_and_clean_csv(file_path: str, max_rows: Optional[int] = None) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    """Audits the input DMart CSV, validates data integrity, and derives dimensional features."""
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Dataset file not found at: {file_path}")

    logger.info(f"Auditing DMart CSV at: {file_path}")
    df = pd.read_csv(file_path, nrows=max_rows)
    raw_row_count = len(df)

    # 1. Column matching (handle minor case/whitespace differences)
    col_map = {col.strip().lower(): col for col in df.columns}
    normalized_cols = {}
    for req in REQUIRED_COLUMNS:
        req_norm = req.lower().replace("_", "").replace(" ", "")
        matched = None
        for col in df.columns:
            if col.lower().replace("_", "").replace(" ", "") == req_norm:
                matched = col
                break
        if not matched:
            raise ValueError(f"Required column '{req}' not found in CSV. Found: {list(df.columns)}")
        normalized_cols[req] = matched

    # Rename to canonical column names
    rename_dict = {orig: can for can, orig in normalized_cols.items()}
    df = df.rename(columns=rename_dict)[REQUIRED_COLUMNS]

    # 2. Audit Missing & Duplicates
    missing_counts = df.isnull().sum().to_dict()
    duplicate_rows = int(df.duplicated().sum())

    # 3. Numeric type conversion & validation
    df["UnitPrice"] = pd.to_numeric(df["UnitPrice"], errors="coerce").fillna(0.0)
    df["Quantity"] = pd.to_numeric(df["Quantity"], errors="coerce").fillna(1).astype(int)
    df["Total"] = pd.to_numeric(df["Total"], errors="coerce").fillna(0.0)

    # Math check: Total = UnitPrice * Quantity
    calculated_total = np.round(df["UnitPrice"] * df["Quantity"], 2)
    math_discrepancies = int((np.abs(df["Total"] - calculated_total) > 0.05).sum())

    # 4. Robust Date & Time parsing
    # Handle day-first format (DD-MM-YYYY or DD/MM/YYYY)
    df["ParsedDate"] = pd.to_datetime(df["Date"], dayfirst=True, errors="coerce")
    default_date = pd.Timestamp("2024-01-01")
    df["ParsedDate"] = df["ParsedDate"].fillna(default_date)

    # Extract Date parts
    df["Year"] = df["ParsedDate"].dt.year
    df["Month"] = df["ParsedDate"].dt.month
    df["Day"] = df["ParsedDate"].dt.day
    df["Quarter"] = df["ParsedDate"].dt.quarter
    df["DayOfWeek"] = df["ParsedDate"].dt.day_name()
    df["IsWeekend"] = df["ParsedDate"].dt.weekday >= 5
    df["DateKey"] = df["Year"] * 10000 + df["Month"] * 100 + df["Day"]

    # Extract Time / Hour
    def parse_hour(val):
        try:
            s = str(val).strip()
            parts = s.split(":")
            if len(parts) >= 1:
                return int(parts[0]) % 24
        except Exception:
            pass
        return 12

    df["SaleHour"] = df["Time"].apply(parse_hour)

    # 5. Clean strings
    df["CustomerType"] = df["CustomerType"].fillna("Regular").astype(str).str.strip()
    df["ProductCategory"] = df["ProductCategory"].fillna("Grocery").astype(str).str.strip()
    df["FullName"] = df["FullName"].fillna("Customer Unknown").astype(str).str.strip()

    report = {
        "raw_row_count": raw_row_count,
        "clean_row_count": len(df),
        "columns": list(df.columns),
        "missing_counts": missing_counts,
        "duplicate_rows": duplicate_rows,
        "math_discrepancies": math_discrepancies,
        "date_range": {
            "min": str(df["ParsedDate"].min().date()),
            "max": str(df["ParsedDate"].max().date()),
        },
        "total_revenue": round(float(df["Total"].sum()), 2),
        "categories": df["ProductCategory"].value_counts().to_dict(),
        "customer_types": df["CustomerType"].value_counts().to_dict(),
    }

    return df, report

def load_data_into_warehouse(df: pd.DataFrame, batch_size: int = 5000) -> Dict[str, Any]:
    """Loads cleaned data into the dimensional star schema (Supabase or Local)."""
    logger.info(f"Loading {len(df)} records into {db_manager.db_type}...")

    # 1. Populate dim_date
    date_records = df[["DateKey", "ParsedDate", "Day", "Month", "Quarter", "Year", "DayOfWeek", "IsWeekend"]].drop_duplicates(subset=["DateKey"])
    date_tuples = []
    for _, r in date_records.iterrows():
        m_name = datetime.date(int(r["Year"]), int(r["Month"]), 1).strftime("%B")
        date_tuples.append((
            int(r["DateKey"]), str(r["ParsedDate"].date()), int(r["Day"]), int(r["Month"]),
            m_name, int(r["Quarter"]), int(r["Year"]), str(r["DayOfWeek"]), bool(r["IsWeekend"])
        ))
    db_manager.execute_batch(
        """INSERT OR IGNORE INTO dim_date (date_key, full_date, day, month, month_name, quarter, year, day_of_week, is_weekend)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);""",
        date_tuples
    )

    # 2. Populate dim_category
    cats = df["ProductCategory"].unique()
    for cat in cats:
        db_manager.execute("INSERT OR IGNORE INTO dim_category (category_name) VALUES (?);", (str(cat),))
    cat_df = db_manager.query_df("SELECT category_key, category_name FROM dim_category;")
    cat_to_key = dict(zip(cat_df["category_name"], cat_df["category_key"]))

    # 3. Populate dim_customer
    cust_records = df[["FullName", "CustomerType"]].drop_duplicates()
    cust_tuples = [(str(r["FullName"]), str(r["CustomerType"])) for _, r in cust_records.iterrows()]
    db_manager.execute_batch(
        "INSERT OR IGNORE INTO dim_customer (full_name, customer_type) VALUES (?, ?);",
        cust_tuples
    )
    cust_df = db_manager.query_df("SELECT customer_key, full_name, customer_type FROM dim_customer;")
    cust_map = {(r["full_name"], r["customer_type"]): r["customer_key"] for _, r in cust_df.iterrows()}

    # 4. Ensure dim_store has rows
    store_df = db_manager.query_df("SELECT store_key FROM dim_store;")
    if store_df.empty:
        stores = [
            ("DMart Thane West", "Mumbai", "West"),
            ("DMart Kandivali", "Mumbai", "West"),
            ("DMart Kothrud", "Pune", "West"),
            ("DMart SG Highway", "Ahmedabad", "West"),
            ("DMart Whitefield", "Bengaluru", "South"),
        ]
        for sname, city, reg in stores:
            db_manager.execute("INSERT INTO dim_store (store_name, city, region, is_simulated) VALUES (?, ?, ?, TRUE);", (sname, city, reg))
        store_df = db_manager.query_df("SELECT store_key FROM dim_store;")
    store_keys = store_df["store_key"].tolist() if not store_df.empty else [1]

    # 5. Load fact_sales in batches
    loaded_count = 0
    total_len = len(df)
    for start in range(0, total_len, batch_size):
        batch = df.iloc[start:start+batch_size]
        batch_tuples = []
        for idx, row in batch.iterrows():
            c_key = cust_map.get((row["FullName"], row["CustomerType"]), 1)
            cat_key = cat_to_key.get(row["ProductCategory"], 1)
            st_key = store_keys[idx % len(store_keys)]
            batch_tuples.append((
                int(row["DateKey"]), int(c_key), int(cat_key), int(st_key),
                str(row["Time"]), int(row["SaleHour"]), float(row["UnitPrice"]),
                int(row["Quantity"]), float(row["Total"])
            ))
        db_manager.execute_batch(
            """INSERT INTO fact_sales (date_key, customer_key, category_key, store_key, sale_time, sale_hour, unit_price, quantity, total_amount, is_simulated)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, FALSE);""",
            batch_tuples
        )
        loaded_count += len(batch)
        logger.info(f"Loaded {loaded_count}/{total_len} sales records.")

    # 6. Seed fact_inventory (simulated constellation) if empty
    inv_check = db_manager.query_df("SELECT COUNT(*) AS cnt FROM fact_inventory;")
    if inv_check.empty or inv_check.iloc[0]["cnt"] == 0:
        inv_tuples = []
        unique_dates = df["DateKey"].unique()[:30]
        for d_key in unique_dates:
            for cat_id in cat_df["category_key"].unique():
                for st_id in store_keys:
                    open_stock = int(1000 + (d_key % 300) + (cat_id * 50) + (st_id * 20))
                    received = int(200 + (cat_id * 30))
                    closed_stock = open_stock + received - int(150 + (cat_id * 20))
                    inv_tuples.append((int(d_key), int(cat_id), int(st_id), open_stock, closed_stock, received))
        db_manager.execute_batch(
            """INSERT INTO fact_inventory (date_key, category_key, store_key, opening_stock, closing_stock, stock_received, is_simulated)
               VALUES (?, ?, ?, ?, ?, ?, TRUE);""",
            inv_tuples
        )

    return {
        "status": "success",
        "rows_loaded": loaded_count,
        "warehouse_type": db_manager.db_type,
    }

