# pyrefly: ignore [missing-import]
import os
import sqlite3
import logging
from typing import Optional, List, Dict, Any, Tuple
import pandas as pd
from .config import settings

import ssl
from urllib.parse import urlparse
import importlib

psycopg: Any = None
try:
    psycopg = importlib.import_module("psycopg")
except Exception:
    psycopg = None

pg8000: Any = None
try:
    pg8000 = importlib.import_module("pg8000.dbapi")
except Exception:
    pg8000 = None

logger = logging.getLogger("dmart.db")


class DatabaseManager:
    def __init__(self):
        self.db_type = "uninitialized"
        self._pg_pool = None
        self._sqlite_path = os.path.join(str(settings.resolved_data_dir), "warehouse.db")
        self._is_connected = False
        self._connection_error = None

    def _get_pg_connection(self):
        """Returns a PostgreSQL connection using psycopg if available, or pg8000 pure-Python driver."""
        if not settings.DATABASE_URL:
            raise ValueError("DATABASE_URL is not set.")
        if psycopg is not None:
            try:
                return psycopg.connect(settings.DATABASE_URL, connect_timeout=5)
            except Exception:
                pass
        if pg8000 is not None:
            parsed = urlparse(settings.DATABASE_URL)
            ssl_ctx = ssl.create_default_context()
            ssl_ctx.check_hostname = False
            ssl_ctx.verify_mode = ssl.CERT_NONE
            return pg8000.connect(
                user=parsed.username or "postgres",
                password=parsed.password or "",
                host=parsed.hostname or "127.0.0.1",
                port=parsed.port or 5432,
                database=parsed.path.lstrip("/") or "postgres",
                ssl_context=ssl_ctx,
                timeout=60,
            )
        raise RuntimeError("No working PostgreSQL driver found. Please install pg8000 or psycopg.")

    def initialize(self):
        """Initializes database connection to Supabase or sets up local warehouse fallback."""
        if settings.DATABASE_URL:
            try:
                conn = self._get_pg_connection()
                try:
                    cur = conn.cursor()
                    cur.execute("SELECT 1;")
                    cur.close()
                finally:
                    conn.close()
                self.db_type = "supabase_postgresql"
                self._is_connected = True
                self._connection_error = None
                logger.info("Successfully connected to Supabase PostgreSQL warehouse.")
                return

            except Exception as e:
                self._connection_error = str(e)
                logger.warning(f"Failed to connect to Supabase PostgreSQL: {e}. Falling back to local warehouse.")

        # Fallback to local SQLite dimensional warehouse
        self.db_type = "local_warehouse"
        self._init_local_warehouse()
        self._is_connected = True

    def _init_local_warehouse(self):
        """Ensures local SQLite database has star schema tables created."""
        os.makedirs(str(settings.resolved_data_dir), exist_ok=True)

        conn = sqlite3.connect(self._sqlite_path)
        cur = conn.cursor()

        # Date dimension
        cur.execute("""
        CREATE TABLE IF NOT EXISTS dim_date (
            date_key INTEGER PRIMARY KEY,
            full_date TEXT NOT NULL UNIQUE,
            day INTEGER NOT NULL,
            month INTEGER NOT NULL,
            month_name TEXT NOT NULL,
            quarter INTEGER NOT NULL,
            year INTEGER NOT NULL,
            day_of_week TEXT NOT NULL,
            is_weekend INTEGER NOT NULL DEFAULT 0
        );
        """)

        # Customer dimension
        cur.execute("""
        CREATE TABLE IF NOT EXISTS dim_customer (
            customer_key INTEGER PRIMARY KEY AUTOINCREMENT,
            full_name TEXT NOT NULL,
            customer_type TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE (full_name, customer_type)
        );
        """)

        # Category dimension
        cur.execute("""
        CREATE TABLE IF NOT EXISTS dim_category (
            category_key INTEGER PRIMARY KEY AUTOINCREMENT,
            category_name TEXT NOT NULL UNIQUE
        );
        """)

        # Store dimension (simulated)
        cur.execute("""
        CREATE TABLE IF NOT EXISTS dim_store (
            store_key INTEGER PRIMARY KEY AUTOINCREMENT,
            store_name TEXT NOT NULL UNIQUE,
            city TEXT NOT NULL,
            region TEXT NOT NULL,
            is_simulated INTEGER NOT NULL DEFAULT 1
        );
        """)

        # Fact Sales
        cur.execute("""
        CREATE TABLE IF NOT EXISTS fact_sales (
            sales_key INTEGER PRIMARY KEY AUTOINCREMENT,
            date_key INTEGER NOT NULL,
            customer_key INTEGER NOT NULL,
            category_key INTEGER NOT NULL,
            store_key INTEGER NOT NULL,
            sale_time TEXT,
            sale_hour INTEGER,
            unit_price REAL NOT NULL,
            quantity INTEGER NOT NULL,
            total_amount REAL NOT NULL,
            is_simulated INTEGER NOT NULL DEFAULT 0,
            FOREIGN KEY (date_key) REFERENCES dim_date(date_key),
            FOREIGN KEY (customer_key) REFERENCES dim_customer(customer_key),
            FOREIGN KEY (category_key) REFERENCES dim_category(category_key),
            FOREIGN KEY (store_key) REFERENCES dim_store(store_key)
        );
        """)

        # Fact Inventory (Simulated)
        cur.execute("""
        CREATE TABLE IF NOT EXISTS fact_inventory (
            inventory_key INTEGER PRIMARY KEY AUTOINCREMENT,
            date_key INTEGER NOT NULL,
            category_key INTEGER NOT NULL,
            store_key INTEGER NOT NULL,
            opening_stock INTEGER NOT NULL,
            closing_stock INTEGER NOT NULL,
            stock_received INTEGER NOT NULL,
            is_simulated INTEGER NOT NULL DEFAULT 1
        );
        """)

        # Seed categories if empty
        cur.execute("SELECT COUNT(*) FROM dim_category;")
        if cur.fetchone()[0] == 0:
            for cat in ["Grocery", "Home & Kitchen", "Electronics", "Clothing", "Beauty & Personal Care", "Beverages"]:
                cur.execute("INSERT OR IGNORE INTO dim_category (category_name) VALUES (?);", (cat,))

        # Seed stores if empty
        cur.execute("SELECT COUNT(*) FROM dim_store;")
        if cur.fetchone()[0] == 0:
            stores = [
                ("DMart Thane West", "Mumbai", "West"),
                ("DMart Kandivali", "Mumbai", "West"),
                ("DMart Kothrud", "Pune", "West"),
                ("DMart SG Highway", "Ahmedabad", "West"),
                ("DMart Whitefield", "Bengaluru", "South"),
            ]
            for sname, city, reg in stores:
                cur.execute("INSERT OR IGNORE INTO dim_store (store_name, city, region, is_simulated) VALUES (?, ?, ?, 1);", (sname, city, reg))

        conn.commit()
        conn.close()

    def get_status(self) -> Dict[str, Any]:
        return {
            "status": "connected" if self._is_connected else "disconnected",
            "warehouse_type": self.db_type,
            "has_supabase_url": bool(settings.DATABASE_URL),
            "connection_error": self._connection_error,
        }

    def query_df(self, query: str, params: Optional[Any] = None) -> pd.DataFrame:
        """Executes a SELECT query and returns a pandas DataFrame."""
        import re
        import warnings
        param_list = list(params) if params is not None else None
        if self.db_type == "supabase_postgresql":
            conn = self._get_pg_connection()
            try:
                pg_query = query.replace("?", "%s")
                with warnings.catch_warnings():
                    warnings.filterwarnings("ignore", category=UserWarning, module="pandas")
                    df = pd.read_sql_query(pg_query, conn, params=param_list)
            finally:
                conn.close()
        else:
            conn = sqlite3.connect(self._sqlite_path)
            try:
                # Replace Postgres specific ILIKE with LIKE if needed
                compat_query = query.replace("ILIKE", "LIKE")
                df = pd.read_sql_query(compat_query, conn, params=param_list)
            finally:
                conn.close()

        # In PostgreSQL queries, restore original column alias casing
        # (e.g. AS UnitPrice -> 'UnitPrice' instead of postgres default lowercase 'unitprice')
        # to ensure seamless cross-warehouse compatibility across all analytical services.
        if not df.empty:
            alias_matches = re.findall(r'(?i)\bAS\s+([A-Za-z0-9_]+)\b', query)
            if alias_matches:
                alias_map = {a.lower(): a for a in alias_matches}
                df.columns = [alias_map.get(str(c).lower(), c) for c in df.columns]

        return df

    def execute(self, query: str, params: Optional[Tuple] = None) -> int:
        """Executes an INSERT/UPDATE/DELETE statement."""
        if self.db_type == "supabase_postgresql":
            conn = self._get_pg_connection()
            try:
                cur = conn.cursor()
                pg_query = query.replace("INSERT OR IGNORE INTO", "INSERT INTO").replace("?", "%s")
                if "INSERT INTO" in pg_query and "ON CONFLICT" not in pg_query:
                    pg_query = pg_query.rstrip("; \t\n") + " ON CONFLICT DO NOTHING;"
                cur.execute(pg_query, list(params) if params else ())
                conn.commit()
                rowcount = cur.rowcount
                cur.close()
                return rowcount
            finally:
                conn.close()
        else:
            conn = sqlite3.connect(self._sqlite_path)
            try:
                cur = conn.cursor()
                cur.execute(query, params or ())
                conn.commit()
                return cur.rowcount
            finally:
                conn.close()

    def execute_batch(self, query: str, params_list: List[Tuple]) -> int:
        """Executes a batch of parameter tuples within a single transaction for ultra-high throughput."""
        if not params_list:
            return 0
        if self.db_type == "supabase_postgresql":
            conn = self._get_pg_connection()
            try:
                cur = conn.cursor()
                clean_q = query.strip()
                if "VALUES" in clean_q.upper() and ("?" in clean_q or "%s" in clean_q):
                    v_idx = clean_q.upper().index("VALUES")
                    prefix = clean_q[:v_idx + 6].strip().replace("INSERT OR IGNORE INTO", "INSERT INTO")
                    after_values = clean_q[v_idx + 6:].strip().rstrip("; \t\n")
                    row_template = after_values.replace("?", "%s")
                    
                    chunk_size = 250
                    for i in range(0, len(params_list), chunk_size):
                        chunk = params_list[i:i+chunk_size]
                        flat_params = []
                        val_clauses = []
                        for row in chunk:
                            val_clauses.append(row_template)
                            flat_params.extend(row)
                        full_sql = f"{prefix} {','.join(val_clauses)}"
                        if "ON CONFLICT" not in full_sql:
                            full_sql += " ON CONFLICT DO NOTHING;"
                        cur.execute(full_sql, flat_params)
                    conn.commit()
                else:
                    pg_query = clean_q.replace("INSERT OR IGNORE INTO", "INSERT INTO").replace("?", "%s")
                    if "INSERT INTO" in pg_query and "ON CONFLICT" not in pg_query:
                        pg_query = pg_query.rstrip("; \t\n") + " ON CONFLICT DO NOTHING;"
                    cur.executemany(pg_query, params_list)
                    conn.commit()
                cur.close()
                return len(params_list)
            finally:
                conn.close()

        else:
            conn = sqlite3.connect(self._sqlite_path)
            try:
                cur = conn.cursor()
                cur.execute("BEGIN TRANSACTION;")
                cur.executemany(query, params_list)
                conn.commit()
                return len(params_list)
            finally:
                conn.close()

    def get_tables(self) -> List[str]:

        """Returns list of warehouse tables."""
        whitelist = ["dim_date", "dim_customer", "dim_category", "dim_store", "fact_sales", "fact_inventory"]
        try:
            if self.db_type == "supabase_postgresql":
                df = self.query_df("SELECT table_name FROM information_schema.tables WHERE table_schema='public';")
                return [t for t in df["table_name"].tolist() if t in whitelist]
            else:
                df = self.query_df("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';")
                return [t for t in df["name"].tolist() if t in whitelist]
        except Exception:
            return whitelist

    def get_table_schema(self, table_name: str) -> List[Dict[str, Any]]:
        """Returns column definitions for the specified table."""
        whitelist = ["dim_date", "dim_customer", "dim_category", "dim_store", "fact_sales", "fact_inventory"]
        if table_name not in whitelist:
            raise ValueError(f"Table '{table_name}' is not an authorized warehouse table.")
        try:
            if self.db_type == "supabase_postgresql":
                df = self.query_df(f"""
                    SELECT column_name, data_type, is_nullable
                    FROM information_schema.columns
                    WHERE table_name = '{table_name}';
                """)
                return df.to_dict(orient="records")
            else:
                conn = sqlite3.connect(self._sqlite_path)
                cur = conn.cursor()
                cur.execute(f"PRAGMA table_info({table_name});")
                rows = cur.fetchall()
                conn.close()
                return [{"column_name": r[1], "data_type": r[2], "is_nullable": "YES" if r[3] == 0 else "NO"} for r in rows]
        except Exception as e:
            logger.error(f"Error fetching table schema: {e}")
            return []

    def get_table_sample(self, table_name: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Returns sample records for a table."""
        whitelist = ["dim_date", "dim_customer", "dim_category", "dim_store", "fact_sales", "fact_inventory"]
        if table_name not in whitelist:
            raise ValueError(f"Table '{table_name}' is not an authorized warehouse table.")
        safe_limit = min(max(1, limit), 100)
        df = self.query_df(f"SELECT * FROM {table_name} LIMIT {safe_limit};")
        return df.to_dict(orient="records")

    def get_dw_summary(self) -> Dict[str, Any]:
        """Returns dimensional warehouse summary stats."""
        counts = {}
        for t in self.get_tables():
            try:
                res = self.query_df(f"SELECT COUNT(*) AS cnt FROM {t};")
                counts[t] = int(res.iloc[0]["cnt"]) if not res.empty else 0
            except Exception:
                counts[t] = 0
        return {
            "warehouse_type": self.db_type,
            "status": "connected" if self._is_connected else "disconnected",
            "table_counts": counts,
            "architecture": "Star Schema with Fact Constellation extension",
            "simulated_dimensions": ["dim_store (city, region)", "fact_inventory (opening_stock, closing_stock)"],
        }

db_manager = DatabaseManager()

