import { categoryRevenue, clusterPoints, customerTypes, insights, kpis, labResult, miningResult, monthlyRevenue, olapResult, previewRows, topCustomers } from "../mocks/data";

export const USE_MOCK = true;

const delay = <T,>(data: T, ms = 350) => new Promise<T>((resolve) => setTimeout(() => resolve(data), ms));

export async function getKpis() {
  return delay({ kpis, monthlyRevenue, categoryRevenue, customerTypes, topCustomers });
}

export async function getExploration() {
  return delay({
    overview: { rows: "1,000,000", columns: 9, missing: 0, duplicates: 128 },
    previewRows,
    dataTypes: [
      { column: "TransactionID", type: "string", non_null: "1,000,000" }, { column: "Date", type: "date", non_null: "1,000,000" },
      { column: "Category", type: "category", non_null: "1,000,000" }, { column: "UnitPrice", type: "float", non_null: "1,000,000" },
      { column: "Quantity", type: "integer", non_null: "1,000,000" }, { column: "Total", type: "float", non_null: "1,000,000" },
    ],
    statistics: [
      { metric: "UnitPrice", mean: 342.8, std: 418.2, min: 10, median: 199, max: 4999 },
      { metric: "Quantity", mean: 3.26, std: 1.71, min: 1, median: 3, max: 12 },
      { metric: "Total", mean: 487.2, std: 638.6, min: 10, median: 326, max: 15990 },
    ],
    distributions: { monthlyRevenue, categoryRevenue },
  });
}

export async function getSegmentation() {
  return delay({
    elbow: [2, 3, 4, 5, 6, 7, 8].map((k, i) => ({ name: String(k), value: [920, 610, 395, 318, 274, 248, 231][i] })),
    points: clusterPoints,
    profiles: [
      { name: "High Value", customers: 18320, spend: "₹8,420", transactions: 16.8, color: "#0E8A4F" },
      { name: "Loyal", customers: 37940, spend: "₹4,280", transactions: 11.2, color: "#2563EB" },
      { name: "Occasional", customers: 44610, spend: "₹2,140", transactions: 5.6, color: "#F59E0B" },
      { name: "At Risk", customers: 23990, spend: "₹1,120", transactions: 2.7, color: "#E45858" },
    ],
  });
}

export async function getPrediction(kind: string) {
  const common = {
    series: Array.from({ length: 32 }, (_, i) => ({ x: 100 + i * 35, y: 112 + i * 34 + ((i % 5) - 2) * 18, name: String(i) })),
    metrics: kind === "forecast" ? { MAE: "₹0.18 Cr", RMSE: "₹0.24 Cr", MAPE: "4.8%" } : { MAE: 12.4, MSE: 231.8, RMSE: 15.23, R2: 0.986 },
    warning: kind === "regression" ? "Total = UnitPrice x Quantity, so near-perfect R2 is expected (data leakage)." : "",
  };
  return delay(common);
}

export async function getInsights() {
  return delay({ insights, recommendations: ["Create premium conversion offers for high-value Members.", "Co-locate Grocery and Beverages in promotional campaigns.", "Increase inventory cover for the December demand peak.", "Test city-specific bundles in Mumbai and Pune."] });
}

export async function runLab(n: number, _params: Record<string, unknown>) { return delay(labResult(n), 650); }
export async function runOlap(op: string, _params: Record<string, unknown>) { return delay(olapResult(op), 650); }
export async function runMining(algo: string, _params: Record<string, unknown>) { return delay(miningResult(algo), 650); }
