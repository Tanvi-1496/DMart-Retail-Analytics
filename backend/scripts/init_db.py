# pyrefly: ignore [missing-import]
"""Database initialization script for DMart Retail Analytics Data Warehouse."""
import sys
import logging
from pathlib import Path

# Add project root to sys.path
BASE_DIR = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(BASE_DIR))

from backend.app.db import db_manager
from backend.app.config import settings
from backend.app.services.data_loader import audit_and_clean_csv, load_data_into_warehouse

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("dmart.init_db")

def init_database():
    logger.info("Initializing database connection...")
    db_manager.initialize()
    logger.info(f"Database type: {db_manager.db_type}")

    sample_csv = settings.resolved_data_dir / "dmart_sample_data.csv"
    if sample_csv.exists():
        cnt_res = db_manager.query_df("SELECT COUNT(*) AS total FROM fact_sales;")
        if cnt_res.empty or int(cnt_res.iloc[0]["total"]) == 0:
            logger.info(f"Seeding warehouse from {sample_csv}...")
            df, report = audit_and_clean_csv(str(sample_csv))
            res = load_data_into_warehouse(df)
            logger.info(f"Loaded {res['rows_loaded']} sales records.")
        else:
            logger.info(f"Warehouse already populated with {cnt_res.iloc[0]['total']} sales records.")

    logger.info("Warehouse Summary:")
    logger.info(db_manager.get_dw_summary())

if __name__ == "__main__":
    init_database()
