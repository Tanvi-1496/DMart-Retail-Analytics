import { useCallback, useState } from "react";
import { getPrediction } from "../api/client";
import { AnalyticsChart, ConfusionMatrix, TreeDiagram } from "../components/charts";
import {
  Card, ChartCard, DataTable, ErrorToast, MetricCards,
  ObservationList, PageHeader, Select, Skeleton, Tabs, WarningBanner,
} from "../components/ui";
import { useApi } from "../hooks/useApi";

export default function Prediction() {
  const [tab, setTab] = useState("Regression");
  const [regression, setRegression] = useState("Multiple");
  const [classifier, setClassifier] = useState("Decision Tree");
  const [category, setCategory] = useState("All categories");

  const kind = tab === "Regression" ? "regression" : tab === "Classification" ? "classification" : "forecast";

  const loader = useCallback(
    () =>
      getPrediction(kind, {
        regression_type: regression,
        classifier,
        category,
      }),
    [kind, regression, classifier, category]
  );

  const { data, loading, error, refetch } = useApi<any>(loader, [kind, regression, classifier, category]);

  return (
    <div className="page">
      <ErrorToast message={error} onRetry={refetch} />

      <PageHeader
        title="Predictive analytics"
        description="Evaluate regression, classification, and time-series forecasting models fitted on dimensional warehouse data."
      />

      <Card className="prediction-shell">
        <Tabs tabs={["Regression", "Classification", "Monthly Forecast"]} active={tab} onChange={setTab} />

        {loading && !data ? (
          <Skeleton cards={3} />
        ) : tab === "Regression" && data ? (
          <>
            <div className="section-toolbar">
              <div className="segmented">
                {["Simple", "Multiple"].map((v) => (
                  <button
                    key={v}
                    className={regression === v ? "active" : ""}
                    onClick={() => setRegression(v)}
                  >
                    {v} Linear Regression
                  </button>
                ))}
              </div>
            </div>

            {data.warning && <WarningBanner warnings={[data.warning]} />}
            <MetricCards metrics={data.metrics || {}} />

            <div className="two-col chart-tall" style={{ marginTop: "20px" }}>
              <ChartCard
                title="Actual vs Predicted Sales Total"
                subtitle={`Evaluation on held-out test split (${regression} Regression)`}
              >
                <AnalyticsChart type="scatter" data={data.series || []} />
              </ChartCard>
              <DataTable
                title="Model Fitted Coefficients"
                columns={["feature", "coefficient", "p_value"]}
                rows={data.coefficients || []}
                pageSize={6}
              />
            </div>

            {data.observations && <ObservationList observations={data.observations} />}
          </>
        ) : tab === "Classification" && data ? (
          <>
            <div className="section-toolbar">
              <div className="segmented">
                {["Decision Tree", "Naive Bayes"].map((v) => (
                  <button
                    key={v}
                    className={classifier === v ? "active" : ""}
                    onClick={() => setClassifier(v)}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {data.warning && <WarningBanner warnings={[data.warning]} />}
            <MetricCards metrics={data.metrics || {}} />

            <div className="two-col" style={{ marginTop: "20px" }}>
              <ChartCard
                title={`Confusion Matrix (${classifier})`}
                subtitle="Evaluation on stratified held-out test split"
              >
                <ConfusionMatrix
                  rows={data.confusion_matrix || []}
                  columns={data.confusion_columns || []}
                />
              </ChartCard>

              {classifier === "Decision Tree" ? (
                <ChartCard
                  title="Feature Importance & Splits"
                  subtitle="Relative Information Gain across features"
                >
                  <TreeDiagram featureImportance={data.feature_importance || []} />
                </ChartCard>
              ) : (
                <ChartCard
                  title="Class Prior Distributions"
                  subtitle="Prior probability of each customer class"
                >
                  <AnalyticsChart type="bar" data={data.series || []} />
                </ChartCard>
              )}
            </div>

            {classifier === "Decision Tree" && data.relevance_table && (
              <div style={{ marginTop: "20px" }}>
                <DataTable
                  title="Attribute Relevance (Mutual Information)"
                  columns={["attribute", "information_gain", "relevance_rank"]}
                  rows={data.relevance_table}
                  pageSize={6}
                />
              </div>
            )}

            {data.observations && <ObservationList observations={data.observations} />}
          </>
        ) : tab === "Monthly Forecast" && data ? (
          <>
            <div className="section-toolbar">
              <Select
                label="Product Category Filter"
                value={category}
                options={["All categories", "Grocery", "Home & Kitchen", "Electronics", "Personal Care", "Beverages"]}
                onChange={setCategory}
              />
            </div>

            <MetricCards metrics={data.metrics || {}} />

            <div style={{ marginTop: "20px" }}>
              <ChartCard
                title="Six-Month Revenue Trend & Forecast"
                subtitle={`Historical sales trend and polynomial forecast for ${category}`}
              >
                <AnalyticsChart type="line" data={data.series || []} secondLine />
              </ChartCard>
            </div>
          </>
        ) : null}
      </Card>
    </div>
  );
}
