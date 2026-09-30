"""
Krishi-Drishti: Vision AI Accuracy Evaluation
Uses google-genai SDK with proper retry + small batch (20 images)
"""
import sys, os, io, json, time, warnings, random
sys.stdout.reconfigure(encoding='utf-8')
# Force unbuffered output so progress shows in real-time on Windows
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
TEST_DIR    = BASE_DIR / "test_images"
RESULTS_DIR.mkdir(exist_ok=True)

load_dotenv(BASE_DIR.parent / ".env")
load_dotenv(BASE_DIR.parent / ".env.local")

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
IMAGES_PER_CLASS = 4   # 4 × 5 classes = 20 total API calls
DELAY = 8.0            # seconds between calls (increased to reduce overload errors)

CLASS_LABELS = {
    "healthy":          "healthy",
    "bacterial_blight": "bacterial blight",
    "brown_spot":       "brown spot",
    "leaf_blast":       "leaf blast",
    "powdery_mildew":   "powdery mildew",
}

# ── Import Pillow (no google SDK imports at module level to avoid AFC print) ──
from PIL import Image
from sklearn.metrics import (accuracy_score, precision_score,
                             recall_score, f1_score, classification_report)

def get_client():
    """Lazy import so AFC warning goes to /dev/null."""
    import google.genai as genai
    return genai.Client(api_key=GEMINI_API_KEY)

def img_to_bytes(path):
    with Image.open(path) as img:
        img = img.convert("RGB").resize((448, 448))
        buf = io.BytesIO()
        img.save(buf, "JPEG", quality=80)
        return buf.getvalue()

def ask_gemini(client, img_bytes, retries=5):
    """Call Gemini with retry on overload. Returns label string."""
    import google.genai as genai
    from google.genai import types

    prompt = (
        "Look at this plant leaf photo. "
        "Reply with EXACTLY ONE label from this list — no other words:\n"
        "healthy | bacterial blight | brown spot | leaf blast | powdery mildew | unknown"
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
                    max_output_tokens=50,
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
            if "overload" in err.lower() or "429" in err or "503" in err or "500" in err:
                wait = (attempt + 1) * 30  # 30s, 60s, 90s, 120s, 150s
                print(f"  [RETRY {attempt+1}/{retries}] API overloaded, waiting {wait}s...")
                time.sleep(wait)
            else:
                print(f"  [ERROR] {err[:120]}")
                return "unknown"
    return "unknown"

def normalize(raw, valid_labels):
    """Match raw Gemini output to one of our labels."""
    raw = raw.lower()
    for lbl in valid_labels:
        if lbl in raw:
            return lbl
    return "unknown"

def main():
    print("=" * 60)
    print("KRISHI-DRISHTI: Vision AI Evaluation (gemini-flash-lite-latest)")
    print("=" * 60)

    if not GEMINI_API_KEY:
        print("[ERROR] GEMINI_API_KEY not found in .env!")
        sys.exit(1)

    # Collect images (random sample per class)
    all_images = []
    for folder_name, label in CLASS_LABELS.items():
        folder = TEST_DIR / folder_name
        if not folder.exists():
            print(f"[SKIP] {folder_name}/ not found")
            continue
        imgs = list(folder.glob("*.jpg")) + list(folder.glob("*.JPG")) + list(folder.glob("*.jpeg"))
        sample = random.sample(imgs, min(IMAGES_PER_CLASS, len(imgs)))
        for p in sample:
            all_images.append((p, label))
        print(f"  {folder_name:20} : {len(sample)} images selected")

    if not all_images:
        print("[ERROR] No images found. Run setup_test_images.py first.")
        sys.exit(1)

    random.shuffle(all_images)
    print(f"\nTotal: {len(all_images)} images | Model: gemini-2.5-flash\n")

    client = get_client()
    valid_labels = list(CLASS_LABELS.values())

    true_labels, pred_labels, per_image = [], [], []

    for i, (img_path, true_label) in enumerate(all_images):
        print(f"[{i+1:2}/{len(all_images)}] {img_path.name[:45]:45}", end=" ")
        img_bytes = img_to_bytes(str(img_path))
        raw = ask_gemini(client, img_bytes)
        pred = normalize(raw, valid_labels)
        ok = "OK" if pred == true_label else "WRONG"
        print(f"-> pred: {pred:20} [{ok}]")

        true_labels.append(true_label)
        pred_labels.append(pred)
        per_image.append({
            "file": img_path.name,
            "true": true_label,
            "pred": pred,
            "raw_response": raw,
            "correct": pred == true_label
        })
        time.sleep(DELAY)

    # ── Metrics ───────────────────────────────────────────
    acc  = accuracy_score(true_labels, pred_labels)
    prec = precision_score(true_labels, pred_labels, average="weighted", zero_division=0)
    rec  = recall_score(true_labels, pred_labels, average="weighted", zero_division=0)
    f1   = f1_score(true_labels, pred_labels, average="weighted", zero_division=0)
    report = classification_report(true_labels, pred_labels, zero_division=0)

    print("\n" + "=" * 60)
    print("RESULTS — Copy these into Table IV.1 of your paper")
    print("=" * 60)
    print(f"  Images tested        : {len(true_labels)}")
    print(f"  Accuracy             : {acc*100:.1f}%")
    print(f"  Precision (weighted) : {prec*100:.1f}%")
    print(f"  Recall (weighted)    : {rec*100:.1f}%")
    print(f"  F1-Score (weighted)  : {f1*100:.1f}%")
    print(f"\nPer-class:\n{report}")

    out = {
        "timestamp": datetime.now().isoformat(),
        "module": "Vision AI (gemini-2.5-flash)",
        "total_images": len(true_labels),
        "metrics": {
            "accuracy": round(acc * 100, 1),
            "precision_weighted": round(prec * 100, 1),
            "recall_weighted": round(rec * 100, 1),
            "f1_weighted": round(f1 * 100, 1),
        },
        "classification_report": report,
        "per_image_results": per_image,
    }
    out_path = RESULTS_DIR / "vision_results.json"
    out_path.write_text(json.dumps(out, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"\nSaved to: {out_path}")

if __name__ == "__main__":
    main()
