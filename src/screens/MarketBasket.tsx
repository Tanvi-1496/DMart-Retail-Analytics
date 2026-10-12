import { useState } from "react";
import { runMining } from "../api/client";
import { NetworkChart } from "../components/charts";
import { Card, DataTable, EmptyState, ErrorToast, MetricCards, ObservationList, PageHeader, RangeField, RunButton, WarningBanner } from "../components/ui";
import type { RunResult } from "../types";

export default function MarketBasket() {
  const [support, setSupport] = useState(0.08);
  const [confidence, setConfidence] = useState(0.5);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);
  const [error, setError] = useState("");
  async function run() {
    setRunning(true); setError("");
    try { setResult(await runMining("apriori", { support, confidence })); }
    catch { setError("Association rules could not be generated."); }
    finally { setRunning(false); }
  }
  return <div className="page">
    <ErrorToast message={error} />
    <PageHeader title="Market basket analysis" description="Discover category affinities and actionable association rules with Apriori." />
    <Card className="parameter-bar"><RangeField label="Minimum support" value={support} min={0.01} max={0.3} step={0.01} onChange={setSupport} /><RangeField label="Minimum confidence" value={confidence} min={0.1} max={0.9} step={0.05} onChange={setConfidence} /><RunButton running={running} onClick={run} /></Card>
    {!result ? <EmptyState title="No rules mined yet" detail="Set support and confidence thresholds, then run Apriori." /> : <>
      <WarningBanner warnings={result.warnings} /><MetricCards metrics={result.metrics} />
      <div className="two-col"><DataTable title={result.tables[0].name} columns={result.tables[0].columns} rows={result.tables[0].rows} /><DataTable title={result.tables[1].name} columns={result.tables[1].columns} rows={result.tables[1].rows} /></div>
      <Card className="chart-card"><div className="card-heading"><div><h2>Rules network</h2><p>Nodes are categories; stronger edges indicate higher lift.</p></div></div><NetworkChart /></Card>
      <ObservationList observations={result.observations} />
    </>}
  </div>;
}
