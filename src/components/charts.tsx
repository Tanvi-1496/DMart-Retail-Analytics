import {
  Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis,
} from "recharts";
import type { Row } from "../types";

const colors = ["#0E8A4F", "#2FB476", "#80D4A8", "#F2B84B", "#4E6BA6"];

export function AnalyticsChart({ type, data, secondLine }: { type: "bar" | "line" | "pie" | "scatter"; data: Row[]; secondLine?: boolean }) {
  if (type === "pie") return <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data} dataKey="value" nameKey="name" innerRadius={58} outerRadius={85} paddingAngle={3}>{data.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer>;
  if (type === "scatter") return <ResponsiveContainer width="100%" height="100%"><ScatterChart margin={{ top: 10, right: 12, bottom: 4, left: 0 }}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis type="number" dataKey="x" tickLine={false} axisLine={false} /><YAxis type="number" dataKey="y" tickLine={false} axisLine={false} /><Tooltip /><Scatter data={data} fill="#0E8A4F">{data.map((row, i) => <Cell key={i} fill={colors[Number(row.cluster ?? i) % colors.length]} />)}</Scatter></ScatterChart></ResponsiveContainer>;
  if (type === "bar") return <ResponsiveContainer width="100%" height="100%"><BarChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: 0 }}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} /><YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} /><Tooltip /><Bar dataKey="value" fill="#0E8A4F" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer>;
  return <ResponsiveContainer width="100%" height="100%"><LineChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" tickLine={false} axisLine={false} /><YAxis tickLine={false} axisLine={false} /><Tooltip /><Line type="monotone" dataKey="value" stroke="#0E8A4F" strokeWidth={3} dot={{ r: 3 }} />{secondLine && <Line type="monotone" dataKey="forecast" stroke="#F2B84B" strokeWidth={3} strokeDasharray="6 5" />}</LineChart></ResponsiveContainer>;
}

export function NetworkChart() {
  const nodes = [{ x: 50, y: 50, n: "Grocery" }, { x: 28, y: 23, n: "Beverages" }, { x: 76, y: 28, n: "Personal Care" }, { x: 20, y: 76, n: "Electronics" }, { x: 78, y: 74, n: "Home & Kitchen" }];
  return <div className="network">
    <svg viewBox="0 0 100 100" role="img" aria-label="Association rules network">
      <g className="edges"><line x1="50" y1="50" x2="28" y2="23" /><line x1="50" y1="50" x2="76" y2="28" /><line x1="50" y1="50" x2="20" y2="76" /><line x1="50" y1="50" x2="78" y2="74" /><line x1="28" y1="23" x2="78" y2="74" /></g>
      {nodes.map((node, i) => <g key={node.n}><circle cx={node.x} cy={node.y} r={i === 0 ? 9 : 7} /><text x={node.x} y={node.y + 14} textAnchor="middle">{node.n}</text></g>)}
    </svg>
  </div>;
}

export function TreeDiagram() {
  return <div className="tree-diagram"><div className="tree-node root">Total ≤ ₹580?</div><div className="tree-connect">┌─────────────┴─────────────┐</div><div className="tree-row"><div className="tree-node">Quantity ≤ 3?</div><div className="tree-node">Member?</div></div><div className="tree-connect">┌────┴────┐ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ┌────┴────┐</div><div className="tree-row leaves"><div>Low</div><div>Mid</div><div>Mid</div><div>High</div></div></div>;
}

export function ConfusionMatrix() {
  const values = [[412, 28, 14], [36, 356, 31], [12, 25, 286]];
  return <div className="confusion-wrap"><div className="matrix-label">Predicted class</div><div className="matrix">{values.flatMap((row, r) => row.map((v, c) => <div key={`${r}-${c}`} style={{ opacity: 0.55 + v / 900 }}><strong>{v}</strong><small>{r === c ? "Correct" : "Misclassified"}</small></div>))}</div><div className="matrix-foot">Actual class · Regular / Member / Premium</div></div>;
}

export function Dendrogram() {
  return <svg className="dendrogram" viewBox="0 0 600 220" role="img" aria-label="Hierarchical clustering dendrogram">
    {[40, 100, 160, 220, 280, 340, 400, 460, 520, 580].map((x) => <line key={x} x1={x} y1="195" x2={x} y2={165 - (x % 7) * 4} />)}
    <path d="M40 165H100M70 165V120M160 145H220M190 145V120M70 120H190M130 120V75M280 157H340M310 157V100M400 150H460M430 150V100M310 100H430M370 100V75M130 75H370M250 75V30M520 155H580M550 155V30M250 30H550" />
  </svg>;
}
