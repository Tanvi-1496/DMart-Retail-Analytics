# pyrefly: ignore [missing-import]
"""One-step Supabase PostgreSQL migration and seeding script."""
import sys
import logging
from pathlib import Path

# Add project root to sys.path
BASE_DIR = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(BASE_DIR))

from backend.app.config import settings  # type: ignore
from backend.app.db import db_manager  # type: ignore
from backend.app.services.data_loader import audit_and_clean_csv, load_data_into_warehouse  # type: ignore

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("dmart.setup_supabase")

def run_migration():
    if not settings.DATABASE_URL:
        print("\n" + "!" * 70)
        print("ERROR: DATABASE_URL is not set!")
        print("Please set your Supabase connection string in backend/.env or .env:")
        print("DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres")
        print("!" * 70 + "\n")
        sys.exit(1)

    logger.info("Connecting to Supabase PostgreSQL...")
    db_manager.initialize()

    if db_manager.db_type != "supabase_postgresql":
        logger.error(f"Failed to connect to Supabase: {db_manager._connection_error}")
        sys.exit(1)

    logger.info("Applying database schemas and migrations...")
    db_dir = BASE_DIR / "database"
    sql_files = ["schema.sql", "seed_simulated.sql", "indexes.sql", "views.sql"]

    conn = db_manager._get_pg_connection()
    try:
        cur = conn.cursor()
        for f_name in sql_files:
            file_path = db_dir / f_name
            if file_path.exists():
                logger.info(f"Running {f_name}...")
                sql_content = file_path.read_text(encoding="utf-8")
                # Split and execute individual statements
                cur.execute(sql_content)
                conn.commit()
                logger.info(f"Successfully applied {f_name}.")
        cur.close()
    finally:
        conn.close()

    # Seed data
    sample_csv = settings.resolved_data_dir / "dmart_sample_data.csv"
    if sample_csv.exists():
        check_df = db_manager.query_df("SELECT COUNT(*) AS total FROM fact_sales;")
        if check_df.empty or int(check_df.iloc[0]["total"]) == 0:
            logger.info(f"Seeding Supabase warehouse with {sample_csv}...")
            df, report = audit_and_clean_csv(str(sample_csv))
            res = load_data_into_warehouse(df)
            logger.info(f"Loaded {res['rows_loaded']:,} records into Supabase!")
        else:
            logger.info(f"Supabase warehouse already has {check_df.iloc[0]['total']:,} sales records.")

    print("\n" + "=" * 60)
    print("SUPABASE SETUP COMPLETED SUCCESSFULLY!")
    print("=" * 60)
    summary = db_manager.get_dw_summary()
    for tbl, count in summary.get("table_counts", {}).items():
        print(f" - {tbl:20s}: {count:,} records")
    print("=" * 60 + "\n")

if __name__ == "__main__":
    run_migration()
