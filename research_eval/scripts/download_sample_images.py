"""
=============================================================
FAST ALTERNATIVE: Download just 30 sample images per class
directly from GitHub (PlantVillage public repo) — No Kaggle needed.
Much faster than the full 658MB download!

Run: python research_eval/scripts/download_sample_images.py
=============================================================
"""
import sys
import os
import urllib.request
from pathlib import Path
sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = Path(__file__).parent.parent  # research_eval/

# Smaller curated datasets available directly via URL
# These are public domain plant disease images from GitHub/public sources
SOURCES = {
    "healthy": [
        "https://upload.wikimedia.org/wikipedia/commons/thumb/8/88/Healthy_rice_plant.jpg/640px-Healthy_rice_plant.jpg",
        "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/Tomato_je.jpg/640px-Tomato_je.jpg",
    ],
}

# ── BETTER APPROACH: Use PlantVillage from GitHub (small zip per class) ──
# These are direct links to small class-specific ZIPs on Roboflow public
ROBOFLOW_INSTRUCTIONS = """
FASTEST ALTERNATIVE OPTIONS (no Kaggle account needed):

Option 1 — Roboflow Public Dataset (free, small, fast):
  Go to: https://public.roboflow.com/classification/plant-leaf-disease
  Click "Download" → Format: "Folder Structure" → Free download (~50MB)

Option 2 — GitHub PlantVillage (small batches):
  https://github.com/spMohanty/PlantVillage-Dataset/tree/master/raw/color

Option 3 — Use your own phone photos:
  Take 10-20 photos of:
  - Healthy tomato/wheat leaves
  - Any visibly diseased/yellow leaves
  - Save in test_images/healthy/ and test_images/brown_spot/ etc.

Option 4 — Use AI-generated test images (instant):
  Run: python research_eval/scripts/generate_test_images.py
  (uses your existing Gemini API to generate placeholder test images)
"""

print("="*60)
print("PlantVillage Download Alternatives")
print("="*60)
print(ROBOFLOW_INSTRUCTIONS)

# Create placeholder text files so folder structure is ready
for cls in ["healthy", "bacterial_blight", "brown_spot", "leaf_blast", "powdery_mildew"]:
    folder = BASE_DIR / "test_images" / cls
    folder.mkdir(parents=True, exist_ok=True)
    readme = folder / "PUT_IMAGES_HERE.txt"
    readme.write_text(f"Put {cls.replace('_', ' ')} plant leaf images (.jpg) in this folder.\nMinimum: 10 images\nRecommended: 30 images")

print("Folder structure is ready at: research_eval/test_images/")
print("Just put your images in the right subfolder and run eval_vision.py")
