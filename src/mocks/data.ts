import type { Insight, Kpi, Row, RunResult } from "../types";

export const categories = ["Grocery", "Home & Kitchen", "Electronics", "Personal Care", "Beverages"];

export const kpis: Kpi[] = [
  { label: "Total Revenue", value: "₹48.7 Cr", change: "+12.4% vs last year", trend: "up" },
  { label: "Transactions", value: "1,000,000", change: "+8.1% vs last year", trend: "up" },
  { label: "Avg Transaction Value", value: "₹487", change: "+4.0% vs last year", trend: "up" },
  { label: "Total Quantity", value: "3.26M", change: "+9.6% vs last year", trend: "up" },
  { label: "Unique Customers", value: "124,860", change: "+6.2% vs last year", trend: "up" },
  { label: "Top Category", value: "Grocery", change: "38.2% of revenue", trend: "neutral" },
];

export const monthlyRevenue = [
  { name: "Jan", value: 3.2 }, { name: "Feb", value: 3.4 }, { name: "Mar", value: 3.7 },
  { name: "Apr", value: 3.6 }, { name: "May", value: 3.9 }, { name: "Jun", value: 4.0 },
  { name: "Jul", value: 4.2 }, { name: "Aug", value: 4.1 }, { name: "Sep", value: 4.3 },
  { name: "Oct", value: 4.5 }, { name: "Nov", value: 4.7 }, { name: "Dec", value: 5.1 },
];

export const categoryRevenue = categories.map((name, i) => ({ name, value: [18.6, 9.3, 8.7, 6.8, 5.3][i] }));
export const customerTypes = [
  { name: "Regular", value: 46 }, { name: "Member", value: 37 }, { name: "Premium", value: 17 },
];

export const topCustomers: Row[] = Array.from({ length: 10 }, (_, i) => ({
  rank: i + 1,
  customer_id: `CUST-${String(8092 - i * 137).padStart(5, "0")}`,
  type: i < 2 ? "Premium" : i < 7 ? "Member" : "Regular",
  transactions: 42 - i * 2,
  revenue: `₹${(184320 - i * 8750).toLocaleString("en-IN")}`,
  avg_value: `₹${(4389 - i * 173).toLocaleString("en-IN")}`,
}));

export const previewRows: Row[] = Array.from({ length: 36 }, (_, i) => ({
  TransactionID: `TXN-${100001 + i}`,
  CustomerID: `CUST-${3021 + (i % 18)}`,
  Date: `2024-${String((i % 12) + 1).padStart(2, "0")}-${String((i % 26) + 1).padStart(2, "0")}`,
  Category: categories[i % categories.length],
  UnitPrice: [85, 249, 1299, 175, 55][i % 5],
  Quantity: (i % 6) + 1,
  Total: [170, 747, 1299, 700, 275][i % 5],
  CustomerType: ["Regular", "Member", "Premium"][i % 3],
  StoreCity: ["Mumbai", "Pune", "Ahmedabad", "Bengaluru"][i % 4],
}));

export const insights: Insight[] = [
  { title: "Sustained revenue momentum", sentence: "Revenue grew 12.4% year over year, with the strongest acceleration in the final quarter.", metric: "Total Revenue · ₹48.7 Cr", tone: "positive" },
  { title: "Grocery leads the mix", sentence: "Grocery contributes 38.2% of revenue and remains the highest-volume category across all cities.", metric: "Category share · 38.2%", tone: "positive" },
  { title: "Premium headroom", sentence: "Premium customers represent only 17% of revenue despite having the highest average transaction value.", metric: "Premium revenue share · 17%", tone: "attention" },
  { title: "Basket affinity", sentence: "Grocery and Beverages appear together in 18.6% of qualifying baskets.", metric: "Rule support · 18.6%", tone: "neutral" },
  { title: "December peak", sentence: "December revenue reached ₹5.1 Cr, 21% above the monthly average.", metric: "Monthly revenue · ₹5.1 Cr", tone: "positive" },
];

const defaultResult = (title: string): RunResult => ({
  tables: [{
    name: `${title} results`,
    columns: ["segment", "transactions", "revenue", "share"],
    rows: categories.map((segment, i) => ({ segment, transactions: 38200 - i * 4100, revenue: `₹${(18.6 - i * 2.7).toFixed(1)} Cr`, share: `${(38.2 - i * 5.8).toFixed(1)}%` })),
  }],
  charts: [{ type: "bar", title, series: categoryRevenue }],
  metrics: { "Rows analyzed": "50,000", Runtime: "820 ms", "Result groups": 5 },
  observations: ["Grocery leads the selected measure, followed by Home & Kitchen.", "The top two categories account for more than half of the selected result."],
  warnings: [],
  meta: { rows_used: 50000, runtime_ms: 820, seed: 42 },
});

export function olapResult(operation: string): RunResult {
  const result = defaultResult(`${operation} result by category`);
  result.tables[0].columns = ["category", "month", "revenue", "transactions"];
  result.tables[0].rows = categories.map((category, i) => ({ category, month: "2024", revenue: `₹${[18.6, 9.3, 8.7, 6.8, 5.3][i]} Cr`, transactions: 382000 - i * 52100 }));
  return result;
}

export function miningResult(algo: string): RunResult {
  if (algo === "apriori") {
    return {
      tables: [
        { name: "Frequent Itemsets", columns: ["itemset", "support", "count"], rows: [
          { itemset: "{Grocery}", support: "0.382", count: 19100 }, { itemset: "{Beverages}", support: "0.274", count: 13700 },
          { itemset: "{Grocery, Beverages}", support: "0.186", count: 9300 }, { itemset: "{Personal Care, Grocery}", support: "0.141", count: 7050 },
        ] },
        { name: "Association Rules", columns: ["antecedent", "consequent", "support", "confidence", "lift"], rows: [
          { antecedent: "Beverages", consequent: "Grocery", support: "0.186", confidence: "0.679", lift: "1.78" },
          { antecedent: "Personal Care", consequent: "Grocery", support: "0.141", confidence: "0.613", lift: "1.60" },
          { antecedent: "Electronics", consequent: "Home & Kitchen", support: "0.092", confidence: "0.521", lift: "1.44" },
        ] },
      ],
      charts: [{ type: "network", title: "Association rule network", series: categoryRevenue }],
      metrics: { Itemsets: 24, Rules: 11, "Strongest lift": 1.78 },
      observations: ["Customers buying Beverages are 1.78 times more likely to also buy Grocery.", "Cross-merchandising Grocery and Beverages may increase basket size."],
      warnings: [],
      meta: { rows_used: 50000, runtime_ms: 1280, seed: 42 },
    };
  }
  return defaultResult(`${algo} analysis`);
}

export function labResult(n: number): RunResult {
  const titles: Record<number, string> = {
    1: "Warehouse schema analysis", 2: "OLAP operations", 3: "Visualization output", 4: "Linear regression",
    5: "Attribute relevance", 6: "Naive Bayes classification", 7: "K-Means clustering", 8: "Agglomerative clustering",
    9: "Apriori mining", 10: "Mini project pipeline", 12: "Customer segmentation",
  };
  const result = n === 9 ? miningResult("apriori") : defaultResult(titles[n]);
  if ([4, 5, 6].includes(n)) {
    result.metrics = n === 4
      ? { MAE: 12.4, MSE: 231.8, RMSE: 15.23, R2: 0.986 }
      : n === 5
        ? { Accuracy: "87.4%", Entropy: 1.284, "Information gain": 0.618, "Tree depth": 5 }
        : { Accuracy: "87.4%", Precision: "86.9%", Recall: "85.7%", "F1 score": "86.3%" };
  }
  if ([7, 8, 12].includes(n)) {
    result.tables = [{ name: "Cluster summary", columns: ["cluster", "customers", "avg_spend", "strategy"], rows: [
      { cluster: "High Value", customers: 34, avg_spend: "₹8,420", strategy: "VIP rewards and early access" },
      { cluster: "Loyal", customers: 67, avg_spend: "₹4,280", strategy: "Bundle incentives" },
      { cluster: "Occasional", customers: 59, avg_spend: "₹2,140", strategy: "Frequency offers" },
      { cluster: "At Risk", customers: 40, avg_spend: "₹1,120", strategy: "Win-back campaign" },
    ] }];
    result.charts = [{ type: "scatter", title: "Cluster distribution", series: clusterPoints }];
  }
  return result;
}

export const clusterPoints = Array.from({ length: 56 }, (_, i) => ({
  x: 20 + ((i * 17) % 78), y: 15 + ((i * 29) % 82), cluster: i % 4, name: `C${i + 1}`,
}));
