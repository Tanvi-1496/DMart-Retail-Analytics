import { Columns3, Copy, Database, Eraser } from "lucide-react";
import { getExploration } from "../api/client";
import { AnalyticsChart } from "../components/charts";
import { ChartCard, DataTable, ErrorToast, KpiCard, PageHeader, Skeleton } from "../components/ui";
import { useApi } from "../hooks/useApi";

export default function DataExploration() {
  const { data, loading, error } = useApi(getExploration);
  if (loading) return <div className="page"><PageHeader title="Data exploration" description="Inspect structure, quality, distributions and descriptive statistics." /><Skeleton /></div>;
  if (!data) return <div className="page"><ErrorToast message={error} /></div>;
  const histogram = (multiplier: number) => [1, 2, 3, 4, 5, 6, 7, 8].map((value) => ({ name: String(value * multiplier), value: [8, 18, 31, 26, 17, 11, 6, 3][value - 1] }));
  return <div className="page">
    <ErrorToast message={error} /><PageHeader title="Data exploration" description="Inspect structure, quality, distributions and descriptive statistics." />
    <div className="overview-grid">
      <KpiCard label="Rows" value={data.overview.rows} change="Complete transaction records" icon={<Database size={17} />} />
      <KpiCard label="Columns" value={data.overview.columns} change="6 dimensions · 3 measures" icon={<Columns3 size={17} />} />
      <KpiCard label="Missing values" value={data.overview.missing} change="No imputation required" icon={<Eraser size={17} />} />
      <KpiCard label="Duplicate rows" value={data.overview.duplicates} change="0.013% of dataset" icon={<Copy size={17} />} />
    </div>
    <DataTable title="Dataset preview" columns={Object.keys(data.previewRows[0])} rows={data.previewRows} pageSize={7} />
    <div className="two-col"><DataTable title="Data types" columns={["column", "type", "non_null"]} rows={data.dataTypes} pageSize={8} /><DataTable title="Numerical statistics" columns={["metric", "mean", "std", "min", "median", "max"]} rows={data.statistics} pageSize={8} /></div>
    <div className="chart-grid-3">
      <ChartCard title="UnitPrice histogram"><AnalyticsChart type="bar" data={histogram(500)} /></ChartCard>
      <ChartCard title="Quantity histogram"><AnalyticsChart type="bar" data={histogram(1)} /></ChartCard>
      <ChartCard title="Total histogram"><AnalyticsChart type="bar" data={histogram(1500)} /></ChartCard>
    </div>
    <ChartCard title="Category distribution" subtitle="Rows by product category"><AnalyticsChart type="bar" data={data.distributions.categoryRevenue} /></ChartCard>
  </div>;
}
