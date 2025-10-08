from fastapi import APIRouter, UploadFile, File, HTTPException
from app.services import evaluation_service
from app.models.evaluation_schemas import EvaluationResponse


router = APIRouter()

@router.post("/run", tags=["Model Evaluation"], response_model=EvaluationResponse)
async def run_model_evaluation(file: UploadFile = File(...)):
    """
    Accepts a .zip file of a labeled dataset, runs evaluation, and returns a
    comprehensive report.
    
    The .zip file must have a structure where each subdirectory is named after a
    class label, e.g.:
    - dataset.zip
      - /cat/
        - meow1.wav
        - meow2.wav
      - /dog/
        - bark1.wav
    """
    if not file.filename.lower().endswith(".zip"):
        raise HTTPException(status_code=400, detail="Invalid file format. Only .zip files are allowed.")

    try:
        result = await evaluation_service.run_evaluation(file)
        return result
    except evaluation_service.EvaluationServiceError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An unexpected server error occurred during evaluation: {e}")
    
