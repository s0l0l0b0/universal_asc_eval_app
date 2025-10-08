import torch
import librosa
import numpy as np
import os
import uuid
import shutil
from fastapi import UploadFile
from typing import List, Dict

# Correct, absolute import of the singleton instance
from app.services.model_services import model_loader, ModelServiceError

TEMP_AUDIO_DIR = "./temp_audio_uploads"
os.makedirs(TEMP_AUDIO_DIR, exist_ok=True)

# We can reuse the error class from the model service for consistency
AudioServiceError = ModelServiceError

def predict_audio_file(file_path: str) -> dict:
    """
    Core prediction function. Takes a file path, loads it, and returns a prediction.
    """
    try:
        model, metadata = model_loader.get_model()
    except Exception as e:
        raise AudioServiceError(str(e))
        
    try:
        target_sr = metadata.sample_rate if metadata.sample_rate else 16000
        audio, sr = librosa.load(file_path, sr=target_sr, mono=True)
        
        mel_spectrogram = librosa.feature.melspectrogram(y=audio, sr=sr, n_mels=128, n_fft=2048, hop_length=512)
        target_width = 512
        if mel_spectrogram.shape[1] < target_width:
            mel_spectrogram = np.pad(mel_spectrogram, ((0, 0), (0, target_width - mel_spectrogram.shape[1])), mode='constant')
        else:
            mel_spectrogram = mel_spectrogram[:, :target_width]
            
        log_mel_spectrogram = librosa.power_to_db(mel_spectrogram, ref=np.max)
        input_tensor = torch.from_numpy(log_mel_spectrogram).float().unsqueeze(0).unsqueeze(0)
    except Exception as e:
        print(f"[ERROR] Librosa/PyTorch processing failed: {e}")
        raise AudioServiceError(f"Failed to process audio file: {e}")
        
    with torch.no_grad():
        output = model(input_tensor)
        
    probabilities = torch.nn.functional.softmax(output, dim=1)[0]
    top_prob, top_idx = torch.max(probabilities, 0)
    predicted_class_index = top_idx.item()
    confidence = top_prob.item()
    
    class_labels = metadata.class_labels if metadata.class_labels else []
    
    if predicted_class_index < len(class_labels):
        predicted_class = class_labels[predicted_class_index]
    else:
        predicted_class = f"Class_{predicted_class_index}"
        
    all_class_confidences = {}
    for i, prob in enumerate(probabilities):
        label = class_labels[i] if i < len(class_labels) else f"Class_{i}"
        all_class_confidences[label] = prob.item()
        
    return {
        "predicted_class": predicted_class,
        "confidence": round(confidence, 4),
        "all_class_confidences": all_class_confidences
    }

def process_batch_files_sequentially(files: List[UploadFile]) -> List[Dict]:
    """
    Processes a batch of audio files one by one to conserve memory.
    """
    results = []
    print("\n--- Starting Sequential Batch Processing ---")
    for i, file in enumerate(files):
        temp_file_path = os.path.join(TEMP_AUDIO_DIR, f"{uuid.uuid4()}_{file.filename}")
        print(f"Processing file {i+1}/{len(files)}: {file.filename}")
        try:
            with open(temp_file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            print(f"  - Saved to temp file.")
            
            prediction_result = predict_audio_file(temp_file_path)
            print(f"  - Prediction successful: {prediction_result['predicted_class']}")
            results.append({
                "filename": file.filename,
                "status": "success",
                "prediction": prediction_result,
                "error_message": None
            })
        except Exception as e:
            print(f"  - FAILED to process file. Error: {e}")
            results.append({
                "filename": file.filename,
                "status": "error",
                "prediction": None,
                "error_message": str(e)
            })
        finally:
            if os.path.exists(temp_file_path):
                os.remove(temp_file_path)
    
    print("--- Sequential Batch Processing Complete ---\n")
    return results