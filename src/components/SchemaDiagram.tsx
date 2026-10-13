import React, { useState } from "react";
import {
  Database,
  Calendar,
  Users,
  Tag,
  Store,
  MapPin,
  Boxes,
  Key,
  Layers,
  Info,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { Button } from "./ui";

export interface ColumnDef {
  name: string;
  type: "INTEGER" | "REAL" | "TEXT";
  isPk?: boolean;
  isFk?: boolean;
  references?: string;
  isMeasure?: boolean;
  note?: string;
}

export interface TableNode {
  id: string;
  name: string;
  classification: "fact" | "dimension" | "conformed_dim" | "normalized_dim";
  isSimulated?: boolean;
  role: string;
  grain?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  columns: ColumnDef[];
}

export interface RelationshipDef {
  id: string;
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
  cardinality: "1:N";
  type: "dim_to_fact" | "outrigger" | "conformed_to_fact";
  label: string;
}

export interface SchemaArchitecture {
  id: string;
  name: string;
  subtitle: string;
  badge: string;
  summary: string;
  advantages: string[];
  tradeoffs: string[];
  canvasWidth: number;
  canvasHeight: number;
  tables: TableNode[];
  relationships: RelationshipDef[];
}

export const SCHEMA_CONFIGS: Record<string, SchemaArchitecture> = {
  "Star Schema": {
    id: "star",
    name: "Star Schema",
    subtitle: "Single central fact table surrounded by denormalized dimension tables",
    badge: "Denormalized · Single-Hop Joins · Optimized Analytical Reads",
    summary:
      "A classic dimensional model featuring FactSales at the center, directly surrounded by 4 denormalized dimensions (DimDate, DimCustomer, DimCategory, DimStore). All dimensions connect directly to FactSales via surrogate foreign keys with 1-to-many cardinality. No dimension-to-dimension relationships exist, maximizing query read throughput and simplifying analytical joins.",
    advantages: [
      "Simpler SQL queries with single-hop joins to fact table",
      "Optimal aggregation performance in OLAP and reporting tools",
      "Intuitive dimensional navigation for business analysts",
    ],
    tradeoffs: [
      "Redundant dimensional attributes (e.g., store city repeated across store records)",
      "Potential data anomalies during dimension updates compared to 3NF",
    ],
    canvasWidth: 980,
    canvasHeight: 520,
    tables: [
      {
        id: "FactSales",
        name: "FactSales",
        classification: "fact",
        role: "Central fact table storing atomic retail sales transaction measurements",
        grain: "One row per sales transaction item",
        x: 375,
        y: 130,
        width: 230,
        height: 250,
        columns: [
          { name: "sales_key", type: "INTEGER", isPk: true },
          { name: "date_key", type: "INTEGER", isFk: true, references: "DimDate.date_key" },
          { name: "customer_key", type: "INTEGER", isFk: true, references: "DimCustomer.customer_key" },
          { name: "category_key", type: "INTEGER", isFk: true, references: "DimCategory.category_key" },
          { name: "store_key", type: "INTEGER", isFk: true, references: "DimStore.store_key" },
          { name: "quantity", type: "INTEGER", isMeasure: true },
          { name: "unit_price", type: "REAL", isMeasure: true },
          { name: "total_amount", type: "REAL", isMeasure: true },
        ],
      },
      {
        id: "DimDate",
        name: "DimDate",
        classification: "dimension",
        role: "Calendar dimension hierarchy for temporal roll-up, slicing, and dicing",
        x: 40,
        y: 30,
        width: 215,
        height: 195,
        columns: [
          { name: "date_key", type: "INTEGER", isPk: true },
          { name: "full_date", type: "TEXT" },
          { name: "day", type: "INTEGER" },
          { name: "month", type: "INTEGER" },
          { name: "quarter", type: "INTEGER" },
          { name: "year", type: "INTEGER" },
        ],
      },
      {
        id: "DimCustomer",
        name: "DimCustomer",
        classification: "dimension",
        role: "Customer demographic profile and membership status",
        x: 40,
        y: 285,
        width: 215,
        height: 145,
        columns: [
          { name: "customer_key", type: "INTEGER", isPk: true },
          { name: "full_name", type: "TEXT" },
          { name: "customer_type", type: "TEXT" },
        ],
      },
      {
        id: "DimCategory",
        name: "DimCategory",
        classification: "dimension",
        role: "Merchandise product classification taxonomy",
        x: 725,
        y: 30,
        width: 215,
        height: 125,
        columns: [
          { name: "category_key", type: "INTEGER", isPk: true },
          { name: "category_name", type: "TEXT" },
        ],
      },
      {
        id: "DimStore",
        name: "DimStore",
        classification: "dimension",
        isSimulated: true,
        role: "Retail store locations and cities (denormalized for Star Schema)",
        x: 725,
        y: 285,
        width: 215,
        height: 145,
        columns: [
          { name: "store_key", type: "INTEGER", isPk: true },
          { name: "store_name", type: "TEXT" },
          { name: "city", type: "TEXT", note: "Denormalized attribute" },
        ],
      },
    ],
    relationships: [
      {
        id: "rel-date-sales",
        fromTable: "DimDate",
        fromColumn: "date_key",
        toTable: "FactSales",
        toColumn: "date_key",
        cardinality: "1:N",
        type: "dim_to_fact",
        label: "DimDate.date_key = FactSales.date_key",
      },
      {
        id: "rel-cust-sales",
        fromTable: "DimCustomer",
        fromColumn: "customer_key",
        toTable: "FactSales",
        toColumn: "customer_key",
        cardinality: "1:N",
        type: "dim_to_fact",
        label: "DimCustomer.customer_key = FactSales.customer_key",
      },
      {
        id: "rel-cat-sales",
        fromTable: "DimCategory",
        fromColumn: "category_key",
        toTable: "FactSales",
        toColumn: "category_key",
        cardinality: "1:N",
        type: "dim_to_fact",
        label: "DimCategory.category_key = FactSales.category_key",
      },
      {
        id: "rel-store-sales",
        fromTable: "DimStore",
        fromColumn: "store_key",
        toTable: "FactSales",
        toColumn: "store_key",
        cardinality: "1:N",
        type: "dim_to_fact",
        label: "DimStore.store_key = FactSales.store_key",
      },
    ],
  },

  "Snowflake Schema": {
    id: "snowflake",
    name: "Snowflake Schema",
    subtitle: "Normalized dimension hierarchy with explicit dimension-to-dimension relationships",
    badge: "Normalized 3NF Outriggers · Multi-Hop Joins · Reduced Redundancy",
    summary:
      "A normalized variation of the dimensional model where selected dimensions are decomposed into sub-tables. DimStore is normalized by removing city name redundancy into a separate DimCity outrigger table. DimStore references DimCity via city_key (FK), while FactSales joins with DimStore via store_key. Queries analyzing City-wise sales require a multi-hop join: FactSales → DimStore → DimCity.",
    advantages: [
      "Eliminates data redundancy and saves storage space in dimension tables",
      "Prevents update and insertion anomalies in shared geographic metadata",
      "Strict normalization adheres to third normal form (3NF)",
    ],
    tradeoffs: [
      "Multi-hop joins (FactSales → DimStore → DimCity) increase query complexity and execution cost",
      "More tables and foreign keys to manage in the schema",
    ],
    canvasWidth: 1040,
    canvasHeight: 530,
    tables: [
      {
        id: "FactSales",
        name: "FactSales",
        classification: "fact",
        role: "Central fact table storing atomic retail sales transaction measurements",
        grain: "One row per sales transaction item",
        x: 350,
        y: 130,
        width: 230,
        height: 250,
        columns: [
          { name: "sales_key", type: "INTEGER", isPk: true },
          { name: "date_key", type: "INTEGER", isFk: true, references: "DimDate.date_key" },
          { name: "customer_key", type: "INTEGER", isFk: true, references: "DimCustomer.customer_key" },
          { name: "category_key", type: "INTEGER", isFk: true, references: "DimCategory.category_key" },
          { name: "store_key", type: "INTEGER", isFk: true, references: "DimStore.store_key" },
          { name: "quantity", type: "INTEGER", isMeasure: true },
          { name: "unit_price", type: "REAL", isMeasure: true },
          { name: "total_amount", type: "REAL", isMeasure: true },
        ],
      },
      {
        id: "DimDate",
        name: "DimDate",
        classification: "dimension",
        role: "Calendar dimension hierarchy for temporal roll-up",
        x: 35,
        y: 30,
        width: 215,
        height: 195,
        columns: [
          { name: "date_key", type: "INTEGER", isPk: true },
          { name: "full_date", type: "TEXT" },
          { name: "day", type: "INTEGER" },
          { name: "month", type: "INTEGER" },
          { name: "quarter", type: "INTEGER" },
          { name: "year", type: "INTEGER" },
        ],
      },
      {
        id: "DimCustomer",
        name: "DimCustomer",
        classification: "dimension",
        role: "Customer demographic profile and membership classification",
        x: 35,
        y: 285,
        width: 215,
        height: 145,
        columns: [
          { name: "customer_key", type: "INTEGER", isPk: true },
          { name: "full_name", type: "TEXT" },
          { name: "customer_type", type: "TEXT" },
        ],
      },
      {
        id: "DimCategory",
        name: "DimCategory",
        classification: "dimension",
        role: "Merchandise product classification taxonomy",
        x: 650,
        y: 30,
        width: 210,
        height: 125,
        columns: [
          { name: "category_key", type: "INTEGER", isPk: true },
          { name: "category_name", type: "TEXT" },
        ],
      },
      {
        id: "DimStore",
        name: "DimStore",
        classification: "dimension",
        isSimulated: true,
        role: "Store entity normalized to reference the DimCity outrigger table",
        x: 620,
        y: 250,
        width: 190,
        height: 145,
        columns: [
          { name: "store_key", type: "INTEGER", isPk: true },
          { name: "store_name", type: "TEXT" },
          { name: "city_key", type: "INTEGER", isFk: true, references: "DimCity.city_key" },
        ],
      },
      {
        id: "DimCity",
        name: "DimCity",
        classification: "normalized_dim",
        isSimulated: true,
        role: "Normalized geographic outrigger dimension containing unique cities and regions",
        x: 845,
        y: 250,
        width: 175,
        height: 145,
        columns: [
          { name: "city_key", type: "INTEGER", isPk: true },
          { name: "city_name", type: "TEXT" },
          { name: "region", type: "TEXT" },
        ],
      },
    ],
    relationships: [
      {
        id: "rel-date-sales",
        fromTable: "DimDate",
        fromColumn: "date_key",
        toTable: "FactSales",
        toColumn: "date_key",
        cardinality: "1:N",
        type: "dim_to_fact",
        label: "DimDate.date_key = FactSales.date_key",
      },
      {
        id: "rel-cust-sales",
        fromTable: "DimCustomer",
        fromColumn: "customer_key",
        toTable: "FactSales",
        toColumn: "customer_key",
        cardinality: "1:N",
        type: "dim_to_fact",
        label: "DimCustomer.customer_key = FactSales.customer_key",
      },
      {
        id: "rel-cat-sales",
        fromTable: "DimCategory",
        fromColumn: "category_key",
        toTable: "FactSales",
        toColumn: "category_key",
        cardinality: "1:N",
        type: "dim_to_fact",
        label: "DimCategory.category_key = FactSales.category_key",
      },
      {
        id: "rel-store-sales",
        fromTable: "DimStore",
        fromColumn: "store_key",
        toTable: "FactSales",
        toColumn: "store_key",
        cardinality: "1:N",
        type: "dim_to_fact",
        label: "DimStore.store_key = FactSales.store_key",
      },
      {
        id: "rel-city-store",
        fromTable: "DimCity",
        fromColumn: "city_key",
        toTable: "DimStore",
        toColumn: "city_key",
        cardinality: "1:N",
        type: "outrigger",
        label: "DimCity.city_key = DimStore.city_key (Normalized Outrigger)",
      },
    ],
  },

  "Fact Constellation Schema": {
    id: "constellation",
    name: "Fact Constellation Schema",
    subtitle: "Multiple fact tables sharing conformed dimensions across distinct business processes",
    badge: "Galaxy Architecture · Conformed Dimensions · Cross-Process Drill-Across",
    summary:
      "Also known as a Galaxy Schema, this architecture models multiple business processes in separate fact tables. FactSales captures customer transactions, while FactInventory captures daily inventory stock balances (opening stock, received, closing stock). The two facts share conformed dimensions (DimDate, DimCategory, DimStore), enabling enterprise drill-across queries, while DimCustomer remains specific to FactSales.",
    advantages: [
      "Models multiple distinct business processes without creating a monolithic, sparse fact table",
      "Shared conformed dimensions ensure enterprise-wide metric consistency across departments",
      "Enables drill-across operations (e.g., comparing sales revenue against inventory levels by category)",
    ],
    tradeoffs: [
      "More sophisticated warehouse design requiring disciplined dimension conformance",
      "Drill-across queries require two-phase aggregation to avoid Cartesian product duplication",
    ],
    canvasWidth: 1060,
    canvasHeight: 570,
    tables: [
      {
        id: "FactSales",
        name: "FactSales",
        classification: "fact",
        role: "Primary fact table capturing customer sales transaction events",
        grain: "One row per sales item transaction",
        x: 170,
        y: 155,
        width: 220,
        height: 250,
        columns: [
          { name: "sales_key", type: "INTEGER", isPk: true },
          { name: "date_key", type: "INTEGER", isFk: true, references: "DimDate.date_key" },
          { name: "customer_key", type: "INTEGER", isFk: true, references: "DimCustomer.customer_key" },
          { name: "category_key", type: "INTEGER", isFk: true, references: "DimCategory.category_key" },
          { name: "store_key", type: "INTEGER", isFk: true, references: "DimStore.store_key" },
          { name: "quantity", type: "INTEGER", isMeasure: true },
          { name: "unit_price", type: "REAL", isMeasure: true },
          { name: "total_amount", type: "REAL", isMeasure: true },
        ],
      },
      {
        id: "FactInventory",
        name: "FactInventory",
        classification: "fact",
        isSimulated: true,
        role: "Secondary fact table capturing daily store/category stock movements",
        grain: "One row per daily store-category inventory snapshot",
        x: 690,
        y: 155,
        width: 220,
        height: 230,
        columns: [
          { name: "inventory_key", type: "INTEGER", isPk: true },
          { name: "date_key", type: "INTEGER", isFk: true, references: "DimDate.date_key" },
          { name: "category_key", type: "INTEGER", isFk: true, references: "DimCategory.category_key" },
          { name: "store_key", type: "INTEGER", isFk: true, references: "DimStore.store_key" },
          { name: "opening_stock", type: "INTEGER", isMeasure: true },
          { name: "stock_received", type: "INTEGER", isMeasure: true },
          { name: "closing_stock", type: "INTEGER", isMeasure: true },
        ],
      },
      {
        id: "DimCustomer",
        name: "DimCustomer",
        classification: "dimension",
        role: "Customer demographics (non-conformed: specific to FactSales transactions)",
        x: 10,
        y: 195,
        width: 140,
        height: 145,
        columns: [
          { name: "customer_key", type: "INTEGER", isPk: true },
          { name: "full_name", type: "TEXT" },
          { name: "customer_type", type: "TEXT" },
        ],
      },
      {
        id: "DimDate",
        name: "DimDate",
        classification: "conformed_dim",
        role: "Conformed calendar dimension shared by FactSales and FactInventory",
        x: 425,
        y: 20,
        width: 210,
        height: 165,
        columns: [
          { name: "date_key", type: "INTEGER", isPk: true },
          { name: "full_date", type: "TEXT" },
          { name: "month", type: "INTEGER" },
          { name: "year", type: "INTEGER" },
        ],
      },
      {
        id: "DimCategory",
        name: "DimCategory",
        classification: "conformed_dim",
        role: "Conformed product taxonomy shared by FactSales and FactInventory",
        x: 425,
        y: 205,
        width: 210,
        height: 125,
        columns: [
          { name: "category_key", type: "INTEGER", isPk: true },
          { name: "category_name", type: "TEXT" },
        ],
      },
      {
        id: "DimStore",
        name: "DimStore",
        classification: "conformed_dim",
        isSimulated: true,
        role: "Conformed store location dimension shared by FactSales and FactInventory",
        x: 425,
        y: 360,
        width: 210,
        height: 145,
        columns: [
          { name: "store_key", type: "INTEGER", isPk: true },
          { name: "store_name", type: "TEXT" },
          { name: "city", type: "TEXT" },
        ],
      },
    ],
    relationships: [
      {
        id: "rel-cust-sales",
        fromTable: "DimCustomer",
        fromColumn: "customer_key",
        toTable: "FactSales",
        toColumn: "customer_key",
        cardinality: "1:N",
        type: "dim_to_fact",
        label: "DimCustomer.customer_key = FactSales.customer_key (Sales Only)",
      },
      {
        id: "rel-date-sales",
        fromTable: "DimDate",
        fromColumn: "date_key",
        toTable: "FactSales",
        toColumn: "date_key",
        cardinality: "1:N",
        type: "conformed_to_fact",
        label: "DimDate.date_key = FactSales.date_key (Conformed Join)",
      },
      {
        id: "rel-date-inv",
        fromTable: "DimDate",
        fromColumn: "date_key",
        toTable: "FactInventory",
        toColumn: "date_key",
        cardinality: "1:N",
        type: "conformed_to_fact",
        label: "DimDate.date_key = FactInventory.date_key (Conformed Join)",
      },
      {
        id: "rel-cat-sales",
        fromTable: "DimCategory",
        fromColumn: "category_key",
        toTable: "FactSales",
        toColumn: "category_key",
        cardinality: "1:N",
        type: "conformed_to_fact",
        label: "DimCategory.category_key = FactSales.category_key (Conformed Join)",
      },
      {
        id: "rel-cat-inv",
        fromTable: "DimCategory",
        fromColumn: "category_key",
        toTable: "FactInventory",
        toColumn: "category_key",
        cardinality: "1:N",
        type: "conformed_to_fact",
        label: "DimCategory.category_key = FactInventory.category_key (Conformed Join)",
      },
      {
        id: "rel-store-sales",
        fromTable: "DimStore",
        fromColumn: "store_key",
        toTable: "FactSales",
        toColumn: "store_key",
        cardinality: "1:N",
        type: "conformed_to_fact",
        label: "DimStore.store_key = FactSales.store_key (Conformed Join)",
      },
      {
        id: "rel-store-inv",
        fromTable: "DimStore",
        fromColumn: "store_key",
        toTable: "FactInventory",
        toColumn: "store_key",
        cardinality: "1:N",
        type: "conformed_to_fact",
        label: "DimStore.store_key = FactInventory.store_key (Conformed Join)",
      },
    ],
  },
};

function getTableIcon(name: string, classification: string) {
  if (classification === "fact") return <Database size={14} className="text-emerald-700" />;
  if (name.includes("Date")) return <Calendar size={14} className="text-amber-700" />;
  if (name.includes("Customer")) return <Users size={14} className="text-blue-700" />;
  if (name.includes("Category")) return <Tag size={14} className="text-purple-700" />;
  if (name.includes("City")) return <MapPin size={14} className="text-cyan-700" />;
  if (name.includes("Store")) return <Store size={14} className="text-orange-700" />;
  if (name.includes("Inventory")) return <Boxes size={14} className="text-teal-700" />;
  return <Layers size={14} className="text-gray-600" />;
}

export default function SchemaDiagram({
  selectedSchema = "Star Schema",
  selectedQuery = "City-wise sales",
  onSelectQuery,
  executedSql,
}: {
  selectedSchema?: string;
  selectedQuery?: string;
  onSelectQuery?: (query: string) => void;
  executedSql?: string;
}) {
  const [hoveredRel, setHoveredRel] = useState<string | null>(null);
  const [hoveredTable, setHoveredTable] = useState<string | null>(null);

  // Normalize schema key
  let normalizedKey = "Star Schema";
  if (selectedSchema.toLowerCase().includes("snow")) {
    normalizedKey = "Snowflake Schema";
  } else if (
    selectedSchema.toLowerCase().includes("constell") ||
    selectedSchema.toLowerCase().includes("galaxy")
  ) {
    normalizedKey = "Fact Constellation Schema";
  }

  const config = SCHEMA_CONFIGS[normalizedKey] ?? SCHEMA_CONFIGS["Star Schema"];

  // Calculate connector path between table boundaries
  function calculatePath(rel: RelationshipDef) {
    const from = config.tables.find((t) => t.id === rel.fromTable);
    const to = config.tables.find((t) => t.id === rel.toTable);
    if (!from || !to) return null;

    let x1 = from.x + from.width;
    let y1 = from.y + from.height / 2;
    let x2 = to.x;
    let y2 = to.y + to.height / 2;

    // Adjust anchor points depending on relative positions
    if (from.x > to.x + to.width) {
      // From is to the right of To
      x1 = from.x;
      x2 = to.x + to.width;
    } else if (Math.abs(from.x - to.x) < 100) {
      // Stacked vertically
      if (from.y < to.y) {
        x1 = from.x + from.width / 2;
        y1 = from.y + from.height;
        x2 = to.x + to.width / 2;
        y2 = to.y;
      } else {
        x1 = from.x + from.width / 2;
        y1 = from.y;
        x2 = to.x + to.width / 2;
        y2 = to.y + to.height;
      }
    } else if (from.x < to.x) {
      // From is to the left of To
      x1 = from.x + from.width;
      x2 = to.x;
    }

    // Special layout adjustments for aesthetic routing in Constellation / Snowflake
    if (rel.id === "rel-date-sales") {
      x1 = from.x + 20;
      y1 = from.y + from.height;
      x2 = to.x + to.width - 20;
      y2 = to.y;
    } else if (rel.id === "rel-date-inv") {
      x1 = from.x + from.width - 20;
      y1 = from.y + from.height;
      x2 = to.x + 20;
      y2 = to.y;
    } else if (rel.id === "rel-store-sales" && config.id === "constellation") {
      x1 = from.x + 20;
      y1 = from.y;
      x2 = to.x + to.width - 20;
      y2 = to.y + to.height;
    } else if (rel.id === "rel-store-inv" && config.id === "constellation") {
      x1 = from.x + from.width - 20;
      y1 = from.y;
      x2 = to.x + 20;
      y2 = to.y + to.height;
    } else if (rel.id === "rel-cat-sales" && config.id === "constellation") {
      x1 = from.x;
      y1 = from.y + from.height / 2;
      x2 = to.x + to.width;
      y2 = to.y + to.height / 2;
    } else if (rel.id === "rel-cat-inv" && config.id === "constellation") {
      x1 = from.x + from.width;
      y1 = from.y + from.height / 2;
      x2 = to.x;
      y2 = to.y + to.height / 2;
    } else if (rel.id === "rel-city-store") {
      x1 = from.x;
      y1 = from.y + 40;
      x2 = to.x + to.width;
      y2 = to.y + 40;
    }

    // Curvature calculation
    const dx = x2 - x1;
    const dy = y2 - y1;
    let cx1 = x1 + dx * 0.5;
    let cy1 = y1;
    let cx2 = x1 + dx * 0.5;
    let cy2 = y2;

    if (Math.abs(dx) < 30) {
      cx1 = x1 + (dy > 0 ? 30 : -30);
      cy1 = y1 + dy * 0.5;
      cx2 = x2 + (dy > 0 ? 30 : -30);
      cy2 = y2 - dy * 0.5;
    }

    const d = `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;

    return { x1, y1, x2, y2, d, midX, midY };
  }

  const queries = [
    "City-wise sales",
    "Category-wise sales",
    "Monthly sales",
    "Customer-wise sales",
    "Inventory vs Sales by Category",
  ];

  return (
    <div className="schema-architecture-container" style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
      {/* Schema Header & Architecture Context */}
      <div
        style={{
          background: "linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%)",
          border: "1px solid #bbf7d0",
          borderRadius: "12px",
          padding: "16px 20px",
          boxShadow: "0 2px 6px rgba(16, 185, 129, 0.05)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700, color: "#14532d" }}>
                {config.name}
              </h3>
              <span
                style={{
                  background: "#dcfce7",
                  color: "#166534",
                  border: "1px solid #86efac",
                  padding: "3px 10px",
                  borderRadius: "9999px",
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  letterSpacing: "0.03em",
                }}
              >
                {config.badge}
              </span>
            </div>
            <p style={{ margin: "5px 0 0", color: "#374151", fontSize: "0.85rem", lineHeight: 1.5 }}>
              {config.summary}
            </p>
          </div>
        </div>

        {/* Legend */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "14px",
            marginTop: "12px",
            paddingTop: "12px",
            borderTop: "1px solid #e5e7eb",
            fontSize: "0.74rem",
            color: "#4b5563",
          }}
        >
          <span style={{ fontWeight: 600, color: "#111827" }}>Legend & Visual Cues:</span>
          <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <span style={{ width: "9px", height: "9px", borderRadius: "50%", background: "#059669" }} />
            <strong>Fact Table</strong> (Central Measures)
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <span style={{ width: "9px", height: "9px", borderRadius: "50%", background: "#3b82f6" }} />
            <strong>Dimension Table</strong> (Descriptive Context)
          </span>
          {config.id === "snowflake" && (
            <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <span style={{ width: "9px", height: "9px", borderRadius: "50%", background: "#06b6d4" }} />
              <strong>Normalized Outrigger (3NF)</strong>
            </span>
          )}
          {config.id === "constellation" && (
            <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <span style={{ width: "9px", height: "9px", borderRadius: "50%", background: "#8b5cf6" }} />
              <strong>Conformed Dimension (Shared)</strong>
            </span>
          )}
          <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <span style={{ background: "#fef3c7", color: "#92400e", padding: "1px 4px", borderRadius: "3px", fontWeight: 700, fontSize: "0.68rem" }}>PK</span>
            Primary Key
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <span style={{ background: "#dbeafe", color: "#1e40af", padding: "1px 4px", borderRadius: "3px", fontWeight: 700, fontSize: "0.68rem" }}>FK</span>
            Foreign Key
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <span style={{ border: "1px solid #10b981", borderRadius: "50%", width: "16px", height: "16px", display: "inline-grid", placeItems: "center", fontSize: "0.65rem", fontWeight: 700, color: "#065f46" }}>1</span>
            →
            <span style={{ border: "1px solid #10b981", borderRadius: "50%", width: "16px", height: "16px", display: "inline-grid", placeItems: "center", fontSize: "0.65rem", fontWeight: 700, color: "#065f46" }}>*</span>
            One-to-Many Relationship
          </span>
        </div>
      </div>

      {/* Interactive Graph Canvas */}
      <div
        className="schema-canvas-wrapper"
        style={{
          background: "#f9fafb",
          border: "1px solid #e5e7eb",
          borderRadius: "14px",
          padding: "16px",
          overflowX: "auto",
          boxShadow: "inset 0 1px 3px rgba(0,0,0,0.02)",
        }}
      >
        <div
          style={{
            position: "relative",
            width: `${config.canvasWidth}px`,
            height: `${config.canvasHeight}px`,
            margin: "0 auto",
            userSelect: "none",
          }}
        >
          {/* SVG Relationship Connector Lines */}
          <svg
            className="schema-connectors-svg"
            width={config.canvasWidth}
            height={config.canvasHeight}
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              zIndex: 5,
            }}
          >
            <defs>
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#059669" floodOpacity="0.3" />
              </filter>
            </defs>

            {config.relationships.map((rel) => {
              const pathData = calculatePath(rel);
              if (!pathData) return null;

              const isHighlighted =
                hoveredRel === rel.id ||
                hoveredTable === rel.fromTable ||
                hoveredTable === rel.toTable;

              let strokeColor = "#059669";
              if (rel.type === "outrigger") strokeColor = "#0284c7";
              if (rel.type === "conformed_to_fact") strokeColor = "#7c3aed";

              return (
                <g key={rel.id} style={{ transition: "all 0.2s ease" }}>
                  {/* Background shadow stroke for visibility */}
                  <path
                    d={pathData.d}
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth={isHighlighted ? 6 : 4}
                    strokeLinecap="round"
                  />
                  {/* Foreground relationship line */}
                  <path
                    d={pathData.d}
                    fill="none"
                    stroke={isHighlighted ? "#047857" : strokeColor}
                    strokeWidth={isHighlighted ? 3.5 : 2}
                    strokeDasharray={rel.type === "outrigger" ? "5 3" : undefined}
                    strokeLinecap="round"
                    filter={isHighlighted ? "url(#glow)" : undefined}
                  />

                  {/* Cardinality Badge "1" at Dimension PK end */}
                  <g transform={`translate(${pathData.x1}, ${pathData.y1})`}>
                    <circle r="9" fill={strokeColor} stroke="#ffffff" strokeWidth="2" />
                    <text
                      textAnchor="middle"
                      dy="3.5"
                      fill="#ffffff"
                      fontSize="9"
                      fontWeight="bold"
                    >
                      1
                    </text>
                  </g>

                  {/* Cardinality Badge "*" at Fact/Referencing FK end */}
                  <g transform={`translate(${pathData.x2}, ${pathData.y2})`}>
                    <circle r="9" fill={strokeColor} stroke="#ffffff" strokeWidth="2" />
                    <text
                      textAnchor="middle"
                      dy="4"
                      fill="#ffffff"
                      fontSize="11"
                      fontWeight="bold"
                    >
                      *
                    </text>
                  </g>

                  {/* Hover join label badge */}
                  {isHighlighted && (
                    <g transform={`translate(${pathData.midX}, ${pathData.midY - 14})`}>
                      <rect
                        x="-100"
                        y="-10"
                        width="200"
                        height="20"
                        rx="4"
                        fill="#111827"
                        opacity="0.9"
                      />
                      <text
                        textAnchor="middle"
                        dy="3"
                        fill="#f9fafb"
                        fontSize="9"
                        fontWeight="600"
                      >
                        {rel.label}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Table Cards */}
          {config.tables.map((tbl) => {
            const isFact = tbl.classification === "fact";
            const isConformed = tbl.classification === "conformed_dim";
            const isNormalized = tbl.classification === "normalized_dim";
            const isHovered = hoveredTable === tbl.id;

            return (
              <div
                key={tbl.id}
                onMouseEnter={() => setHoveredTable(tbl.id)}
                onMouseLeave={() => setHoveredTable(null)}
                style={{
                  position: "absolute",
                  left: `${tbl.x}px`,
                  top: `${tbl.y}px`,
                  width: `${tbl.width}px`,
                  zIndex: isHovered ? 20 : 10,
                  background: "#ffffff",
                  borderRadius: "10px",
                  boxShadow: isHovered
                    ? "0 10px 25px -5px rgba(0,0,0,0.15), 0 0 0 2px #059669"
                    : isFact
                    ? "0 4px 12px rgba(16, 185, 129, 0.15), 0 0 0 2px #10b981"
                    : isConformed
                    ? "0 4px 12px rgba(139, 92, 246, 0.12), 0 0 0 1.5px #a78bfa"
                    : isNormalized
                    ? "0 4px 12px rgba(6, 182, 212, 0.12), 0 0 0 1.5px #67e8f9"
                    : "0 2px 8px rgba(0,0,0,0.06), 0 0 0 1px #e5e7eb",
                  transition: "all 0.15s ease",
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                }}
              >
                {/* Table Header */}
                <div
                  style={{
                    padding: "8px 10px",
                    background: isFact
                      ? "linear-gradient(135deg, #065f46 0%, #047857 100%)"
                      : isConformed
                      ? "linear-gradient(135deg, #5b21b6 0%, #6d28d9 100%)"
                      : isNormalized
                      ? "linear-gradient(135deg, #0e7490 0%, #0891b2 100%)"
                      : "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
                    borderBottom: `1px solid ${isFact ? "#047857" : "#e2e8f0"}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <div
                      style={{
                        padding: "3px",
                        borderRadius: "5px",
                        background: isFact || isConformed || isNormalized ? "rgba(255,255,255,0.2)" : "#ffffff",
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      {getTableIcon(tbl.name, tbl.classification)}
                    </div>
                    <strong
                      style={{
                        fontSize: "0.82rem",
                        color: isFact || isConformed || isNormalized ? "#ffffff" : "#1e293b",
                        fontWeight: 700,
                      }}
                    >
                      {tbl.name}
                    </strong>
                  </div>

                  <div style={{ display: "flex", gap: "4px" }}>
                    {tbl.isSimulated && (
                      <span
                        title="Simulated dimension entity modeled for educational warehouse schema comparison"
                        style={{
                          fontSize: "0.6rem",
                          fontWeight: 700,
                          background: "#fef3c7",
                          color: "#92400e",
                          padding: "1px 5px",
                          borderRadius: "4px",
                        }}
                      >
                        Simulated
                      </span>
                    )}
                    <span
                      style={{
                        fontSize: "0.6rem",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.03em",
                        background: isFact
                          ? "#34d399"
                          : isConformed
                          ? "#c4b5fd"
                          : isNormalized
                          ? "#a5f3fc"
                          : "#e2e8f0",
                        color: isFact ? "#064e3b" : isConformed ? "#4c1d95" : isNormalized ? "#164e63" : "#334155",
                        padding: "1px 5px",
                        borderRadius: "4px",
                      }}
                    >
                      {isFact
                        ? "Fact"
                        : isConformed
                        ? "Conformed"
                        : isNormalized
                        ? "Outrigger"
                        : "Dimension"}
                    </span>
                  </div>
                </div>

                {/* Table Columns */}
                <div style={{ padding: "6px 8px", display: "flex", flexDirection: "column", gap: "4px", fontSize: "0.72rem" }}>
                  {tbl.columns.map((col) => (
                    <div
                      key={col.name}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "2px 4px",
                        borderRadius: "4px",
                        background: col.isPk
                          ? "rgba(254, 243, 199, 0.45)"
                          : col.isFk
                          ? "rgba(219, 234, 254, 0.35)"
                          : col.isMeasure
                          ? "rgba(220, 252, 231, 0.35)"
                          : "transparent",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                        {col.isPk ? (
                          <span
                            title="Primary Key"
                            style={{
                              background: "#f59e0b",
                              color: "#ffffff",
                              fontSize: "0.58rem",
                              fontWeight: 800,
                              padding: "0 3px",
                              borderRadius: "3px",
                            }}
                          >
                            PK
                          </span>
                        ) : col.isFk ? (
                          <span
                            title={`Foreign Key -> ${col.references}`}
                            style={{
                              background: "#2563eb",
                              color: "#ffffff",
                              fontSize: "0.58rem",
                              fontWeight: 800,
                              padding: "0 3px",
                              borderRadius: "3px",
                            }}
                          >
                            FK
                          </span>
                        ) : col.isMeasure ? (
                          <span
                            title="Measurable Metric"
                            style={{
                              background: "#10b981",
                              color: "#ffffff",
                              fontSize: "0.58rem",
                              fontWeight: 800,
                              padding: "0 3px",
                              borderRadius: "3px",
                            }}
                          >
                            M
                          </span>
                        ) : (
                          <span style={{ width: "14px", height: "1px" }} />
                        )}

                        <span
                          style={{
                            fontWeight: col.isPk || col.isFk ? 700 : 500,
                            color: col.isPk ? "#78350f" : col.isFk ? "#1e3a8a" : col.isMeasure ? "#065f46" : "#374151",
                          }}
                        >
                          {col.name}
                        </span>
                      </div>

                      <span style={{ fontSize: "0.62rem", color: "#9ca3af", fontFamily: "monospace" }}>
                        {col.type}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Table Role Footer Note */}
                <div
                  style={{
                    padding: "4px 8px",
                    background: "#f9fafb",
                    borderTop: "1px solid #f3f4f6",
                    fontSize: "0.64rem",
                    color: "#6b7280",
                    lineHeight: 1.25,
                  }}
                >
                  {tbl.role}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Interactive Query Runner Buttons */}
      <div
        style={{
          background: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: "12px",
          padding: "14px 18px",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
          <div>
            <strong style={{ fontSize: "0.85rem", color: "#111827" }}>
              Execute Analysis Query against {config.name}:
            </strong>
            <span style={{ fontSize: "0.78rem", color: "#6b7280", marginLeft: "8px" }}>
              Selecting a query runs the warehouse join path matching this schema.
            </span>
          </div>
          <span style={{ fontSize: "0.75rem", color: "#059669", fontWeight: 600 }}>
            Active Query: {selectedQuery}
          </span>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {queries.map((q) => {
            const isActive = selectedQuery.toLowerCase() === q.toLowerCase();
            return (
              <Button
                key={q}
                variant={isActive ? "primary" : "secondary"}
                onClick={() => {
                  if (onSelectQuery) onSelectQuery(q);
                }}
                className={isActive ? "" : "text-xs"}
              >
                {isActive ? `✓ ${q}` : `Run: ${q}`}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Dynamic Table Metadata & Schema Specifications */}
      <div
        style={{
          background: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: "12px",
          padding: "16px 20px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
          <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: "#111827", display: "flex", alignItems: "center", gap: "6px" }}>
            <Layers size={16} className="text-emerald-700" />
            Dynamic Schema Metadata & Table Specifications ({config.tables.length} Tables)
          </h4>
          <span style={{ fontSize: "0.75rem", color: "#6b7280" }}>
            Source of Truth: DMart Dimensional Warehouse Model
          </span>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "0.78rem",
              textAlign: "left",
            }}
          >
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0", color: "#475569" }}>
                <th style={{ padding: "8px 10px" }}>Table Name</th>
                <th style={{ padding: "8px 10px" }}>Classification</th>
                <th style={{ padding: "8px 10px" }}>Primary Key</th>
                <th style={{ padding: "8px 10px" }}>Foreign Keys / References</th>
                <th style={{ padding: "8px 10px" }}>Key Measures / Attributes</th>
                <th style={{ padding: "8px 10px" }}>Data Warehouse Role & Join Path</th>
              </tr>
            </thead>
            <tbody>
              {config.tables.map((t, idx) => {
                const pkCol = t.columns.find((c) => c.isPk);
                const fkCols = t.columns.filter((c) => c.isFk);
                const measureCols = t.columns.filter((c) => c.isMeasure);
                const attrCols = t.columns.filter((c) => !c.isPk && !c.isFk && !c.isMeasure);

                return (
                  <tr
                    key={t.id}
                    style={{
                      borderBottom: "1px solid #f1f5f9",
                      background: idx % 2 === 0 ? "#ffffff" : "#fafafa",
                    }}
                  >
                    <td style={{ padding: "8px 10px", fontWeight: 700, color: "#0f172a" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        {getTableIcon(t.name, t.classification)}
                        <span>{t.name}</span>
                        {t.isSimulated && (
                          <span style={{ fontSize: "0.6rem", background: "#fef3c7", color: "#92400e", padding: "1px 4px", borderRadius: "3px" }}>
                            Simulated
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: "8px 10px" }}>
                      <span
                        style={{
                          fontSize: "0.68rem",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          background:
                            t.classification === "fact"
                              ? "#dcfce7"
                              : t.classification === "conformed_dim"
                              ? "#ede9fe"
                              : t.classification === "normalized_dim"
                              ? "#cffafe"
                              : "#f1f5f9",
                          color:
                            t.classification === "fact"
                              ? "#166534"
                              : t.classification === "conformed_dim"
                              ? "#5b21b6"
                              : t.classification === "normalized_dim"
                              ? "#155e75"
                              : "#334155",
                        }}
                      >
                        {t.classification.replace("_", " ")}
                      </span>
                    </td>
                    <td style={{ padding: "8px 10px", fontFamily: "monospace", color: "#b45309", fontWeight: 700 }}>
                      {pkCol ? pkCol.name : "None"}
                    </td>
                    <td style={{ padding: "8px 10px", fontSize: "0.72rem" }}>
                      {fkCols.length > 0 ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                          {fkCols.map((fk) => (
                            <span key={fk.name} style={{ fontFamily: "monospace", color: "#1d4ed8" }}>
                              {fk.name} → {fk.references}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span style={{ color: "#9ca3af" }}>None (Root Dimension)</span>
                      )}
                    </td>
                    <td style={{ padding: "8px 10px", fontSize: "0.72rem" }}>
                      {measureCols.length > 0 ? (
                        <span style={{ color: "#047857", fontWeight: 600 }}>
                          Measures: {measureCols.map((m) => m.name).join(", ")}
                        </span>
                      ) : (
                        <span style={{ color: "#475569" }}>
                          Attrs: {attrCols.map((a) => a.name).join(", ")}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "8px 10px", color: "#475569", fontSize: "0.74rem", lineHeight: 1.35 }}>
                      {t.role}
                      {t.grain && <div style={{ color: "#047857", fontWeight: 500 }}>Grain: {t.grain}</div>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
