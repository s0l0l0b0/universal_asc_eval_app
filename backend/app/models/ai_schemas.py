from pydantic import BaseModel
from app.models.evaluation_schemas import EvaluationResponse

class AISummaryRequest(BaseModel):
    """The request body for generating an AI summary. It contains the full evaluation report."""
    evaluation_data: EvaluationResponse

class AISummaryResponse(BaseModel):
    """The response containing the AI-generated HTML summary."""
    summary_html: str