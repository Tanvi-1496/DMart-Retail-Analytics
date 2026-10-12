import { useState } from "react";
import { getSegmentation } from "../api/client";
import { AnalyticsChart } from "../components/charts";
import { Card, ChartCard, ErrorToast, PageHeader, RangeField, Skeleton } from "../components/ui";
import { useApi } from "../hooks/useApi";

export default function Segmentation() {
  const { data, loading, error } = useApi(getSegmentation);
  const [k, setK] = useState(4);
  const [auto, setAuto] = useState(true);
  if (loading) return <div className="page"><PageHeader title="Customer segmentation" description="Discover customer groups using K-Means clustering." /><Skeleton /></div>;
  if (!data) return <div className="page"><ErrorToast message={error} /></div>;
  return <div className="page">
    <ErrorToast message={error} /><PageHeader title="Customer segmentation" description="Discover customer groups using K-Means clustering." actions={<Card className="inline-control"><RangeField label="Clusters (K)" value={k} min={2} max={8} onChange={setK} /><label className="toggle"><input type="checkbox" checked={auto} onChange={() => setAuto(!auto)} /><span />Auto (Elbow)</label></Card>} />
    <div className="two-col chart-tall"><ChartCard title="Elbow method" subtitle="Within-cluster sum of squares"><AnalyticsChart type="line" data={data.elbow} /></ChartCard><ChartCard title="Customer clusters" subtitle="Annual spend vs transaction frequency"><AnalyticsChart type="scatter" data={data.points} /></ChartCard></div>
    <div className="profile-grid">{data.profiles.map((profile) => <Card className="profile-card" key={profile.name}><div className="profile-top"><span className="cluster-dot" style={{ background: profile.color }} /><strong>{profile.name}</strong></div><div className="profile-value">{profile.customers.toLocaleString()}</div><small>customers</small><dl><div><dt>Avg spend</dt><dd>{profile.spend}</dd></div><div><dt>Avg transactions</dt><dd>{profile.transactions}</dd></div></dl></Card>)}</div>
    <ChartCard title="Cluster size" subtitle="Customers per segment"><AnalyticsChart type="bar" data={data.profiles.map((p) => ({ name: p.name, value: p.customers }))} /></ChartCard>
  </div>;
}
