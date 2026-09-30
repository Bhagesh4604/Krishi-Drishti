import sys, os, warnings, json
sys.stdout.reconfigure(encoding='utf-8')
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'
warnings.filterwarnings('ignore')

import numpy as np
import tensorflow as tf
from pathlib import Path
from sklearn.metrics import classification_report, accuracy_score

# Paths
BASE_DIR = Path(__file__).parent.parent.parent
MODEL_PATH = BASE_DIR / "backend" / "ml_models" / "plant_disease_efficientnet.h5"
LABELS_PATH = BASE_DIR / "backend" / "ml_models" / "class_labels_disease.json"
PLANTVILLAGE = Path(r'C:\Users\bhage\.cache\kagglehub\datasets\emmarex\plantdisease\versions\1\PlantVillage')

IMG_SIZE = 224
BATCH_SIZE = 64

print("==================================================")
print("Krishi-Drishti: Evaluating EfficientNetB0 Model")
print("==================================================")

# 1. Load Model & Labels
print(f"Building native model architecture...")
from tensorflow.keras.applications import EfficientNetB0
from tensorflow.keras import layers

base = EfficientNetB0(input_shape=(IMG_SIZE, IMG_SIZE, 3), include_top=False, weights=None)
inputs = tf.keras.Input(shape=(IMG_SIZE, IMG_SIZE, 3))
x = base(inputs, training=False)
x = layers.GlobalAveragePooling2D()(x)
x = layers.Dropout(0.3)(x)
x = layers.Dense(512, activation='relu')(x)

with open(LABELS_PATH, "r") as f:
    labels_data = json.load(f)
    if "classes" in labels_data:
        class_names = labels_data["classes"]
    else:
        class_names = list(labels_data.values())

outputs = layers.Dense(len(class_names), activation='softmax')(x)
model = tf.keras.Model(inputs, outputs)

print(f"Loading weights from {MODEL_PATH}...")
try:
    model.load_weights(str(MODEL_PATH))
except Exception as e:
    print(f"Error loading weights: {e}")
    sys.exit(1)

with open(LABELS_PATH, "r") as f:
    labels_data = json.load(f)
    if "classes" in labels_data:
        class_names = labels_data["classes"]
    else:
        # Fallback if structure is different
        class_names = list(labels_data.values())

print(f"Model loaded successfully. Found {len(class_names)} classes.")

# 2. Setup Test Generator (Validation split)
print("\nPreparing test dataset...")
# We use validation_split=0.2 and subset="validation" to evaluate on the 20% holdout
val_ds = tf.keras.utils.image_dataset_from_directory(
    PLANTVILLAGE,
    validation_split=0.2,
    subset="validation",
    seed=42,
    image_size=(IMG_SIZE, IMG_SIZE),
    batch_size=BATCH_SIZE,
    shuffle=False # Crucial for matching predictions to true labels
)

# 3. Predict
print("\nRunning inference on validation set (this may take a minute)...")
y_true = []
y_pred = []

for images, labels in val_ds:
    # EfficientNetB0 expects 0-255 inputs if it has its own Rescaling layer
    preds = model.predict(images, verbose=0)
    y_true.extend(labels.numpy())
    y_pred.extend(np.argmax(preds, axis=1))

y_true = np.array(y_true)
y_pred = np.array(y_pred)

# 4. Metrics
acc = accuracy_score(y_true, y_pred)
print("\n" + "=" * 50)
print("FINAL RESULTS")
print("=" * 50)
print(f"Overall Accuracy: {acc * 100:.2f}%")
print("-" * 50)

# We map the indices back to original folder names for the report
original_folders = val_ds.class_names
report = classification_report(y_true, y_pred, target_names=original_folders, zero_division=0)
print(report)

print("==================================================")
print("Evaluation Complete.")
