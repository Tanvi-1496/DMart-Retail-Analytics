export type Row = Record<string, string | number>;

export const CANONICAL_CATEGORIES = [
  "All categories",
  "Grocery",
  "Beauty & Personal Care",
  "Home & Kitchen",
  "Clothing",
  "Electronics",
  "Beverages",
] as const;

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

export interface TreeNodeData {
  node_id: number;
  depth: number;
  is_leaf: boolean;
  samples: number;
  impurity: number;
  impurity_name?: string;
  value: number[];
  class: string;
  class_distribution?: Record<string, number>;
  feature?: string;
  threshold?: number;
  condition?: string;
  left?: TreeNodeData;
  right?: TreeNodeData;
  metadata?: {
    total_nodes: number;
    max_depth: number;
    displayed_depth: number;
    pruned: boolean;
    features: string[];
    classes: string[];
  };
}

export interface ColumnSchema {
  name: string;
  type: string;
  non_null_count: number;
  role: string;
  sample?: string;
}

export interface DatasetMetadata {
  dataset_name: string;
  source_file: string;
  total_records: number;
  total_columns: number;
  columns: ColumnSchema[];
  pipeline_step: string;
  classifier?: string;
  target_variable?: string;
  features_used?: string[];
  train_test_split?: string;
  train_records?: number;
  test_records?: number;
  random_seed?: number;
  preprocessing_performed?: string[];
  execution_status: string;
  runtime_ms: number;
  timestamp: string;
}

export interface RunResult {
  lab?: number;
  status?: string;
  params?: Record<string, any>;
  tables: TableResult[];
  charts: ChartResult[];
  metrics: Record<string, string | number>;
  observations: string[];
  warnings: string[];
  sql?: string;
  meta: {
    rows_used: number;
    runtime_ms: number;
    seed: number;
    sql?: string;
    tree_data?: TreeNodeData;
    dataset_metadata?: DatasetMetadata;
  };
  tree_data?: TreeNodeData;
  dataset_metadata?: DatasetMetadata;
}

export interface Kpi {
  label: string;
  value: string;
  change: string;
  trend: "up" | "neutral" | "down";
}

export interface Insight {
  title: string;
  sentence: string;
  metric: string;
  tone: "positive" | "attention" | "neutral";
}

export interface DashboardData {
  kpis: Kpi[];
  monthlyRevenue: Row[];
  categoryRevenue: Row[];
  customerTypes: Row[];
  topCustomers: Row[];
}

export interface FilterOptions {
  categories: string[];
  customer_types: string[];
  cities: string[];
  date_range: { min: string; max: string };
}

export interface ExplorationData {
  overview: { rows: string; columns: number; missing: number; duplicates: number };
  previewRows: Row[];
  dataTypes: { column: string; type: string; non_null: string }[];
  statistics: { metric: string; mean: number; std: number; min: number; median: number; max: number }[];
  distributions: {
    monthlyRevenue: Row[];
    categoryRevenue: Row[];
    unitPriceHist?: Row[];
    quantityHist?: Row[];
    totalHist?: Row[];
  };
}

export interface ProfileItem {
  name: string;
  customers: number;
  spend: string;
  transactions: number;
  color: string;
}

export interface SegmentationData {
  elbow: { name: string; value: number }[];
  points: { name: string; x: number; y: number; cluster: number }[];
  profiles: ProfileItem[];
}
