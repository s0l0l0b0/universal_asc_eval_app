from pydantic import BaseModel, Field
from typing import List, Dict, Union

class ClassMetrics(BaseModel):
    """Metrics for a single class (precision, recall, f1-score)."""
    precision: float
    recall: float
    f1_score: float = Field(alias="f1-score")
    support: int

class EvaluationReport(BaseModel):
    """Detailed classification report including metrics for each class."""
    # The keys will be class names or 'macro avg', 'weighted avg'
    report: Dict[str, Union[ClassMetrics, Dict[str, float]]]

class EvaluationResponse(BaseModel):
    """The final, comprehensive response for a model evaluation request."""
    overall_accuracy: float
    classification_report: Dict[str, Union[ClassMetrics, Dict[str, float]]]
    confusion_matrix: List[List[int]]
    dataset_statistics: Dict[str, int]

