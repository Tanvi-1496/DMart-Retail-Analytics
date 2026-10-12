import { useMemo, useState, type ReactNode } from "react";
import { ArrowDownToLine, ChevronLeft, ChevronRight, Database, LoaderCircle, SearchX, TrendingUp } from "lucide-react";
import type { Row } from "../types";

export function Button({ children, onClick, variant = "primary", disabled = false, className = "" }: { children: ReactNode; onClick?: () => void; variant?: "primary" | "secondary" | "ghost"; disabled?: boolean; className?: string }) {
  return <button disabled={disabled} onClick={onClick} className={`btn btn-${variant} ${className}`}>{children}</button>;
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`card ${className}`}>{children}</div>;
}

export function PageHeader({ title, description, actions }: { title: string; description: string; actions?: ReactNode }) {
  return <div className="page-header"><div><h1>{title}</h1><p>{description}</p></div>{actions}</div>;
}

export function DatasetChip({ children = "DMart (1,000,000 transactions)" }: { children?: ReactNode }) {
  return <span className="dataset-chip"><Database size={14} />{children}</span>;
}

export function KpiCard({ label, value, change, icon }: { label: string; value: string | number; change?: string; icon?: ReactNode }) {
  return <Card className="kpi-card"><div className="kpi-top"><span>{label}</span><div className="icon-box">{icon ?? <TrendingUp size={17} />}</div></div><strong>{value}</strong>{change && <small>{change}</small>}</Card>;
}

export function ChartCard({ title, subtitle, children, className = "" }: { title: string; subtitle?: string; children: ReactNode; className?: string }) {
  return <Card className={`chart-card ${className}`}><div className="card-heading"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div></div><div className="chart-body">{children}</div></Card>;
}

export function SimulatedBadge() { return <span className="simulated">Simulated</span>; }

export function WarningBanner({ warnings }: { warnings: string[] }) {
  if (!warnings.length) return null;
  return <div className="warning-banner">{warnings.map((warning) => <p key={warning}>{warning}</p>)}</div>;
}

export function ObservationList({ observations }: { observations: string[] }) {
  return <Card className="observation"><div className="eyebrow">Key observation</div>{observations.map((item, i) => <div className="observation-row" key={item}><span>{i + 1}</span><p>{item}</p></div>)}</Card>;
}

export function MetricCards({ metrics }: { metrics: Record<string, string | number> }) {
  return <div className="metric-grid">{Object.entries(metrics).map(([label, value]) => <KpiCard key={label} label={label} value={value} />)}</div>;
}

export function EmptyState({ title = "No results yet", detail = "Adjust the parameters and run the analysis to see results." }: { title?: string; detail?: string }) {
  return <div className="empty-state"><SearchX size={30} /><h3>{title}</h3><p>{detail}</p></div>;
}

export function Skeleton({ cards = 4 }: { cards?: number }) {
  return <div className="skeleton-grid">{Array.from({ length: cards }, (_, i) => <div className="skeleton-card" key={i}><span /><span /><span /></div>)}</div>;
}

export function ErrorToast({ message }: { message: string }) {
  if (!message) return null;
  return <div className="error-toast"><strong>Something went wrong</strong><span>{message}</span></div>;
}

function csvValue(value: string | number) { return `"${String(value).replaceAll("\"", "\"\"")}"`; }

export function DataTable({ title, columns, rows, pageSize = 8 }: { title?: string; columns: string[]; rows: Row[]; pageSize?: number }) {
  const [page, setPage] = useState(0);
  const [sortKey, setSortKey] = useState(columns[0] ?? "");
  const [ascending, setAscending] = useState(true);
  const sorted = useMemo(() => [...rows].sort((a, b) => {
    const first = a[sortKey] ?? ""; const second = b[sortKey] ?? "";
    return String(first).localeCompare(String(second), undefined, { numeric: true }) * (ascending ? 1 : -1);
  }), [rows, sortKey, ascending]);
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const shown = sorted.slice(page * pageSize, (page + 1) * pageSize);

  function sort(column: string) {
    if (sortKey === column) setAscending(!ascending); else { setSortKey(column); setAscending(true); }
  }
  function exportCsv() {
    const csv = [columns.join(","), ...rows.map((row) => columns.map((c) => csvValue(row[c] ?? "")).join(","))].join("\n");
    const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); link.download = `${title ?? "export"}.csv`; link.click();
  }
  if (!rows.length) return <EmptyState />;
  return <Card className="table-card">
    <div className="table-toolbar">{title && <h2>{title}</h2>}<Button variant="secondary" onClick={exportCsv}><ArrowDownToLine size={15} />Export CSV</Button></div>
    <div className="table-scroll"><table><thead><tr>{columns.map((column) => <th key={column} onClick={() => sort(column)}>{column.replaceAll("_", " ")} {sortKey === column ? (ascending ? "↑" : "↓") : ""}</th>)}</tr></thead>
    <tbody>{shown.map((row, i) => <tr key={i}>{columns.map((column) => <td key={column}>{row[column]}</td>)}</tr>)}</tbody></table></div>
    <div className="pagination"><span>Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, rows.length)} of {rows.length}</span><div><Button variant="ghost" disabled={page === 0} onClick={() => setPage(page - 1)}><ChevronLeft size={16} /></Button><span>Page {page + 1} of {pages}</span><Button variant="ghost" disabled={page === pages - 1} onClick={() => setPage(page + 1)}><ChevronRight size={16} /></Button></div></div>
  </Card>;
}

export function Tabs({ tabs, active, onChange }: { tabs: string[]; active: string; onChange: (tab: string) => void }) {
  return <div className="tabs">{tabs.map((tab) => <button key={tab} onClick={() => onChange(tab)} className={active === tab ? "active" : ""}>{tab}</button>)}</div>;
}

export function Select({ label, value, options, onChange, badge }: { label: string; value: string; options: string[]; onChange: (value: string) => void; badge?: ReactNode }) {
  return <label className="field"><span>{label}{badge}</span><select value={value} onChange={(e) => onChange(e.target.value)}>{options.map((o) => <option key={o}>{o}</option>)}</select></label>;
}

export function RangeField({ label, value, min, max, step = 1, onChange }: { label: string; value: number; min: number; max: number; step?: number; onChange: (value: number) => void }) {
  return <label className="field range-field"><span>{label}<strong>{value}</strong></span><input type="range" value={value} min={min} max={max} step={step} onChange={(e) => onChange(Number(e.target.value))} /></label>;
}

export function RunButton({ running, onClick }: { running: boolean; onClick: () => void }) {
  return <Button disabled={running} onClick={onClick}>{running ? <><LoaderCircle className="spin" size={16} />Running analysis</> : "Run analysis"}</Button>;
}
