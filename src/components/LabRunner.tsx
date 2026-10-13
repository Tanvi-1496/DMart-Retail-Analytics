import { useEffect, useState, type ReactNode } from "react";
import { BookOpen, Database, RotateCcw, X } from "lucide-react";
import { runLab } from "../api/client";
import { AnalyticsChart, ConfusionMatrix, Dendrogram, NetworkChart, TreeDiagram } from "./charts";
import InteractiveDecisionTree from "./InteractiveDecisionTree";
import DatasetMetadataPanel from "./DatasetMetadataPanel";
import SchemaDiagram from "./SchemaDiagram";
import {
  Button, Card, DataTable, DatasetChip, EmptyState, ErrorToast, MetricCards,
  ObservationList, RangeField, RunButton, Select, Tabs, WarningBanner,
} from "./ui";
import type { RunResult } from "../types";

export type Param =
  | { type: "select"; key: string; label: string; options: string[]; initial: string }
  | { type: "range"; key: string; label: string; min: number; max: number; step?: number; initial: number }
  | { type: "number"; key: string; label: string; initial: number }
  | { type: "check"; key: string; label: string; options: string[]; initial: string[] };

export interface LabConfig {
  number: number;
  title: string;
  subtitle?: string;
  description?: string;
  dataset: string;
  theory: string;
  params: Param[];
  special?: "schema" | "tree" | "confusion" | "cluster" | "dendrogram" | "network" | "pipeline";
}

function LabVisual({
  special,
  result,
  params,
  onParamChange,
  onRun,
}: {
  special?: LabConfig["special"];
  result: RunResult;
  params?: Record<string, unknown>;
  onParamChange?: (key: string, val: any) => void;
  onRun?: () => void;
}) {
  if (special === "tree") {
    return (
      <div className="lab-charts-grid">
        <div className="chart-card-standalone">
          <h4 className="chart-header-title">{result.charts[0]?.title || "Attribute Relevance & Mutual Information"}</h4>
          <div style={{ height: "300px", width: "100%" }}>
            <AnalyticsChart type={(result.charts[0]?.type as any) || "bar"} data={result.charts[0]?.series || []} />
          </div>
        </div>
        <div className="chart-card-standalone">
          <h4 className="chart-header-title">Decision Tree Logic Hierarchy</h4>
          <TreeDiagram featureImportance={result.charts[0]?.series} />
        </div>
        {result.charts.slice(1).map((chart, idx) => (
          <div key={idx} className="chart-card-standalone" style={{ gridColumn: "span 2" }}>
            <h4 className="chart-header-title">{chart.title || `Supplemental Metric ${idx + 2}`}</h4>
            <div style={{ height: "300px", width: "100%" }}>
              <AnalyticsChart type={(chart.type as any) || "bar"} data={chart.series || []} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (special === "confusion") {
    return (
      <div className="lab-charts-grid">
        <div className="chart-card-standalone">
          <h4 className="chart-header-title">Supervised Confusion Matrix</h4>
          <ConfusionMatrix
            rows={result.tables[0]?.rows || []}
            columns={result.tables[0]?.columns || []}
          />
        </div>
        {result.charts[0] && (
          <div className="chart-card-standalone">
            <h4 className="chart-header-title">{result.charts[0].title || "Class Prior Distributions (%)"}</h4>
            <div style={{ height: "300px", width: "100%" }}>
              <AnalyticsChart type={(result.charts[0].type as any) || "bar"} data={result.charts[0].series} />
            </div>
          </div>
        )}
        {result.charts[1] && (
          <div className="chart-card-standalone" style={{ gridColumn: "span 2" }}>
            <h4 className="chart-header-title">{result.charts[1].title || "Evaluation Performance Metrics (%)"}</h4>
            <div style={{ height: "300px", width: "100%" }}>
              <AnalyticsChart type={(result.charts[1].type as any) || "bar"} data={result.charts[1].series} />
            </div>
          </div>
        )}
      </div>
    );
  }

  if (special === "dendrogram") {
    return (
      <div className="lab-charts-grid">
        <div className="chart-card-standalone">
          <h4 className="chart-header-title">Hierarchical Clustering Dendrogram</h4>
          <Dendrogram />
        </div>
        {result.charts[0] && (
          <div className="chart-card-standalone">
            <h4 className="chart-header-title">{result.charts[0].title || "Customer Spending vs Income Scatter"}</h4>
            <div style={{ height: "300px", width: "100%" }}>
              <AnalyticsChart type="scatter" data={result.charts[0]?.series || []} />
            </div>
          </div>
        )}
        {result.charts[1] && (
          <div className="chart-card-standalone" style={{ gridColumn: "span 2" }}>
            <h4 className="chart-header-title">{result.charts[1].title || "Cluster Size Breakdown"}</h4>
            <div style={{ height: "300px", width: "100%" }}>
              <AnalyticsChart type={(result.charts[1].type as any) || "bar"} data={result.charts[1].series || []} />
            </div>
          </div>
        )}
      </div>
    );
  }

  if (special === "network") {
    const edges = (result.charts?.[0]?.series || [])
      .filter((s: any) => s.source && s.target)
      .map((s: any) => ({
        source: String(s.source),
        target: String(s.target),
        lift: Number(s.lift || 1),
        confidence: Number(s.confidence || 0.5),
      }));

    return (
      <div className="lab-charts-grid">
        <div className="chart-card-standalone">
          <h4 className="chart-header-title">{result.charts[0]?.title || "Association Rules Affinity Graph"}</h4>
          <NetworkChart edges={edges} />
        </div>
        {result.charts[1] && (
          <div className="chart-card-standalone">
            <h4 className="chart-header-title">{result.charts[1].title || "Top Association Rules by Lift"}</h4>
            <div style={{ height: "300px", width: "100%" }}>
              <AnalyticsChart type={(result.charts[1].type as any) || "bar"} data={result.charts[1].series} />
            </div>
          </div>
        )}
      </div>
    );
  }

  if (special === "schema") {
    const activeSchema = String(result.params?.schema || params?.schema || "Star Schema");
    const activeQuery = String(result.params?.query || params?.query || "City-wise sales");

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <SchemaDiagram
          selectedSchema={activeSchema}
          selectedQuery={activeQuery}
          onSelectQuery={(query) => {
            if (onParamChange) onParamChange("query", query);
          }}
          executedSql={result.sql}
        />

        {result.charts && result.charts.length > 0 && (
          <div className="lab-charts-grid" style={{ marginTop: "10px" }}>
            {result.charts.map((chart, idx) => (
              <div
                key={idx}
                className="chart-card-standalone"
                style={{
                  gridColumn: result.charts.length === 1 || (result.charts.length === 3 && idx === 2) ? "span 2" : "auto",
                }}
              >
                <h4 className="chart-header-title">{chart.title || "Query Result Analytics"}</h4>
                <div style={{ height: "300px", width: "100%" }}>
                  <AnalyticsChart type={(chart.type as any) || "bar"} data={chart.series} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (special === "pipeline") {
    const steps = ["Preprocess", "Classify", "Cluster", "Associate"];
    const currentStep = String(result.params?.step || "Preprocess");
    const classifierChoice = String(result.params?.classifier || "Decision Tree");
    const isClassifyStep = currentStep.toLowerCase() === "classify";
    const isDecisionTree = classifierChoice.toLowerCase().includes("tree");

    // Confusion Matrix table if present
    const cmTable = result.tables?.find(
      (t) => t.name.toLowerCase().includes("confusion") || t.columns.some((c) => c.toLowerCase().includes("predicted"))
    );

    // Network chart edges for associate step
    const networkChart = result.charts?.find((c) => c.type === "network");
    const networkEdges = (networkChart?.series || [])
      .filter((s: any) => s.source && s.target)
      .map((s: any) => ({
        source: String(s.source),
        target: String(s.target),
        lift: Number(s.lift || 1),
        confidence: Number(s.confidence || 0.5),
      }));

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
        {/* Interactive Pipeline Stepper */}
        <div className="pipeline">
          {steps.map((step, i) => {
            const active = currentStep.toLowerCase() === step.toLowerCase();
            return (
              <div
                key={step}
                onClick={() => {
                  if (onParamChange) onParamChange("step", step);
                }}
                style={{
                  cursor: "pointer",
                  outline: active ? "2px solid #0E8A4F" : "none",
                  background: active ? "#e9f6ef" : undefined,
                  borderRadius: "8px",
                  transition: "all 0.15s ease",
                }}
              >
                <span>{i + 1}</span>
                <strong>{step}</strong>
                <small>{["Data cleaned & audited", "Decision Tree vs Naive Bayes", "K-Means (k=3) profiling", "Apriori association rules"][i]}</small>
              </div>
            );
          })}
        </div>

        {/* Step 2 (Classify): Real Decision Tree Visualization */}
        {isClassifyStep && isDecisionTree && result.tree_data && (
          <InteractiveDecisionTree treeData={result.tree_data} />
        )}

        {/* Step 2 (Classify): Supervised Confusion Matrix (for Naive Bayes or DT fallback) */}
        {isClassifyStep && (!isDecisionTree || !result.tree_data) && cmTable && (
          <div className="chart-card-standalone">
            <h4 className="chart-header-title">Supervised Confusion Matrix (Gaussian Naive Bayes)</h4>
            <ConfusionMatrix rows={cmTable.rows} columns={cmTable.columns} />
          </div>
        )}

        {/* Step 4 (Associate): Category Association Network Graph */}
        {currentStep.toLowerCase() === "associate" && networkEdges.length > 0 && (
          <div className="chart-card-standalone">
            <h4 className="chart-header-title">Cross-Category Association Affinity Network Graph</h4>
            <NetworkChart edges={networkEdges} />
          </div>
        )}

        {/* Step Charts Grid */}
        {result.charts && result.charts.length > 0 && (
          <div className="lab-charts-grid">
            {result.charts
              .filter((c) => c.type !== "network")
              .map((c, idx) => (
                <div
                  key={idx}
                  className="chart-card-standalone"
                  style={{ gridColumn: result.charts.length === 1 ? "span 2" : "auto" }}
                >
                  <h4 className="chart-header-title">{c.title || `Pipeline Visual ${idx + 1}`}</h4>
                  <div style={{ height: "300px", width: "100%" }}>
                    <AnalyticsChart type={(c.type as any) || "bar"} data={c.series} />
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    );
  }

  if (special === "cluster") {
    const elbowChart = result.charts?.find((c) => c.title?.toLowerCase().includes("elbow") || c.type === "line") || result.charts?.[1];
    const scatterChart = result.charts?.find((c) => c.type === "scatter") || result.charts?.[0];
    const otherCharts = (result.charts || []).filter((c) => c !== elbowChart && c !== scatterChart);

    return (
      <div className="lab-charts-grid">
        {elbowChart && (
          <div className="chart-card-standalone">
            <h4 className="chart-header-title">{elbowChart.title || "Elbow Method (Inertia vs K)"}</h4>
            <div style={{ height: "300px", width: "100%" }}>
              <AnalyticsChart type="line" data={elbowChart.series || []} />
            </div>
          </div>
        )}
        {scatterChart && (
          <div className="chart-card-standalone">
            <h4 className="chart-header-title">{scatterChart.title || "Customer Centroid Clusters"}</h4>
            <div style={{ height: "300px", width: "100%" }}>
              <AnalyticsChart type="scatter" data={scatterChart.series || []} />
            </div>
          </div>
        )}
        {otherCharts.map((c, idx) => (
          <div key={idx} className="chart-card-standalone" style={{ gridColumn: "span 2" }}>
            <h4 className="chart-header-title">{c.title || `Segment Distribution ${idx + 1}`}</h4>
            <div style={{ height: "300px", width: "100%" }}>
              <AnalyticsChart type={(c.type as any) || "bar"} data={c.series || []} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!result.charts || result.charts.length === 0) {
    return (
      <div className="empty-state">
        <h3>No Charts Available</h3>
        <p>This laboratory operation did not produce chartable dimensional series.</p>
      </div>
    );
  }

  const isSingle = result.charts.length === 1;
  return (
    <div className={`lab-charts-grid ${isSingle ? "single-chart" : ""}`}>
      {result.charts.map((c, idx) => (
        <div
          key={idx}
          className="chart-card-standalone"
          style={{ gridColumn: isSingle || (result.charts.length === 3 && idx === 2) ? "span 2" : "auto" }}
        >
          <h4 className="chart-header-title">{c.title || `Visual Output ${idx + 1}`}</h4>
          <div style={{ height: "300px", width: "100%" }}>
            <AnalyticsChart type={(c.type as any) || "bar"} data={c.series || []} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function LabRunner({ config }: { config: LabConfig }) {
  const initial = Object.fromEntries(config.params.map((p) => [p.key, p.initial]));
  const [params, setParams] = useState<Record<string, unknown>>(initial);
  const [result, setResult] = useState<RunResult | null>(null);
  const [running, setRunning] = useState(false);
  const [tab, setTab] = useState(config.special === "schema" ? "Charts" : "Result");
  const [drawer, setDrawer] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    document.title = `${config.title} | DMart Retail Analytics`;
    run(initial);
  }, [config.number]);

  async function run(overrideParams?: Record<string, unknown>) {
    setRunning(true);
    setError("");
    const activeParams = overrideParams || params;
    try {
      const res = await runLab(config.number, activeParams);
      setResult(res);
    } catch (err: any) {
      setError(err?.message || "The laboratory experiment could not be completed.");
    } finally {
      setRunning(false);
    }
  }

  function update(key: string, value: unknown) {
    const next = { ...params, [key]: value };
    setParams(next);
    // If updating step or classifier or query or schema, execute with next parameters
    if (key === "step" || key === "classifier" || key === "query" || key === "schema") {
      run(next);
    }
  }

  function toggleCheckbox(key: string, option: string) {
    const current = Array.isArray(params[key]) ? (params[key] as string[]) : [];
    const next = current.includes(option) ? current.filter((x) => x !== option) : [...current, option];
    update(key, next);
  }

  function resetParams() {
    setParams(initial);
    run(initial);
  }

  function numericParam(param: Extract<Param, { type: "range" | "number" }>) {
    const value = Number(params[param.key]);
    return Number.isFinite(value) ? value : param.initial;
  }

  return (
    <div className="page">
      <ErrorToast message={error} onRetry={() => run()} />

      <div className="lab-header">
        <div>
          <div className="lab-kicker">Academic Experiment · Lab {config.number}</div>
          <h1>{config.title}</h1>
          {config.subtitle && (
            <p className="lab-subtitle" style={{ fontSize: "1.02rem", fontWeight: 600, color: "#166534", margin: "4px 0 6px" }}>
              {config.subtitle}
            </p>
          )}
          {config.description && (
            <p className="lab-description" style={{ fontSize: "0.875rem", color: "#4b5563", maxWidth: "850px", margin: "0 0 10px", lineHeight: 1.5 }}>
              {config.description}
            </p>
          )}
          <DatasetChip>{config.dataset}</DatasetChip>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <Button variant="ghost" onClick={resetParams}>
            <RotateCcw size={15} style={{ marginRight: 4 }} />
            Reset
          </Button>
          <Button variant="secondary" onClick={() => setDrawer(true)}>
            <BookOpen size={16} />
            Theory & Guidelines
          </Button>
        </div>
      </div>

      <div className="lab-layout">
        <Card className="param-panel">
          <div className="panel-title">
            <span>Parameters & Hyperparameters</span>
            <small>Configure algorithm controls</small>
          </div>
          <div className="param-fields">
            {config.params.map((param) => {
              if (param.type === "select") {
                const isClassifier = param.key === "classifier";
                const currentStep = String(params.step ?? "Preprocess");
                const isClassifierDisabled = isClassifier && currentStep.toLowerCase() !== "classify";

                return (
                  <div key={param.key}>
                    <Select
                      label={param.label}
                      value={String(params[param.key] ?? param.initial)}
                      options={param.options}
                      disabled={isClassifierDisabled}
                      onChange={(v) => update(param.key, v)}
                    />
                    {isClassifierDisabled && (
                      <small
                        style={{
                          color: "#6b7280",
                          fontSize: "0.72rem",
                          display: "block",
                          marginTop: "-6px",
                          marginBottom: "10px",
                          lineHeight: 1.3,
                        }}
                      >
                        Classifier disabled for <em>{currentStep}</em> step. Switch Pipeline Step to <strong>Classify</strong> to enable.
                      </small>
                    )}
                  </div>
                );
              }
              if (param.type === "range") {
                return (
                  <RangeField
                    key={param.key}
                    label={param.label}
                    value={numericParam(param)}
                    min={param.min}
                    max={param.max}
                    step={param.step}
                    onChange={(v) => update(param.key, v)}
                  />
                );
              }
              if (param.type === "number") {
                return (
                  <label className="field" key={param.key}>
                    <span>{param.label}</span>
                    <input
                      type="number"
                      value={numericParam(param)}
                      onChange={(e) => update(param.key, Number(e.target.value))}
                    />
                  </label>
                );
              }
              const checkedList = Array.isArray(params[param.key])
                ? (params[param.key] as string[])
                : param.initial;
              return (
                <fieldset className="checkbox-group" key={param.key}>
                  <legend>{param.label}</legend>
                  {param.options.map((option) => (
                    <label key={option} style={{ cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={checkedList.includes(option)}
                        onChange={() => toggleCheckbox(param.key, option)}
                      />
                      <span>{option}</span>
                    </label>
                  ))}
                </fieldset>
              );
            })}
          </div>
          <RunButton running={running} onClick={() => run()} label={`Execute Lab ${config.number}`} />
        </Card>

        <Card className="lab-results">
          {result && (result.dataset_metadata || result.meta?.dataset_metadata) && (
            <DatasetMetadataPanel metadata={result.dataset_metadata || result.meta?.dataset_metadata} />
          )}
          <WarningBanner warnings={result?.warnings ?? []} />
          <Tabs tabs={["Result", "Charts", "Metrics", "Observation", "SQL/Code"]} active={tab} onChange={setTab} />

          {running ? (
            <div className="empty-state" style={{ padding: "48px 24px" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  border: "3px solid #e2e8f0",
                  borderTopColor: "#0E8A4F",
                  borderRadius: "50%",
                  animation: "spin 0.8s linear infinite",
                  margin: "0 auto 16px",
                }}
              />
              <h3 style={{ margin: "0 0 6px", color: "#1e293b", fontSize: "1.1rem" }}>
                Executing {config.title}
              </h3>
              <p style={{ color: "#64748b", fontSize: "0.875rem", margin: 0 }}>
                Running pipeline stage: <strong style={{ color: "#0e8a4f" }}>{String(params.step || "Preprocess")}</strong>
                {String(params.step).toLowerCase() === "classify"
                  ? ` with ${String(params.classifier || "Decision Tree")}`
                  : ""}
                ... Computing live algorithm results.
              </p>
            </div>
          ) : !result ? (
            <EmptyState
              title={`Lab ${config.number} Ready`}
              detail="Configure parameter controls on the left and click execute to run this data mining workflow."
              onAction={() => run()}
              actionLabel="Execute with default settings"
            />
          ) : (
            <>
              {tab === "Result" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {result.tables.map((t, idx) => (
                    <DataTable key={idx} title={t.name} columns={t.columns} rows={t.rows} pageSize={8} />
                  ))}
                </div>
              )}

              {tab === "Charts" && (
                <LabVisual
                  special={config.special}
                  result={result}
                  params={params}
                  onParamChange={update}
                  onRun={() => run()}
                />
              )}

              {tab === "Metrics" && (
                <MetricCards
                  metrics={{
                    ...result.metrics,
                    "Records analyzed": result.meta.rows_used,
                    "Execution runtime": `${result.meta.runtime_ms} ms`,
                  }}
                />
              )}

              {tab === "Observation" && <ObservationList observations={result.observations} />}

              {tab === "SQL/Code" && (
                <pre className="code-block">
                  {result.sql ||
                    result.meta?.sql ||
                    `# Lab ${config.number}: ${config.title}\n# Dataset: ${config.dataset}\n\nfrom backend.app.services.lab_runner_service import execute_lab\n\nresult = execute_lab(\n    lab_number=${config.number},\n    params=${JSON.stringify(params, null, 2)}\n)\n\nprint(f"Status: {result.status}")\nprint(f"Metrics: {result.metrics}")\nprint(f"Observations: {result.observations}")`}
                </pre>
              )}
            </>
          )}
        </Card>
      </div>

      {drawer && (
        <div className="drawer-backdrop" onClick={() => setDrawer(false)}>
          <aside className="theory-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-head">
              <div>
                <span>Theoretical Foundation</span>
                <h2>{config.title}</h2>
              </div>
              <Button variant="ghost" onClick={() => setDrawer(false)}>
                <X size={19} />
              </Button>
            </div>
            <div className="theory-body">
              <div className="theory-icon">
                <Database size={24} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "12px" }}>
                {config.theory.split("\n\n").map((para, i) => (
                  <p key={i} style={{ margin: 0, whiteSpace: "pre-line" }}>
                    {para}
                  </p>
                ))}
              </div>
              <h3>Curricular learning objective</h3>
              <p>
                Configure the analytical method, evaluate execution metrics against dimensional facts or benchmark samples,
                and interpret empirical observations in Data Warehousing and Data Mining.
              </p>
              <h3>Target Dataset</h3>
              <p>
                <strong>{config.dataset}</strong> · Validated source schema without data suppression or fabrication.
              </p>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
