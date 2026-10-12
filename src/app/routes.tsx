import { createBrowserRouter } from "react-router";
import AppShell from "../components/AppShell";
import Dashboard from "../screens/Dashboard";
import DataExploration from "../screens/DataExploration";
import SalesAnalysis from "../screens/SalesAnalysis";
import MarketBasket from "../screens/MarketBasket";
import Segmentation from "../screens/Segmentation";
import Prediction from "../screens/Prediction";
import Insights from "../screens/Insights";
import LabPage from "../screens/LabPage";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: AppShell,
    children: [
      { index: true, Component: Dashboard },
      { path: "exploration", Component: DataExploration },
      { path: "sales", Component: SalesAnalysis },
      { path: "market-basket", Component: MarketBasket },
      { path: "segmentation", Component: Segmentation },
      { path: "prediction", Component: Prediction },
      { path: "insights", Component: Insights },
      { path: "labs/:labNumber", Component: LabPage },
    ],
  },
]);
