# pyrefly: ignore [missing-import]
import os

import glob
from pathlib import Path
# pyrefly: ignore [missing-import]
from fastapi import APIRouter, HTTPException
import pandas as pd
from ..config import settings
from ..services.data_loader import audit_and_clean_csv

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
            # Row count check (fast)
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
