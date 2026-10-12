import time
import logging
from typing import Dict, Any, List
# pyrefly: ignore [missing-import]
import numpy as np
import pandas as pd
from sklearn.tree import DecisionTreeClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_recall_fscore_support, classification_report
from sklearn.feature_selection import mutual_info_classif
from ..db import db_manager
from ..schemas.common import RunResult, TableResult, ChartResult, MetaResult

logger = logging.getLogger("dmart.decision_tree")

def run_decision_tree_analysis(params: Dict[str, Any]) -> RunResult:
    """Executes attribute relevance and entropy-based Decision Tree classification."""
    start_time = time.time()
    max_depth = int(params.get("depth", 5))
    max_depth = min(max(max_depth, 2), 15)
    selected_features = params.get("features", ["UnitPrice", "Quantity"])
    if isinstance(selected_features, str):
        selected_features = [f.strip() for f in selected_features.split(",") if f.strip()]
    if not selected_features:
        selected_features = ["UnitPrice", "Quantity"]

    # 1. Fetch data from warehouse
    query = """
        SELECT s.unit_price AS UnitPrice, s.quantity AS Quantity, s.total_amount AS Total,
               c.category_name AS Category, cust.customer_type AS CustomerType
        FROM fact_sales s
        JOIN dim_category c ON s.category_key = c.category_key
        JOIN dim_customer cust ON s.customer_key = cust.customer_key
        LIMIT 50000;
    """
    df = db_manager.query_df(query)
    if df.empty:
        raise ValueError("No sales records available in warehouse for decision tree.")

    # 2. Define target: Customer spend level (Low, Mid, High) based on tertiles of Total
    # or CustomerType if specified
    use_spend_target = "Total" not in selected_features
    if use_spend_target:
        # Discretize Total into 3 equal bins
        q33 = df["Total"].quantile(0.33)
        q66 = df["Total"].quantile(0.66)
        def categorize_spend(v):
            if v <= q33: return "Low"
            elif v <= q66: return "Mid"
            else: return "High"
        target_series = df["Total"].apply(categorize_spend)
        target_name = "Spend_Level (Low/Mid/High)"
    else:
        target_series = df["CustomerType"]
        target_name = "CustomerType"

    # 3. Build feature matrix
    X_df = pd.DataFrame()
    for col in selected_features:
        if col in ["UnitPrice", "Quantity", "Total"]:
            X_df[col] = df[col]
        elif col in ["Category", "CustomerType"]:
            if col != target_name:
                dummies = pd.get_dummies(df[col], prefix=col, drop_first=True, dtype=float)
                X_df = pd.concat([X_df, dummies], axis=1)

    if X_df.empty:
        X_df["UnitPrice"] = df["UnitPrice"]
        X_df["Quantity"] = df["Quantity"]

    # 4. Compute Mutual Information / Information Gain for attribute relevance
    mi_scores = mutual_info_classif(X_df, target_series, random_state=42)
    relevance_rows = []
    for col_name, mi in zip(X_df.columns, mi_scores):
        relevance_rows.append({
            "attribute": col_name,
            "information_gain": round(float(mi), 4),
            "relevance_rank": 0,
        })
    relevance_rows.sort(key=lambda x: x["information_gain"], reverse=True)
    for i, r in enumerate(relevance_rows):
        r["relevance_rank"] = i + 1

    # 5. Fit Decision Tree with entropy criterion (ID3 / C4.5 / J48 style)
    X_train, X_test, y_train, y_test = train_test_split(X_df, target_series, test_size=0.2, random_state=42, stratify=target_series)
    clf = DecisionTreeClassifier(criterion="entropy", max_depth=max_depth, random_state=42)
    clf.fit(X_train, y_train)

    y_pred = clf.predict(X_test)
    acc = float(accuracy_score(y_test, y_pred))
    prec, rec, f1, _ = precision_recall_fscore_support(y_test, y_pred, average="weighted", zero_division=0)

    # 6. Feature Importance Bar Chart
    feat_series = []
    for col_name, imp in zip(X_df.columns, clf.feature_importances_):
        feat_series.append({"name": col_name, "value": round(float(imp) * 100, 1)})
    feat_series.sort(key=lambda x: x["value"], reverse=True)

    # 7. Check for warnings
    warnings = []
    if "Total" in selected_features and use_spend_target:
        warnings.append("Target Leakage: 'Total' was selected as a feature while predicting Spend Level derived from Total.")
    if acc > 0.98 and "Total" in selected_features:
        warnings.append(f"Near-perfect classification accuracy ({acc * 100:.1f}%) observed due to direct mathematical derivation of target.")

    # 8. Dynamic observations
    top_attr = relevance_rows[0]["attribute"] if relevance_rows else "UnitPrice"
    top_mi = relevance_rows[0]["information_gain"] if relevance_rows else 0.0
    obs = [
        f"Evaluated attribute relevance against target '{target_name}' across {len(df):,} transactions.",
        f"'{top_attr}' exhibited the highest Information Gain ({top_mi:.4f}), providing the most effective initial split.",
        f"Entropy Decision Tree reached an evaluation accuracy of {acc * 100:.1f}% with maximum depth {max_depth}.",
        f"Weighted Macro F1-score: {f1 * 100:.1f}%, indicating balanced discrimination across target partitions.",
    ]

    elapsed_ms = int((time.time() - start_time) * 1000)

    return RunResult(
        lab=5,
        status="success",
        params=params,
        tables=[TableResult(name="Attribute Relevance (Mutual Information)", columns=["attribute", "information_gain", "relevance_rank"], rows=relevance_rows)],
        charts=[ChartResult(type="bar", title="Feature Importance (%)", series=feat_series[:8])],
        metrics={
            "Accuracy": f"{acc * 100:.1f}%",
            "Precision": f"{prec * 100:.1f}%",
            "Recall": f"{rec * 100:.1f}%",
            "F1 score": f"{f1 * 100:.1f}%",
            "Tree depth": int(clf.get_depth()),
            "Leaves": int(clf.get_n_leaves()),
        },
        observations=obs,
        warnings=warnings,
        meta=MetaResult(rows_used=len(df), runtime_ms=elapsed_ms, seed=42)
    )
