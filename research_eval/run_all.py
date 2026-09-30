"""
=============================================================
Krishi-Drishti Research Evaluation — ONE-CLICK LAUNCHER
=============================================================
Run this from the research_eval/ folder:
    python run_all.py

It will run all 3 evaluation scripts in sequence and
print a final summary of all metrics for your paper.
=============================================================
"""
import sys
import os
import json
import subprocess
from pathlib import Path
from datetime import datetime

sys.stdout.reconfigure(encoding='utf-8')

# Paths
SCRIPTS_DIR = Path(__file__).parent / "scripts"
RESULTS_DIR = Path(__file__).parent / "eval_results"
RESULTS_DIR.mkdir(exist_ok=True)

def run_script(script_name: str) -> bool:
    """Run a script and return True if successful."""
    script_path = SCRIPTS_DIR / script_name
    print(f"\n{'='*60}")
    print(f"Running: {script_name}")
    print(f"{'='*60}")
    result = subprocess.run(
        [sys.executable, str(script_path)],
        cwd=str(Path(__file__).parent),
        capture_output=False
    )
    return result.returncode == 0


def print_final_summary():
    """Read all result files and print a consolidated summary."""
    print(f"\n{'#'*60}")
    print("FINAL SUMMARY — COPY THESE INTO YOUR RESEARCH PAPER")
    print(f"{'#'*60}")
    print(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}")

    # Vision Results
    vision_file = RESULTS_DIR / "vision_results.json"
    if vision_file.exists():
        data = json.loads(vision_file.read_text(encoding='utf-8'))
        m = data.get("metrics", {})
        print(f"\n[TABLE IV.1] Vision AI Evaluation ({data.get('module', '')})")
        print(f"  Images Tested  : {data.get('total_images', 'N/A')}")
        print(f"  Accuracy       : {m.get('accuracy', 'N/A')}%")
        print(f"  Precision      : {m.get('precision_weighted', 'N/A')}%")
        print(f"  Recall         : {m.get('recall_weighted', 'N/A')}%")
        print(f"  F1-Score       : {m.get('f1_weighted', 'N/A')}%")
    else:
        print("\n[TABLE IV.1] Vision AI  -> NOT RUN YET (run eval_vision.py)")

    # SOC Results
    soc_file = RESULTS_DIR / "soc_results.json"
    if soc_file.exists():
        data = json.loads(soc_file.read_text(encoding='utf-8'))
        m = data.get("metrics", {})
        note = "(DEMO)" if "DEMO" in data.get("note", "") else "(REAL)"
        print(f"\n[TABLE IV.2] SOC Prediction {note} ({data.get('module', '')})")
        print(f"  Samples Tested : {data.get('total_samples', 'N/A')}")
        print(f"  R2 Score       : {m.get('R2', 'N/A')}")
        print(f"  RMSE (g/kg)    : {m.get('RMSE_g_per_kg', 'N/A')}")
        print(f"  MAE  (g/kg)    : {m.get('MAE_g_per_kg', 'N/A')}")
        print(f"  CCC            : {m.get('CCC', 'N/A')}")
    else:
        print("\n[TABLE IV.2] SOC Model  -> NOT RUN YET (run eval_soc.py)")

    # System Results
    sys_file = RESULTS_DIR / "system_results.json"
    if sys_file.exists():
        data = json.loads(sys_file.read_text(encoding='utf-8'))
        print(f"\n[TABLE IV.4] System Performance ({data.get('module', '')})")
        if "estimated_metrics" in data:
            for k, v in data["estimated_metrics"].items():
                print(f"  {k:35} : {v}")
        elif "endpoints" in data:
            for name, m in data["endpoints"].items():
                if "avg_ms" in m:
                    print(f"  {name:35} : Avg={m['avg_ms']}ms  P95={m.get('p95_ms','?')}ms")
    else:
        print("\n[TABLE IV.4] Performance  -> NOT RUN YET (run eval_system.py)")

    # Usability Results
    ux_file = RESULTS_DIR / "usability_results.json"
    if ux_file.exists():
        data = json.loads(ux_file.read_text(encoding='utf-8'))
        print(f"\n[TABLE IV.5] Usability Study — SUS Score")
        print(f"  Farmers Tested : {data.get('n_farmers', 'N/A')}")
        print(f"  SUS Score      : {data.get('average_sus', 'N/A')} / 100")
        print(f"  Grade          : {data.get('grade', 'N/A')}")
    else:
        print("\n[TABLE IV.5] Usability  -> NOT RUN YET (run eval_system.py)")

    print(f"\n{'#'*60}")
    print("All results saved in: research_eval/eval_results/")
    print(f"{'#'*60}\n")


if __name__ == "__main__":
    print("KRISHI-DRISHTI: Research Evaluation Suite")
    print(f"Starting at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("\nNote: Vision eval requires GEMINI_API_KEY in .env")
    print("Note: System eval requires backend running (run_backend.bat)")

    # Run all scripts
    run_script("eval_soc.py")
    run_script("eval_system.py")

    # Vision eval is last (slowest — makes Gemini API calls)
    vision_images = list(Path(__file__).parent.glob("test_images/*/*.jpg"))
    if vision_images:
        print(f"\nFound {len(vision_images)} test images. Running Vision eval...")
        run_script("eval_vision.py")
    else:
        print("\n[SKIP] Vision eval: No images in test_images/ yet.")
        print("  Run setup_test_images.py after PlantVillage downloads.")

    # Show consolidated summary
    print_final_summary()
