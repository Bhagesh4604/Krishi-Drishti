"""
Local Disease Predictor — Production Engine & Universal Multi-Crop Vision
========================================================================
Supports:
  1. Universal Model V2 (universal_model_v2.h5 + universal_indices_v2.json):
     74 Agricultural Classes covering major Indian staple crops, cash crops,
     horticulture fruits & vegetables, and severe field insect pests.
  2. Fallback Engine: TensorFlow Lite (.tflite, 5.2 MB) / EfficientNet H5 (15 classes).
  3. Render Low-Memory Execution (<100MB RAM via single-threaded execution & immediate gc.collect()).

Contract Preservation:
----------------------
Returns an output schema 100% IDENTICAL to the Gemini /api/ai/diagnose response:
  { diagnosis, confidence, summary, health_score, remedies[], _source }
"""

from __future__ import annotations

import gc
import json
import logging
import os
import threading
import time
from typing import Optional

import numpy as np
from PIL import Image

# ── Render / Low-Memory Environment Variables ────────────────────────────────
os.environ.setdefault("CUDA_VISIBLE_DEVICES", "-1")
os.environ.setdefault("TF_ENABLE_ONEDNN_OPTS", "0")
os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "3")
os.environ.setdefault("MALLOC_ARENA_MAX", "2")


logger = logging.getLogger(__name__)

# ── Model Paths ─────────────────────────────────────────────────────────────
_HERE = os.path.dirname(os.path.abspath(__file__))
_UNIVERSAL_MODEL_PATH = os.path.join(_HERE, "universal_model_v2.h5")
_UNIVERSAL_INDICES_PATH = os.path.join(_HERE, "universal_indices_v2.json")
_TFLITE_PATH = os.path.join(_HERE, "plant_disease_efficientnet.tflite")
_LEGACY_MODEL_PATH = os.path.join(_HERE, "plant_disease_efficientnet.h5")
_LEGACY_LABELS_PATH = os.path.join(_HERE, "class_labels_disease.json")

# ── Input Configuration ──────────────────────────────────────────────────────
_INPUT_SIZE = (224, 224)

# ── Detailed Agronomic Remedies Knowledge-Base ──────────────────────────────
_BASE_REMEDIES: dict[str, list[dict]] = {
    # ── Pests (Kaggle Model Classes) ──
    "Rice stem borer": [
        {"title": "Pheromone Traps", "desc": "Install 5-8 yellow stem borer pheromone traps per acre at 20-25 days after transplanting.", "type": "organic"},
        {"title": "Biological Parasitoid", "desc": "Release Trichogramma japonicum egg parasitoid @ 1,00,000/ha 3 times at weekly intervals.", "type": "organic"},
        {"title": "Clipping Seedling Tips", "desc": "Clip the tips of rice seedlings before transplanting to destroy egg clusters.", "type": "cultural"},
        {"title": "Cartap Hydrochloride", "desc": "Apply Cartap hydrochloride 4G @ 10 kg/acre or Chlorantraniliprole 18.5 SC @ 60 mL/acre at ETL (5% dead hearts).", "type": "chemical"},
    ],
    "green leafhopper": [
        {"title": "Neem Seed Kernel Extract", "desc": "Spray NSKE 5% or Azadirachtin 10,000 ppm @ 2 mL/L to repel vectors.", "type": "organic"},
        {"title": "Yellow Sticky Traps", "desc": "Erect 10 yellow sticky traps per acre slightly above the crop canopy.", "type": "cultural"},
        {"title": "Imidacloprid / Thiamethoxam", "desc": "Spray Thiamethoxam 25 WG @ 40 g/acre or Imidacloprid 17.8 SL @ 50 mL/acre.", "type": "chemical"},
    ],
    "planthopper": [
        {"title": "Alley Formation (Alternate Wetting)", "desc": "Drain the field for 3-4 days to expose the plant base to direct sunlight and reduce humidity.", "type": "cultural"},
        {"title": "Avoid Excess Nitrogen", "desc": "Split nitrogen doses; avoid excess urea which promotes succulent growth favored by BPH.", "type": "cultural"},
        {"title": "Pymetrozine 50 WG", "desc": "Direct spray towards the plant base using Pymetrozine 50 WG @ 120 g/acre or Triflumezopyrim 10 SC @ 94 mL/acre.", "type": "chemical"},
    ],
    "rice bug": [
        {"title": "Field Sanitation", "desc": "Keep bunds clean by trimming weed grasses that act as alternate hosts during tillering.", "type": "cultural"},
        {"title": "Neem Oil Spray", "desc": "Spray 3% neem oil mixed with mild soap during milky grain stage early in the morning.", "type": "organic"},
        {"title": "Malathion 5% Dust", "desc": "Dust Malathion 5D @ 10 kg/acre or spray Chlorpyrifos 20 EC @ 2 mL/L during flowering/milking.", "type": "chemical"},
    ],
    "rice leaf roller": [
        {"title": "Biological Control", "desc": "Conserve predatory spiders and release Trichogramma chilonis @ 1,00,000/ha.", "type": "organic"},
        {"title": "Manual Rope Dragging", "desc": "Pass a long rope across the crop canopy during early tillering to dislodge feeding larvae.", "type": "cultural"},
        {"title": "Flubendiamide Spray", "desc": "Spray Flubendiamide 39.35 SC @ 20 mL/acre or Cartap hydrochloride 50 SP @ 400 g/acre.", "type": "chemical"},
    ],

    # ── Field Crops & Staples (Plant Disease Classes) ──
    "rice": [
        {"title": "Tricyclazole 75 WP", "desc": "For Blast: Spray Tricyclazole 75 WP @ 0.6 g/L or Isoprothiolane 40 EC @ 1.5 mL/L at boot leaf stage.", "type": "chemical"},
        {"title": "Validamycin / Hexaconazole", "desc": "For Sheath Blight: Spray Validamycin 3L @ 2 mL/L targeting the plant sheath.", "type": "chemical"},
        {"title": "Pseudomonas fluorescens", "desc": "Apply bio-control agent Pseudomonas fluorescens @ 2.5 kg/ha mixed with 50 kg FYM.", "type": "organic"},
    ],
    "wheat": [
        {"title": "Propiconazole 25 EC", "desc": "For Rust / Blight: Spray Propiconazole 25 EC (Tilt) @ 1 mL/L upon first sighting of pustules.", "type": "chemical"},
        {"title": "Seed Treatment", "desc": "Treat seeds with Carboxin + Thiram @ 2 g/kg seed before sowing.", "type": "cultural"},
        {"title": "Balanced Potash Nutrition", "desc": "Ensure adequate Muriate of Potash (MOP) application to enhance disease resistance.", "type": "cultural"},
    ],
    "cotton": [
        {"title": "Copper Oxychloride + Streptocycline", "desc": "For Bacterial Blight: Spray Copper oxychloride 50 WP @ 2.5 g/L + Streptocycline 100 ppm.", "type": "chemical"},
        {"title": "Vector Management for CLCuV", "desc": "Manage whitefly vectors with Diafenthiuron 50 WP @ 1.2 g/L or Spiromesifen 22.9 SC @ 1 mL/L.", "type": "chemical"},
        {"title": "Resistant Crop Spacing", "desc": "Maintain 90x60 cm row spacing to avoid dense canopy humidity.", "type": "cultural"},
    ],
    "sugarcane": [
        {"title": "Sett Treatment", "desc": "Dip seed setts in Carbendazim 50 WP (1 g/L) or hot water treatment (52°C for 30 mins) before planting.", "type": "cultural"},
        {"title": "Trichoderma Soil Enrichment", "desc": "Apply Trichoderma viride @ 5 kg/ha with enriched vermicompost in planting furrows.", "type": "organic"},
        {"title": "Rogue Out Infected Clumps", "desc": "Uproot and burn red rot or smut affected clumps immediately; do not take ratoon from affected crop.", "type": "cultural"},
    ],
    "banana": [
        {"title": "Propiconazole + Mineral Oil", "desc": "For Sigatoka: Spray Propiconazole 25 EC @ 1 mL/L mixed with 1% agricultural mineral oil.", "type": "chemical"},
        {"title": "De-suckering & Drainage", "desc": "Prune excess suckers to maintain single pseudo-stem; provide drainage trenches.", "type": "cultural"},
        {"title": "Pseudomonas Drenching", "desc": "Drench basin with Pseudomonas fluorescens (10 g/L) for biological suppression of soil pathogens.", "type": "organic"},
    ],
    "mustard-oil": [
        {"title": "Mancozeb Spray", "desc": "For White Rust / Alternaria: Spray Mancozeb 75 WP @ 2 g/L at 45 and 60 days after sowing.", "type": "chemical"},
        {"title": "Early Sowing", "desc": "Complete sowing before October 15 to escape peak aphids and white rust infection.", "type": "cultural"},
    ],
    "Fox_nut(Makhana)": [
        {"title": "Water Circulation", "desc": "Maintain fresh water circulation and skim floating debris to prevent stagnation pathogens.", "type": "cultural"},
        {"title": "Copper Hydroxide Spray", "desc": "Apply copper hydroxide @ 2 g/L during vegetative leaf expansion phase.", "type": "chemical"},
    ],
    "Pearl_millet(bajra)": [
        {"title": "Metalaxyl Seed Treatment", "desc": "Treat seeds with Metalaxyl 35 SD @ 6 g/kg seed to prevent Downy Mildew / Green Ear.", "type": "cultural"},
        {"title": "Mancozeb 75 WP", "desc": "Spray Mancozeb @ 2 g/L at earhead emergence stage.", "type": "chemical"},
    ],

    # ── Fruits & Vegetable Post-Harvest Rot & Freshness ──
    "Rotten": [
        {"title": "Immediate Segregation", "desc": "Cull and segregate infected and decaying produce immediately to prevent ethylene and spore spread.", "type": "cultural"},
        {"title": "Post-Harvest Cold Storage", "desc": "Maintain optimal cold storage temperature (0-4°C for temperate fruits, 10-13°C for tropical produce).", "type": "cultural"},
        {"title": "Hot Water Immersion (48-52°C)", "desc": "Dip fruit in warm water (48-52°C for 3-5 mins) to kill surface fungal mycelia and latent anthracnose.", "type": "organic"},
        {"title": "Sanitary Crate Disinfection", "desc": "Disinfect harvesting crates with 0.1% sodium hypochlorite solution between batches.", "type": "cultural"},
    ],
    "Healthy": [
        {"title": "Maintain Balanced Nutrition", "desc": "Continue recommended fertigation and micronutrient schedule (Zn, B, Fe).", "type": "cultural"},
        {"title": "Routine Prophylaxis", "desc": "Carry out regular field scouting every 3-4 days to spot early pest hotspots.", "type": "organic"},
    ],
}


def _format_class_metadata(raw_class: str) -> tuple[str, bool, str, list[dict]]:
    """
    Parses composite class name (e.g. 'fruit_veg_model___Mango__Rotten')
    into (clean_name, is_healthy, summary, remedies).
    """
    clean = raw_class
    for prefix in ["plant_disease_model___", "fruit_veg_model___", "kaggle_trained_model___", "universal_vision_model___"]:
        if clean.startswith(prefix):
            clean = clean[len(prefix):]
            break

    clean = clean.replace("__", " - ").replace("_", " ").strip()
    is_healthy = "healthy" in raw_class.lower()

    # Determine remedies and summary
    remedies: list[dict] = []
    summary = f"Detected: {clean}."

    if is_healthy:
        summary = f"The {clean.split('-')[0].strip()} specimen is healthy with no pathogenic lesions or infestation."
        remedies = _BASE_REMEDIES["Healthy"]
    elif "rotten" in raw_class.lower():
        crop_name = clean.split('-')[0].strip()
        summary = f"Post-harvest rot / decay detected on {crop_name}. Immediate sorting and cold-chain sanitation required."
        remedies = _BASE_REMEDIES["Rotten"]
    else:
        # Check specific keyword match in base remedies
        matched = False
        for key, rem_list in _BASE_REMEDIES.items():
            if key.lower() in raw_class.lower():
                remedies = rem_list
                summary = f"Agronomic alert: {clean} detected. Recommended protocol attached below."
                matched = True
                break

        if not matched:
            # Default broad-spectrum organic & cultural protocol
            summary = f"Identified crop symptom: {clean}. Early intervention recommended."
            remedies = [
                {"title": "Neem / Biological Spray", "desc": "Spray neem oil 3-5 mL/L or apply Trichoderma viride @ 5g/L on affected foliage.", "type": "organic"},
                {"title": "Field Sanitation & Airflow", "desc": "Prune severely affected foliage and avoid overhead irrigation to minimize leaf wetness.", "type": "cultural"},
                {"title": "Broad-Spectrum Protectant", "desc": "Apply copper oxychloride (2.5 g/L) or Mancozeb (2 g/L) as a protective barrier.", "type": "chemical"},
            ]

    return clean, is_healthy, summary, remedies


# ── Thread-Safe Singletons ───────────────────────────────────────────────────
_engine_type: Optional[str] = None
_model = None
_tflite_input_details = None
_tflite_output_details = None
_classes: Optional[list[str]] = None
_load_error: Optional[str] = None
_load_attempted = False
_load_lock = threading.Lock()
_inference_lock = threading.Lock()


def _load_model_once() -> tuple:
    """
    Lazy-load the model once in a thread-safe manner.
    Order of preference:
      1. Universal Model V2 (universal_model_v2.h5 + universal_indices_v2.json) — 74 classes.
      2. TFLite (Ultra-low memory, ideal for Render 512MB RAM, single-threaded) — 15 classes.
      3. Legacy EfficientNet H5.
    """
    global _engine_type, _model, _tflite_input_details, _tflite_output_details
    global _classes, _load_error, _load_attempted

    if _load_attempted:
        return _engine_type, _model, _classes, _load_error

    with _load_lock:
        if _load_attempted:
            return _engine_type, _model, _classes, _load_error

        _load_attempted = True

        # ── 1. Strategy A: Universal Model V2 (74 Classes) ───────────────────
        if os.path.exists(_UNIVERSAL_MODEL_PATH) and os.path.exists(_UNIVERSAL_INDICES_PATH):
            try:
                with open(_UNIVERSAL_INDICES_PATH, "r", encoding="utf-8") as f:
                    raw_indices = json.load(f)
                    # Sort classes by their integer index to guarantee alignment
                    _classes = [k for k, v in sorted(raw_indices.items(), key=lambda item: item[1])]

                import tensorflow as tf
                # Enforce single-thread CPU execution to maintain low memory on Render
                try:
                    tf.config.threading.set_inter_op_parallelism_threads(1)
                    tf.config.threading.set_intra_op_parallelism_threads(1)
                except Exception:
                    pass

                _model = tf.keras.models.load_model(_UNIVERSAL_MODEL_PATH, compile=False)
                _engine_type = "universal_keras"
                _load_error = None
                logger.info(
                    "[LocalDiseasePredictor] Universal Model V2 loaded successfully: %d classes (%.1f MB).",
                    len(_classes), os.path.getsize(_UNIVERSAL_MODEL_PATH) / 1e6
                )
                return _engine_type, _model, _classes, None
            except Exception as e:
                logger.warning("[LocalDiseasePredictor] Universal model load failed (%s); trying TFLite...", e)

        # ── 2. Strategy B: Ultra-lightweight TFLite (15 classes) ─────────────
        if os.path.exists(_TFLITE_PATH) and os.path.exists(_LEGACY_LABELS_PATH):
            try:
                with open(_LEGACY_LABELS_PATH, "r", encoding="utf-8") as f:
                    _classes = json.load(f)["classes"]

                Interpreter = None
                try:
                    from ai_edge_litert.interpreter import Interpreter
                except ImportError:
                    pass
                if Interpreter is None:
                    try:
                        from tflite_runtime.interpreter import Interpreter
                    except ImportError:
                        pass
                if Interpreter is None:
                    try:
                        import tensorflow as tf
                        Interpreter = tf.lite.Interpreter
                    except ImportError:
                        pass

                if Interpreter is not None:
                    interpreter = Interpreter(model_path=_TFLITE_PATH, num_threads=1)
                    interpreter.allocate_tensors()
                    _tflite_input_details = interpreter.get_input_details()
                    _tflite_output_details = interpreter.get_output_details()
                    _model = interpreter
                    _engine_type = "tflite"
                    _load_error = None
                    logger.info(
                        "[LocalDiseasePredictor] TFLite model loaded successfully: %d classes (%.1f MB).",
                        len(_classes), os.path.getsize(_TFLITE_PATH) / 1e6
                    )
                    return _engine_type, _model, _classes, None
            except Exception as e:
                logger.warning("[LocalDiseasePredictor] TFLite load failed: %s", e)

        # ── 3. Strategy C: Legacy EfficientNet Keras ─────────────────────────
        if os.path.exists(_LEGACY_MODEL_PATH) and os.path.exists(_LEGACY_LABELS_PATH):
            try:
                with open(_LEGACY_LABELS_PATH, "r", encoding="utf-8") as f:
                    _classes = json.load(f)["classes"]

                import tensorflow as tf
                _model = tf.keras.models.load_model(_LEGACY_MODEL_PATH, compile=False)
                _engine_type = "legacy_keras"
                _load_error = None
                logger.info("[LocalDiseasePredictor] Legacy Keras model loaded: %d classes.", len(_classes))
                return _engine_type, _model, _classes, None
            except Exception as e:
                logger.warning("[LocalDiseasePredictor] Legacy Keras load failed: %s", e)

        _load_error = "No supported disease vision model could be loaded."
        logger.error("[LocalDiseasePredictor] %s", _load_error)
        return None, None, None, _load_error


def _preprocess(image: Image.Image, scale_to_unit: bool = True) -> np.ndarray:
    """Resize to model input and apply only the preprocessing this model needs."""
    img = image.convert("RGB").resize(_INPUT_SIZE, Image.LANCZOS)
    arr = np.array(img, dtype=np.float32)
    if scale_to_unit:
        arr /= 255.0
    return np.expand_dims(arr, axis=0)


def _crop_matches_context(crop_type: str, raw_class: str) -> bool:
    """Avoid returning a local-model label from a visibly different crop class."""
    crop = "".join(char.lower() for char in crop_type if char.isalnum())
    if crop.endswith("s") and len(crop) > 4:
        crop = crop[:-1]
    if not crop or crop in {"other", "unknown", "notsure"}:
        return True

    label = "".join(char.lower() for char in raw_class if char.isalnum())
    aliases = {
        "maize": ("maize", "corn"),
        "corn": ("maize", "corn"),
        "paddy": ("rice",),
        "rice": ("rice", "paddy"),
        "brinjal": ("brinjal", "eggplant", "aubergine"),
        "eggplant": ("brinjal", "eggplant", "aubergine"),
        "aubergine": ("brinjal", "eggplant", "aubergine"),
        "chili": ("chili", "chilli", "pepper"),
        "chilli": ("chili", "chilli", "pepper"),
        "capsicum": ("capsicum", "pepper"),
        "groundnut": ("groundnut", "peanut"),
        "peanut": ("groundnut", "peanut"),
    }
    candidates = aliases.get(crop, (crop,))
    return any(candidate in label for candidate in candidates)


# ── Public API ───────────────────────────────────────────────────────────────

def predict(
    image: Image.Image,
    mode: str = "diagnosis",
    crop_type: str = "",
    growth_stage: str = "",
    symptoms: str = "",
) -> dict:
    """
    Run local inference on `image` and return a response dict
    that matches the Gemini /api/ai/diagnose schema exactly.
    Supports both disease/pest diagnosis and produce commercial quality grading.
    Always returns a valid dict — never raises.
    """
    t0 = time.perf_counter()

    engine, model, classes, load_err = _load_model_once()

    if load_err or model is None or classes is None:
        logger.warning("[LocalDiseasePredictor] Model unavailable: %s", load_err)
        return {
            "diagnosis": "Local Model Unavailable",
            "confidence": 0,
            "summary": f"Local model unavailable: {load_err}. Falling back to Gemini cloud vision.",
            "health_score": 0,
            "remedies": [],
            "_source": "local_error",
        }

    try:
        # The older EfficientNet artifacts include an internal Rescaling(1/255)
        # layer; feeding them [0,1] here would divide the image a second time.
        arr = _preprocess(image, scale_to_unit=engine not in {"tflite", "legacy_keras"})

        with _inference_lock:
            if engine == "tflite":
                model.set_tensor(_tflite_input_details[0]["index"], arr)
                model.invoke()
                preds = model.get_tensor(_tflite_output_details[0]["index"])
            else:
                preds = model.predict(arr, verbose=0)

        class_scores = np.asarray(preds[0], dtype=np.float32)
        if class_scores.size != len(classes) or not np.all(np.isfinite(class_scores)):
            raise ValueError("The vision model returned invalid class scores.")
        pred_idx = int(np.argmax(class_scores))
        confidence = int(round(float(class_scores[pred_idx]) * 100))
        raw_key = classes[pred_idx]

        del arr
        gc.collect()

        clean_name, is_healthy, summary, remedies = _format_class_metadata(raw_key)

        latency_ms = (time.perf_counter() - t0) * 1000

        # Commercial Quality Grading Mode
        if mode == "grading":
            crop_name = clean_name.split("-")[0].strip()
            if is_healthy:
                grade = "Grade A"
                grade_summary = f"{crop_name} Quality: Grade A (Fresh & Market Ready). High commercial visual standard."
                grade_score = 95
                grade_remedies = [
                    {"title": "Cold-Chain Preservation", "desc": f"Maintain recommended post-harvest temperature and 85-90% relative humidity for {crop_name}.", "type": "cultural"},
                    {"title": "Aerated Packaging", "desc": "Pack in ventilated crates to prevent moisture build-up and surface condensation.", "type": "cultural"}
                ]
            elif "rotten" in raw_key.lower():
                grade = "Grade C"
                grade_summary = f"{crop_name} Quality: Grade C (Post-Harvest Spoilage / Decay). Tissue rot detected; cull immediately."
                grade_score = max(15, 100 - confidence)
                grade_remedies = [
                    {"title": "Immediate Cull & Sorting", "desc": "Segregate decayed items immediately to stop ethylene gas and spore transmission.", "type": "cultural"},
                    {"title": "Crate Sanitation", "desc": "Wash crates and sorting tables with 0.1% sodium hypochlorite solution.", "type": "cultural"}
                ]
            else:
                grade = "Grade B"
                grade_summary = f"{crop_name} Quality: Grade B (Cosmetic Blemish / Secondary). Minor surface marking ({clean_name}); suitable for processing or immediate local retail."
                grade_score = 65
                grade_remedies = [
                    {"title": "Processing Diversion", "desc": "Redirect blemished produce to pulp, drying, or processing facilities to avoid waste.", "type": "cultural"}
                ]

            logger.info(
                "[LocalDiseasePredictor] Grading (%s): %s -> %s (conf=%d%%, latency=%.1fms)",
                engine, clean_name, grade, confidence, latency_ms
            )
            return {
                "diagnosis": grade,
                "confidence": confidence,
                "summary": grade_summary,
                "health_score": grade_score,
                "remedies": grade_remedies,
                "_source": f"local_{engine}_grading",
            }

        # Standard Diagnosis Mode. A softmax value is a model score, not a
        # calibrated disease probability or a crop-health measurement.
        crop_matches = _crop_matches_context(crop_type, raw_key)
        low_signal = confidence < 35 or not crop_matches
        safe_remedies = [
            remedy for remedy in remedies
            if str(remedy.get("type", "")).lower() in {"cultural", "organic"}
        ]
        if low_signal:
            diagnosis = "Unable to confirm from this photo"
            if not crop_matches:
                summary = (
                    f"The model's possible match ({clean_name}) does not match the crop you entered "
                    f"({crop_type.strip()}). No diagnosis is being made. Check the crop selection and "
                    "capture a close, well-lit image of the affected area."
                )
            else:
                summary = (
                    f"The model's top visual match was {clean_name}, but its score is too weak to use "
                    "as a diagnosis. Capture a close, well-lit image of the affected leaf and its underside."
                )
            safe_remedies = []
        else:
            diagnosis = clean_name
            summary = (
                f"Possible visual match: {clean_name}. This is an AI screening result; confirm symptoms "
                "in the field before choosing a treatment."
            )

        logger.info(
            "[LocalDiseasePredictor] Prediction (%s): %s (conf=%d%%, latency=%.1fms)",
            engine, diagnosis, confidence, latency_ms
        )

        return {
            "diagnosis": diagnosis,
            "confidence": confidence,
            "model_score": confidence,
            "confidence_level": "low" if low_signal else "screening",
            "analysis_status": "needs_review" if low_signal else "screening_only",
            "analysis_method": "Local crop vision model",
            "crop_identification": crop_type.strip() or None,
            "farmer_growth_stage": growth_stage.strip() or None,
            "farmer_symptom_context": symptoms.strip() or None,
            "image_quality": "unknown",
            "observed_symptoms": [],
            "summary": summary,
            "health_score": None,
            "remedies": safe_remedies,
            "next_steps": [
                "Take a close-up in daylight, include the whole plant and the leaf underside, and ask a local agronomist to confirm before treatment."
            ],
            "_source": f"local_{engine}",
        }

    except Exception as exc:
        logger.exception("[LocalDiseasePredictor] Inference error: %s", exc)
        gc.collect()
        return {
            "diagnosis": "Inference Error",
            "confidence": 0,
            "summary": f"Local model inference failed: {exc}",
            "health_score": 0,
            "remedies": [],
            "_source": "local_error",
        }


def is_model_ready() -> tuple[bool, str]:
    """Returns (True, '') if the model loaded OK, or (False, reason) otherwise."""
    _, _, _, err = _load_model_once()
    return (err is None), (err or "")
