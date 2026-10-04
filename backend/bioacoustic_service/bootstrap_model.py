"""
bootstrap_model.py
Creates and saves a valid pest_audio_model.h5 with the correct architecture.
No training data required — the model is initialised with random weights.
The heuristic in the frontend supplements it for real analysis.
"""
import numpy as np
import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Conv2D, MaxPooling2D, Flatten, Dense, Dropout, GlobalAveragePooling2D, BatchNormalization
import os, sys

MODEL_PATH = "pest_audio_model.h5"
INPUT_SHAPE = (128, 1723, 1)

print("Building model architecture...")
model = Sequential([
    Conv2D(16, (3, 3), activation="relu", padding="same", input_shape=INPUT_SHAPE),
    BatchNormalization(),
    MaxPooling2D((2, 2)),
    Conv2D(32, (3, 3), activation="relu", padding="same"),
    BatchNormalization(),
    MaxPooling2D((2, 2)),
    Conv2D(64, (3, 3), activation="relu", padding="same"),
    MaxPooling2D((4, 4)),
    GlobalAveragePooling2D(),
    Dense(64, activation="relu"),
    Dropout(0.5),
    Dense(1, activation="sigmoid"),
])
model.compile(optimizer="adam", loss="binary_crossentropy", metrics=["accuracy"])
model.summary()

# Quick sanity-fit on 4 synthetic samples so weights are proper floats (not NaN)
print("\nInitialising weights with 1-step synthetic fit...")
X = np.random.rand(4, *INPUT_SHAPE).astype(np.float32) * 0.01
y = np.array([0, 1, 0, 1], dtype=np.float32)
model.fit(X, y, epochs=1, batch_size=4, verbose=0)

if os.path.exists(MODEL_PATH):
    os.remove(MODEL_PATH)
model.save(MODEL_PATH)
size_kb = os.path.getsize(MODEL_PATH) / 1024
print(f"\n✓ Saved {MODEL_PATH}  ({size_kb:.0f} KB)")
