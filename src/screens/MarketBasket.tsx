import { useState } from "react";
import { runMining } from "../api/client";
import { NetworkChart } from "../components/charts";
import {
  Card, DataTable, EmptyState, ErrorToast, MetricCards,
  ObservationList, PageHeader, RangeField, RunButton, WarningBanner,
} from "../components/ui";
import type { RunResult } from "../types";

export default function MarketBasket() {
  const [support, setSupport] = useState(0.05);
  const [confidence, setConfidence] = useState(0.3);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);
  const [error, setError] = useState("");

  async function run() {
    setRunning(true);
    setError("");
    try {
      const res = await runMining("apriori", { support, confidence });
      setResult(res);
    } catch (err: any) {
      setError(err?.message || "Association rules could not be generated.");
    } finally {
      setRunning(false);
    }
  }

  // Extract edges for network visualization if available
  const edges = (result?.charts?.[0]?.series || [])
    .filter((s: any) => s.source && s.target)
    .map((s: any) => ({
      source: String(s.source),
      target: String(s.target),
      lift: Number(s.lift || 1),
      confidence: Number(s.confidence || 0.5),
    }));

  return (
    <div className="page">
      <ErrorToast message={error} onRetry={run} />

      <PageHeader
        title="Market basket analysis"
        description="Discover category affinities and actionable association rules using Apriori downward closure."
      />

      <Card className="parameter-bar">
        <RangeField
          label="Minimum support"
          value={support}
          min={0.01}
          max={0.25}
          step={0.01}
          onChange={setSupport}
        />
        <RangeField
          label="Minimum confidence"
          value={confidence}
          min={0.1}
          max={0.9}
          step={0.05}
          onChange={setConfidence}
        />
        <RunButton running={running} onClick={run} label="Run Apriori Mining" />
      </Card>

      {!result ? (
        <EmptyState
          title="No rules mined yet"
          detail="Adjust support and confidence thresholds above, then click 'Run Apriori Mining'."
          onAction={run}
          actionLabel="Run with default thresholds (Support 0.05, Conf 0.3)"
        />
      ) : (
        <>
          <WarningBanner warnings={result.warnings} />
          <MetricCards metrics={result.metrics} />

          <div className="two-col" style={{ marginTop: "20px" }}>
            <DataTable
              title={result.tables[0]?.name || "Frequent Itemsets"}
              columns={result.tables[0]?.columns || ["itemset", "support", "count"]}
              rows={result.tables[0]?.rows || []}
              pageSize={8}
            />
            <DataTable
              title={result.tables[1]?.name || "Association Rules"}
              columns={result.tables[1]?.columns || ["antecedent", "consequent", "support", "confidence", "lift"]}
              rows={result.tables[1]?.rows || []}
              pageSize={8}
            />
          </div>

          <Card className="chart-card" style={{ marginTop: "20px" }}>
            <div className="card-heading">
              <div>
                <h2>Rules Affinity Network</h2>
                <p>Nodes represent product categories; edges illustrate mined affinities scaled by lift.</p>
              </div>
            </div>
            <NetworkChart edges={edges} />
          </Card>

          <ObservationList observations={result.observations} />
        </>
      )}
    </div>
  );
}
