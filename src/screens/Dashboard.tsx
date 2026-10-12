import { CreditCard, IndianRupee, Package, ReceiptText, ShoppingBasket, Users } from "lucide-react";
import { getKpis } from "../api/client";
import { AnalyticsChart } from "../components/charts";
import { ChartCard, DataTable, ErrorToast, KpiCard, PageHeader, Skeleton } from "../components/ui";
import { useApi } from "../hooks/useApi";

const icons = [IndianRupee, ReceiptText, CreditCard, Package, Users, ShoppingBasket];

export default function Dashboard() {
  const { data, loading, error } = useApi(getKpis);
  if (loading) return <div className="page"><PageHeader title="Executive dashboard" description="A complete view of retail performance across one million transactions." /><Skeleton cards={6} /></div>;
  if (!data) return <div className="page"><ErrorToast message={error} /></div>;
  return <div className="page">
    <ErrorToast message={error} />
    <PageHeader title="Executive dashboard" description="A complete view of retail performance across one million transactions." />
    <div className="kpi-grid">{data.kpis.map((kpi, i) => { const Icon = icons[i]; return <KpiCard key={kpi.label} {...kpi} icon={<Icon size={17} />} />; })}</div>
    <div className="dashboard-grid">
      <ChartCard title="Monthly Revenue" subtitle="Revenue in ₹ crore · Jan–Dec 2024" className="span-2"><AnalyticsChart type="line" data={data.monthlyRevenue} /></ChartCard>
      <ChartCard title="Revenue by Customer Type" subtitle="Share of total revenue"><AnalyticsChart type="pie" data={data.customerTypes} /></ChartCard>
      <ChartCard title="Revenue by Category" subtitle="Revenue in ₹ crore" className="span-3"><AnalyticsChart type="bar" data={data.categoryRevenue} /></ChartCard>
    </div>
    <DataTable title="Top 10 Customers" columns={["rank", "customer_id", "type", "transactions", "revenue", "avg_value"]} rows={data.topCustomers} pageSize={10} />
  </div>;
}
