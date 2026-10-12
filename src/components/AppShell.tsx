import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router";
import {
  BarChart3, Boxes, ChevronLeft, ChevronRight, FlaskConical, LayoutDashboard,
  Lightbulb, Menu, Network, PanelLeftClose, Search, Sparkles, Store, Target, Users,
} from "lucide-react";
import { DatasetChip } from "./ui";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/exploration", label: "Data Exploration", icon: Search },
  { to: "/sales", label: "Sales Analysis", icon: BarChart3 },
  { to: "/market-basket", label: "Market Basket", icon: Network },
  { to: "/segmentation", label: "Customer Segmentation", icon: Users },
  { to: "/prediction", label: "Prediction", icon: Target },
  { to: "/insights", label: "Insights", icon: Lightbulb },
];
const labs = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12];
const names: Record<string, string> = { "/": "Dashboard", "/exploration": "Data Exploration", "/sales": "Sales Analysis", "/market-basket": "Market Basket", "/segmentation": "Customer Segmentation", "/prediction": "Prediction", "/insights": "Insights" };

export default function AppShell() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const title = location.pathname.startsWith("/labs/") ? `Experiment · Lab ${location.pathname.split("/").pop()}` : names[location.pathname] ?? "DMart Analytics";
  return <div className="app-shell">
    <aside className={collapsed ? "sidebar collapsed" : "sidebar"}>
      <div className="brand"><div className="brand-mark"><Store size={21} /></div><div className="brand-copy"><strong>DMart</strong><span>Retail Analytics</span></div></div>
      <nav>
        <div className="nav-list">{nav.map((item) => <NavLink key={item.to} to={item.to} end={item.to === "/"} title={item.label}><item.icon size={18} /><span>{item.label}</span></NavLink>)}</div>
        <div className="nav-group"><div className="nav-label"><FlaskConical size={14} /><span>Experiments</span></div>{labs.map((lab) => <NavLink key={lab} to={`/labs/${lab}`}><span className="lab-dot">{lab}</span><span>Lab {lab}</span></NavLink>)}</div>
      </nav>
      <button className="collapse-button" onClick={() => setCollapsed(!collapsed)}>{collapsed ? <ChevronRight size={18} /> : <><PanelLeftClose size={17} /><span>Collapse sidebar</span></>}</button>
    </aside>
    <div className="main-shell">
      <header className="topbar"><div><Menu className="mobile-menu" size={20} /><span className="top-title">{title}</span></div><DatasetChip /></header>
      <main><Outlet /></main>
    </div>
  </div>;
}
