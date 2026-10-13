import { useMemo, useState, type CSSProperties, type ReactNode, type HTMLAttributes } from "react";
import { ArrowDownToLine, ChevronLeft, ChevronRight, Database, LoaderCircle, RefreshCw, RotateCcw, SearchX, TrendingUp } from "lucide-react";
import type { Row } from "../types";

export function Button({
  children,
  onClick,
  variant = "primary",
  disabled = false,
  className = "",
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost";
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit" | "reset";
}) {
  return (
    <button type={type} disabled={disabled} onClick={onClick} className={`btn btn-${variant} ${className}`}>
      {children}
    </button>
  );
}

export function Card({
  children,
  className = "",
  style,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`card ${className}`} style={style} {...props}>
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {actions}
    </div>
  );
}

export function DatasetChip({ children = "DMart (10,000 live warehouse records)" }: { children?: ReactNode }) {
  return (
    <span className="dataset-chip">
      <Database size={14} />
      {children}
    </span>
  );
}

export function KpiCard({
  label,
  value,
  change,
  icon,
}: {
  label: string;
  value: string | number;
  change?: string;
  icon?: ReactNode;
}) {
  return (
    <Card className="kpi-card">
      <div className="kpi-top">
        <span>{label}</span>
        <div className="icon-box">{icon ?? <TrendingUp size={17} />}</div>
      </div>
      <strong style={{ fontSize: "16px" }}>{value}</strong>
      {change && <small>{change}</small>}
    </Card>
  );
}

export function ChartCard({
  title,
  subtitle,
  children,
  className = "",
  actions,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  actions?: ReactNode;
}) {
  return (
    <Card className={`chart-card ${className}`}>
      <div className="card-heading">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {actions}
      </div>
      <div className="chart-body">{children}</div>
    </Card>
  );
}

export function SimulatedBadge() {
  return <span className="simulated">Simulated</span>;
}

export function WarningBanner({ warnings }: { warnings: string[] }) {
  if (!warnings.length) return null;
  return (
    <div className="warning-banner">
      {warnings.map((warning, i) => (
        <p key={i}>{warning}</p>
      ))}
    </div>
  );
}

export function ObservationList({ observations }: { observations: string[] }) {
  if (!observations.length) return null;
  return (
    <Card className="observation">
      <div className="eyebrow">Key observations & empirical findings</div>
      {observations.map((item, i) => (
        <div className="observation-row" key={i}>
          <span>{i + 1}</span>
          <p>{item}</p>
        </div>
      ))}
    </Card>
  );
}

export function MetricCards({ metrics }: { metrics: Record<string, string | number> }) {
  return (
    <div className="metric-grid">
      {Object.entries(metrics).map(([label, value]) => (
        <KpiCard key={label} label={label} value={value} />
      ))}
    </div>
  );
}

export function EmptyState({
  title = "No results yet",
  detail = "Adjust the parameters and run the analysis to see results.",
  onAction,
  actionLabel,
}: {
  title?: string;
  detail?: string;
  onAction?: () => void;
  actionLabel?: string;
}) {
  return (
    <div className="empty-state">
      <SearchX size={30} />
      <h3>{title}</h3>
      <p>{detail}</p>
      {onAction && actionLabel && (
        <Button variant="secondary" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

export function Skeleton({ cards = 4 }: { cards?: number }) {
  return (
    <div className="skeleton-grid">
      {Array.from({ length: cards }, (_, i) => (
        <div className="skeleton-card" key={i}>
          <span />
          <span />
          <span />
        </div>
      ))}
    </div>
  );
}

export function ErrorToast({ message, onRetry }: { message: string; onRetry?: () => void }) {
  if (!message) return null;
  return (
    <div className="error-toast">
      <div style={{ flex: 1 }}>
        <strong>Connection or execution error</strong>
        <p style={{ margin: "4px 0 0", fontSize: "13px" }}>{message}</p>
      </div>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry} className="btn-sm">
          <RefreshCw size={13} style={{ marginRight: 4 }} />
          Retry
        </Button>
      )}
    </div>
  );
}

function csvValue(value: string | number) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

export function DataTable({
  title,
  columns,
  rows,
  pageSize = 8,
  actions,
}: {
  title?: string;
  columns: string[];
  rows: Row[];
  pageSize?: number;
  actions?: ReactNode;
}) {
  const [page, setPage] = useState(0);
  const [sortKey, setSortKey] = useState(columns[0] ?? "");
  const [ascending, setAscending] = useState(true);

  const sorted = useMemo(() => {
    if (!sortKey) return rows;
    return [...rows].sort((a, b) => {
      const first = a[sortKey] ?? "";
      const second = b[sortKey] ?? "";
      return String(first).localeCompare(String(second), undefined, { numeric: true }) * (ascending ? 1 : -1);
    });
  }, [rows, sortKey, ascending]);

  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(page, pages - 1);
  const shown = sorted.slice(safePage * pageSize, (safePage + 1) * pageSize);

  function sort(column: string) {
    if (sortKey === column) {
      setAscending(!ascending);
    } else {
      setSortKey(column);
      setAscending(true);
    }
  }

  function exportCsv() {
    const csv = [
      columns.join(","),
      ...rows.map((row) => columns.map((c) => csvValue(row[c] ?? "")).join(",")),
    ].join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    link.download = `${(title || "dmart_export").toLowerCase().replace(/\s+/g, "_")}.csv`;
    link.click();
  }

  if (!rows.length) {
    return <EmptyState title="No records found" detail="No data available matching the current criteria." />;
  }

  return (
    <Card className="table-card">
      <div className="table-toolbar">
        {title && <h2>{title}</h2>}
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {actions}
          <Button variant="secondary" onClick={exportCsv}>
            <ArrowDownToLine size={15} />
            Export CSV
          </Button>
        </div>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column} onClick={() => sort(column)} style={{ cursor: "pointer", userSelect: "none" }}>
                  {column.replaceAll("_", " ")} {sortKey === column ? (ascending ? "↑" : "↓") : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((row, i) => (
              <tr key={i}>
                {columns.map((column) => (
                  <td key={column}>{row[column] !== undefined && row[column] !== null ? String(row[column]) : "—"}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="pagination">
        <span>
          Showing {safePage * pageSize + 1}–{Math.min((safePage + 1) * pageSize, rows.length)} of {rows.length} records
        </span>
        <div>
          <Button variant="ghost" disabled={safePage === 0} onClick={() => setPage(safePage - 1)}>
            <ChevronLeft size={16} />
          </Button>
          <span>
            Page {safePage + 1} of {pages}
          </span>
          <Button variant="ghost" disabled={safePage >= pages - 1} onClick={() => setPage(safePage + 1)}>
            <ChevronRight size={16} />
          </Button>
        </div>
      </div>
    </Card>
  );
}

export function Tabs({ tabs, active, onChange }: { tabs: string[]; active: string; onChange: (tab: string) => void }) {
  return (
    <div className="tabs">
      {tabs.map((tab) => (
        <button key={tab} onClick={() => onChange(tab)} className={active === tab ? "active" : ""}>
          {tab}
        </button>
      ))}
    </div>
  );
}

export function Select({
  label,
  value,
  options,
  onChange,
  badge,
  disabled = false,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  badge?: ReactNode;
  disabled?: boolean;
}) {
  return (
    <label className="field" style={{ opacity: disabled ? 0.65 : 1, cursor: disabled ? "not-allowed" : "default" }}>
      <span>
        {label}
        {badge}
      </span>
      <select value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} style={{ cursor: disabled ? "not-allowed" : "pointer" }}>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

export function RangeField({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="field range-field">
      <span>
        {label}
        <strong>{value}</strong>
      </span>
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

export function RunButton({
  running,
  onClick,
  label = "Run analysis",
}: {
  running: boolean;
  onClick: () => void;
  label?: string;
}) {
  return (
    <Button disabled={running} onClick={onClick}>
      {running ? (
        <>
          <LoaderCircle className="spin" size={16} />
          Executing query...
        </>
      ) : (
        label
      )}
    </Button>
  );
}
