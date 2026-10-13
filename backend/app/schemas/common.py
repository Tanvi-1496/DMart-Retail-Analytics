from typing import List, Dict, Any, Optional, Literal
from pydantic import BaseModel, Field

class TableResult(BaseModel):
    name: str
    columns: List[str]
    rows: List[Dict[str, Any]]

class ChartResult(BaseModel):
    type: Literal["bar", "line", "pie", "scatter", "heatmap", "histogram", "tree", "dendrogram", "network"]
    title: str
    series: List[Dict[str, Any]]

class MetaResult(BaseModel):
    rows_used: int = 0
    runtime_ms: int = 0
    seed: int = 42
    sql: Optional[str] = None
    dataset_metadata: Optional[Dict[str, Any]] = None
    tree_data: Optional[Dict[str, Any]] = None

class RunResult(BaseModel):
    lab: Optional[int] = None
    status: str = "success"
    params: Optional[Dict[str, Any]] = None
    tables: List[TableResult] = []
    charts: List[ChartResult] = []
    metrics: Dict[str, Any] = {}
    observations: List[str] = []
    warnings: List[str] = []
    sql: Optional[str] = None
    meta: MetaResult = Field(default_factory=MetaResult)
    tree_data: Optional[Dict[str, Any]] = None
    dataset_metadata: Optional[Dict[str, Any]] = None

class Kpi(BaseModel):
    label: str
    value: str
    change: str
    trend: Literal["up", "neutral", "down"] = "up"

class Insight(BaseModel):
    title: str
    sentence: str
    metric: str
    tone: Literal["positive", "attention", "neutral"] = "neutral"
