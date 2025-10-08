from pydantic import BaseModel
from typing import List
from app.models.audio_schemas import BatchResultItem
from app.models.evaluation_schemas import EvaluationResponse
from app.models.ai_schemas import AISummaryResponse

class BatchExportRequest(BaseModel):
    """Data required to export batch processing results."""
    results: List[BatchResultItem]

class EvaluationExportRequest(BaseModel):
    """Data required to export a full evaluation report."""
    evaluation_data: EvaluationResponse
    ai_summary: AISummaryResponse