import { useCallback, useEffect, useState } from "react";
import { CreditCard, IndianRupee, Package, ReceiptText, RefreshCw, RotateCcw, ShoppingBasket, Users } from "lucide-react";
import { getKpis } from "../api/client";
import { AnalyticsChart } from "../components/charts";
import { Button, Card, ChartCard, DataTable, ErrorToast, KpiCard, PageHeader, Select, Skeleton } from "../components/ui";
import { useApi } from "../hooks/useApi";
import { type DashboardData, CANONICAL_CATEGORIES } from "../types";


const icons = [IndianRupee, ReceiptText, CreditCard, Package, Users, ShoppingBasket];

const months = [
  "All months", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

export default function Dashboard() {
  const [category, setCategory] = useState("All categories");
  const [customerType, setCustomerType] = useState("All customer types");
  const [month, setMonth]
    = useState("All months");

  useEffect(() => {
    document.title = "DMart Retail Analysis";
  }, []);

  const monthParam = month === "All months" ? undefined : String(months.indexOf(month));

  const loader = useCallback(
    () => getKpis({ category, customer_type: customerType, month: monthParam }),
    [category, customerType, monthParam]
  );

  const { data, loading, error, refetch } = useApi<DashboardData>(loader, [category, customerType, monthParam]);

  function resetFilters() {
    setCategory("All categories");
    setCustomerType("All customer types");
    setMonth("All months");
  }

  const isFiltered = category !== "All categories" || customerType !== "All customer types" || month !== "All months";

  return (
    <div className="page">
      <ErrorToast message={error} onRetry={refetch} />

      <PageHeader
        title="DMart Retail Analysis"
        description="A complete view of retail performance across live warehouse transactions."
        actions={
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            {isFiltered && (
              <Button variant="ghost" onClick={resetFilters}>
                <RotateCcw size={15} style={{ marginRight: 4 }} />
                Reset filters
              </Button>
            )}
            <Button variant="secondary" onClick={refetch}>
              <RefreshCw size={15} style={{ marginRight: 4 }} />
              Refresh
            </Button>
          </div>
        }
      />

      <Card className="filter-card mb-5">
        <div className="filter-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
          <Select
            label="Product category"
            value={category}
            options={[...CANONICAL_CATEGORIES]}
            onChange={setCategory}
          />
          <Select
            label="Customer type"
            value={customerType}
            options={["All customer types", "Regular", "Member", "Premium"]}
            onChange={setCustomerType}
          />
          <Select
            label="Filter by month"
            value={month}
            options={months}
            onChange={setMonth}
          />
        </div>
      </Card>

      {loading && !data ? (
        <Skeleton cards={6} />
      ) : data ? (
        <>
          <div className="kpi-grid">
            {data.kpis.map((kpi, i) => {
              const Icon = icons[i % icons.length];
              return <KpiCard key={kpi.label} {...kpi} icon={<Icon size={17} />} />;
            })}
          </div>

          <div className="dashboard-grid">
            <ChartCard
              title="Monthly Revenue"
              subtitle={`Revenue in ₹ crore · ${month !== "All months" ? month : "Jan–Dec 2024"}`}
              className="span-2"
            >
              <AnalyticsChart type="line" data={data.monthlyRevenue} />
            </ChartCard>

            <ChartCard title="Revenue by Customer Type" subtitle="Share of total revenue">
              <AnalyticsChart type="pie" data={data.customerTypes} />
            </ChartCard>

            <ChartCard title="Revenue by Category" subtitle="Revenue in ₹ crore" className="span-3">
              <AnalyticsChart type="bar" data={data.categoryRevenue} />
            </ChartCard>
          </div>

          <DataTable
            title="Top Customers by Spend"
            columns={["rank", "customer_id", "type", "transactions", "revenue", "avg_value"]}
            rows={data.topCustomers}
            pageSize={10}
          />
        </>
      ) : null}
    </div>
  );
}
