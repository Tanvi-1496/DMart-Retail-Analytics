from typing import Optional, List, Dict, Any
from pydantic import BaseModel

class OlapRequest(BaseModel):
    category: Optional[str] = "All categories"
    customerType: Optional[str] = "All customer types"
    dimension: Optional[str] = "Category"
    measure: Optional[str] = "Revenue"
    city: Optional[str] = "All cities"

class PredictionRequest(BaseModel):
    type: Optional[str] = "Multiple"
    features: Optional[List[str]] = ["UnitPrice", "Quantity"]
    test_size: Optional[float] = 0.2
    target: Optional[str] = "Total"
    category: Optional[str] = "All categories"

class LabRunRequest(BaseModel):
    params: Optional[Dict[str, Any]] = None
