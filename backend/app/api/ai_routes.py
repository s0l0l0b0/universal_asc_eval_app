from typing import List, Optional
from fastapi import APIRouter, HTTPException, Body, Query, Header
from app.services import ai_service
from app.models.ai_schemas import AISummaryResponse
from app.models.evaluation_schemas import EvaluationResponse
from app.models.audio_schemas import BatchResultItem

router = APIRouter()

@router.post("/summary", tags=["AI Analysis"], response_model=AISummaryResponse)
async def get_ai_summary(
    evaluation_data: EvaluationResponse = Body(...),
    provider: str = Query("openai", description="The AI provider to use: 'openai', 'anthropic', or 'deepseek'"),
    x_api_key: Optional[str] = Header(None, alias="X-API-Key", description="API key for the selected provider")
):
    """
    Generates an intelligent evaluation summary using an external AI service.
    Takes a full evaluation report as input.
    
    The API key can be provided via the X-API-Key header. If not provided,
    the server will fall back to environment variable configuration.
    """
    try:
        summary_html = await ai_service.generate_summary(evaluation_data, provider, api_key=x_api_key)
        return {"summary_html": summary_html}
    except ai_service.AIServiceError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An unexpected server error occurred: {e}")

@router.post("/summarize_predictions", tags=["AI Analysis"], response_model=AISummaryResponse)
async def get_ai_prediction_summary(
    results: List[BatchResultItem] = Body(...),
    provider: str = Query("openai", description="The AI provider to use."),
    x_api_key: Optional[str] = Header(None, alias="X-API-Key", description="API key for the selected provider")
):
    """
    Generates a qualitative summary for a list of batch predictions.
    Does not include accuracy or other formal metrics.
    
    The API key can be provided via the X-API-Key header. If not provided,
    the server will fall back to environment variable configuration.
    """
    try:
        # Convert Pydantic models to dicts for the service
        results_dict = [result.model_dump() for result in results]
        summary_html = await ai_service.generate_batch_summary(results_dict, provider, api_key=x_api_key)
        return {"summary_html": summary_html}
    except ai_service.AIServiceError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An unexpected server error occurred: {e}")
