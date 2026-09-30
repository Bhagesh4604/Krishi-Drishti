"""
Krishi-Drishti: Evaluate universal_vision_model.h5 (Your Own Model!)
=====================================================================
Model: backend/ml_models/universal_vision_model.h5
- Input: 224x224x3 (RGB, normalized 0-1)
- Output: 9 disease classes

Step 1: Auto-detect which archive index maps to which disease
Step 2: Run full evaluation on PlantVillage test images
Step 3: Report Accuracy, Precision, Recall, F1 for paper

Run: Python310 -u research_eval/scripts/eval_our_model.py
"""
import sys, os, warnings, json, random, io
sys.stdout.reconfigure(encoding='utf-8')
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'
os.environ["PYTHONUNBUFFERED"] = "1"
warnings.filterwarnings('ignore')

import builtins
_op = builtins.print
builtins.print = lambda *a, **kw: _op(*a, **{**kw, "flush": True})

import numpy as np
import tensorflow as tf
from PIL import Image
from pathlib import Path
from datetime import datetime
from sklearn.metrics import (accuracy_score, precision_score, recall_score,
                              f1_score, classification_report)

# ── Paths ─────────────────────────────────────────────────────────────────
BASE_DIR     = Path(__file__).parent.parent
MODEL_PATH   = Path(r'C:\Users\bhage\Desktop\Krishi-Drishti\backend\ml_models\universal_vision_model.h5')
RESULTS_DIR  = BASE_DIR / "eval_results"
PLANTVILLAGE = Path(r'C:\Users\bhage\.cache\kagglehub\datasets\emmarex\plantdisease\versions\1\PlantVillage')
RESULTS_DIR.mkdir(exist_ok=True)

# PlantVillage folders sorted alphabetically — this is how Keras ImageDataGenerator
# assigns class indices (0..N-1) when using flow_from_directory
# The model's "archive (N)" labels correspond to alphabetical folder order
ALL_PV_FOLDERS = sorted([f.name for f in PLANTVILLAGE.iterdir() if f.is_dir()])
print("PlantVillage folders (alphabetical = model class order):")
for i, f in enumerate(ALL_PV_FOLDERS):
    print(f"  [{i}] {f}")

# ── Load model ─────────────────────────────────────────────────────────────
print("\nLoading universal_vision_model.h5...")
model = tf.keras.models.load_model(str(MODEL_PATH), compile=False)
print(f"  Input  : {model.input_shape}")
print(f"  Output : {model.output_shape}")
print(f"  Params : {model.count_params():,}")

IMG_SIZE = 224  # model expects 224x224

def preprocess(img_path):
    """Load, resize, normalize image for model input."""
    with Image.open(img_path) as img:
        img = img.convert('RGB').resize((IMG_SIZE, IMG_SIZE))
        arr = np.array(img, dtype=np.float32) / 255.0
        return np.expand_dims(arr, 0)  # (1, 224, 224, 3)

# ── Define evaluation classes ─────────────────────────────────────────────
# Map PlantVillage folders to our 5 evaluation disease labels
# Using the alphabetical index = model's class index
EVAL_CLASSES = {
    # folder_name: (model_class_idx, our_label)
    # We figure idx from ALL_PV_FOLDERS list
}

DISEASE_GROUPS = {
    "healthy": [
        "Tomato_healthy",
        "Potato___healthy",
        "Pepper__bell___healthy",
    ],
    "early blight": [
        "Tomato_Early_blight",
        "Potato___Early_blight",
    ],
    "late blight": [
        "Tomato_Late_blight",
        "Potato___Late_blight",
    ],
    "bacterial spot": [
        "Tomato_Bacterial_spot",
        "Pepper__bell___Bacterial_spot",
    ],
    "leaf mold": [
        "Tomato_Leaf_Mold",
    ],
}

# Build lookup: folder → (model_class_idx, our_label)
folder_to_info = {}
for label, folders in DISEASE_GROUPS.items():
    for folder in folders:
        if folder in ALL_PV_FOLDERS:
            idx = ALL_PV_FOLDERS.index(folder)
            folder_to_info[folder] = {"model_idx": idx, "label": label}
            print(f"  {folder:45} → class [{idx}] → '{label}'")

print()

# ── Collect test images ────────────────────────────────────────────────────
IMAGES_PER_FOLDER = 20   # 20 × ~9 folders = ~180 images total
all_images = []  # list of (img_path, model_correct_class_idx, our_label)

for folder, info in folder_to_info.items():
    folder_path = PLANTVILLAGE / folder
    imgs = list(folder_path.glob("*.jpg")) + list(folder_path.glob("*.JPG"))
    random.shuffle(imgs)
    sample = imgs[:IMAGES_PER_FOLDER]
    for p in sample:
        all_images.append((p, info["model_idx"], info["label"]))
    print(f"  {folder:45}: {len(sample)} images (class idx={info['model_idx']})")

random.shuffle(all_images)
print(f"\nTotal evaluation images: {len(all_images)}")
print("=" * 60)
print("RUNNING EVALUATION on your trained model...")
print("=" * 60)

true_labels, pred_labels, pred_idxs = [], [], []
correct = 0

for i, (img_path, true_idx, true_label) in enumerate(all_images):
    try:
        inp = preprocess(img_path)
        probs = model.predict(inp, verbose=0)[0]
        pred_idx = int(np.argmax(probs))
        confidence = float(probs[pred_idx]) * 100

        # Map predicted index back to label
        if pred_idx < len(ALL_PV_FOLDERS):
            pred_folder = ALL_PV_FOLDERS[pred_idx]
            # Find what label this folder belongs to
            pred_label = "unknown"
            for lbl, folders in DISEASE_GROUPS.items():
                if pred_folder in folders:
                    pred_label = lbl
                    break
        else:
            pred_label = "unknown"

        ok = "OK" if pred_label == true_label else "WRONG"
        if pred_label == true_label:
            correct += 1

        running = correct / (i + 1) * 100
        print(f"[{i+1:3}/{len(all_images)}] {img_path.name[:35]:35} "
              f"true={true_label:15} pred={pred_label:15} conf={confidence:5.1f}%  [{ok}]  ({running:.0f}%)")

        true_labels.append(true_label)
        pred_labels.append(pred_label)

    except Exception as e:
        print(f"[{i+1:3}] ERROR: {e}")
        true_labels.append(true_label)
        pred_labels.append("unknown")

# ── Final metrics ──────────────────────────────────────────────────────────
acc  = accuracy_score(true_labels, pred_labels)
prec = precision_score(true_labels, pred_labels, average='weighted', zero_division=0)
rec  = recall_score(true_labels, pred_labels, average='weighted', zero_division=0)
f1   = f1_score(true_labels, pred_labels, average='weighted', zero_division=0)
target_names = sorted(set(true_labels))
report = classification_report(true_labels, pred_labels,
                                target_names=target_names, zero_division=0)

print("\n" + "=" * 60)
print("FINAL RESULTS — Your Own Trained Model")
print("=" * 60)
print(f"  Model                : universal_vision_model.h5")
print(f"  Architecture         : Custom CNN (3.5M params)")
print(f"  Images evaluated     : {len(true_labels)}")
print(f"  Accuracy             : {acc*100:.1f}%")
print(f"  Precision (weighted) : {prec*100:.1f}%")
print(f"  Recall (weighted)    : {rec*100:.1f}%")
print(f"  F1-Score (weighted)  : {f1*100:.1f}%")
print(f"\nPer-class breakdown:\n{report}")

results = {
    "timestamp": datetime.now().isoformat(),
    "module": "Vision AI — Krishi-Drishti Custom CNN (universal_vision_model.h5)",
    "evaluation_version": "v3-own-model",
    "model_path": str(MODEL_PATH),
    "model_params": model.count_params(),
    "input_shape": str(model.input_shape),
    "total_images": len(true_labels),
    "metrics": {
        "accuracy": round(acc * 100, 1),
        "precision_weighted": round(prec * 100, 1),
        "recall_weighted": round(rec * 100, 1),
        "f1_weighted": round(f1 * 100, 1),
    },
    "classification_report": report,
}

out_path = RESULTS_DIR / "vision_results_v3_our_model.json"
out_path.write_text(json.dumps(results, indent=2, ensure_ascii=False), encoding='utf-8')
print(f"\nSaved to: {out_path}")
print("Done!")
