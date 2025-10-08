from pydantic import BaseModel
from typing import List, Optional

class ModelLoadRequest(BaseModel):
    """Request model for loading a specific model file."""
    filename: str

class ModelMetadata(BaseModel):
    """Response model for displaying loaded model metadata."""
    model_type_and_architecture: str
    num_classes: Optional[int] = None
    class_labels: Optional[List[str]] = None
    sample_rate: Optional[int] = None
    num_trainable_parameters: int
    model_loading_timestamp: str
    confidence_level: Optional[str] = "Low (metadata inferred from model structure)"