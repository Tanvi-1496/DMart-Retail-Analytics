import pytest
from backend.app.services.lab_runner_service import execute_lab

@pytest.mark.parametrize("lab_number,params", [
    (1, {"schema": "Star", "query": "Category-wise sales"}),
    (1, {"schema": "Star", "query": "Monthly sales"}),
    (2, {"operation": "Roll-up", "dimension": "Category", "measure": "Revenue"}),
    (2, {"operation": "Roll-up", "dimension": "Month", "measure": "Revenue"}),
    (2, {"operation": "Drill-down", "dimension": "Category", "measure": "Revenue"}),
    (3, {"chart": "Bar", "x": "Category", "y": "Total"}),
    (3, {"chart": "Line", "x": "Month", "y": "Total"}),
    (3, {"chart": "Scatter", "x": "UnitPrice", "y": "Total"}),
    (4, {"type": "Multiple", "features": ["UnitPrice", "Quantity"], "test": 0.2}),
    (5, {"features": ["UnitPrice", "Quantity", "Total"], "depth": 5}),
    (6, {"test": 0.2, "sample": 50000}),
    (7, {"k": 4}),
    (8, {"linkage": "Ward", "clusters": 5}),
    (9, {"support": 0.08, "confidence": 0.5}),
    (10, {"step": "Preprocess"}),
    (10, {"step": "Classify", "classifier": "Decision Tree"}),
    (10, {"step": "Cluster"}),
    (10, {"step": "Associate"}),
    (11, {"n_estimators": 50, "max_depth": 8, "test_size": 0.2}),
    (12, {"k": 5, "score": "Silhouette"}),
])
def test_all_lab_charts_non_empty_and_valid(lab_number, params):
    res = execute_lab(lab_number, params)
    assert res.status == "success"
    assert len(res.charts) >= 1, f"Lab {lab_number} with params {params} produced no charts"

    for idx, chart in enumerate(res.charts):
        assert chart.type in ["bar", "line", "pie", "scatter", "histogram", "network"], f"Invalid chart type {chart.type}"
        assert chart.title and len(chart.title.strip()) > 0, f"Chart {idx} missing title"
        assert len(chart.series) > 0, f"Chart {idx} '{chart.title}' has empty series"

        # Check for non-blank series content
        if chart.type in ["bar", "line", "pie"]:
            names = [s.get("name") for s in chart.series if "name" in s]
            values = [s.get("value") for s in chart.series if "value" in s]
            assert len(names) > 0, f"Chart {idx} missing 'name' attributes"
            assert len(values) > 0, f"Chart {idx} missing 'value' attributes"

            # Check that names are not all identical repeated strings like '2024'
            if len(names) > 1:
                assert len(set(names)) > 1 or names[0] != "2024", f"Chart {idx} has repeated identical '2024' names: {names}"

            # Check that values are not all zero
            numeric_vals = [float(v) for v in values if isinstance(v, (int, float))]
            assert any(v != 0.0 for v in numeric_vals), f"Chart {idx} series has all zero values: {values}"

        elif chart.type == "scatter":
            xs = [s.get("x") for s in chart.series if "x" in s]
            ys = [s.get("y") for s in chart.series if "y" in s]
            assert len(xs) > 0, f"Scatter chart {idx} missing 'x' coordinates"
            assert len(ys) > 0, f"Scatter chart {idx} missing 'y' coordinates"
            assert any(float(x) != 0.0 for x in xs), f"Scatter chart {idx} has all zero X"
            assert any(float(y) != 0.0 for y in ys), f"Scatter chart {idx} has all zero Y"
