# pyrefly: ignore [missing-import]
import time
import logging

from typing import Dict, Any, List
import pandas as pd
# pyrefly: ignore [missing-import]
from mlxtend.frequent_patterns import apriori, association_rules
# pyrefly: ignore [missing-import]
from mlxtend.preprocessing import TransactionEncoder
from ..db import db_manager
from ..schemas.common import RunResult, TableResult, ChartResult, MetaResult
from .observations import generate_apriori_observations

logger = logging.getLogger("dmart.apriori")

def run_apriori_mining(params: Dict[str, Any]) -> RunResult:
    """Lab 9 & Market Basket: Computes frequent itemsets and association rules with Apriori."""
    start_time = time.time()
    min_support = float(params.get("support", 0.05))
    min_support = min(max(min_support, 0.01), 0.5)
    min_confidence = float(params.get("confidence", 0.3))
    min_confidence = min(max(min_confidence, 0.1), 0.95)

    # 1. Fetch sales transactions grouped into proxy baskets
    # Basket proxy: (customer, date) combination
    query = """
        SELECT cust.full_name AS customer, d.full_date AS tx_date, c.category_name AS category
        FROM fact_sales s
        JOIN dim_customer cust ON s.customer_key = cust.customer_key
        JOIN dim_date d ON s.date_key = d.date_key
        JOIN dim_category c ON s.category_key = c.category_key
        LIMIT 25000;
    """
    df = db_manager.query_df(query)
    if df.empty:
        raise ValueError("No sales records available in warehouse for association mining.")

    # 2. Group items into transactions
    basket_df = df.groupby(["customer", "tx_date"])["category"].apply(lambda s: sorted(list(set(s)))).reset_index()
    transactions = basket_df["category"].tolist()

    # Filter out single-item baskets to ensure meaningful association mining if possible
    multi_baskets = [t for t in transactions if len(t) >= 2]
    mining_txns = multi_baskets if len(multi_baskets) >= 50 else transactions

    # 3. One-hot encode transactions
    te = TransactionEncoder()
    te_ary = te.fit(mining_txns).transform(mining_txns)
    df_encoded = pd.DataFrame(te_ary, columns=te.columns_)

    # 4. Run Apriori
    frequent_itemsets = apriori(df_encoded, min_support=min_support, use_colnames=True)

    # 5. Build Itemsets Table
    itemset_rows = []
    if not frequent_itemsets.empty:
        frequent_itemsets["length"] = frequent_itemsets["itemsets"].apply(lambda x: len(x))
        sorted_itemsets = frequent_itemsets.sort_values(by="support", ascending=False)
        for _, r in sorted_itemsets.head(15).iterrows():
            items = ", ".join(list(r["itemsets"]))
            itemset_rows.append({
                "itemset": f"{{{items}}}",
                "support": str(round(float(r["support"]), 3)),
                "count": round(float(r["support"]) * len(mining_txns)),
            })

    # 6. Derive Association Rules
    rule_rows = []
    network_edges = []
    if not frequent_itemsets.empty and len(frequent_itemsets) > 1:
        try:
            rules = association_rules(frequent_itemsets, metric="confidence", min_threshold=min_confidence)
            if not rules.empty:
                rules = rules.sort_values(by="lift", ascending=False)
                for _, r in rules.head(12).iterrows():
                    ant = ", ".join(list(r["antecedents"]))
                    con = ", ".join(list(r["consequents"]))
                    rule_rows.append({
                        "antecedent": ant,
                        "consequent": con,
                        "support": str(round(float(r["support"]), 3)),
                        "confidence": str(round(float(r["confidence"]), 3)),
                        "lift": str(round(float(r["lift"]), 2)),
                    })
                    network_edges.append({
                        "source": ant,
                        "target": con,
                        "lift": round(float(r["lift"]), 2),
                        "confidence": round(float(r["confidence"]), 2),
                    })
        except Exception as e:
            logger.warning(f"Error computing association rules: {e}")

    warnings = [
        "Proxy Basket Limitation: Baskets are approximated by grouping purchases by (Customer, Date) since raw retail transaction logs do not contain explicit invoice IDs."
    ]

    if not rule_rows:
        warnings.append(
            f"No association rules met the minimum support ({min_support}) and confidence ({min_confidence}) thresholds. Try lowering the thresholds."
        )
        obs = [
            f"Evaluated {len(mining_txns):,} proxy baskets with min support {min_support} and min confidence {min_confidence}.",
            "No itemset pairs met both criteria simultaneously. Lower the sliders to discover lower-frequency affinities.",
        ]
    else:
        obs, rule_warnings = generate_apriori_observations(pd.DataFrame(rule_rows))
        warnings.extend(rule_warnings)
        obs.insert(0, f"Mined {len(itemset_rows)} frequent itemsets and {len(rule_rows)} association rules across {len(mining_txns):,} shopping baskets.")

    elapsed_ms = int((time.time() - start_time) * 1000)

    # Categories and mined edges for network visualization
    cat_res = db_manager.query_df("SELECT category_name as name, COUNT(*) as value FROM fact_sales s JOIN dim_category c ON s.category_key = c.category_key GROUP BY c.category_name;")
    cat_series = []
    for _, r in cat_res.iterrows():
        cat_series.append({"name": r["name"], "value": int(r["value"])})

    # Pack edges into network chart series as well
    for edge in network_edges:
        cat_series.append({
            "name": f"{edge['source']} → {edge['target']}",
            "value": edge["lift"],
            "source": edge["source"],
            "target": edge["target"],
            "lift": edge["lift"],
            "confidence": edge["confidence"],
        })

    rules_lift_series = []
    for r in rule_rows[:8]:
        rules_lift_series.append({
            "name": f"{r['antecedent']} -> {r['consequent']}",
            "value": float(r["lift"]),
            "support": float(r["support"]),
            "confidence": float(r["confidence"]),
        })

    return RunResult(
        lab=9,
        status="success",
        params=params,
        tables=[
            TableResult(name="Frequent Itemsets", columns=["itemset", "support", "count"], rows=itemset_rows),
            TableResult(name="Association Rules", columns=["antecedent", "consequent", "support", "confidence", "lift"], rows=rule_rows),
        ],
        charts=[
            ChartResult(type="network", title="Category Association Network", series=cat_series),
            ChartResult(type="bar", title="Top Association Rules by Lift", series=rules_lift_series),
        ],
        metrics={
            "Itemsets": len(itemset_rows),
            "Rules": len(rule_rows),
            "Strongest lift": float(rule_rows[0]["lift"]) if rule_rows else 0.0,
            "Baskets evaluated": len(mining_txns),
            "Min support": min_support,
            "Min confidence": min_confidence,
        },
        observations=obs,
        warnings=warnings,
        meta=MetaResult(rows_used=len(df), runtime_ms=elapsed_ms, seed=42)
    )
