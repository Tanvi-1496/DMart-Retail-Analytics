import { AlertCircle, CheckCircle2, Lightbulb, Sparkles, TrendingUp } from "lucide-react";
import { getInsights } from "../api/client";
import { Card, ErrorToast, PageHeader, Skeleton } from "../components/ui";
import { useApi } from "../hooks/useApi";

export default function Insights() {
  const { data, loading, error } = useApi(getInsights);
  if (loading) return <div className="page"><PageHeader title="Insights" description="Automatically generated signals from the latest analytics run." /><Skeleton cards={5} /></div>;
  if (!data) return <div className="page"><ErrorToast message={error} /></div>;
  const icons = { positive: TrendingUp, attention: AlertCircle, neutral: Sparkles };
  return <div className="page">
    <ErrorToast message={error} /><PageHeader title="Insights" description="Automatically generated signals from the latest analytics run." />
    <div className="insights-layout"><div className="insight-list">{data.insights.map((insight) => { const Icon = icons[insight.tone]; return <Card className="insight-card" key={insight.title}><div className={`insight-icon ${insight.tone}`}><Icon size={19} /></div><div><h2>{insight.title}</h2><p>{insight.sentence}</p><span>{insight.metric}</span></div></Card>; })}</div>
    <Card className="recommendations"><div className="recommendation-head"><div className="icon-box"><Lightbulb size={18} /></div><div><h2>Recommendations</h2><p>Prioritized actions based on current patterns</p></div></div>{data.recommendations.map((item) => <label key={item}><input type="checkbox" /><CheckCircle2 size={18} /><span>{item}</span></label>)}</Card></div>
  </div>;
}
