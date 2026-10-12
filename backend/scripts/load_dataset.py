# pyrefly: ignore [missing-import]
"""CLI dataset loader and audit utility for DMart Retail Analytics Data Warehouse."""
import os
import sys
import argparse
import logging
from pathlib import Path

# Add project root to sys.path
BASE_DIR = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(BASE_DIR))

from backend.app.db import db_manager  # type: ignore
from backend.app.config import settings  # type: ignore
from backend.app.services.data_loader import audit_and_clean_csv, load_data_into_warehouse  # type: ignore

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("dmart.load_dataset")

def main():
    parser = argparse.ArgumentParser(description="Load and audit DMart transaction datasets into the warehouse.")
    parser.add_argument(
        "--csv",
        type=str,
        default=str(settings.resolved_data_dir / "dmart_sample_data.csv"),
        help="Path to the DMart transactions CSV file."
    )
    parser.add_argument(
        "--audit-only",
        action="store_true",
        help="Run audit and validation checks without loading data into the warehouse."
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=5000,
        help="Batch size for database transactional insertions."
    )
    args = parser.parse_args()

    csv_path = Path(args.csv).resolve()
    if not csv_path.exists():
        logger.error(f"Error: CSV file not found at: {csv_path}")
        sys.exit(1)

    logger.info(f"Auditing DMart CSV file: {csv_path}")
    df, report = audit_and_clean_csv(str(csv_path))

    print("\n" + "=" * 60)
    print("DMART DATASET AUDIT REPORT")
    print("=" * 60)
    print(f"Total Raw Rows:        {report['raw_row_count']:,}")
    print(f"Cleaned Valid Rows:    {report['clean_row_count']:,}")
    print(f"Duplicate Rows:        {report['duplicate_rows']}")
    print(f"Math Discrepancies:    {report['math_discrepancies']} (UnitPrice * Quantity != Total)")
    print(f"Date Range:            {report['date_range']['min']} to {report['date_range']['max']}")
    print(f"Total Revenue:         Rs. {report['total_revenue']:,.2f}")
    print(f"Product Categories:    {list(report['categories'].keys())}")
    print(f"Customer Types:        {report['customer_types']}")
    print("=" * 60 + "\n")

    if args.audit_only:
        logger.info("Audit-only flag provided. Skipping warehouse insertion.")
        return

    logger.info("Connecting to Data Warehouse...")
    db_manager.initialize()
    logger.info(f"Active Warehouse Engine: {db_manager.db_type}")

    logger.info(f"Ingesting {len(df):,} records into warehouse (batch size: {args.batch_size})...")
    load_result = load_data_into_warehouse(df, batch_size=args.batch_size)
    logger.info(f"Ingestion completed successfully! Rows loaded: {load_result['rows_loaded']:,}")

    summary = db_manager.get_dw_summary()
    print("\n" + "=" * 60)
    print("WAREHOUSE POST-LOAD SUMMARY")
    print("=" * 60)
    for tbl, count in summary.get("table_counts", {}).items():
        print(f" - {tbl:20s}: {count:,} records")
    print("=" * 60 + "\n")

if __name__ == "__main__":
    main()
