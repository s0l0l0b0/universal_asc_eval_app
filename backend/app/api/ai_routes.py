from typing import List
from fastapi import APIRouter, HTTPException, Body, Query
from app.services import ai_service
from app.models.ai_schemas import AISummaryResponse
from app.models.evaluation_schemas import EvaluationResponse
from app.models.audio_schemas import BatchResultItem

router = APIRouter()

@router.post("/summary", tags=["AI Analysis"], response_model=AISummaryResponse)
async def get_ai_summary(
    evaluation_data: EvaluationResponse = Body(...),
    provider: str = Query("openai", description="The AI provider to use: 'openai', 'anthropic', or 'deepseek'")
):
    """
    Generates an intelligent evaluation summary using an external AI service.
    Takes a full evaluation report as input.
    """
    try:
        summary_html = await ai_service.generate_summary(evaluation_data, provider)
        return {"summary_html": summary_html}
    except ai_service.AIServiceError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An unexpected server error occurred: {e}")

@router.post("/summarize_predictions", tags=["AI Analysis"], response_model=AISummaryResponse)
async def get_ai_prediction_summary(
    results: List[BatchResultItem] = Body(...),
    provider: str = Query("openai", description="The AI provider to use.")
):
    """
    Generates a qualitative summary for a list of batch predictions.
    Does not include accuracy or other formal metrics.
    """
    try:
        # Convert Pydantic models to dicts for the service
        results_dict = [result.model_dump() for result in results]
        summary_html = await ai_service.generate_batch_summary(results_dict, provider)
        return {"summary_html": summary_html}
    except ai_service.AIServiceError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An unexpected server error occurred: {e}")