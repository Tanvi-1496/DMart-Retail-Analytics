export type Row = Record<string, string | number>;

export type ChartType =
  | "bar"
  | "line"
  | "pie"
  | "scatter"
  | "heatmap"
  | "histogram"
  | "tree"
  | "dendrogram"
  | "network";

export interface TableResult {
  name: string;
  columns: string[];
  rows: Row[];
}

export interface ChartResult {
  type: ChartType;
  title: string;
  series: Row[];
}

export interface RunResult {
  tables: TableResult[];
  charts: ChartResult[];
  metrics: Record<string, string | number>;
  observations: string[];
  warnings: string[];
  meta: { rows_used: number; runtime_ms: number; seed: number };
}

export interface Kpi {
  label: string;
  value: string;
  change: string;
  trend: "up" | "neutral";
}

export interface Insight {
  title: string;
  sentence: string;
  metric: string;
  tone: "positive" | "attention" | "neutral";
}
