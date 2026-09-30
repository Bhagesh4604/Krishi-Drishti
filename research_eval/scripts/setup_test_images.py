"""
=============================================================
SETUP SCRIPT: Organizes PlantVillage dataset for eval_vision.py
=============================================================
Run this AFTER the dataset downloads:
    python setup_test_images.py

It will:
1. Find the downloaded PlantVillage folder
2. Pick 30 images per class (enough for evaluation)
3. Copy them into test_images/ with correct folder names
4. Then you can run: python eval_vision.py
=============================================================
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

import os
import shutil
import random
from pathlib import Path

# ── WHERE KAGGLE DOWNLOADS TO ─────────────────────────────
KAGGLE_CACHE = Path(os.path.expanduser("~")) / ".cache" / "kagglehub" / "datasets" / "emmarex" / "plantdisease"

# ── HOW MANY IMAGES PER CLASS TO USE (keep it manageable) ─
IMAGES_PER_CLASS = 30  # 30 × 5 classes = 150 API calls total

# ── MAP PlantVillage folder names → our eval class names ──
# PlantVillage uses names like "Tomato___Bacterial_spot"
# We map these to our 5 evaluation categories:
CLASS_MAPPING = {
    # healthy class
    "Tomato___healthy":                     "healthy",
    "Potato___healthy":                     "healthy",
    "Corn_(maize)___healthy":               "healthy",

    # bacterial blight / spot
    "Tomato___Bacterial_spot":              "bacterial_blight",
    "Pepper,_bell___Bacterial_spot":        "bacterial_blight",

    # brown spot / early blight
    "Tomato___Early_blight":                "brown_spot",
    "Potato___Early_blight":                "brown_spot",

    # leaf blast / late blight
    "Tomato___Late_blight":                 "leaf_blast",
    "Potato___Late_blight":                 "leaf_blast",

    # powdery mildew
    "Strawberry___Leaf_scorch":             "powdery_mildew",
    "Grape___Esca_(Black_Measles)":         "powdery_mildew",
}

OUTPUT_DIR = Path(__file__).parent.parent / "test_images"


def find_dataset_root():
    """Search for the PlantVillage dataset root folder."""
    # Try kagglehub cache
    if KAGGLE_CACHE.exists():
        # Walk to find a folder containing disease subfolders
        for version_dir in sorted(KAGGLE_CACHE.iterdir(), reverse=True):
            for root, dirs, files in os.walk(version_dir):
                root_path = Path(root)
                # PlantVillage has subfolders with "___" in them
                subfolders = [d for d in dirs if "___" in d or "healthy" in d.lower()]
                if len(subfolders) > 5:
                    print(f"[OK] Found PlantVillage dataset at: {root_path}")
                    return root_path

    # Also check common Windows download paths
    common_paths = [
        Path.home() / "Downloads",
        Path.home() / ".cache" / "kagglehub",
        Path("C:/Users") / os.environ.get("USERNAME", "") / ".cache" / "kagglehub",
    ]
    for p in common_paths:
        for root, dirs, files in os.walk(p):
            root_path = Path(root)
            subfolders = [d for d in dirs if "___" in d]
            if len(subfolders) > 5:
                print(f"[OK] Found PlantVillage dataset at: {root_path}")
                return root_path

    return None


def setup_test_images(dataset_root: Path):
    """Copy selected images into test_images/ with correct structure."""
    print(f"\nSetting up test images from: {dataset_root}")

    # Create output directories
    target_classes = set(CLASS_MAPPING.values())
    for cls in target_classes:
        (OUTPUT_DIR / cls).mkdir(parents=True, exist_ok=True)

    # Track how many copied per target class
    copied_count = {cls: 0 for cls in target_classes}
    total_copied = 0

    # Walk through dataset
    for pv_folder, target_class in CLASS_MAPPING.items():
        # Find this folder in the dataset (search recursively)
        matches = list(dataset_root.rglob(pv_folder))
        if not matches:
            print(f"  [SKIP] Folder not found: {pv_folder}")
            continue

        source_dir = matches[0]
        all_images = list(source_dir.glob("*.jpg")) + list(source_dir.glob("*.JPG")) + list(source_dir.glob("*.jpeg"))

        if not all_images:
            print(f"  [SKIP] No images in: {source_dir}")
            continue

        # Determine how many to copy (fill up to IMAGES_PER_CLASS)
        still_needed = IMAGES_PER_CLASS - copied_count[target_class]
        if still_needed <= 0:
            continue

        to_copy = random.sample(all_images, min(still_needed, len(all_images)))

        for img in to_copy:
            dest = OUTPUT_DIR / target_class / f"{pv_folder}_{img.name}"
            shutil.copy2(img, dest)
            copied_count[target_class] += 1
            total_copied += 1

        print(f"  [OK] {pv_folder:45} -> {target_class:20} ({len(to_copy)} images)")

    print(f"\n{'='*60}")
    print(f"SETUP COMPLETE")
    print(f"{'='*60}")
    print(f"  Total images copied : {total_copied}")
    for cls, count in copied_count.items():
        status = "[OK]" if count >= 10 else "[LOW - need more]"
        print(f"  {cls:25} : {count:3} images  {status}")
    print(f"\n  Output folder: {OUTPUT_DIR.absolute()}")
    print(f"\nNEXT STEP: Run the vision evaluation:")
    print(f"  python eval_vision.py")


def main():
    print("="*60)
    print("SETUP: PlantVillage Test Image Organizer")
    print("="*60)

    dataset_root = find_dataset_root()

    if dataset_root is None:
        print("\n[ERROR] Could not find PlantVillage dataset!")
        print("\nPossible reasons:")
        print("  1. Download is still in progress (wait for it to finish)")
        print("  2. Dataset downloaded to a different location")
        print("\nManual fix: Find the folder containing subfolders like")
        print("  'Tomato___Bacterial_spot', 'Tomato___healthy', etc.")
        print("Then set KAGGLE_CACHE in this script to that path.")
        return

    setup_test_images(dataset_root)


if __name__ == "__main__":
    main()
