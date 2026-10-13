import { useMemo } from "react";
import {
  Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis,
} from "recharts";
import type { Row } from "../types";

export const chartColors = [
  "#0E8A4F", // DMart primary green
  "#2FB476", // Forest green
  "#4E6BA6", // Slate blue
  "#F2B84B", // Warm amber
  "#8B5CF6", // Purple
  "#EC4899", // Magenta
  "#06B6D4", // Cyan
  "#F97316", // Coral orange
];

/** Cleanly parses any string or numeric value into a valid JavaScript number. */
export function parseNumericValue(val: unknown): number {
  if (typeof val === "number" && !Number.isNaN(val)) return val;
  if (typeof val === "string") {
    // Remove currency symbols, commas, percent, whitespace
    const cleaned = val.replace(/[₹$€,%\s]/g, "").trim();
    const parsed = parseFloat(cleaned);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

/** Formats a numeric value into a human-readable string with currency/suffix. */
export function formatMetricNumber(v: number): string {
  const abs = Math.abs(v);
  const sign = v < 0 ? "-" : "";
  if (abs >= 10_000_000) return `${sign}₹${(abs / 10_000_000).toFixed(2)} Cr`;
  if (abs >= 100_000) return `${sign}₹${(abs / 100_000).toFixed(2)} L`;
  if (abs >= 1_000 && abs < 100_000) return `${sign}${(abs / 1_000).toFixed(1)}k`;
  if (Number.isInteger(v)) return v.toLocaleString();
  return v.toFixed(2);
}

/** Normalized chart row with ensured name, value, x, y, and cluster fields. */
interface NormalizedPoint {
  name: string;
  value: number;
  x?: number;
  y?: number;
  cluster?: number;
  forecast?: number;
  [key: string]: any;
}

export function AnalyticsChart({
  type,
  data = [],
  secondLine,
  xLabel,
  yLabel,
}: {
  type: "bar" | "line" | "pie" | "scatter" | "histogram";
  data: Row[];
  secondLine?: boolean;
  xLabel?: string;
  yLabel?: string;
}) {
  // Normalize data points to prevent blank plotting areas and NaN axes
  const normalizedData: NormalizedPoint[] = useMemo(() => {
    if (!data || data.length === 0) return [];

    return data.map((item, idx) => {
      // 1. Resolve item name / X-axis label
      let name = "";
      if (item.name !== undefined && item.name !== null) {
        name = String(item.name);
      } else if (item.label !== undefined) {
        name = String(item.label);
      } else if (item.dimension !== undefined) {
        name = String(item.dimension);
      } else if (item.category !== undefined) {
        name = String(item.category);
      } else if (item.month !== undefined) {
        name = String(item.month);
      } else if (item.Month !== undefined) {
        name = String(item.Month);
      } else if (item.bin_range !== undefined) {
        name = String(item.bin_range);
      } else if (item.pollutant_feature !== undefined) {
        name = String(item.pollutant_feature);
      } else {
        // Fallback to first non-id string field
        const stringKey = Object.keys(item).find(
          (k) => typeof item[k] === "string" && !k.toLowerCase().includes("id")
        );
        name = stringKey ? String(item[stringKey]) : `Item ${idx + 1}`;
      }

      // 2. Resolve primary numeric value for Bar / Line / Pie
      let value = 0;
      if (item.value !== undefined && item.value !== null) {
        value = parseNumericValue(item.value);
      } else if (item.revenue !== undefined) {
        value = parseNumericValue(item.revenue);
      } else if (item.count !== undefined) {
        value = parseNumericValue(item.count);
      } else if (item.lift !== undefined) {
        value = parseNumericValue(item.lift);
      } else if (item.frequency !== undefined) {
        value = parseNumericValue(item.frequency);
      } else if (item.aggregated_value !== undefined) {
        value = parseNumericValue(item.aggregated_value);
      } else if (item.y !== undefined) {
        value = parseNumericValue(item.y);
      } else {
        // Find first numeric field
        const numKey = Object.keys(item).find(
          (k) => typeof item[k] === "number" || (!Number.isNaN(parseFloat(String(item[k]))) && !k.toLowerCase().includes("id") && k !== name)
        );
        value = numKey ? parseNumericValue(item[numKey]) : 0;
      }

      // 3. Resolve scatter coordinates
      const xVal = item.x !== undefined ? parseNumericValue(item.x) : idx + 1;
      const yVal = item.y !== undefined ? parseNumericValue(item.y) : value;
      const cluster = item.cluster !== undefined ? Math.max(0, parseInt(String(item.cluster), 10) || 0) : idx;
      const forecastVal = item.forecast !== undefined ? parseNumericValue(item.forecast) : undefined;

      return {
        ...item,
        name,
        value,
        x: xVal,
        y: yVal,
        cluster,
        forecast: forecastVal,
      };
    });
  }, [data]);

  if (!normalizedData || normalizedData.length === 0) {
    return (
      <div style={{ height: "100%", minHeight: "220px", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748B", fontSize: "13px" }}>
        No chartable data available for the current selection.
      </div>
    );
  }

  // Common Y-Axis tick formatter
  const formatYAxisTick = (val: number) => {
    if (val === 0) return "0";
    const abs = Math.abs(val);
    const sign = val < 0 ? "-" : "";
    if (abs >= 10_000_000) return `${sign}₹${(abs / 10_000_000).toFixed(1)}Cr`;
    if (abs >= 100_000) return `${sign}₹${(abs / 100_000).toFixed(1)}L`;
    if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(1)}k`;
    if (abs < 1 && abs > 0) return `${sign}${abs.toFixed(2)}`;
    return String(Math.round(val));
  };

  if (type === "pie") {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <Pie
            data={normalizedData}
            dataKey="value"
            nameKey="name"
            innerRadius={55}
            outerRadius={85}
            paddingAngle={3}
          >
            {normalizedData.map((_, i) => (
              <Cell key={i} fill={chartColors[i % chartColors.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: any, name: any) => [formatMetricNumber(parseNumericValue(value)), name]}
            contentStyle={{ backgroundColor: "#FFFFFF", borderRadius: "8px", border: "1px solid #E2E8F0", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" }}
          />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  if (type === "scatter") {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 16, right: 20, bottom: 24, left: 16 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
          <XAxis
            type="number"
            dataKey="x"
            tickLine={false}
            axisLine={{ stroke: "#CBD5E1" }}
            tick={{ fontSize: 11, fill: "#64748B" }}
            tickFormatter={formatYAxisTick}
            domain={["auto", "auto"]}
            label={xLabel ? { value: xLabel, position: "insideBottom", offset: -12, fontSize: 12, fill: "#64748B" } : undefined}
          />
          <YAxis
            type="number"
            dataKey="y"
            tickLine={false}
            axisLine={{ stroke: "#CBD5E1" }}
            tick={{ fontSize: 11, fill: "#64748B" }}
            width={58}
            tickFormatter={formatYAxisTick}
            domain={["auto", "auto"]}
            label={yLabel ? { value: yLabel, angle: -90, position: "insideLeft", offset: 10, fontSize: 12, fill: "#64748B" } : undefined}
          />
          <Tooltip
            cursor={{ strokeDasharray: "3 3", stroke: "#94A3B8" }}
            formatter={(val: any, key: any) => [formatMetricNumber(parseNumericValue(val)), key === "x" ? (xLabel || "X Value") : (yLabel || "Y Value")]}
            contentStyle={{ backgroundColor: "#FFFFFF", borderRadius: "8px", border: "1px solid #E2E8F0", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" }}
          />
          <Scatter data={normalizedData} fill="#0E8A4F">
            {normalizedData.map((row, i) => (
              <Cell key={i} fill={chartColors[Number(row.cluster ?? i) % chartColors.length]} />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    );
  }

  if (type === "bar" || type === "histogram") {
    const isRotated = normalizedData.length > 6;
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={normalizedData}
          margin={{ top: 16, right: 16, bottom: isRotated ? 36 : 16, left: 16 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
          <XAxis
            dataKey="name"
            tickLine={false}
            axisLine={{ stroke: "#CBD5E1" }}
            tick={{ fontSize: 11, fill: "#64748B" }}
            interval={0}
            angle={isRotated ? -25 : 0}
            textAnchor={isRotated ? "end" : "middle"}
          />
          <YAxis
            tickLine={false}
            axisLine={{ stroke: "#CBD5E1" }}
            tick={{ fontSize: 11, fill: "#64748B" }}
            width={58}
            tickFormatter={formatYAxisTick}
          />
          <Tooltip
            formatter={(value: any) => [formatMetricNumber(parseNumericValue(value)), yLabel || "Value"]}
            contentStyle={{ backgroundColor: "#FFFFFF", borderRadius: "8px", border: "1px solid #E2E8F0", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" }}
          />
          <Bar dataKey="value" fill="#0E8A4F" radius={[4, 4, 0, 0]}>
            {normalizedData.map((_, i) => (
              <Cell key={i} fill={chartColors[i % chartColors.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  }

  // Default: Line chart
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart
        data={normalizedData}
        margin={{ top: 16, right: 20, bottom: 20, left: 16 }}
      >
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
        <XAxis
          dataKey="name"
          tickLine={false}
          axisLine={{ stroke: "#CBD5E1" }}
          tick={{ fontSize: 11, fill: "#64748B" }}
        />
        <YAxis
          tickLine={false}
          axisLine={{ stroke: "#CBD5E1" }}
          tick={{ fontSize: 11, fill: "#64748B" }}
          width={58}
          tickFormatter={formatYAxisTick}
        />
        <Tooltip
          formatter={(value: any, key: any) => [formatMetricNumber(parseNumericValue(value)), key === "forecast" ? "Forecast" : (yLabel || "Actual")]}
          contentStyle={{ backgroundColor: "#FFFFFF", borderRadius: "8px", border: "1px solid #E2E8F0", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" }}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke="#0E8A4F"
          strokeWidth={2.8}
          dot={{ r: 3.5, fill: "#0E8A4F" }}
          activeDot={{ r: 5 }}
        />
        {secondLine && (
          <Line
            type="monotone"
            dataKey="forecast"
            stroke="#F2B84B"
            strokeWidth={2.8}
            strokeDasharray="5 4"
            dot={{ r: 3.5, fill: "#F2B84B" }}
            activeDot={{ r: 5 }}
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}

export function NetworkChart({
  edges = [],
  categories = ["Grocery", "Beverages", "Personal Care", "Electronics", "Home & Kitchen"],
}: {
  edges?: { source: string; target: string; lift: number; confidence: number }[];
  categories?: string[];
}) {
  const defaultNodes = [
    { x: 50, y: 50, n: "Grocery" },
    { x: 26, y: 26, n: "Beverages" },
    { x: 74, y: 28, n: "Personal Care" },
    { x: 22, y: 74, n: "Electronics" },
    { x: 76, y: 72, n: "Home & Kitchen" },
  ];

  const nodeMap: Record<string, { x: number; y: number; n: string }> = {};
  defaultNodes.forEach((node) => {
    nodeMap[node.n] = node;
  });

  const lines = useMemo(() => {
    if (!edges || edges.length === 0) return [];

    return edges.slice(0, 10).map((e) => {
      // Find source or closest match
      const srcNode = Object.keys(nodeMap).find((k) => e.source.includes(k));
      const tgtNode = Object.keys(nodeMap).find((k) => e.target.includes(k));

      const src = (srcNode ? nodeMap[srcNode] : null) || { x: 35, y: 45 };
      const tgt = (tgtNode ? nodeMap[tgtNode] : null) || { x: 65, y: 55 };

      return {
        x1: src.x,
        y1: src.y,
        x2: tgt.x,
        y2: tgt.y,
        lift: e.lift,
        confidence: e.confidence,
        label: `Lift ${e.lift}`,
      };
    });
  }, [edges]);

  return (
    <div className="network" style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
      <svg viewBox="0 0 100 100" role="img" aria-label="Association rules network" style={{ maxWidth: "420px", width: "100%" }}>
        <g className="edges">
          {lines.map((l, i) => (
            <line
              key={i}
              x1={l.x1}
              y1={l.y1}
              x2={l.x2}
              y2={l.y2}
              stroke="#0E8A4F"
              strokeWidth={Math.min(3.5, Math.max(1.2, (l.lift || 1) * 1.4))}
              strokeOpacity={0.7}
            />
          ))}
        </g>
        {defaultNodes.map((node, i) => (
          <g key={node.n}>
            <circle cx={node.x} cy={node.y} r={i === 0 ? 8 : 6.5} fill={chartColors[i % chartColors.length]} />
            <text x={node.x} y={node.y + 11} textAnchor="middle" fontSize="3.6" fill="#1E293B" fontWeight="600">
              {node.n}
            </text>
          </g>
        ))}
      </svg>
      {edges.length > 0 ? (
        <div style={{ marginTop: "8px", fontSize: "12px", color: "#64748B", textAlign: "center" }}>
          Showing {Math.min(edges.length, 10)} active association rule affinities (edge thickness scaled by Lift)
        </div>
      ) : (
        <div style={{ marginTop: "8px", fontSize: "12px", color: "#94A3B8", textAlign: "center" }}>
          No association rules met the selected support and confidence thresholds. Try lowering thresholds to reveal cross-category affinities.
        </div>
      )}
    </div>
  );
}

export function TreeDiagram({
  featureImportance,
}: {
  featureImportance?: { name: string; value: number }[];
}) {
  const topFeat = featureImportance?.[0]?.name || "UnitPrice";
  const secondFeat = featureImportance?.[1]?.name || "Quantity";

  return (
    <div className="tree-diagram">
      <div className="tree-node root">{topFeat} ≤ Root Split?</div>
      <div className="tree-connect">┌─────────────┴─────────────┐</div>
      <div className="tree-row">
        <div className="tree-node">{secondFeat} ≤ Split 2?</div>
        <div className="tree-node">CustomerType?</div>
      </div>
      <div className="tree-connect">┌────┴────┐ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ┌────┴────┐</div>
      <div className="tree-row leaves">
        <div>Regular</div>
        <div>Member</div>
        <div>Member</div>
        <div>Premium</div>
      </div>
    </div>
  );
}

export function ConfusionMatrix({
  rows,
  columns,
}: {
  rows?: Row[];
  columns?: string[];
}) {
  if (rows && rows.length > 0 && columns && columns.length > 1) {
    const predCols = columns.filter((c) => c !== "Actual Class" && c !== "Actual" && c !== "class");
    return (
      <div className="confusion-wrap">
        <div className="matrix-label">Predicted Class</div>
        <div
          className="matrix"
          style={{ gridTemplateColumns: `repeat(${predCols.length}, 1fr)` }}
        >
          {rows.flatMap((row, r) =>
            predCols.map((col, c) => {
              const val = Number(row[col] ?? 0);
              const isDiag = r === c;
              return (
                <div key={`${r}-${c}`} style={{ opacity: 0.65 + Math.min(val / 200, 0.35) }}>
                  <strong>{val}</strong>
                  <small>{isDiag ? "Correct" : "Misclassified"}</small>
                </div>
              );
            })
          )}
        </div>
        <div className="matrix-foot">
          Actual Class: {rows.map((r) => String(r["Actual Class"] || r["Actual"] || r[columns[0]])).join(" / ")}
        </div>
      </div>
    );
  }

  return (
    <div className="confusion-wrap" style={{ padding: "20px", textAlign: "center", color: "#64748B" }}>
      No confusion matrix available for current model parameters.
    </div>
  );
}

export function Dendrogram({
  clusters = 5,
  linkage = "ward",
}: {
  clusters?: number;
  linkage?: string;
}) {
  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
      <svg className="dendrogram" viewBox="0 0 600 220" role="img" aria-label="Hierarchical clustering dendrogram">
        {/* Height / Distance guide lines */}
        <line x1="30" y1="30" x2="30" y2="195" stroke="#CBD5E1" strokeWidth="1" strokeDasharray="3 3" />
        <text x="24" y="35" fontSize="10" fill="#94A3B8" textAnchor="end">Merge Height</text>
        <text x="24" y="195" fontSize="10" fill="#94A3B8" textAnchor="end">0</text>

        {/* Leaves */}
        {[60, 110, 160, 210, 260, 310, 360, 410, 460, 510, 560].map((x) => (
          <line key={x} x1={x} y1="195" x2={x} y2={165 - (x % 5) * 5} stroke="#64748B" strokeWidth="1.2" />
        ))}

        {/* Hierarchical linkage merges */}
        <path d="M60 165H110M85 165V120M160 155H210M185 155V120M85 120H185M135 120V75M260 160H310M285 160V100M360 150H410M385 150V100M285 100H385M335 100V75M135 75H335M235 75V35M460 160H510M485 160V100M510 160H560M535 160V60M485 100H535M510 100V35M235 35H510" fill="none" stroke="#0E8A4F" strokeWidth="2" />
      </svg>
      <div style={{ marginTop: "4px", fontSize: "11px", color: "#64748B", textAlign: "center" }}>
        Hierarchical Cluster Tree ({linkage.toUpperCase()} linkage criterion · K={clusters} segments formed at height threshold)
      </div>
    </div>
  );
}
