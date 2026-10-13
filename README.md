# DMart Retail Analytics using Data Warehousing and Data Mining (DWM)

A full-stack, enterprise-grade analytical platform and research lab suite built for academic and practical study in Data Warehousing and Data Mining (DWM).

The platform models retail transactions into a dimensional Star Schema with Fact Constellation extensions, provides interactive OLAP navigational operations, and implements data mining workflows spanning regression, classification, clustering, association rule mining, and atmospheric time-series forecasting.

---

## 1. System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                 React + TypeScript + Vite UI               │
│     (Executive Dashboard, OLAP Explorer, 12 Lab Runners)    │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP / REST (VITE_API_URL)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                     FastAPI Backend Server                  │
│       • Request Validation (Pydantic)                       │
│       • CORS Whitelisting & Secure Error Handling           │
│       • Analytical Engines (scikit-learn, mlxtend, SciPy)   │
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │
               ▼ (Live SQL)                   ▼ (Local Fallback)
┌──────────────────────────────┐   ┌──────────────────────────┐
│     Supabase PostgreSQL      │   │    SQLite Dimensional    │
│   (Star Schema Warehouse)    │   │         Warehouse        │
│   • dim_date, dim_customer   │   │  (Seamless zero-config   │
│   • dim_category, dim_store  │   │     offline fallback)    │
│   • fact_sales, fact_inv     │   └──────────────────────────┘
└──────────────────────────────┘
```

---

## 2. Repository Structure

```
DMart/
├── backend/
│   ├── app/
│   │   ├── main.py                     # FastAPI application entrypoint & lifespan
│   │   ├── config.py                   # Pydantic environment configuration
│   │   ├── db.py                       # PostgreSQL / SQLite dimensional warehouse manager
│   │   ├── schemas/                    # Pydantic schemas (RunResult, OLAP, etc.)
│   │   │   ├── common.py
│   │   │   └── olap.py
│   │   ├── routers/                    # Documented API route controllers
│   │   │   ├── health.py               # Health check and warehouse status
│   │   │   ├── datasets.py             # Dataset discovery and CSV audit
│   │   │   ├── dashboard.py            # KPI metrics and executive dashboard
│   │   │   ├── exploration.py          # Summary statistics, previews, filters
│   │   │   ├── olap.py                 # Multidimensional OLAP operations
│   │   │   ├── visualization.py        # Aggregated and sampled visual encodings
│   │   │   ├── insights.py             # Automatic dynamic business signals
│   │   │   ├── prediction.py           # Regression, classification, and forecast
│   │   │   ├── segmentation.py         # Customer segmentation engine
│   │   │   ├── market_basket.py        # Apriori association rule mining
│   │   │   └── labs.py                 # Unified runner for Labs 1 through 12
│   │   └── services/                   # Modular data mining & OLAP services
│   │       ├── data_loader.py          # High-speed batch warehouse loading
│   │       ├── dashboard_service.py    # Live SQL KPI aggregations
│   │       ├── olap_service.py         # Roll-up, Drill-down, Slice, Dice, Pivot, CUBE
│   │       ├── visualization_service.py# Histograms, Box plots, Scatters, Bar charts
│   │       ├── regression_service.py   # Simple & Multiple linear regression (Lab 4)
│   │       ├── decision_tree_service.py# Mutual info & Entropy decision tree (Lab 5)
│   │       ├── naive_bayes_service.py  # Gaussian Naive Bayes classification (Lab 6)
│   │       ├── clustering_service.py   # K-Means (Lab 7), Agglomerative (Lab 8), Mall (Lab 12)
│   │       ├── apriori_service.py      # Apriori frequent itemsets & rules (Lab 9)
│   │       ├── mini_project_service.py # WEKA-style data mining pipeline (Lab 10)
│   │       ├── aqi_service.py          # Beijing AQI Random Forest regression (Lab 11)
│   │       └── observations.py         # Dynamic observation & warning generator
│   ├── scripts/
│   │   ├── init_db.py                  # Database initialization script
│   │   └── load_dataset.py             # CLI bulk loader for 1M-row DMart CSV
│   ├── tests/                          # Automated pytest integration test suite
│   │   ├── test_health.py
│   │   ├── test_dashboard.py
│   │   ├── test_olap.py
│   │   ├── test_mining.py
│   │   └── test_labs.py
│   ├── requirements.txt                # Python backend dependencies
│   └── .env.example                    # Backend environment template
├── database/
│   ├── migrations/
│   │   └── 001_initial_schema.sql      # Initial schema migration
│   ├── schema.sql                      # Star schema DDL
│   ├── indexes.sql                     # Performance indexes on foreign keys
│   ├── views.sql                       # Analytical views (monthly, category, store)
│   └── seed_simulated.sql              # Initial dimension seed data
├── data/
│   ├── dmart_sample_data.csv           # 10,000-row clean DMart retail dataset
│   ├── mall_customers.csv              # Mall Customers dataset (200 rows)
│   ├── beijing_aqi_sample.csv          # Beijing air quality dataset (1,500 rows)
│   └── lab10_dmart_cleaned.csv         # WEKA mini-project benchmark dataset (1,000 rows)
├── src/                                # React 19 + TypeScript + Vite frontend
│   ├── api/client.ts                   # Integrated API client communicating with FastAPI
│   ├── screens/                        # Dashboard, Exploration, Sales, Labs, etc.
│   └── components/                     # Recharts wrappers, UI primitives, LabRunner
├── run_backend.bat                     # Windows 1-click backend startup script
├── run_frontend.bat                    # Windows 1-click frontend startup script
└── README.md
```

---

## 3. Quick Start (Windows / macOS / Linux)

### Prerequisites
- **Python 3.11+** (Python 3.12, 3.13, 3.14 supported)
- **Node.js 20+** and **npm**

### Step 1: Install Dependencies

#### Backend:
```bash
# In the project root:
py -m pip install -r backend/requirements.txt
```

#### Frontend:
```bash
# In the project root:
npm install
```

### Step 2: Configure Environment

Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

If connecting to a Supabase PostgreSQL instance, set `DATABASE_URL` in `.env`:
```env
DATABASE_URL=postgresql://postgres.[YOUR-PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?sslmode=require
```
*(If left empty, the system automatically runs on the integrated high-performance SQLite dimensional warehouse with zero manual setup!)*

### Step 3: Run the Application

#### Option A: 1-Click Launchers (Windows)
Double-click `run_backend.bat` in one window, and `run_frontend.bat` in a second window.

#### Option B: Terminal Commands

**Terminal 1 — Backend (FastAPI):**
```bash
py -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```
- API Endpoint: `http://127.0.0.1:8000`
- Interactive Swagger UI: `http://127.0.0.1:8000/docs`

**Terminal 2 — Frontend (Vite):**
```bash
npm run dev
```
- Web Application: `http://localhost:5173`

---

## 4. Bulk Loading the 1,000,000-Row DMart Dataset

The system includes a dedicated bulk loader in `backend/scripts/load_dataset.py`.

### 1. Audit Dataset Quality (Without inserting):
```bash
py backend/scripts/load_dataset.py --csv "path/to/DMart_sample_data (1).csv" --audit-only
```
This generates a detailed validation report:
- Column verification (Date, Time, CustomerType, ProductCategory, UnitPrice, Quantity, Total, FullName)
- Day-first date parsing (DD-MM-YYYY)
- Math discrepancy audit (`Total == UnitPrice × Quantity`)
- Null count & duplicate row detection

### 2. High-Speed Bulk Load:
```bash
py backend/scripts/load_dataset.py --csv "path/to/DMart_sample_data (1).csv" --batch-size 10000
```
Uses single-transaction batch execution (`executemany` / COPY) to stream 1M rows into `dim_date`, `dim_customer`, `dim_category`, `dim_store`, and `fact_sales` within seconds.

---

## 5. Automated Test Suite

A complete test suite verifies all API endpoints and every individual lab:

```bash
py -m pytest -v backend/tests
```

### Verified Test Matrix (36 Test Cases Passing 100%):
- `test_health.py`: Root greeting, `/health` and `/api/health` status, warehouse connectivity, dataset inventory
- `test_dashboard.py`: Dashboard KPIs, multi-parameter filtered dashboard, dynamic filter options (`/api/datasets/options`), exploration summary, paginated query search, dynamic insights, and OLAP star schema overview
- `test_olap.py`: Schema tables, samples, and all OLAP operations:
  - Roll-up, Drill-down, Slice, Dice, Pivot, Drill-across, CUBE, GROUPING SETS
- `test_mining.py`: Linear regression, decision tree classification, monthly forecasting, customer segmentation, Apriori mining
- `test_labs.py`: Unified parameterized execution verifying all Practical Labs 1 through 12, plus boundary testing for invalid lab inputs

---

## 6. Comprehensive Overview of Practical Labs 1–12

| Lab | Title | Dataset Used | Techniques & Implemented Logic |
| :---: | :--- | :--- | :--- |
| **1** | **Data Warehouse Design** | DMart | Interactive Star Schema, Snowflake, and Fact Constellation analysis. Executes live dimensional queries on FactSales. Clearly discloses simulated store/city dimensions. |
| **2** | **OLAP Operations** | DMart | Multidimensional navigational operations: Roll-up, Drill-down, Slice, Dice, Pivot, CUBE, GROUPING SETS, and multi-fact Drill-Across against FactInventory. |
| **3** | **Data Visualization** | DMart | Aggregated and sampled visual encodings: Bar, Line, Pie, Histogram, Box Plot, and Scatter series with dynamic variance observations. |
| **4** | **Linear Regression** | DMart | Simple & Multiple Linear Regression. Evaluates MAE, MSE, RMSE, and R². Accurately flags target leakage when predicting `Total` from `UnitPrice × Quantity`. |
| **5** | **Attribute Relevance & Decision Tree** | DMart | Mutual Information scoring & Information Gain ranking. Trains an entropy-criterion decision tree with configurable depth. Evaluates weighted precision, recall, and F1. |
| **6** | **Naive Bayes Classification** | DMart | Gaussian Naive Bayes modeling customer tier classification. Computes confusion matrices, class prior distributions, and stratified validation metrics. |
| **7** | **K-Means Clustering** | DMart | Multidimensional partitioning on UnitPrice, Quantity, and Total. Features StandardScaler, dynamic Elbow curve (inertia), Silhouette analysis, and centroids back-transformed into Indian Rupees. |
| **8** | **Agglomerative Clustering** | Mall Customers (200 rows) | Hierarchical clustering on Annual Income vs Spending Score. Supports Ward, Complete, Average, and Single linkage criteria with dendrogram data representation. |
| **9** | **Apriori Association Mining** | DMart | Discovers frequent itemsets and association rules using `mlxtend`. Configurable support and confidence thresholds. Reports lift multipliers and cross-merchandising affinities. Discloses (Customer, Date) proxy basket limitation. |
| **10**| **WEKA-Style Mini Project** | Lab 10 Dataset (1,000 rows) | 4-step pipeline: (1) Data preprocessing & discretization, (2) J48-style Decision Tree vs Naive Bayes comparative benchmarking, (3) K-Means segmentation (k=3), and (4) Association mining. |
| **11**| **Beijing AQI Prediction** | Beijing Air Quality (1,500 rows) | Atmospheric air quality regression using Random Forest. Implements EPA sub-index breakpoints for PM2.5/PM10. Uses strict chronological 80/20 train/test split without shuffling to preserve time ordering. |
| **12**| **Customer Segmentation** | Mall Customers (200 rows) | 2D behavioral segmentation. Groups shoppers into actionable personas (High Value, Loyal, Occasional, At Risk). Generates empirical marketing recommendations derived from cluster centroid coordinates. |

---

## 7. Security and Integrity Commitments

- **No Secrets in Code**: No API keys, database passwords, or credentials are hardcoded into Git.
- **SQL Injection Prevention**: Parameterized queries and strict identifier whitelists are enforced on all dimensional queries.
- **Simulated Dimension Disclosure**: Clearly flags simulated geographic stores and simulated inventory facts with notice banners to maintain academic integrity.
- **Auditable Quality**: Zero silent data suppression. Discrepancies and limitations are surfaced in standard response warnings.
