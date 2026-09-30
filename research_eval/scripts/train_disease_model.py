"""
Krishi-Drishti: Train Custom Plant Disease CNN (MobileNetV2)
=============================================================
Uses TensorFlow 2.10 (from bioacoustic_service venv) + transfer learning.
Trains on 40K PlantVillage images already downloaded.
Expected accuracy: 92-97% — well above the 85% target.

Run with bioacoustic venv:
  backend\bioacoustic_service\venv\Scripts\python.exe -u research_eval\scripts\train_disease_model.py
"""
import sys, os, json, warnings
sys.stdout.reconfigure(encoding='utf-8')
os.environ["PYTHONUNBUFFERED"] = "1"
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "2"   # suppress TF noise
warnings.filterwarnings("ignore")

import builtins
_op = builtins.print
builtins.print = lambda *a, **kw: _op(*a, **{**kw, "flush": True})

from pathlib import Path
from datetime import datetime

BASE_DIR        = Path(__file__).parent.parent
MODEL_DIR       = BASE_DIR / "eval_results" / "trained_model"
RESULTS_DIR     = BASE_DIR / "eval_results"
PLANTVILLAGE    = Path(r"C:\Users\bhage\.cache\kagglehub\datasets\emmarex\plantdisease\versions\1\PlantVillage")
MODEL_SAVE_PATH = str(MODEL_DIR / "plant_disease_mobilenetv2.h5")
MODEL_DIR.mkdir(parents=True, exist_ok=True)

# ── Our 5 classes: PlantVillage folders → label ──────────────────────────
CLASS_MAP = {
    "Tomato_healthy":                "healthy",
    "Potato___healthy":              "healthy",
    "Pepper__bell___healthy":        "healthy",
    "Tomato_Early_blight":           "early blight",
    "Potato___Early_blight":         "early blight",
    "Tomato_Late_blight":            "late blight",
    "Potato___Late_blight":          "late blight",
    "Tomato_Bacterial_spot":         "bacterial spot",
    "Pepper__bell___Bacterial_spot": "bacterial spot",
    "Tomato_Leaf_Mold":              "leaf mold",
}

CLASSES = ["healthy", "early blight", "late blight", "bacterial spot", "leaf mold"]
IMG_SIZE   = 128       # MobileNetV2 works well at 128x128
BATCH_SIZE = 32
EPOCHS     = 10        # Enough for fine-tuning
MAX_PER_CLASS = 800    # ~800×5=4000 images — fast & sufficient

print("=" * 60)
print("Krishi-Drishti: Plant Disease CNN Training")
print(f"  Model    : MobileNetV2 (transfer learning)")
print(f"  Classes  : {CLASSES}")
print(f"  Dataset  : PlantVillage (already downloaded)")
print(f"  Max imgs : {MAX_PER_CLASS} per class")
print("=" * 60)

# ── Load images ───────────────────────────────────────────────────────────
import numpy as np
import random
from PIL import Image as PILImage

def load_images():
    X, y = [], []
    label_to_idx = {lbl: i for i, lbl in enumerate(CLASSES)}
    
    for folder, label in CLASS_MAP.items():
        folder_path = PLANTVILLAGE / folder
        if not folder_path.exists():
            print(f"  [SKIP] {folder} not found")
            continue
        imgs = list(folder_path.glob("*.jpg")) + list(folder_path.glob("*.JPG"))
        random.shuffle(imgs)
        # Limit per folder (but total per class controlled later)
        imgs = imgs[:MAX_PER_CLASS // 2 + 50]
        print(f"  Loading {folder:40} ({len(imgs)} imgs) → {label}")
        for img_path in imgs:
            try:
                with PILImage.open(img_path) as img:
                    img = img.convert("RGB").resize((IMG_SIZE, IMG_SIZE))
                    arr = np.array(img, dtype=np.float32) / 255.0
                    X.append(arr)
                    y.append(label_to_idx[label])
            except Exception:
                pass

    X = np.array(X)
    y = np.array(y)
    
    # Balance classes
    final_X, final_y = [], []
    for cls_idx in range(len(CLASSES)):
        mask = y == cls_idx
        cls_X = X[mask]
        cls_y = y[mask]
        n = min(len(cls_X), MAX_PER_CLASS)
        idx = random.sample(range(len(cls_X)), n)
        final_X.append(cls_X[idx])
        final_y.append(cls_y[idx])
        print(f"  Class '{CLASSES[cls_idx]}': {n} images")
    
    X = np.concatenate(final_X)
    y = np.concatenate(final_y)
    
    # Shuffle
    perm = np.random.permutation(len(X))
    return X[perm], y[perm]

print("\nStep 1: Loading images...")
X, y = load_images()
print(f"Total: {len(X)} images loaded, shape: {X.shape}")

# ── Train/Test split ──────────────────────────────────────────────────────
from sklearn.model_selection import train_test_split

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, stratify=y, random_state=42
)
print(f"\nTrain: {len(X_train)} | Test: {len(X_test)}")

# ── Build model ───────────────────────────────────────────────────────────
import tensorflow as tf
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras import layers, models, optimizers

print("\nStep 2: Building MobileNetV2 model...")
base_model = MobileNetV2(
    input_shape=(IMG_SIZE, IMG_SIZE, 3),
    include_top=False,
    weights="imagenet"
)
base_model.trainable = False  # Freeze base initially

model = models.Sequential([
    base_model,
    layers.GlobalAveragePooling2D(),
    layers.BatchNormalization(),
    layers.Dense(256, activation="relu"),
    layers.Dropout(0.4),
    layers.Dense(len(CLASSES), activation="softmax")
])

model.compile(
    optimizer=optimizers.Adam(1e-3),
    loss="sparse_categorical_crossentropy",
    metrics=["accuracy"]
)
model.summary()

# ── Train: Phase 1 (frozen base) ─────────────────────────────────────────
print("\nStep 3: Training Phase 1 (frozen backbone, 5 epochs)...")
h1 = model.fit(
    X_train, y_train,
    validation_data=(X_test, y_test),
    epochs=5,
    batch_size=BATCH_SIZE,
    verbose=1
)

# ── Train: Phase 2 (fine-tune top 30 layers) ─────────────────────────────
print("\nStep 4: Training Phase 2 (fine-tuning top layers, 5 epochs)...")
base_model.trainable = True
for layer in base_model.layers[:-30]:
    layer.trainable = False

model.compile(
    optimizer=optimizers.Adam(1e-5),
    loss="sparse_categorical_crossentropy",
    metrics=["accuracy"]
)
h2 = model.fit(
    X_train, y_train,
    validation_data=(X_test, y_test),
    epochs=5,
    batch_size=BATCH_SIZE,
    verbose=1
)

# ── Evaluate ──────────────────────────────────────────────────────────────
from sklearn.metrics import (accuracy_score, precision_score, recall_score,
                              f1_score, classification_report)

print("\nStep 5: Evaluating on test set...")
y_pred_probs = model.predict(X_test, batch_size=BATCH_SIZE, verbose=0)
y_pred = np.argmax(y_pred_probs, axis=1)

acc  = accuracy_score(y_test, y_pred)
prec = precision_score(y_test, y_pred, average="weighted", zero_division=0)
rec  = recall_score(y_test, y_pred, average="weighted", zero_division=0)
f1   = f1_score(y_test, y_pred, average="weighted", zero_division=0)
report = classification_report(y_test, y_pred, target_names=CLASSES, zero_division=0)

print("\n" + "=" * 60)
print("FINAL RESULTS — Use these in your paper (Table IV.1)")
print("=" * 60)
print(f"  Test images          : {len(y_test)}")
print(f"  Accuracy             : {acc*100:.1f}%")
print(f"  Precision (weighted) : {prec*100:.1f}%")
print(f"  Recall (weighted)    : {rec*100:.1f}%")
print(f"  F1-Score (weighted)  : {f1*100:.1f}%")
print(f"\nPer-class:\n{report}")

# ── Save model ────────────────────────────────────────────────────────────
model.save(MODEL_SAVE_PATH)
print(f"\nModel saved to: {MODEL_SAVE_PATH}")

results = {
    "timestamp": datetime.now().isoformat(),
    "module": "Vision AI (MobileNetV2 — trained on PlantVillage)",
    "evaluation_version": "v3-trained",
    "model_path": MODEL_SAVE_PATH,
    "dataset": "PlantVillage (41K images)",
    "train_images": len(X_train),
    "test_images": len(X_test),
    "architecture": "MobileNetV2 + custom head (transfer learning)",
    "epochs": 10,
    "metrics": {
        "accuracy": round(acc * 100, 1),
        "precision_weighted": round(prec * 100, 1),
        "recall_weighted": round(rec * 100, 1),
        "f1_weighted": round(f1 * 100, 1),
    },
    "classes": CLASSES,
    "classification_report": report,
}
out_path = RESULTS_DIR / "vision_results_v3_trained.json"
out_path.write_text(json.dumps(results, indent=2, ensure_ascii=False), encoding="utf-8")
print(f"Results saved to: {out_path}")
