import { useCallback, useEffect, useState } from "react";
import { Columns3, Copy, Database, Eraser, RefreshCw, RotateCcw, Search } from "lucide-react";
import { getExploration, queryExploration } from "../api/client";
import { AnalyticsChart } from "../components/charts";
import { Button, Card, ChartCard, DataTable, ErrorToast, KpiCard, PageHeader, Select, Skeleton } from "../components/ui";
import { useApi } from "../hooks/useApi";
import type { ExplorationData, Row } from "../types";

export default function DataExploration() {
  const { data, loading, error, refetch } = useApi<ExplorationData>(getExploration);

  // Filter state for records query
  const [filterCategory, setFilterCategory] = useState("All categories");
  const [filterCustomerType, setFilterCustomerType] = useState("All customer types");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [filteredRows, setFilteredRows] = useState<Row[]>([]);
  const [totalMatches, setTotalMatches] = useState<number | null>(null);
  const [queryLoading, setQueryLoading] = useState(false);

  const fetchRecords = useCallback(async () => {
    setQueryLoading(true);
    try {
      const res = await queryExploration({
        category: filterCategory !== "All categories" ? filterCategory : undefined,
        customer_type: filterCustomerType !== "All customer types" ? filterCustomerType : undefined,
        search: searchTerm.trim() || undefined,
        page,
        page_size: 20,
      });
      setFilteredRows(res.records);
      setTotalMatches(res.total_records);
    } catch {
      // If error querying specific filter, fall back to initial preview
      if (data?.previewRows) setFilteredRows(data.previewRows);
    } finally {
      setQueryLoading(false);
    }
  }, [filterCategory, filterCustomerType, searchTerm, page, data]);

  useEffect(() => {
    if (data?.previewRows) {
      if (filterCategory === "All categories" && filterCustomerType === "All customer types" && !searchTerm.trim()) {
        setFilteredRows(data.previewRows);
        setTotalMatches(null);
      } else {
        fetchRecords();
      }
    }
  }, [fetchRecords, data, filterCategory, filterCustomerType, searchTerm]);

  function resetFilters() {
    setFilterCategory("All categories");
    setFilterCustomerType("All customer types");
    setSearchTerm("");
    setPage(1);
  }

  if (loading && !data) {
    return (
      <div className="page">
        <PageHeader title="Data exploration" description="Inspect structure, quality, distributions and descriptive statistics." />
        <Skeleton cards={4} />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="page">
        <ErrorToast message={error} onRetry={refetch} />
      </div>
    );
  }

  const upHist = data.distributions?.unitPriceHist || [];
  const qtyHist = data.distributions?.quantityHist || [];
  const totHist = data.distributions?.totalHist || [];

  return (
    <div className="page">
      <ErrorToast message={error} onRetry={refetch} />

      <PageHeader
        title="Data exploration"
        description="Inspect structure, quality, distributions and descriptive statistics."
        actions={
          <Button variant="secondary" onClick={refetch}>
            <RefreshCw size={15} style={{ marginRight: 4 }} />
            Refresh data
          </Button>
        }
      />

      <div className="overview-grid">
        <KpiCard label="Rows" value={data.overview.rows} change="Complete transaction records" icon={<Database size={17} />} />
        <KpiCard label="Columns" value={data.overview.columns} change="6 dimensions · 3 measures" icon={<Columns3 size={17} />} />
        <KpiCard label="Missing values" value={data.overview.missing} change="No imputation required" icon={<Eraser size={17} />} />
        <KpiCard label="Duplicate rows" value={data.overview.duplicates} change="Quality verified" icon={<Copy size={17} />} />
      </div>

      <Card className="filter-card" style={{ marginBottom: "20px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "flex-end" }}>
          <div style={{ flex: 1, minWidth: "200px" }}>
            <label className="field">
              <span>Search customer or category</span>
              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  placeholder="e.g. Sharma, Grocery..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPage(1);
                  }}
                  style={{ width: "100%", paddingLeft: "32px" }}
                />
                <Search size={16} style={{ position: "absolute", left: "10px", top: "10px", color: "#94A3B8" }} />
              </div>
            </label>
          </div>
          <div style={{ minWidth: "180px" }}>
            <Select
              label="Category"
              value={filterCategory}
              options={["All categories", "Grocery", "Home & Kitchen", "Electronics", "Personal Care", "Beverages"]}
              onChange={(v) => {
                setFilterCategory(v);
                setPage(1);
              }}
            />
          </div>
          <div style={{ minWidth: "180px" }}>
            <Select
              label="Customer type"
              value={filterCustomerType}
              options={["All customer types", "Regular", "Member", "Premium"]}
              onChange={(v) => {
                setFilterCustomerType(v);
                setPage(1);
              }}
            />
          </div>
          {(filterCategory !== "All categories" || filterCustomerType !== "All customer types" || searchTerm) && (
            <Button variant="ghost" onClick={resetFilters}>
              <RotateCcw size={15} style={{ marginRight: 4 }} />
              Reset
            </Button>
          )}
        </div>
      </Card>

      <DataTable
        title={`Dataset records ${totalMatches !== null ? `(${totalMatches} matches)` : "(Sample)"}`}
        columns={filteredRows.length > 0 ? Object.keys(filteredRows[0]) : ["TransactionID", "CustomerID", "Category", "UnitPrice", "Quantity", "Total"]}
        rows={filteredRows}
        pageSize={8}
      />

      <div className="two-col" style={{ marginTop: "20px" }}>
        <DataTable title="Schema Data Types" columns={["column", "type", "non_null"]} rows={data.dataTypes} pageSize={8} />
        <DataTable title="Descriptive Statistics" columns={["metric", "mean", "std", "min", "median", "max"]} rows={data.statistics} pageSize={8} />
      </div>

      <div className="chart-grid-3" style={{ marginTop: "20px" }}>
        <ChartCard title="UnitPrice distribution" subtitle="Frequency by unit price range">
          <AnalyticsChart type="bar" data={upHist} />
        </ChartCard>
        <ChartCard title="Quantity distribution" subtitle="Units per transaction">
          <AnalyticsChart type="bar" data={qtyHist} />
        </ChartCard>
        <ChartCard title="Total amount distribution" subtitle="Transaction value bins">
          <AnalyticsChart type="bar" data={totHist} />
        </ChartCard>
      </div>

      <div style={{ marginTop: "20px" }}>
        <ChartCard title="Category revenue breakdown" subtitle="Revenue generated per category in ₹ crore">
          <AnalyticsChart type="bar" data={data.distributions.categoryRevenue} />
        </ChartCard>
      </div>
    </div>
  );
}
