from pydantic import BaseModel, Field
from typing import List, Optional, Dict



class SinglePredictionResult(BaseModel):
    """Defines the structure for a single audio file prediction."""
    predicted_class: str
    confidence: float
    all_class_confidences: Dict[str, float]


class BatchResultItem(BaseModel):
    """Defines the structure for a single item in a batch processing result."""
    filename: str
    status: str = Field(..., description="Either 'success' or 'error'")
    prediction: Optional[SinglePredictionResult] = None
    error_message: Optional[str] = None


class BatchProcessingResponse(BaseModel):
    """The final response structure for a batch processing request."""
    results: List[BatchResultItem]