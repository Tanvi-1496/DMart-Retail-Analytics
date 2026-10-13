import { useState } from "react";
import { runOlap } from "../api/client";
import { AnalyticsChart } from "../components/charts";
import {
  Button, Card, DataTable, EmptyState, ErrorToast, MetricCards,
  ObservationList, PageHeader, RunButton, Select, SimulatedBadge, Tabs, WarningBanner,
} from "../components/ui";
import { RotateCcw } from "lucide-react";
import type { RunResult } from "../types";

export default function SalesAnalysis() {
  const [operation, setOperation] = useState("Roll-up");
  const [category, setCategory] = useState("All categories");
  const [customerType, setCustomerType] = useState("All customer types");
  const [storeCity, setStoreCity] = useState("All cities");
  const [dimension, setDimension] = useState("Category");
  const [measure, setMeasure] = useState("Revenue");
  const [tab, setTab] = useState("Table");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);
  const [error, setError] = useState("");

  async function run() {
    setRunning(true);
    setError("");
    try {
      const res = await runOlap(operation, {
        category,
        customerType,
        storeCity,
        dimension,
        measure,
      });
      setResult(res);
    } catch (err: any) {
      setError(err?.message || "The OLAP query could not be completed.");
    } finally {
      setRunning(false);
    }
  }

  function resetFilters() {
    setOperation("Roll-up");
    setCategory("All categories");
    setCustomerType("All customer types");
    setStoreCity("All cities");
    setDimension("Category");
    setMeasure("Revenue");
  }

  return (
    <div className="page">
      <ErrorToast message={error} onRetry={run} />

      <PageHeader
        title="Sales analysis"
        description="Explore multidimensional performance with OLAP operations and flexible filters."
        actions={
          <Button variant="ghost" onClick={resetFilters}>
            <RotateCcw size={15} style={{ marginRight: 4 }} />
            Reset parameters
          </Button>
        }
      />

      <Card className="filter-card">
        <div className="filter-grid">
          <Select
            label="Category"
            value={category}
            options={["All categories", "Grocery", "Home & Kitchen", "Electronics", "Personal Care", "Beverages"]}
            onChange={setCategory}
          />
          <Select
            label="Customer type"
            value={customerType}
            options={["All customer types", "Regular", "Member", "Premium"]}
            onChange={setCustomerType}
          />
          <Select
            label="Store city"
            badge={<SimulatedBadge />}
            value={storeCity}
            options={["All cities", "Mumbai", "Pune", "Ahmedabad", "Bengaluru"]}
            onChange={setStoreCity}
          />
          <Select
            label="OLAP operation"
            value={operation}
            options={["Roll-up", "Drill-down", "Slice", "Dice", "Pivot", "CUBE", "GROUPING SETS", "Drill-across"]}
            onChange={setOperation}
          />
          <Select
            label="Dimension"
            value={dimension}
            options={["Category", "Month", "Customer Type", "Store City"]}
            onChange={setDimension}
          />
          <Select
            label="Measure"
            value={measure}
            options={["Revenue", "Transactions", "Quantity", "Average value"]}
            onChange={setMeasure}
          />
          <div className="run-slot">
            <RunButton running={running} onClick={run} label="Execute OLAP Query" />
          </div>
        </div>
      </Card>

      {!result ? (
        <EmptyState
          title="Ready for OLAP multidimensional analysis"
          detail="Choose an operation, dimensions, and measures above, then click 'Execute OLAP Query'."
          onAction={run}
          actionLabel="Run with default settings"
        />
      ) : (
        <Card className="results-card">
          <WarningBanner warnings={result.warnings} />
          <Tabs tabs={["Table", "Chart", "SQL"]} active={tab} onChange={setTab} />
          {tab === "Table" && (
            <DataTable
              title={`${operation} Dimensional Data`}
              columns={result.tables[0]?.columns || []}
              rows={result.tables[0]?.rows || []}
              pageSize={10}
            />
          )}
          {tab === "Chart" && (
            <div className="lab-charts-grid" style={{ margin: "16px 0" }}>
              {(result.charts || []).map((c, idx) => (
                <div
                  key={idx}
                  className="chart-card-standalone"
                  style={{ gridColumn: result.charts.length === 1 ? "span 2" : "auto" }}
                >
                  <h4 className="chart-header-title">{c.title || `OLAP Visualization ${idx + 1}`}</h4>
                  <div style={{ height: "300px", width: "100%" }}>
                    <AnalyticsChart type={(c.type as any) || "bar"} data={c.series || []} />
                  </div>
                </div>
              ))}
              {(!result.charts || result.charts.length === 0) && (
                <div className="empty-state" style={{ gridColumn: "span 2" }}>
                  <h3>No Chartable Data</h3>
                  <p>This OLAP dimensional slice does not contain chartable series data.</p>
                </div>
              )}
            </div>
          )}
          {tab === "SQL" && (
            <pre className="code-block">
              {result.sql ||
                result.meta?.sql ||
                `-- Live SQL Executed against dimensional warehouse:\nSELECT ${dimension}, ${measure}\nFROM fact_sales s\nGROUP BY ${dimension};`}
            </pre>
          )}
          <MetricCards metrics={result.metrics} />
          <ObservationList observations={result.observations} />
        </Card>
      )}
    </div>
  );
}
