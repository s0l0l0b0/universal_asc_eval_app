from fastapi import APIRouter, UploadFile, File, HTTPException
from typing import List
from app.services import audio_service
from app.models.audio_schemas import SinglePredictionResult, BatchProcessingResponse

router = APIRouter()

# This endpoint no longer needs to be async, as the service will run sequentially
@router.post("/predict", tags=["Audio Classification"], response_model=SinglePredictionResult)
def predict_single_file(file: UploadFile = File(...)):
    # This function's logic is simple and can stay as is, but we make it synchronous
    # for consistency. The service will handle temp files.
    try:
        result = audio_service.predict_single_uploaded_file(file)
        return result
    except audio_service.AudioServiceError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {e}")

# This endpoint also becomes synchronous
@router.post("/batch", tags=["Audio Classification"], response_model=BatchProcessingResponse)
def predict_batch(files: List[UploadFile] = File(...)):
    """
    Accepts multiple audio files and processes them SEQUENTIALLY to save memory.
    """
    try:
        batch_results = audio_service.process_batch_files_sequentially(files)
        return {"results": batch_results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An unexpected server error occurred during batch processing: {e}")