import torch
import os
from datetime import datetime
from app.models.model_schemas import ModelMetadata
from app.models.torch_model import SimpleCNN

UPLOAD_DIRECTORY = "./temp_uploads"

class ModelServiceError(Exception):
    """Custom exception for model service errors."""
    pass

class ModelLoaderSingleton:
    _instance = None
    _model = None
    _metadata = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(ModelLoaderSingleton, cls).__new__(cls)
        return cls._instance

    def load_model(self, filename: str) -> ModelMetadata:
        """
        Loads a model and stores it internally within the singleton instance.
        """
        file_path = os.path.join(UPLOAD_DIRECTORY, filename)
        if not os.path.exists(file_path):
            raise ModelServiceError(f"Model file not found: {filename}")

        try:
            print("\n[DEBUG] Attempting to load model file with Singleton...\n")
            loaded_file = torch.load(file_path, map_location=torch.device('cpu'))
            
            if isinstance(loaded_file, dict) and 'model_state_dict' in loaded_file:
                print("[DEBUG] Detected state dict checkpoint.")
                num_classes = loaded_file.get('num_classes')
                if num_classes is None:
                    raise ModelServiceError("Invalid checkpoint. Dictionary must contain 'num_classes'.")

                model = SimpleCNN(num_classes=num_classes)
                model.load_state_dict(loaded_file['model_state_dict'])
                model.eval()

                class_labels = loaded_file.get('class_labels')
                sample_rate = loaded_file.get('sample_rate', 16000)
                confidence = "High (metadata included in file)"

            elif isinstance(loaded_file, torch.jit.ScriptModule):
                print("[DEBUG] Detected TorchScript model.")
                model = loaded_file
                model.eval()
                
                try:
                    final_layer = list(model.classifier.children())[-1]
                    num_classes = final_layer.out_features
                except Exception:
                    raise ModelServiceError("Cannot determine number of classes from this TorchScript model.")
                
                class_labels = [f"Class_{i}" for i in range(num_classes)]
                sample_rate = 16000
                confidence = "Medium (TorchScript model, metadata inferred)"
            
            else:
                raise ModelServiceError(f"Unsupported model format.")

            architecture = str(model)
            params = sum(p.numel() for p in model.parameters() if p.requires_grad)

            metadata = ModelMetadata(
                model_type_and_architecture=architecture,
                num_classes=num_classes,
                class_labels=class_labels,
                sample_rate=sample_rate,
                num_trainable_parameters=params,
                model_loading_timestamp=datetime.utcnow().isoformat(),
                confidence_level=confidence
            )

            self._model = model
            self._metadata = metadata
            
            return metadata

        except Exception as e:
            self._model = None
            self._metadata = None
            raise ModelServiceError(f"Failed to load or inspect the model: {e}")

    def get_model(self):
        """Returns the currently loaded model and its metadata from the instance."""
        if self._model is None or self._metadata is None:
            raise ModelServiceError("No model is currently loaded. Please load a model first.")
        return self._model, self._metadata

# Create the single, importable instance of the loader
model_loader = ModelLoaderSingleton()