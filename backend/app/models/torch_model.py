import torch
import torch.nn as nn

# A robust CNN that dynamically calculates its final layer size.
class SimpleCNN(nn.Module):
    def __init__(self, num_classes=10):
        super(SimpleCNN, self).__init__()
        
        # Define the convolutional part of the model (the "feature extractor")
        self.features = nn.Sequential(
            nn.Conv2d(1, 8, kernel_size=5),
            nn.ReLU(),
            nn.MaxPool2d(2),
            nn.Conv2d(8, 16, kernel_size=5),
            nn.ReLU(),
            nn.MaxPool2d(2)
        )
        
        # Create a dummy input to calculate the output shape of the conv layers
        dummy_input = torch.randn(1, 1, 128, 512) # A typical input size
        conv_output_size = self._get_conv_output_shape(dummy_input)
        
        # Define the classification part of the model
        self.classifier = nn.Sequential(
            nn.Flatten(),
            nn.Linear(conv_output_size, num_classes)
        )

    def _get_conv_output_shape(self, x):
        # Pass the dummy input through the feature extractor layers
        output = self.features(x)
        # Flatten the output and get its size
        return output.flatten(1).shape[1]

    def forward(self, x):
        # The forward pass is now cleaner
        x = self.features(x)
        x = self.classifier(x)
        return x