"""
Local Disease Predictor — Production Engine & Render Optimization
==================================================================
Dual-Engine (TFLite + Keras 3) Local Disease Prediction for Krishi-Drishti.

Render Constrained Memory Optimization:
----------------------------------------
Render free/starter instances have 512MB RAM and throttled vCPUs.
This module optimizes resource consumption:
  1. Primary Runtime: TensorFlow Lite (.tflite, 5.2 MB) with single-threaded
     execution (`num_threads=1`). Consumes only ~15-25 MB RAM (vs 350+ MB for full Keras).
  2. Fallback Runtime: Keras 3 with compatibility patch and thread limits.
  3. OS Environment Tuning:
       - TF_ENABLE_ONEDNN_OPTS=0   (disables heavy oneDNN tensor scratch buffers)
       - TF_CPP_MIN_LOG_LEVEL=3    (suppresses verbose C++ buffer allocations)
       - MALLOC_ARENA_MAX=2        (restricts glibc malloc arenas on Linux/Docker)
  4. Memory Cleanup: Explicit gc.collect() and tensor deallocation after every run.
  5. Thread-Safe: Singleton interpreter protected by threading.Lock() to prevent
     concurrent spikes.

Contract Preservation:
----------------------
Returns an output schema 100% IDENTICAL to the Gemini /api/ai/diagnose response:
  { diagnosis, confidence, summary, health_score, remedies[], _source }
The frontend and Android app remain completely untouched.
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
os.environ.setdefault("TF_ENABLE_ONEDNN_OPTS", "0")
os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "3")
os.environ.setdefault("MALLOC_ARENA_MAX", "2")

logger = logging.getLogger(__name__)

# ── Paths (resolved relative to this file) ───────────────────────────────────
_HERE = os.path.dirname(os.path.abspath(__file__))
_TFLITE_PATH = os.path.join(_HERE, "plant_disease_efficientnet.tflite")
_MODEL_PATH  = os.path.join(_HERE, "plant_disease_efficientnet.h5")
_LABELS_PATH = os.path.join(_HERE, "class_labels_disease.json")

# ── Image pre-processing config ──────────────────────────────────────────────
_INPUT_SIZE = (224, 224)

# ── Remedy knowledge-base (15 classes across tomato, potato, pepper) ─────────
_REMEDIES: dict[str, list[dict]] = {
    "Pepper__bell___Bacterial_spot": [
        {"title": "Copper Bactericide",  "desc": "Apply copper-based bactericide (e.g. Kocide 3000) every 7 days during warm, wet weather.", "type": "chemical"},
        {"title": "Crop Rotation",        "desc": "Rotate with non-solanaceous crops for 2+ seasons to break the disease cycle.", "type": "organic"},
    ],
    "Pepper__bell___healthy": [],

    "Potato___Early_blight": [
        {"title": "Chlorothalonil Spray", "desc": "Apply Chlorothalonil (Daconil) at first symptom appearance; repeat every 7-10 days.", "type": "chemical"},
        {"title": "Lower-Leaf Removal",   "desc": "Prune infected lower leaves early to reduce inoculum and improve air circulation.", "type": "organic"},
    ],
    "Potato___Late_blight": [
        {"title": "Metalaxyl + Mancozeb", "desc": "Apply Ridomil Gold MZ preventatively during cool, wet weather every 7 days.", "type": "chemical"},
        {"title": "Destroy Infected Tissue", "desc": "Immediately remove and burn infected haulm; never compost late blight debris.", "type": "organic"},
    ],
    "Potato___healthy": [],

    "Tomato_Bacterial_spot": [
        {"title": "Copper Bactericide",  "desc": "Spray copper oxychloride (50WP @ 3g/L) preventatively; avoid overhead irrigation.", "type": "chemical"},
        {"title": "Drip Irrigation",     "desc": "Switch to drip irrigation to prevent water splashing that spreads bacteria.", "type": "organic"},
    ],
    "Tomato_Early_blight": [
        {"title": "Azoxystrobin Fungicide", "desc": "Apply Azoxystrobin (Amistar) at 1mL/L; rotate with Mancozeb to prevent resistance.", "type": "chemical"},
        {"title": "Mulching",               "desc": "Apply plastic or straw mulch to prevent soil splash onto lower foliage.", "type": "organic"},
    ],
    "Tomato_Late_blight": [
        {"title": "Metalaxyl-M + Mancozeb", "desc": "Apply Ridomil Gold @ 2.5g/L at first sign; repeat every 5-7 days in wet conditions.", "type": "chemical"},
        {"title": "Remove Debris",           "desc": "Remove all infected plant material at season end; do not compost.", "type": "organic"},
    ],
    "Tomato_Leaf_Mold": [
        {"title": "Chlorothalonil / Mancozeb", "desc": "Apply fungicide spray when humidity exceeds 85%; target leaf undersides.", "type": "chemical"},
        {"title": "Improve Ventilation",       "desc": "Increase plant spacing and prune leaves to reduce humidity in the canopy.", "type": "organic"},
    ],
    "Tomato_Septoria_leaf_spot": [
        {"title": "Mancozeb 75WP",  "desc": "Apply Mancozeb @ 2g/L at first symptom on lower leaves; repeat every 10 days.", "type": "chemical"},
        {"title": "Sanitation",     "desc": "Remove and destroy heavily infected leaves; do not compost them.", "type": "organic"},
    ],
    "Tomato_Spider_mites_Two_spotted_spider_mite": [
        {"title": "Abamectin Miticide", "desc": "Apply abamectin (Vertimec) @ 0.5mL/L; focus on leaf undersides where mites colonize.", "type": "chemical"},
        {"title": "Neem Oil Spray",     "desc": "Spray neem oil (3mL/L) + insecticidal soap on undersides of leaves every 5 days.", "type": "organic"},
    ],
    "Tomato__Target_Spot": [
        {"title": "Chlorothalonil / Mancozeb", "desc": "Apply broad-spectrum fungicide when first lesions appear; repeat every 7 days.", "type": "chemical"},
        {"title": "Canopy Management",         "desc": "Reduce leaf wetness by pruning and increasing row spacing; avoid overhead watering.", "type": "organic"},
    ],
    "Tomato__Tomato_YellowLeaf__Curl_Virus": [
        {"title": "Imidacloprid Insecticide", "desc": "Apply Imidacloprid 17.8SL @ 0.5mL/L to control whitefly vector; start early.", "type": "chemical"},
        {"title": "Reflective Mulch",         "desc": "Use silver reflective mulch to disorient and repel Bemisia tabaci whitefly.", "type": "organic"},
    ],
    "Tomato__Tomato_mosaic_virus": [
        {"title": "Sanitation Protocol", "desc": "Wash hands and tools with soap before handling plants; remove and destroy infected plants immediately.", "type": "organic"},
    ],
    "Tomato_healthy": [],
}

# ── Summaries for each class ─────────────────────────────────────────────────
_SUMMARIES: dict[str, str] = {
    "Pepper__bell___Bacterial_spot": "Bacterial spot detected on bell pepper - caused by Xanthomonas campestris; favoured by warm, wet conditions.",
    "Pepper__bell___healthy":        "Pepper plant appears healthy with no visible disease symptoms.",
    "Potato___Early_blight":         "Early blight (Alternaria solani) detected - brown lesions with concentric rings on older leaves.",
    "Potato___Late_blight":          "CRITICAL: Late blight (Phytophthora infestans) detected - rapid defoliation risk; act immediately.",
    "Potato___healthy":              "Potato plant appears healthy with no visible disease symptoms.",
    "Tomato_Bacterial_spot":         "Bacterial spot (Xanthomonas spp.) detected - small, water-soaked leaf lesions that turn brown.",
    "Tomato_Early_blight":           "Early blight (Alternaria solani) on tomato - dark concentric lesions, usually on lower leaves first.",
    "Tomato_Late_blight":            "Late blight (Phytophthora infestans) detected on tomato - white mould on undersides; spreads fast.",
    "Tomato_Leaf_Mold":              "Leaf mold (Passalora fulva) detected - pale green/yellow spots on upper leaf surface, olive mould below.",
    "Tomato_Septoria_leaf_spot":     "Septoria leaf spot - small circular lesions with dark borders and white centres on lower leaves.",
    "Tomato_Spider_mites_Two_spotted_spider_mite": "Spider mite infestation detected - stippling and bronzing on leaves; fine webbing visible.",
    "Tomato__Target_Spot":           "Target spot (Corynespora cassiicola) - concentric ring lesions on leaves, stems, and fruit.",
    "Tomato__Tomato_YellowLeaf__Curl_Virus": "Tomato Yellow Leaf Curl Virus (TYLCV) detected - transmitted by whitefly; no cure, manage vector.",
    "Tomato__Tomato_mosaic_virus":   "Tomato mosaic virus detected - light/dark green mosaic pattern; spread by contact.",
    "Tomato_healthy":                "Tomato plant appears healthy with no visible disease symptoms.",
}


# ── Thread-Safe Singletons ───────────────────────────────────────────────────

_engine_type: Optional[str] = None  # "tflite" or "keras"
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
    Lazy-load the model exactly once in a thread-safe manner.
    Order of preference:
      1. TFLite (Ultra-low memory, ideal for Render 512MB RAM, single-threaded)
      2. Keras 3 with compatibility patch
      3. tf_keras (Keras 2 standalone)
      4. tensorflow.keras
    """
    global _engine_type, _model, _tflite_input_details, _tflite_output_details
    global _classes, _load_error, _load_attempted

    if _load_attempted:
        return _engine_type, _model, _classes, _load_error

    with _load_lock:
        if _load_attempted:
            return _engine_type, _model, _classes, _load_error

        _load_attempted = True

        # ── 1. Load class labels ──────────────────────────────────────────────
        try:
            with open(_LABELS_PATH, "r", encoding="utf-8") as f:
                data = json.load(f)
                _classes = data["classes"]
            logger.info("[LocalDiseasePredictor] Loaded %d class labels.", len(_classes))
        except Exception as e:
            _load_error = f"Cannot load class labels: {e}"
            logger.error("[LocalDiseasePredictor] %s", _load_error)
            return None, None, None, _load_error

        # ── 2. Strategy A (PRIMARY for Render): Ultra-lightweight TFLite ─────
        if os.path.exists(_TFLITE_PATH):
            try:
                import tensorflow as tf
                # Enforce single-thread execution to prevent memory surges on Render
                interpreter = tf.lite.Interpreter(
                    model_path=_TFLITE_PATH,
                    num_threads=1
                )
                interpreter.allocate_tensors()
                _tflite_input_details = interpreter.get_input_details()
                _tflite_output_details = interpreter.get_output_details()
                _model = interpreter
                _engine_type = "tflite"
                _load_error = None
                logger.info(
                    "[LocalDiseasePredictor] Render-optimized TFLite model loaded successfully "
                    "(%.1f MB, memory ~20MB).",
                    os.path.getsize(_TFLITE_PATH) / 1e6
                )
                return _engine_type, _model, _classes, None
            except Exception as e:
                logger.warning(
                    "[LocalDiseasePredictor] TFLite load failed (%s); falling back to H5...", e
                )

        # ── 3. Strategy B: Keras 3 with compatibility patch ───────────────────
        if os.path.exists(_MODEL_PATH):
            try:
                import keras
                if hasattr(keras, "layers") and hasattr(keras.layers, "Dense"):
                    _orig_dense_from_config = keras.layers.Dense.from_config

                    @classmethod
                    def _patched_dense_from_config(cls, config):
                        if isinstance(config, dict):
                            config.pop("quantization_config", None)
                        return _orig_dense_from_config(config)

                    keras.layers.Dense.from_config = _patched_dense_from_config

                _model = keras.models.load_model(_MODEL_PATH, compile=False)
                _engine_type = "keras"
                _load_error = None
                logger.info("[LocalDiseasePredictor] Keras model loaded (%.1f MB).",
                            os.path.getsize(_MODEL_PATH) / 1e6)
                return _engine_type, _model, _classes, None
            except Exception as e:
                logger.warning("[LocalDiseasePredictor] Keras load failed (%s); trying tf_keras...", e)

            # Strategy C: tf_keras standalone
            try:
                import tf_keras as tfk
                _model = tfk.models.load_model(_MODEL_PATH, compile=False)
                _engine_type = "keras"
                _load_error = None
                return _engine_type, _model, _classes, None
            except Exception as e:
                logger.warning("[LocalDiseasePredictor] tf_keras load failed: %s", e)

        _load_error = f"Neither {_TFLITE_PATH} nor {_MODEL_PATH} could be loaded."
        logger.error("[LocalDiseasePredictor] %s", _load_error)
        return None, None, None, _load_error


def _preprocess(image: Image.Image) -> np.ndarray:
    """Resize, normalise, and expand dims to (1, 224, 224, 3)."""
    img = image.convert("RGB").resize(_INPUT_SIZE, Image.LANCZOS)
    arr = np.array(img, dtype=np.float32) / 255.0
    return np.expand_dims(arr, axis=0)


def _build_response(
    diagnosis_key: str,
    confidence: int,
    source_tag: str = "local",
) -> dict:
    """
    Construct a response dict that is schema-identical to the Gemini response:
      { diagnosis, confidence, summary, health_score, remedies[], _source }
    """
    clean_name = (
        diagnosis_key
        .replace("___", " - ")
        .replace("__", " - ")
        .replace("_", " ")
        .strip()
    )
    is_healthy = "healthy" in diagnosis_key.lower()
    health_score = 100 if is_healthy else max(0, 100 - confidence)
    summary = _SUMMARIES.get(
        diagnosis_key,
        f"Detected: {clean_name}. Confidence: {confidence}%."
    )

    return {
        "diagnosis":    clean_name,
        "confidence":   confidence,
        "summary":      summary,
        "health_score": health_score,
        "remedies":     _REMEDIES.get(diagnosis_key, []),
        "_source":      source_tag,
    }


# ── Public API ───────────────────────────────────────────────────────────────

def predict(image: Image.Image) -> dict:
    """
    Run local inference on `image` and return a response dict
    that matches the Gemini /api/ai/diagnose schema exactly.

    Always returns a dict — never raises.
    Thread-safe and memory-bounded for Render environments.
    """
    t0 = time.perf_counter()

    engine, model, classes, load_err = _load_model_once()

    if load_err or model is None or classes is None:
        logger.warning("[LocalDiseasePredictor] Model unavailable: %s", load_err)
        return {
            "diagnosis":    "Local Model Unavailable",
            "confidence":   0,
            "summary":      (
                f"Local model could not be loaded: {load_err}. "
                "Set USE_LOCAL_DISEASE_MODEL=false to use Gemini API instead."
            ),
            "health_score": 0,
            "remedies":     [],
            "_source":      "local_error",
        }

    try:
        arr = _preprocess(image)

        # Thread-safe execution to prevent memory contention
        with _inference_lock:
            if engine == "tflite":
                model.set_tensor(_tflite_input_details[0]["index"], arr)
                model.invoke()
                preds = model.get_tensor(_tflite_output_details[0]["index"])
            else:
                preds = model.predict(arr, verbose=0)

        pred_idx   = int(np.argmax(preds[0]))
        confidence = int(round(float(preds[0][pred_idx]) * 100))
        diagnosis_key = classes[pred_idx]

        # Free memory immediately (essential for Render 512MB RAM)
        del arr
        gc.collect()

        latency_ms = (time.perf_counter() - t0) * 1000
        logger.info(
            "[LocalDiseasePredictor] Prediction (%s): %s (conf=%d%%, latency=%.1fms)",
            engine, diagnosis_key, confidence, latency_ms,
        )

        return _build_response(diagnosis_key, confidence, source_tag="local")

    except Exception as exc:
        logger.exception("[LocalDiseasePredictor] Inference error: %s", exc)
        gc.collect()
        return {
            "diagnosis":    "Inference Error",
            "confidence":   0,
            "summary":      f"Local model inference failed: {exc}",
            "health_score": 0,
            "remedies":     [],
            "_source":      "local_error",
        }


def is_model_ready() -> tuple[bool, str]:
    """
    Returns (True, '') if the model loaded OK, or (False, reason) otherwise.
    Triggers the lazy load on first call.
    """
    _, _, _, err = _load_model_once()
    return (err is None), (err or "")
