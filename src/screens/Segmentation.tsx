import { useCallback, useState } from "react";
import { getSegmentation } from "../api/client";
import { AnalyticsChart } from "../components/charts";
import { Card, ChartCard, ErrorToast, PageHeader, RangeField, Skeleton } from "../components/ui";
import { useApi } from "../hooks/useApi";
import type { SegmentationData } from "../types";

export default function Segmentation() {
  const [k, setK] = useState(4);
  const [auto, setAuto] = useState(false);

  const loader = useCallback(() => getSegmentation(k, auto), [k, auto]);
  const { data, loading, error, refetch } = useApi<SegmentationData>(loader, [k, auto]);

  return (
    <div className="page">
      <ErrorToast message={error} onRetry={refetch} />

      <PageHeader
        title="Customer segmentation"
        description="Discover customer groups using K-Means clustering on the Mall Customers benchmark dataset."
        actions={
          <Card className="inline-control">
            <RangeField label="Clusters (K)" value={k} min={2} max={8} onChange={(val) => { setAuto(false); setK(val); }} />
            <label className="toggle" style={{ cursor: "pointer" }}>
              <input type="checkbox" checked={auto} onChange={() => setAuto(!auto)} />
              <span />
              Auto (Elbow k=4)
            </label>
          </Card>
        }
      />

      {loading && !data ? (
        <Skeleton cards={4} />
      ) : data ? (
        <>
          <div className="two-col chart-tall">
            <ChartCard title="Elbow method" subtitle="Within-cluster sum of squares (Inertia) vs K">
              <AnalyticsChart type="line" data={data.elbow} />
            </ChartCard>
            <ChartCard title="Customer clusters" subtitle="Annual spend vs transaction frequency / score">
              <AnalyticsChart type="scatter" data={data.points} />
            </ChartCard>
          </div>

          <div className="profile-grid" style={{ marginTop: "20px" }}>
            {data.profiles.map((profile) => (
              <Card className="profile-card" key={profile.name}>
                <div className="profile-top">
                  <span className="cluster-dot" style={{ background: profile.color }} />
                  <strong>{profile.name}</strong>
                </div>
                <div className="profile-value">{profile.customers.toLocaleString()}</div>
                <small>representative shoppers</small>
                <dl>
                  <div>
                    <dt>Avg spend</dt>
                    <dd>{profile.spend}</dd>
                  </div>
                  <div>
                    <dt>Frequency / Score</dt>
                    <dd>{profile.transactions}</dd>
                  </div>
                </dl>
              </Card>
            ))}
          </div>

          <div style={{ marginTop: "20px" }}>
            <ChartCard title="Segment distribution" subtitle="Shoppers per identified customer archetype">
              <AnalyticsChart
                type="bar"
                data={data.profiles.map((p) => ({ name: p.name, value: p.customers }))}
              />
            </ChartCard>
          </div>
        </>
      ) : null}
    </div>
  );
}
