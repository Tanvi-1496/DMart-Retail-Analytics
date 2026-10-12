# pyrefly: ignore [missing-import]
import time
import logging
from typing import Dict, Any, List
import numpy as np  # type: ignore
import pandas as pd  # type: ignore

from sklearn.naive_bayes import GaussianNB
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_recall_fscore_support, confusion_matrix
from ..db import db_manager
from ..schemas.common import RunResult, TableResult, ChartResult, MetaResult

logger = logging.getLogger("dmart.naive_bayes")

def run_naive_bayes_analysis(params: Dict[str, Any]) -> RunResult:
    """Executes Gaussian Naive Bayes classification for customer type or spend category."""
    start_time = time.time()
    test_size = float(params.get("test", params.get("test_size", 0.2)))
    test_size = min(max(test_size, 0.1), 0.5)
    sample_limit = int(params.get("sample", 50000))
    sample_limit = min(max(sample_limit, 500), 100000)

    # 1. Fetch data from warehouse
    query = f"""
        SELECT s.unit_price AS UnitPrice, s.quantity AS Quantity,
               c.category_name AS Category, cust.customer_type AS CustomerType
        FROM fact_sales s
        JOIN dim_category c ON s.category_key = c.category_key
        JOIN dim_customer cust ON s.customer_key = cust.customer_key
        LIMIT {sample_limit};
    """
    df = db_manager.query_df(query)
    if df.empty:
        raise ValueError("No records available in warehouse for Naive Bayes classification.")

    # 2. Build feature matrix and target
    target = df["CustomerType"]
    X = pd.DataFrame()
    X["UnitPrice"] = df["UnitPrice"]
    X["Quantity"] = df["Quantity"]

    # Frequency-encode or dummy encode Category
    cat_dummies = pd.get_dummies(df["Category"], prefix="Cat", drop_first=True, dtype=float)
    X = pd.concat([X, cat_dummies], axis=1)

    # 3. Train/test split with stratification
    X_train, X_test, y_train, y_test = train_test_split(X, target, test_size=test_size, random_state=42, stratify=target)

    # 4. Fit Gaussian Naive Bayes
    gnb = GaussianNB()
    gnb.fit(X_train, y_train)

    # 5. Evaluate
    y_pred = gnb.predict(X_test)
    acc = float(accuracy_score(y_test, y_pred))
    prec, rec, f1, _ = precision_recall_fscore_support(y_test, y_pred, average="weighted", zero_division=0)

    # 6. Confusion Matrix Table
    classes = sorted(list(set(target)))
    cm = confusion_matrix(y_test, y_pred, labels=classes)
    cm_rows = []
    for i, actual_cls in enumerate(classes):
        row = {"Actual Class": actual_cls}
        for j, pred_cls in enumerate(classes):
            row[f"Pred: {pred_cls}"] = int(cm[i][j])
        cm_rows.append(row)

    cm_cols = ["Actual Class"] + [f"Pred: {c}" for c in classes]

    # Chart representation: Class prior probabilities
    class_priors = []
    for cls_name, prior in zip(gnb.classes_, gnb.class_prior_):
        class_priors.append({"name": str(cls_name), "value": round(float(prior) * 100, 1)})

    prior_str = ", ".join([f"{cp['name']}: {cp['value']}%" for cp in class_priors])
    obs = [
        f"Trained Gaussian Naive Bayes across {len(X_train):,} training records with independent Gaussian priors.",
        f"Evaluation accuracy on held-out test split ({len(X_test):,} transactions): {acc * 100:.1f}%.",
        f"Weighted Precision: {prec * 100:.1f}%, Recall: {rec * 100:.1f}%, and F1-score: {f1 * 100:.1f}%.",
        f"Class prior distribution: {prior_str}.",
    ]


    warnings = []
    if len(classes) < 2:
        warnings.append("Degenerate Target Warning: Target contains fewer than two distinct classes.")

    elapsed_ms = int((time.time() - start_time) * 1000)

    return RunResult(
        lab=6,
        status="success",
        params=params,
        tables=[TableResult(name="Confusion Matrix", columns=cm_cols, rows=cm_rows)],
        charts=[ChartResult(type="bar", title="Target Class Priors (%)", series=class_priors)],
        metrics={
            "Accuracy": f"{acc * 100:.1f}%",
            "Precision": f"{prec * 100:.1f}%",
            "Recall": f"{rec * 100:.1f}%",
            "F1 score": f"{f1 * 100:.1f}%",
            "Test size": f"{int(test_size * 100)}%",
            "Samples": len(df),
        },
        observations=obs,
        warnings=warnings,
        meta=MetaResult(rows_used=len(df), runtime_ms=elapsed_ms, seed=42)
    )
