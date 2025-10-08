import os
import uuid
import zipfile
import shutil
from fastapi import UploadFile
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix

from app.services.model_services import model_loader, ModelServiceError
from app.services import audio_service

EVALUATION_TEMP_DIR = "./temp_evaluation"
os.makedirs(EVALUATION_TEMP_DIR, exist_ok=True)

class EvaluationServiceError(Exception):
    """Custom exception for evaluation service errors."""
    pass

async def run_evaluation(zip_file: UploadFile) -> dict:
    """
    Orchestrates the entire model evaluation process.
    """
    # 1. Get the currently loaded model and metadata
    try:
        model, metadata = model_loader.get_current_model()
        if metadata.class_labels:
            model_class_labels = sorted(metadata.class_labels)
        elif metadata.num_classes:
            model_class_labels = [f"Class_{i}" for i in range(metadata.num_classes)]
        else:
            raise EvaluationServiceError("Cannot run evaluation: Model has no class labels or number of classes defined.")
    except ModelServiceError as e:
        raise EvaluationServiceError(str(e))

    # 2. Unzip the uploaded dataset to a temporary location
    eval_session_id = str(uuid.uuid4())
    unzip_path = os.path.join(EVALUATION_TEMP_DIR, eval_session_id)
    os.makedirs(unzip_path)

    try:
        with zipfile.ZipFile(zip_file.file, 'r') as zf:
            zf.extractall(unzip_path)

        # 3. Parse dataset and validate against model labels (REQ-004-1)
        filepaths, true_labels = _parse_dataset(unzip_path, model_class_labels)
        
        if not filepaths:
            raise EvaluationServiceError("Dataset is empty or has an invalid structure.")

        # 4. Run prediction on each file
        predicted_labels = []
        for file_path in filepaths:
            try:
                result = audio_service.predict_audio_file(file_path)
                predicted_labels.append(result["predicted_class"])
            except audio_service.AudioServiceError:
                # If a single file fails, we'll skip it for the report
                # but a more robust implementation might log this.
                continue

        # 5. Calculate evaluation metrics (REQ-004-2)
        accuracy = accuracy_score(true_labels, predicted_labels)
        report = classification_report(true_labels, predicted_labels, labels=model_class_labels, output_dict=True)
        matrix = confusion_matrix(true_labels, predicted_labels, labels=model_class_labels)

        # 6. Format and return the results
        return {
            "overall_accuracy": accuracy,
            "classification_report": report,
            "confusion_matrix": matrix.tolist(), # Convert numpy array to list
            "dataset_statistics": {
                "total_files": len(filepaths),
                "files_per_class": {label: true_labels.count(label) for label in model_class_labels}
            }
        }
    finally:
        # 7. Clean up the unzipped files
        if os.path.exists(unzip_path):
            shutil.rmtree(unzip_path)


def _parse_dataset(base_path: str, model_class_labels: list) -> tuple[list, list]:
    """
    Walks the unzipped directory, validates subfolders, and collects file paths and labels.
    """
    filepaths = []
    true_labels = []
    supported_formats = (".wav", ".mp3", ".m4a", ".flac")

    dataset_folders = [d for d in os.listdir(base_path) if os.path.isdir(os.path.join(base_path, d))]

    # REQ-004-1: Validate that folder names match model class labels
    for folder in dataset_folders:
        if folder not in model_class_labels:
            raise EvaluationServiceError(f"Dataset folder '{folder}' does not match any of the model's class labels.")

    for root, _, files in os.walk(base_path):
        for file in files:
            if file.lower().endswith(supported_formats):
                class_label = os.path.basename(root)
                if class_label in model_class_labels:
                    filepaths.append(os.path.join(root, file))
                    true_labels.append(class_label)
    
    return filepaths, true_labels

