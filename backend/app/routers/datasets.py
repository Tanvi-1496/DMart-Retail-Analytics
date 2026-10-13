# pyrefly: ignore [missing-import]
import os
import glob
from pathlib import Path
# pyrefly: ignore [missing-import]
from fastapi import APIRouter, HTTPException
import pandas as pd
from ..config import settings
from ..services.data_loader import audit_and_clean_csv
from ..db import db_manager

router = APIRouter(prefix="/api/datasets", tags=["Datasets"])

@router.get("")
def list_datasets():
    data_dir = settings.resolved_data_dir
    files = glob.glob(os.path.join(str(data_dir), "*.csv"))
    datasets = []
    for f in sorted(files):
        p = Path(f)
        try:
            df_head = pd.read_csv(f, nrows=2)
            with open(f, "rb") as fp:
                line_count = sum(1 for _ in fp) - 1
            datasets.append({
                "filename": p.name,
                "path": str(p),
                "size_kb": round(p.stat().st_size / 1024, 1),
                "rows": line_count,
                "columns": list(df_head.columns),
                "status": "available",
            })
        except Exception as e:
            datasets.append({
                "filename": p.name,
                "path": str(p),
                "error": str(e),
                "status": "unreadable",
            })
    return {
        "data_directory": str(data_dir),
        "total_datasets": len(datasets),
        "datasets": datasets,
    }

@router.get("/options")
def get_filter_options():
    """Returns distinct filter choices directly from the dimensional tables."""
    try:
        cat_df = db_manager.query_df("SELECT DISTINCT category_name FROM dim_category ORDER BY category_name;")
        categories = ["All categories"] + (cat_df["category_name"].tolist() if not cat_df.empty else [])

        cust_df = db_manager.query_df("SELECT DISTINCT customer_type FROM dim_customer ORDER BY customer_type;")
        customer_types = ["All customer types"] + (cust_df["customer_type"].tolist() if not cust_df.empty else [])

        city_df = db_manager.query_df("SELECT DISTINCT city FROM dim_store ORDER BY city;")
        cities = ["All cities"] + (city_df["city"].tolist() if not city_df.empty else [])

        date_df = db_manager.query_df("SELECT MIN(full_date) AS min_d, MAX(full_date) AS max_d FROM dim_date;")
        min_date = str(date_df.iloc[0]["min_d"]) if not date_df.empty else "2024-01-01"
        max_date = str(date_df.iloc[0]["max_d"]) if not date_df.empty else "2024-12-31"

        return {
            "categories": categories,
            "customer_types": customer_types,
            "cities": cities,
            "date_range": {"min": min_date, "max": max_date},
        }
    except Exception as e:
        return {
            "categories": ["All categories", "Grocery", "Home & Kitchen", "Electronics", "Personal Care", "Beverages"],
            "customer_types": ["All customer types", "Regular", "Member", "Premium"],
            "cities": ["All cities", "Mumbai", "Pune", "Ahmedabad", "Bengaluru"],
            "date_range": {"min": "2024-01-01", "max": "2024-12-31"},
        }

@router.post("/audit")
def audit_dataset(filename: str = "dmart_sample_data.csv"):
    data_dir = settings.resolved_data_dir
    f_path = os.path.join(str(data_dir), filename)
    if not os.path.exists(f_path):
        raise HTTPException(status_code=404, detail=f"Dataset '{filename}' not found in data directory.")
    try:
        _, report = audit_and_clean_csv(f_path)
        return {"status": "success", "report": report}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
