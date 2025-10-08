import torch
import torch.nn as nn
import torch.optim as optim
# Using your intentional 'torch_model' filename
from app.models.torch_model import SimpleCNN

DCASE_CLASS_LABELS = [
    "Airport", "Bus", "Metro", "Metro station", "Park", 
    "Public square", "Shopping mall", "Street, pedestrian", 
    "Street, traffic", "Tram"
]

NUM_CLASSES = len(DCASE_CLASS_LABELS)
SAMPLE_RATE = 16000
OUTPUT_FILENAME = "trained_model.pth"
EPOCHS = 20 # A small number for quick training

if __name__ == "__main__":
    print(f"--- Training a small model with DCASE labels for {EPOCHS} batches ---")
    
    model = SimpleCNN(num_classes=NUM_CLASSES)
    optimizer = optim.Adam(model.parameters(), lr=0.001)
    criterion = nn.CrossEntropyLoss()

    print("Generating fake training data...")
    fake_inputs = torch.randn(EPOCHS, 4, 1, 128, 512)
    fake_labels = torch.randint(0, NUM_CLASSES, (EPOCHS, 4))

    print("Training...")
    model.train()
    for i in range(EPOCHS):
        optimizer.zero_grad()
        outputs = model(fake_inputs[i])
        loss = criterion(outputs, fake_labels[i])
        loss.backward()
        optimizer.step()
        if (i + 1) % 5 == 0:
            print(f"  Batch {i+1}/{EPOCHS}, Loss: {loss.item():.4f}")

    model.eval()
    print("Training complete.")

    print(f"\nSaving model and metadata to '{OUTPUT_FILENAME}'...")
    torch.save({
        'model_state_dict': model.state_dict(),
        'num_classes': NUM_CLASSES,
        'class_labels': DCASE_CLASS_LABELS,
        'sample_rate': SAMPLE_RATE,
    }, OUTPUT_FILENAME)
    
    print(f"\n✓ Success! Model and DCASE metadata saved to '{OUTPUT_FILENAME}'")