from fastapi import APIRouter, UploadFile, File, HTTPException
import os
from app.models.model_schemas import ModelLoadRequest
# Correct, absolute import of the singleton instance
from app.services.model_services import model_loader

router = APIRouter()
UPLOAD_DIRECTORY = "./temp_uploads"
os.makedirs(UPLOAD_DIRECTORY, exist_ok=True)
MAX_FILE_SIZE = 500 * 1024 * 1024

@router.post("/upload", tags=["Model Management"])
async def upload_model(file: UploadFile = File(...)):
    if not (file.filename.endswith(".pt") or file.filename.endswith(".pth")):
        raise HTTPException(status_code=400, detail="Invalid file format. Only .pt or .pth files are allowed.")

    file_path = os.path.join(UPLOAD_DIRECTORY, file.filename)
    
    try:
        with open(file_path, "wb") as buffer:
            content = await file.read()
            if len(content) > MAX_FILE_SIZE:
                os.remove(file_path)
                raise HTTPException(status_code=413, detail=f"File size exceeds the limit.")
            buffer.write(content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"There was an error uploading the file: {e}")
    finally:
        await file.close()

    return { "message": "Model uploaded successfully", "filename": file.filename }

@router.post("/load", tags=["Model Management"])
def load_model(request: ModelLoadRequest):
    try:
        metadata = model_loader.load_model(request.filename)
        return metadata
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))