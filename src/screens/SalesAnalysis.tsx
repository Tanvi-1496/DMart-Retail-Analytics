import { useState } from "react";
import { runOlap } from "../api/client";
import { AnalyticsChart } from "../components/charts";
import { Card, DataTable, EmptyState, ErrorToast, MetricCards, ObservationList, PageHeader, RunButton, Select, SimulatedBadge, Tabs, WarningBanner } from "../components/ui";
import type { RunResult } from "../types";

export default function SalesAnalysis() {
  const [operation, setOperation] = useState("Roll-up");
  const [category, setCategory] = useState("All categories");
  const [customerType, setCustomerType] = useState("All customer types");
  const [dimension, setDimension] = useState("Category");
  const [measure, setMeasure] = useState("Revenue");
  const [tab, setTab] = useState("Table");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);
  const [error, setError] = useState("");
  async function run() {
    setRunning(true); setError("");
    try { setResult(await runOlap(operation, { category, customerType, dimension, measure })); }
    catch { setError("The OLAP query could not be completed."); }
    finally { setRunning(false); }
  }
  return <div className="page">
    <ErrorToast message={error} />
    <PageHeader title="Sales analysis" description="Explore multidimensional performance with OLAP operations and flexible filters." />
    <Card className="filter-card"><div className="filter-grid">
      <Select label="Category" value={category} options={["All categories", "Grocery", "Home & Kitchen", "Electronics", "Personal Care", "Beverages"]} onChange={setCategory} />
      <Select label="Customer type" value={customerType} options={["All customer types", "Regular", "Member", "Premium"]} onChange={setCustomerType} />
      <label className="field"><span>Date range</span><input type="text" value="Jan 1, 2024 — Dec 31, 2024" readOnly /></label>
      <Select label="Store city" badge={<SimulatedBadge />} value="All cities" options={["All cities", "Mumbai", "Pune", "Ahmedabad", "Bengaluru"]} onChange={() => {}} />
      <Select label="OLAP operation" value={operation} options={["Roll-up", "Drill-down", "Slice", "Dice", "Pivot", "CUBE", "GROUPING SETS", "Drill-across"]} onChange={setOperation} />
      <Select label="Dimension" value={dimension} options={["Category", "Month", "Customer Type", "Store City"]} onChange={setDimension} />
      <Select label="Measure" value={measure} options={["Revenue", "Transactions", "Quantity", "Average value"]} onChange={setMeasure} />
      <div className="run-slot"><RunButton running={running} onClick={run} /></div>
    </div></Card>
    {!result ? <EmptyState title="Ready for OLAP analysis" detail="Choose an operation and dimensions, then run the analysis." /> : <Card className="results-card">
      <WarningBanner warnings={result.warnings} /><Tabs tabs={["Table", "Chart", "SQL"]} active={tab} onChange={setTab} />
      {tab === "Table" && <DataTable columns={result.tables[0].columns} rows={result.tables[0].rows} />}
      {tab === "Chart" && <div className="standalone-chart"><AnalyticsChart type="bar" data={result.charts[0].series} /></div>}
      {tab === "SQL" && <pre className="code-block">{`SELECT ${dimension}, SUM(Total) AS ${measure}\nFROM dmart_sales\nWHERE transaction_date BETWEEN '2024-01-01' AND '2024-12-31'\nGROUP BY ${dimension}\nORDER BY ${measure} DESC;`}</pre>}
      <MetricCards metrics={result.metrics} /><ObservationList observations={result.observations} />
    </Card>}
  </div>;
}
