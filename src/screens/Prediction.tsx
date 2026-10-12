import { useCallback, useState } from "react";
import { getPrediction } from "../api/client";
import { AnalyticsChart, ConfusionMatrix, TreeDiagram } from "../components/charts";
import { Card, ChartCard, DataTable, ErrorToast, MetricCards, PageHeader, Select, Skeleton, Tabs, WarningBanner } from "../components/ui";
import { useApi } from "../hooks/useApi";

export default function Prediction() {
  const [tab, setTab] = useState("Regression");
  const [regression, setRegression] = useState("Multiple");
  const [classifier, setClassifier] = useState("Decision Tree");
  const [category, setCategory] = useState("All categories");
  const loader = useCallback(() => getPrediction(tab.toLowerCase().includes("forecast") ? "forecast" : tab.toLowerCase()), [tab]);
  const { data, loading, error } = useApi(loader);
  const forecast = [
    { name: "Jul", value: 4.2 }, { name: "Aug", value: 4.1 }, { name: "Sep", value: 4.3 },
    { name: "Oct", value: 4.5 }, { name: "Nov", value: 4.7 }, { name: "Dec", value: 5.1 },
    { name: "Jan", forecast: 4.6 }, { name: "Feb", forecast: 4.8 }, { name: "Mar", forecast: 5.0 },
  ];
  return <div className="page">
    <ErrorToast message={error} /><PageHeader title="Predictive analytics" description="Evaluate regression, classification and time-series forecasting models." />
    <Card className="prediction-shell"><Tabs tabs={["Regression", "Classification", "Monthly Forecast"]} active={tab} onChange={setTab} />
      {loading || !data ? <Skeleton cards={3} /> : tab === "Regression" ? <>
        <div className="section-toolbar"><div className="segmented">{["Simple", "Multiple"].map((v) => <button className={regression === v ? "active" : ""} onClick={() => setRegression(v)} key={v}>{v}</button>)}</div></div>
        <WarningBanner warnings={[data.warning]} /><MetricCards metrics={data.metrics} />
        <div className="two-col chart-tall"><ChartCard title="Actual vs predicted" subtitle="Total transaction value"><AnalyticsChart type="scatter" data={data.series} /></ChartCard><DataTable title="Model coefficients" columns={["feature", "coefficient", "p_value"]} rows={[{ feature: "UnitPrice", coefficient: 3.182, p_value: "<0.001" }, { feature: "Quantity", coefficient: 162.4, p_value: "<0.001" }, { feature: "CustomerType_Member", coefficient: 18.7, p_value: "0.014" }]} /></div>
      </> : tab === "Classification" ? <>
        <div className="section-toolbar"><div className="segmented">{["Decision Tree", "Naive Bayes"].map((v) => <button className={classifier === v ? "active" : ""} onClick={() => setClassifier(v)} key={v}>{v}</button>)}</div></div>
        <MetricCards metrics={{ Precision: "86.9%", Recall: "85.7%", "F1 score": "86.3%" }} />
        <div className="two-col"><ChartCard title="Confusion matrix"><ConfusionMatrix /></ChartCard><ChartCard title="Decision tree" subtitle="Customer type classification"><TreeDiagram /></ChartCard></div>
      </> : <>
        <div className="section-toolbar"><Select label="Category" value={category} options={["All categories", "Grocery", "Home & Kitchen", "Electronics", "Personal Care", "Beverages"]} onChange={setCategory} /></div>
        <MetricCards metrics={data.metrics} /><ChartCard title="Six-month revenue forecast" subtitle="Actual and forecast revenue in ₹ crore with confidence range"><AnalyticsChart type="line" data={forecast} secondLine /></ChartCard>
      </>}
    </Card>
  </div>;
}
