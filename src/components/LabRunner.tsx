import { useState, type ReactNode } from "react";
import { BookOpen, Database, X } from "lucide-react";
import { runLab } from "../api/client";
import { AnalyticsChart, ConfusionMatrix, Dendrogram, NetworkChart, TreeDiagram } from "./charts";
import { Button, Card, DataTable, DatasetChip, EmptyState, ErrorToast, MetricCards, ObservationList, RangeField, RunButton, Select, Tabs, WarningBanner } from "./ui";
import type { RunResult } from "../types";

export type Param =
  | { type: "select"; key: string; label: string; options: string[]; initial: string }
  | { type: "range"; key: string; label: string; min: number; max: number; step?: number; initial: number }
  | { type: "number"; key: string; label: string; initial: number }
  | { type: "check"; key: string; label: string; options: string[]; initial: string[] };

export interface LabConfig {
  number: number;
  title: string;
  dataset: string;
  theory: string;
  params: Param[];
  special?: "schema" | "tree" | "confusion" | "cluster" | "dendrogram" | "network" | "pipeline";
}

function LabVisual({ special, result }: { special?: LabConfig["special"]; result: RunResult }) {
  if (special === "tree") return <div className="two-col lab-chart-grid"><div className="standalone-chart"><AnalyticsChart type="bar" data={result.charts[0].series} /></div><TreeDiagram /></div>;
  if (special === "confusion") return <ConfusionMatrix />;
  if (special === "dendrogram") return <div className="two-col lab-chart-grid"><Dendrogram /><div className="standalone-chart"><AnalyticsChart type="scatter" data={result.charts[0].series} /></div></div>;
  if (special === "network") return <NetworkChart />;
  if (special === "schema") return <><div className="schema-diagram"><div className="schema-fact"><strong>FactSales</strong><span>transaction_id</span><span>customer_key</span><span>category_key</span><span>date_key</span><span>total</span></div>{["DimCustomer", "DimCategory", "DimDate", "DimStore"].map((name, i) => <div key={name} className={`schema-dim d${i}`}><strong>{name}</strong><span>primary_key</span><span>attributes</span></div>)}</div><div className="query-buttons">{["Category-wise sales", "Monthly sales", "City-wise sales", "Customer-wise sales"].map((query) => <Button variant="secondary" key={query}>{query}</Button>)}</div></>;
  if (special === "pipeline") return <div className="pipeline">{["Preprocess", "Classify", "Cluster", "Associate"].map((step, i) => <div key={step}><span>{i + 1}</span><strong>{step}</strong><small>{["Data cleaned", "87.4% accuracy", "4 segments", "11 rules"][i]}</small></div>)}</div>;
  if (special === "cluster") {
    const elbow = [2, 3, 4, 5, 6, 7].map((k, i) => ({ name: String(k), value: [920, 610, 395, 318, 274, 248][i] }));
    return <div className="two-col lab-chart-grid"><div className="standalone-chart"><AnalyticsChart type="line" data={elbow} /></div><div className="standalone-chart"><AnalyticsChart type="scatter" data={result.charts[0].series} /></div></div>;
  }
  return <div className="standalone-chart"><AnalyticsChart type="bar" data={result.charts[0].series} /></div>;
}

export default function LabRunner({ config }: { config: LabConfig }) {
  const initial = Object.fromEntries(config.params.map((p) => [p.key, p.initial]));
  const [params, setParams] = useState<Record<string, unknown>>(initial);
  const [result, setResult] = useState<RunResult | null>(null);
  const [running, setRunning] = useState(false);
  const [tab, setTab] = useState("Result");
  const [drawer, setDrawer] = useState(false);
  const [error, setError] = useState("");
  async function run() {
    setRunning(true); setError("");
    try { setResult(await runLab(config.number, params)); }
    catch { setError("The experiment could not be completed."); }
    finally { setRunning(false); }
  }
  function update(key: string, value: unknown) { setParams({ ...params, [key]: value }); }
  function numericParam(param: Extract<Param, { type: "range" | "number" }>) {
    const value = Number(params[param.key]);
    return Number.isFinite(value) ? value : param.initial;
  }
  return <div className="page">
    <ErrorToast message={error} />
    <div className="lab-header"><div><div className="lab-kicker">Experiment · Lab {config.number}</div><h1>{config.title}</h1><DatasetChip>{config.dataset}</DatasetChip></div><Button variant="secondary" onClick={() => setDrawer(true)}><BookOpen size={16} />Theory</Button></div>
    <div className="lab-layout"><Card className="param-panel"><div className="panel-title"><span>Parameters</span><small>Configure the experiment</small></div>
      <div className="param-fields">{config.params.map((param) => {
        if (param.type === "select") return <Select key={param.key} label={param.label} value={String(params[param.key])} options={param.options} onChange={(v) => update(param.key, v)} />;
        if (param.type === "range") return <RangeField key={param.key} label={param.label} value={numericParam(param)} min={param.min} max={param.max} step={param.step} onChange={(v) => update(param.key, v)} />;
        if (param.type === "number") return <label className="field" key={param.key}><span>{param.label}</span><input type="number" value={numericParam(param)} onChange={(e) => update(param.key, Number(e.target.value))} /></label>;
        return <fieldset className="checkbox-group" key={param.key}><legend>{param.label}</legend>{param.options.map((option) => <label key={option}><input type="checkbox" defaultChecked={param.initial.includes(option)} /><span>{option}</span></label>)}</fieldset>;
      })}</div><RunButton running={running} onClick={run} />
    </Card>
    <Card className="lab-results"><WarningBanner warnings={result?.warnings ?? []} /><Tabs tabs={["Result", "Charts", "Metrics", "Observation", "SQL/Code"]} active={tab} onChange={setTab} />
      {!result ? <EmptyState title="Experiment ready" detail="Configure the parameters and run this lab to generate results." /> : <>
        {tab === "Result" && <DataTable columns={result.tables[0].columns} rows={result.tables[0].rows} />}
        {tab === "Charts" && <LabVisual special={config.special} result={result} />}
        {tab === "Metrics" && <MetricCards metrics={{ ...result.metrics, "Rows used": result.meta.rows_used, Runtime: `${result.meta.runtime_ms} ms` }} />}
        {tab === "Observation" && <ObservationList observations={result.observations} />}
        {tab === "SQL/Code" && <pre className="code-block">{`# Lab ${config.number}: ${config.title}\nresult = dmart.run(\n  dataset="${config.dataset}",\n  params=${JSON.stringify(params, null, 2)}\n)\nresult.summary()`}</pre>}
      </>}
    </Card></div>
    {drawer && <div className="drawer-backdrop" onClick={() => setDrawer(false)}><aside className="theory-drawer" onClick={(e) => e.stopPropagation()}><div className="drawer-head"><div><span>Theory notes</span><h2>{config.title}</h2></div><Button variant="ghost" onClick={() => setDrawer(false)}><X size={19} /></Button></div><div className="theory-body"><div className="theory-icon"><Database size={24} /></div><p>{config.theory}</p><h3>Learning objective</h3><p>Configure the method, interpret the generated output, and connect the observation to a data warehousing or data mining principle.</p></div></aside></div>}
  </div>;
}
