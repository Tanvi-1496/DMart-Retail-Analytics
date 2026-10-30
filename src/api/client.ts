import type { DashboardData, ExplorationData, FilterOptions, RunResult, SegmentationData } from "../types";

const API_BASE = (import.meta as any).env?.VITE_API_URL || "http://127.0.0.1:8000";

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45000);

  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) {
      let errorMsg = `Server error (${res.status} ${res.statusText})`;
      try {
        const errJson = await res.json();
        if (errJson?.detail) errorMsg = String(errJson.detail);
      } catch {
        // use default errorMsg
      }
      throw new Error(errorMsg);
    }

    return (await res.json()) as T;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err?.name === "AbortError") {
      throw new Error(`Request timed out while contacting ${url}. The analytical query took longer than 45 seconds.`);
    }
    if (err instanceof TypeError && err.message.toLowerCase().includes("fetch")) {
      throw new Error(`Cannot connect to FastAPI backend at ${API_BASE}. Ensure the backend is running via 'run_backend.bat' or 'py -m uvicorn backend.app.main:app'.`);
    }
    throw err;
  }
}

export async function getFilterOptions(): Promise<FilterOptions> {
  return apiFetch<FilterOptions>(`${API_BASE}/api/datasets/options`);
}

export async function getKpis(filters?: Record<string, string | number | undefined>): Promise<DashboardData> {
  const params = new URLSearchParams();
  if (filters) {
    for (const [key, val] of Object.entries(filters)) {
      if (val !== undefined && val !== null && val !== "" && val !== "All" && val !== "All categories" && val !== "All customer types" && val !== "All months") {
        params.append(key, String(val));
      }
    }
  }
  const qs = params.toString();
  return apiFetch<DashboardData>(`${API_BASE}/api/dashboard${qs ? `?${qs}` : ""}`);
}

export async function getExploration(): Promise<ExplorationData> {
  return apiFetch<ExplorationData>(`${API_BASE}/api/exploration/summary`);
}

export async function queryExploration(body: {
  category?: string;
  customer_type?: string;
  min_amount?: number;
  max_amount?: number;
  search?: string;
  page?: number;
  page_size?: number;
}) {
  return apiFetch<{
    page: number;
    page_size: number;
    total_records: number;
    total_pages: number;
    records: Record<string, string | number>[];
  }>(`${API_BASE}/api/exploration/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function getSegmentation(k = 4, auto = false): Promise<SegmentationData> {
  return apiFetch<SegmentationData>(`${API_BASE}/api/segmentation?k=${k}&auto=${auto}`);
}

export async function getPrediction(
  kind: string,
  options?: { regression_type?: string; classifier?: string; category?: string }
): Promise<any> {
  const params = new URLSearchParams({ kind });
  if (options?.regression_type) params.append("regression_type", options.regression_type);
  if (options?.classifier) params.append("classifier", options.classifier);
  if (options?.category && options.category !== "All categories") params.append("category", options.category);

  return apiFetch<any>(`${API_BASE}/api/mining/prediction?${params.toString()}`);
}

export async function getInsights() {
  return apiFetch<{
    insights: { title: string; sentence: string; metric: string; tone: "positive" | "attention" | "neutral" }[];
    recommendations: string[];
  }>(`${API_BASE}/api/insights`);
}

export async function runLab(n: number, params: Record<string, unknown>): Promise<RunResult> {
  return apiFetch<RunResult>(`${API_BASE}/api/labs/${n}/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ params }),
  });
}

export async function runOlap(op: string, params: Record<string, unknown>): Promise<RunResult> {
  return apiFetch<RunResult>(`${API_BASE}/api/olap/${encodeURIComponent(op)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
}

export async function runMining(algo: string, params: Record<string, unknown>): Promise<RunResult> {
  return apiFetch<RunResult>(`${API_BASE}/api/market-basket/apriori`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
}
