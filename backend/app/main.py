import os
import logging
from contextlib import asynccontextmanager
# pyrefly: ignore [missing-import]
from fastapi import FastAPI
# pyrefly: ignore [missing-import]
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from .db import db_manager
from .services.data_loader import audit_and_clean_csv, load_data_into_warehouse

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("dmart.app")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup sequence
    logger.info("Initializing DMart Analytics database connection...")
    db_manager.initialize()

    if settings.SEED_ON_STARTUP:
        try:
            # Check if warehouse has records
            cnt_res = db_manager.query_df("SELECT COUNT(*) AS total FROM fact_sales;")
            if cnt_res.empty or int(cnt_res.iloc[0]["total"]) == 0:
                sample_csv = os.path.join(str(settings.resolved_data_dir), "dmart_sample_data.csv")
                if os.path.exists(sample_csv):
                    logger.info(f"Auto-seeding warehouse from: {sample_csv}")
                    df, rep = audit_and_clean_csv(sample_csv)
                    load_data_into_warehouse(df)
                    logger.info("Warehouse successfully seeded.")
        except Exception as e:
            logger.warning(f"Auto-seeding check encountered an issue: {e}")

    yield

    # Shutdown sequence
    logger.info("DMart Analytics backend shutting down.")

app = FastAPI(
    title="DMart Retail Analytics API",
    description="Data Warehousing & Data Mining (DWM) backend powering OLAP operations and Practical Labs 1-12",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS configuration
origins = [o.strip() for o in settings.FRONTEND_ORIGIN.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
from .routers import health, datasets, dashboard, exploration, olap, visualization, insights, prediction, segmentation, market_basket, labs

app.include_router(health.router)
app.include_router(datasets.router)
app.include_router(dashboard.router)
app.include_router(exploration.router)
app.include_router(olap.router)
app.include_router(visualization.router)
app.include_router(insights.router)
app.include_router(prediction.router)
app.include_router(segmentation.router)
app.include_router(market_basket.router)
app.include_router(labs.router)

@app.get("/")
def root():
    return {
        "message": "DMart Retail Analytics DWM Backend is running.",
        "documentation": "/docs",
        "health": "/api/health",
    }
