# pyrefly: ignore [missing-import]
from fastapi import APIRouter, HTTPException


from typing import Dict, Any, Optional
from ..services.lab_runner_service import execute_lab
from ..schemas.common import RunResult

router = APIRouter(prefix="/api/labs", tags=["Laboratories"])

LAB_CATALOG = [
    {"number": 1, "title": "Data Warehouse Design", "dataset": "DMart (Star Schema)", "technologies": "PostgreSQL, Star Schema, Fact Constellation"},
    {"number": 2, "title": "OLAP Operations", "dataset": "DMart", "technologies": "SQL, CUBE, ROLLUP, Drill-down, Slice, Dice, Pivot"},
    {"number": 3, "title": "Data Visualization", "dataset": "DMart", "technologies": "Aggregated SQL, Distributions, Scatter Sampling"},
    {"number": 4, "title": "Linear Regression", "dataset": "DMart", "technologies": "scikit-learn LinearRegression, Train/Test Split, MAE/RMSE/R²"},
    {"number": 5, "title": "Attribute Relevance + Decision Tree", "dataset": "DMart", "technologies": "Mutual Information, Entropy, DecisionTreeClassifier"},
    {"number": 6, "title": "Naive Bayes Classification", "dataset": "DMart", "technologies": "GaussianNB, Confusion Matrix, Precision/Recall/F1"},
    {"number": 7, "title": "K-Means Clustering", "dataset": "DMart", "technologies": "KMeans, StandardScaler, Elbow Method, Silhouette Score"},
    {"number": 8, "title": "Agglomerative Clustering", "dataset": "Mall Customers (200 rows)", "technologies": "SciPy AgglomerativeClustering, Dendrogram, Linkage"},
    {"number": 9, "title": "Apriori Association Rules", "dataset": "DMart (Basket Proxy)", "technologies": "mlxtend Apriori, Association Rules, Support/Confidence/Lift"},
    {"number": 10, "title": "Integrated Data Mining Pipeline", "dataset": "Lab 10 Cleaned (1,000 rows)", "technologies": "Data Preprocessing, Classification, Clustering & Association Rule Mining"},
    {"number": 11, "title": "Beijing AQI Prediction", "dataset": "Beijing AQI (1,500 rows)", "technologies": "RandomForestRegressor, Sub-index Breakpoints, Chronological Split"},
    {"number": 12, "title": "Customer Segmentation", "dataset": "Mall Customers (200 rows)", "technologies": "K-Means, Demographic Profiling, Empirical Strategy Recommendation"},
]

@router.get("")
def list_labs():
    return {"total_labs": len(LAB_CATALOG), "labs": LAB_CATALOG}

@router.get("/{lab_number}")
def get_lab_info(lab_number: int):
    for lab in LAB_CATALOG:
        if lab["number"] == lab_number:
            return lab
    raise HTTPException(status_code=404, detail=f"Lab {lab_number} not found.")

@router.post("/{lab_number}/run", response_model=RunResult)
def run_lab(lab_number: int, params: Optional[Dict[str, Any]] = None):
    try:
        return execute_lab(lab_number, params or {})
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
