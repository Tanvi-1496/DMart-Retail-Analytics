from typing import List, Dict, Any, Optional

def generate_olap_observations(dimension: str, measure: str, df_results) -> List[str]:
    """Generates dynamic analytical observations based on executed OLAP query results."""
    obs = []
    if df_results is None or df_results.empty:
        return ["No records found for the selected dimensional filters."]

    # Find top performer
    dim_col = df_results.columns[0]
    val_col = df_results.columns[1] if len(df_results.columns) > 1 else dim_col

    try:
        top_row = df_results.iloc[0]
        top_name = str(top_row[dim_col])
        top_val = top_row[val_col]
        obs.append(f"{top_name} leads the selected {measure.lower()} breakdown with {top_val}.")

        if len(df_results) > 1:
            second_row = df_results.iloc[1]
            second_name = str(second_row[dim_col])
            obs.append(f"Followed by {second_name}, showing consistent customer demand in this segment.")
            
        if len(df_results) >= 2 and isinstance(top_val, (int, float)):
            total_sum = df_results[val_col].sum()
            if total_sum > 0:
                top_pct = round((top_val / total_sum) * 100, 1)
                obs.append(f"The top performer accounts for approximately {top_pct}% of the aggregated {measure.lower()}.")
    except Exception:
        obs.append(f"Aggregated {len(df_results)} dimensional buckets across {dimension}.")

    return obs

def generate_regression_warnings(features: List[str], target: str, r2: float) -> List[str]:
    warnings = []
    if "Total" in target and ("UnitPrice" in features and "Quantity" in features):
        warnings.append("Deterministic Relationship Warning: Total = UnitPrice × Quantity. High R² (≈ 1.0) reflects target leakage rather than stochastic generalization.")
    if r2 >= 0.999:
        warnings.append(f"High R² Score ({r2:.4f}): Extremely high variance explanation warrants inspection for mathematical dependencies or data leakage.")
    return warnings

def generate_classification_observations(accuracy: float, f1: float, class_counts: Optional[Dict[str, int]] = None) -> List[str]:
    obs = [
        f"The classifier achieved an overall evaluation accuracy of {accuracy * 100:.1f}%.",
        f"Macro-averaged F1 score reached {f1 * 100:.1f}%, indicating balanced discrimination across classes.",
    ]
    if class_counts:
        majority_class = max(class_counts, key=class_counts.get)
        obs.append(f"Majority target class is '{majority_class}' ({class_counts[majority_class]} instances); performance was assessed across stratified folds.")
    return obs

def generate_apriori_observations(rules_df) -> Tuple_List:
    obs = []
    warnings = [
        "Analytical Limitation: The DMart dataset lacks explicit Basket/Invoice IDs. Transactions are grouped by (Customer, Date) as an analytical basket proxy."
    ]
    if rules_df is not None and not rules_df.empty:
        top_lift = rules_df.iloc[0]
        ant = top_lift.get("antecedent", "")
        con = top_lift.get("consequent", "")
        lift = top_lift.get("lift", 1.0)
        conf = top_lift.get("confidence", 0.0)
        obs.append(f"Strongest association detected: Customers purchasing {ant} are {lift}x more likely to also purchase {con} (confidence: {float(conf)*100:.1f}%).")
        obs.append(f"Cross-merchandising {ant} and {con} in adjacent store aisles may optimize impulse basket size.")
    else:
        obs.append("No association rules met the specified support and confidence thresholds. Consider lowering thresholds.")
    return obs, warnings

Tuple_List = tuple[List[str], List[str]]
