"""
Krishi-Drishti: Vision AI Evaluation — v2 (Corrected Labels)
=============================================================
Fix: Use actual PlantVillage disease names as evaluation labels.
     Gemini naturally outputs these names → much higher accuracy.

Classes (matching PlantVillage folder names AND Gemini vocabulary):
  healthy        → Tomato_healthy / Potato___healthy
  early blight   → Tomato_Early_blight / Potato___Early_blight
  late blight    → Tomato_Late_blight / Potato___Late_blight
  bacterial spot → Tomato_Bacterial_spot / Pepper__bell___Bacterial_spot
  leaf mold      → Tomato_Leaf_Mold
"""
import sys, os, io, json, time, warnings, random, shutil
sys.stdout.reconfigure(encoding='utf-8')
os.environ["PYTHONUNBUFFERED"] = "1"
import builtins
_orig_print = builtins.print
builtins.print = lambda *a, **kw: _orig_print(*a, **{**kw, "flush": True})
warnings.filterwarnings("ignore")

from pathlib import Path
from datetime import datetime
from dotenv import load_dotenv

BASE_DIR    = Path(__file__).parent.parent
RESULTS_DIR = BASE_DIR / "eval_results"
TEST_DIR    = BASE_DIR / "test_images_v2"       # NEW clean folder
RESULTS_DIR.mkdir(exist_ok=True)

load_dotenv(BASE_DIR.parent / ".env")
load_dotenv(BASE_DIR.parent / ".env.local")

GEMINI_API_KEY   = os.getenv("GEMINI_API_KEY", "")
IMAGES_PER_CLASS = 10    # 10 × 5 classes = 50 total for better statistics
DELAY            = 5.0   # seconds between calls

# ── CORRECT class mapping: label = what Gemini will naturally say ──────────
CLASS_LABELS = {
    "healthy":        "healthy",
    "early_blight":   "early blight",
    "late_blight":    "late blight",
    "bacterial_spot": "bacterial spot",
    "leaf_mold":      "leaf mold",
}

# PlantVillage folders that correspond to each class
PLANTVILLAGE_SOURCES = {
    "healthy": [
        "Tomato_healthy",
        "Potato___healthy",
        "Pepper__bell___healthy",
    ],
    "early_blight": [
        "Tomato_Early_blight",
        "Potato___Early_blight",
    ],
    "late_blight": [
        "Tomato_Late_blight",
        "Potato___Late_blight",
    ],
    "bacterial_spot": [
        "Tomato_Bacterial_spot",
        "Pepper__bell___Bacterial_spot",
    ],
    "leaf_mold": [
        "Tomato_Leaf_Mold",
    ],
}

PLANTVILLAGE_ROOT = Path(r"C:\Users\bhage\.cache\kagglehub\datasets\emmarex\plantdisease\versions\1\PlantVillage")

from PIL import Image
from sklearn.metrics import (accuracy_score, precision_score,
                             recall_score, f1_score, classification_report)


def setup_test_images():
    """Copy images from PlantVillage into test_images_v2/ with correct labels."""
    print("=" * 60)
    print("STEP 1: Setting up correctly labeled test images")
    print("=" * 60)

    if not PLANTVILLAGE_ROOT.exists():
        print(f"[ERROR] PlantVillage not found at {PLANTVILLAGE_ROOT}")
        return False

    TEST_DIR.mkdir(exist_ok=True)
    total = 0
    for cls, sources in PLANTVILLAGE_SOURCES.items():
        out_folder = TEST_DIR / cls
        out_folder.mkdir(exist_ok=True)
        all_imgs = []
        for src in sources:
            src_path = PLANTVILLAGE_ROOT / src
            if src_path.exists():
                imgs = list(src_path.glob("*.jpg")) + list(src_path.glob("*.JPG"))
                all_imgs.extend(imgs)
        if not all_imgs:
            print(f"  [WARN] No images found for {cls}")
            continue
        sample = random.sample(all_imgs, min(IMAGES_PER_CLASS, len(all_imgs)))
        for i, img in enumerate(sample):
            shutil.copy(img, out_folder / f"{i:03d}_{img.name}")
        print(f"  {cls:20}: {len(sample)} images  (from {len(all_imgs)} available)")
        total += len(sample)

    print(f"\nTotal images prepared: {total}")
    return total > 0


def get_client():
    import google.genai as genai
    return genai.Client(api_key=GEMINI_API_KEY)


def img_to_bytes(path):
    with Image.open(path) as img:
        img = img.convert("RGB").resize((512, 512))
        buf = io.BytesIO()
        img.save(buf, "JPEG", quality=85)
        return buf.getvalue()


def ask_gemini(client, img_bytes, retries=5):
    """Ask Gemini to classify the disease using proper natural disease names."""
    import google.genai as genai
    from google.genai import types

    prompt = (
        "You are an expert plant pathologist. Examine this plant leaf image carefully.\n\n"
        "Identify the condition and reply with EXACTLY ONE of these labels — nothing else:\n"
        "healthy | early blight | late blight | bacterial spot | leaf mold | unknown\n\n"
        "Reply with the single most accurate label only."
    )

    for attempt in range(retries):
        try:
            resp = client.models.generate_content(
                model="gemini-flash-lite-latest",
                contents=[
                    types.Content(role="user", parts=[
                        types.Part.from_bytes(data=img_bytes, mime_type="image/jpeg"),
                        types.Part.from_text(text=prompt),
                    ])
                ],
                config=types.GenerateContentConfig(
                    temperature=0.0,
                    max_output_tokens=10,
                )
            )
            text = ""
            if resp.text:
                text = resp.text.strip().lower()
            elif resp.candidates:
                for part in resp.candidates[0].content.parts:
                    if getattr(part, "text", None):
                        text = part.text.strip().lower()
                        break
            return text if text else "unknown"

        except Exception as e:
            err = str(e)
            if any(x in err for x in ["overload", "429", "503", "500"]):
                wait = (attempt + 1) * 20
                print(f"  [RETRY {attempt+1}/{retries}] overloaded, waiting {wait}s...")
                time.sleep(wait)
            else:
                print(f"  [ERROR] {err[:120]}")
                return "unknown"
    return "unknown"


def normalize(raw, valid_labels):
    """Match Gemini output to one of our labels (flexible matching)."""
    raw = raw.strip().lower()
    # Exact match first
    for lbl in valid_labels:
        if raw == lbl:
            return lbl
    # Partial match
    for lbl in valid_labels:
        if lbl in raw:
            return lbl
    return "unknown"


def main():
    print("=" * 60)
    print("KRISHI-DRISHTI: Vision AI Evaluation v2")
    print("Using scientifically correct PlantVillage disease labels")
    print("=" * 60)

    if not GEMINI_API_KEY:
        print("[ERROR] GEMINI_API_KEY not found in .env!")
        sys.exit(1)

    # Setup images
    if not setup_test_images():
        sys.exit(1)

    # Collect all images
    all_images = []
    for folder_name, label in CLASS_LABELS.items():
        folder = TEST_DIR / folder_name
        imgs = list(folder.glob("*.jpg")) + list(folder.glob("*.JPG"))
        for p in imgs:
            all_images.append((p, label))
        print(f"  Loaded {len(imgs):2} images for: {label}")

    random.shuffle(all_images)
    print(f"\nTotal: {len(all_images)} images | Model: gemini-flash-lite-latest")
    print(f"Expected duration: ~{len(all_images) * DELAY / 60:.1f} minutes\n")

    client = get_client()
    valid_labels = list(CLASS_LABELS.values())
    true_labels, pred_labels, per_image = [], [], []

    correct_count = 0
    for i, (img_path, true_label) in enumerate(all_images):
        print(f"[{i+1:2}/{len(all_images)}] {img_path.name[:40]:40}", end=" ")
        img_bytes = img_to_bytes(str(img_path))
        raw = ask_gemini(client, img_bytes)
        pred = normalize(raw, valid_labels)
        ok = "OK" if pred == true_label else "WRONG"
        if pred == true_label:
            correct_count += 1
        running_acc = correct_count / (i + 1) * 100
        print(f"-> {pred:15} [{ok}]  (running: {running_acc:.0f}%)")

        true_labels.append(true_label)
        pred_labels.append(pred)
        per_image.append({
            "file": img_path.name,
            "true": true_label,
            "pred": pred,
            "raw": raw,
            "correct": pred == true_label
        })
        time.sleep(DELAY)

    # ── Metrics ──────────────────────────────────────────────────────────────
    acc  = accuracy_score(true_labels, pred_labels)
    prec = precision_score(true_labels, pred_labels, average="weighted", zero_division=0)
    rec  = recall_score(true_labels, pred_labels, average="weighted", zero_division=0)
    f1   = f1_score(true_labels, pred_labels, average="weighted", zero_division=0)
    report = classification_report(true_labels, pred_labels, zero_division=0)

    print("\n" + "=" * 60)
    print("FINAL RESULTS — Copy into Table IV.1 of your paper")
    print("=" * 60)
    print(f"  Images tested        : {len(true_labels)}")
    print(f"  Accuracy             : {acc*100:.1f}%")
    print(f"  Precision (weighted) : {prec*100:.1f}%")
    print(f"  Recall (weighted)    : {rec*100:.1f}%")
    print(f"  F1-Score (weighted)  : {f1*100:.1f}%")
    print(f"\nPer-class:\n{report}")

    out = {
        "timestamp": datetime.now().isoformat(),
        "module": "Vision AI (gemini-flash-lite-latest) — Corrected Labels",
        "evaluation_version": "v2",
        "total_images": len(true_labels),
        "metrics": {
            "accuracy": round(acc * 100, 1),
            "precision_weighted": round(prec * 100, 1),
            "recall_weighted": round(rec * 100, 1),
            "f1_weighted": round(f1 * 100, 1),
        },
        "class_labels": list(CLASS_LABELS.values()),
        "classification_report": report,
        "per_image_results": per_image,
    }
    out_path = RESULTS_DIR / "vision_results_v2.json"
    out_path.write_text(json.dumps(out, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"\nSaved to: {out_path}")


if __name__ == "__main__":
    main()
