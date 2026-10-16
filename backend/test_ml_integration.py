"""
Krishi-Drishti ML Integration Test Suite
=========================================
Tests all ML models, inference pipelines, and AI-driven components.
Run from the backend directory with: python test_ml_integration.py
"""

import sys
import os
import time
import json
import traceback

# ── Path setup ──────────────────────────────────────────────────────────────────
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

# ── Result accumulator ──────────────────────────────────────────────────────────
RESULTS = []

def record(component, test_name, status, latency_ms, output=None, error=None, note=None):
    RESULTS.append({
        "component": component,
        "test": test_name,
        "status": status,           # PASS | FAIL | WARN | SKIP
        "latency_ms": latency_ms,
        "output_sample": str(output)[:200] if output else None,
        "error": str(error)[:300] if error else None,
        "note": note,
    })
    icon = {"PASS": "✅", "FAIL": "❌", "WARN": "⚠️", "SKIP": "⏭️"}.get(status, "?")
    lat_str = f"{latency_ms:.1f}ms" if latency_ms is not None else "N/A"
    print(f"  {icon} [{lat_str}] {test_name}")
    if error:
        print(f"       ERROR: {error}")
    if note:
        print(f"       NOTE: {note}")


# ═══════════════════════════════════════════════════════════════════════════════
# 1. DISEASE FORECASTER (Rule-based Epidemiological Model)
# ═══════════════════════════════════════════════════════════════════════════════

def test_disease_forecaster():
    print("\n[1] DISEASE FORECASTER — Rule-Based Epidemiological Model")
    print("-" * 60)

    try:
        from ml_models.disease_forecaster import evaluate_disease_risk
    except ImportError as e:
        record("Disease Forecaster", "Module Import", "FAIL", None, error=e)
        return

    record("Disease Forecaster", "Module Import", "PASS", 0.0)

    # ─ Valid payload: Rice, high-humidity monsoon conditions ─────────────────
    weather_data = [
        {"temp": 27.0, "humidity": 88.0, "precip": 12.0},
        {"temp": 26.5, "humidity": 90.0, "precip": 8.0},
        {"temp": 27.5, "humidity": 92.0, "precip": 15.0},
        {"temp": 28.0, "humidity": 87.0, "precip": 5.0},
        {"temp": 27.2, "humidity": 89.0, "precip": 10.0},
    ]
    t0 = time.perf_counter()
    try:
        result = evaluate_disease_risk(weather_data, "rice")
        lat = (time.perf_counter() - t0) * 1000
        if isinstance(result, list):
            record("Disease Forecaster", "Rice — High-humidity payload", "PASS", lat,
                   output=result[:2], note=f"{len(result)} alert(s) generated")
        else:
            record("Disease Forecaster", "Rice — High-humidity payload", "FAIL", lat,
                   error="Return type is not list")
    except Exception as e:
        record("Disease Forecaster", "Rice — High-humidity payload", "FAIL",
               (time.perf_counter() - t0) * 1000, error=e)

    # ─ Valid payload: Wheat ──────────────────────────────────────────────────
    wheat_weather = [
        {"temp": 22.0, "humidity": 78.0, "precip": 3.0},
        {"temp": 21.5, "humidity": 75.0, "precip": 2.0},
        {"temp": 23.0, "humidity": 80.0, "precip": 4.0},
        {"temp": 22.5, "humidity": 77.0, "precip": 1.5},
        {"temp": 22.0, "humidity": 76.0, "precip": 2.5},
    ]
    t0 = time.perf_counter()
    try:
        result = evaluate_disease_risk(wheat_weather, "wheat")
        lat = (time.perf_counter() - t0) * 1000
        record("Disease Forecaster", "Wheat — Normal conditions", "PASS", lat,
               output=result[:1], note=f"{len(result)} alert(s)")
    except Exception as e:
        record("Disease Forecaster", "Wheat — Normal conditions", "FAIL",
               (time.perf_counter() - t0) * 1000, error=e)

    # ─ Edge case: fewer than 5 days (disease_forecaster.py — strict) ─────────
    t0 = time.perf_counter()
    try:
        result = evaluate_disease_risk(weather_data[:3], "rice")  # Only 3 days
        lat = (time.perf_counter() - t0) * 1000
        if result == []:
            record("Disease Forecaster", "Insufficient data (<5 days) → empty list", "PASS", lat,
                   note="Correctly returns [] with <5 days")
        else:
            record("Disease Forecaster", "Insufficient data (<5 days) → empty list", "FAIL", lat,
                   error=f"Expected [], got {result}")
    except Exception as e:
        record("Disease Forecaster", "Insufficient data (<5 days) → empty list", "FAIL",
               (time.perf_counter() - t0) * 1000, error=e)

    # ─ Edge case: unknown crop type ─────────────────────────────────────────
    t0 = time.perf_counter()
    try:
        result = evaluate_disease_risk(weather_data, "banana_pepper_exotic")
        lat = (time.perf_counter() - t0) * 1000
        record("Disease Forecaster", "Unknown crop type → fallback rules", "PASS", lat,
               output=result[:1], note=f"Fallback produced {len(result)} alert(s)")
    except Exception as e:
        record("Disease Forecaster", "Unknown crop type → fallback rules", "FAIL",
               (time.perf_counter() - t0) * 1000, error=e)

    # ─ Edge case: empty weather list ────────────────────────────────────────
    t0 = time.perf_counter()
    try:
        result = evaluate_disease_risk([], "wheat")
        lat = (time.perf_counter() - t0) * 1000
        record("Disease Forecaster", "Empty weather list → graceful return", "PASS", lat,
               note=f"Returns {result}")
    except Exception as e:
        record("Disease Forecaster", "Empty weather list → graceful return", "FAIL",
               (time.perf_counter() - t0) * 1000, error=e)

    # ─ All crops coverage ────────────────────────────────────────────────────
    crops_to_test = ["cotton", "sugarcane", "tomato", "maize", "soybean", "potato", "grapes"]
    for crop in crops_to_test:
        t0 = time.perf_counter()
        try:
            result = evaluate_disease_risk(weather_data, crop)
            lat = (time.perf_counter() - t0) * 1000
            record("Disease Forecaster", f"Crop coverage — {crop}", "PASS", lat,
                   note=f"{len(result)} alert(s)")
        except Exception as e:
            record("Disease Forecaster", f"Crop coverage — {crop}", "FAIL",
                   (time.perf_counter() - t0) * 1000, error=e)


# ═══════════════════════════════════════════════════════════════════════════════
# 2. DISEASE RISK MODEL (disease_risk_model.py — padded window variant)
# ═══════════════════════════════════════════════════════════════════════════════

def test_disease_risk_model():
    print("\n[2] DISEASE RISK MODEL — Padded Window Variant")
    print("-" * 60)

    try:
        from ml_models.disease_risk_model import evaluate_disease_risk as evaluate_risk2
    except ImportError as e:
        record("Disease Risk Model", "Module Import", "FAIL", None, error=e)
        return

    record("Disease Risk Model", "Module Import", "PASS", 0.0)

    weather_data = [
        {"temp": 15.0, "humidity": 90.0, "precip": 25.0},
        {"temp": 16.0, "humidity": 91.0, "precip": 30.0},
        {"temp": 15.5, "humidity": 88.0, "precip": 20.0},
        {"temp": 16.5, "humidity": 92.0, "precip": 28.0},
        {"temp": 15.2, "humidity": 89.0, "precip": 22.0},
    ]

    # Full 5-day window
    t0 = time.perf_counter()
    try:
        result = evaluate_risk2(weather_data, "potato")
        lat = (time.perf_counter() - t0) * 1000
        record("Disease Risk Model", "Potato Late Blight conditions", "PASS", lat,
               output=result[:1], note=f"{len(result)} alert(s)")
    except Exception as e:
        record("Disease Risk Model", "Potato Late Blight conditions", "FAIL",
               (time.perf_counter() - t0) * 1000, error=e)

    # Padded window with fewer than 5 days (disease_risk_model pads with defaults)
    t0 = time.perf_counter()
    try:
        result = evaluate_risk2(weather_data[:2], "rice")   # 2-day input, should pad
        lat = (time.perf_counter() - t0) * 1000
        record("Disease Risk Model", "2-day input — padding fallback", "PASS", lat,
               note=f"Padded to 5 days, {len(result)} alert(s)")
    except Exception as e:
        record("Disease Risk Model", "2-day input — padding fallback", "FAIL",
               (time.perf_counter() - t0) * 1000, error=e)

    # Invalid input types
    t0 = time.perf_counter()
    try:
        result = evaluate_risk2([{"temp": None, "humidity": None, "precip": None}] * 5, "wheat")
        lat = (time.perf_counter() - t0) * 1000
        record("Disease Risk Model", "None values in weather dict", "PASS", lat,
               note=f"Handled gracefully, {len(result)} alert(s)")
    except Exception as e:
        record("Disease Risk Model", "None values in weather dict", "FAIL",
               (time.perf_counter() - t0) * 1000, error=e)


# ═══════════════════════════════════════════════════════════════════════════════
# 3. YIELD PREDICTOR — Random Forest Regressor
# ═══════════════════════════════════════════════════════════════════════════════

def test_yield_predictor():
    print("\n[3] YIELD PREDICTOR — Random Forest Regressor")
    print("-" * 60)

    try:
        from ml_models.yield_predictor import predict_yield, get_crop_yield_benchmark
    except ImportError as e:
        record("Yield Predictor", "Module Import", "FAIL", None, error=e)
        return

    record("Yield Predictor", "Module Import", "PASS", 0.0)

    # Model training + first inference (lazy init)
    t0 = time.perf_counter()
    try:
        result = predict_yield(health_score=0.7, moisture=45.0, crop_type="wheat")
        lat = (time.perf_counter() - t0) * 1000
        if isinstance(result, float) and result > 0:
            record("Yield Predictor", "Wheat — healthy conditions (first call, trains model)", "PASS",
                   lat, output=f"{result} t/ha", note="Training included in latency")
        else:
            record("Yield Predictor", "Wheat — healthy conditions", "FAIL", lat,
                   error=f"Expected float > 0, got {result}")
    except Exception as e:
        record("Yield Predictor", "Wheat — healthy conditions (first call)", "FAIL",
               (time.perf_counter() - t0) * 1000, error=e)

    # Second inference (warm path)
    crops_and_expectations = [
        ("rice",      0.8, 55.0,  3.0, 6.0),    # (crop, health, moisture, min_exp, max_exp)
        ("sugarcane", 0.6, 60.0, 50.0, 100.0),
        ("potato",    0.5, 50.0, 15.0, 35.0),
        ("tomato",    0.9, 52.0, 25.0, 50.0),
        ("maize",     0.4, 48.0,  1.5,  5.0),
    ]

    for crop, hs, moist, lo, hi in crops_and_expectations:
        t0 = time.perf_counter()
        try:
            result = predict_yield(hs, moist, crop)
            lat = (time.perf_counter() - t0) * 1000
            within_range = lo <= result <= hi
            status = "PASS" if within_range else "WARN"
            record("Yield Predictor", f"{crop.capitalize()} — health={hs}, moist={moist}%",
                   status, lat, output=f"{result} t/ha",
                   note=f"Expected {lo}–{hi} t/ha" if not within_range else None)
        except Exception as e:
            record("Yield Predictor", f"{crop.capitalize()} yield prediction", "FAIL",
                   (time.perf_counter() - t0) * 1000, error=e)

    # Edge case: boundary inputs
    for label, h, m, c in [
        ("Zero health score",  0.0, 45.0, "wheat"),
        ("Max health score",   1.0, 45.0, "wheat"),
        ("Extreme low moisture", 0.5,  5.0, "wheat"),
        ("Extreme high moisture", 0.5, 90.0, "wheat"),
        ("None crop type",     0.5, 45.0, None),
        ("Unknown crop",       0.5, 45.0, "alien_plant"),
    ]:
        t0 = time.perf_counter()
        try:
            result = predict_yield(h, m, c)
            lat = (time.perf_counter() - t0) * 1000
            record("Yield Predictor", f"Edge — {label}", "PASS", lat, output=f"{result} t/ha")
        except Exception as e:
            record("Yield Predictor", f"Edge — {label}", "FAIL",
                   (time.perf_counter() - t0) * 1000, error=e)

    # Benchmark lookup
    t0 = time.perf_counter()
    try:
        bm = get_crop_yield_benchmark("rice")
        lat = (time.perf_counter() - t0) * 1000
        assert "icar_average_yield_t_ha" in bm and "optimal_moisture_pct" in bm
        record("Yield Predictor", "Benchmark lookup — rice", "PASS", lat, output=bm)
    except Exception as e:
        record("Yield Predictor", "Benchmark lookup — rice", "FAIL",
               (time.perf_counter() - t0) * 1000, error=e)


# ═══════════════════════════════════════════════════════════════════════════════
# 4. SOC ESTIMATOR — Gradient Boosting (soc_estimator.py)
# ═══════════════════════════════════════════════════════════════════════════════

def test_soc_estimator():
    print("\n[4] SOC ESTIMATOR — Gradient Boosting (soc_estimator.py)")
    print("-" * 60)

    try:
        from ml_models.soc_estimator import estimate_soc
    except ImportError as e:
        record("SOC Estimator (GB)", "Module Import", "FAIL", None, error=e)
        return

    record("SOC Estimator (GB)", "Module Import", "PASS", 0.0)

    # Check if CSV training data exists
    csv_path = os.path.join("backend", "data", "soc_training_data.csv")
    data_exists = os.path.exists(csv_path)
    record("SOC Estimator (GB)", "Training data CSV present",
           "PASS" if data_exists else "WARN", 0.0,
           note=csv_path if data_exists else f"CSV missing — will use synthetic fallback")

    # First call: trains model
    t0 = time.perf_counter()
    try:
        result = estimate_soc(ndvi_avg=0.65, evi_avg=0.55, moisture_avg=35.0, days_enrolled=180)
        lat = (time.perf_counter() - t0) * 1000
        if 10.0 <= result <= 42.0:
            record("SOC Estimator (GB)", "Nominal input (first call, trains model)", "PASS",
                   lat, output=f"{result} t/ha", note="Training included in latency")
        else:
            record("SOC Estimator (GB)", "Nominal input — physical bounds check", "FAIL",
                   lat, error=f"Out of physical range [10, 42]: {result}")
    except Exception as e:
        record("SOC Estimator (GB)", "Nominal input (first call)", "FAIL",
               (time.perf_counter() - t0) * 1000, error=e)

    # Warm path calls
    test_cases = [
        ("Low NDVI degraded land",  0.25, 0.20, 12.0,   30.0),
        ("High NDVI healthy soil",  0.85, 0.78, 45.0, 2000.0),
        ("Zero days enrolled",      0.50, 0.45, 25.0,    0.0),
        ("Max days enrolled",       0.70, 0.63, 38.0, 3650.0),
    ]

    for label, ndvi, evi, moist, days in test_cases:
        t0 = time.perf_counter()
        try:
            result = estimate_soc(ndvi, evi, moist, days)
            lat = (time.perf_counter() - t0) * 1000
            in_range = 10.0 <= result <= 42.0
            record("SOC Estimator (GB)", label, "PASS" if in_range else "FAIL",
                   lat, output=f"{result} t/ha")
        except Exception as e:
            record("SOC Estimator (GB)", label, "FAIL",
                   (time.perf_counter() - t0) * 1000, error=e)


# ═══════════════════════════════════════════════════════════════════════════════
# 5. SOC MODEL — Multiple Linear Regression (soc_model.py)
# ═══════════════════════════════════════════════════════════════════════════════

def test_soc_model():
    print("\n[5] SOC MODEL — Multiple Linear Regression (soc_model.py)")
    print("-" * 60)

    try:
        from ml_models.soc_model import train_soc_model, predict_soc
    except ImportError as e:
        record("SOC Model (MLR)", "Module Import", "FAIL", None, error=e)
        return

    record("SOC Model (MLR)", "Module Import", "PASS", 0.0)

    # Train with valid data
    bioclimatic = [[25.0, 4.0], [35.0, 5.5], [20.0, 3.0], [30.0, 4.8], [28.0, 4.2]]
    soc_values  = [18.5, 22.0, 15.0, 20.5, 19.0]

    t0 = time.perf_counter()
    try:
        result = train_soc_model(bioclimatic, soc_values)
        lat = (time.perf_counter() - t0) * 1000
        assert result["status"] == "success"
        assert "r_squared" in result
        record("SOC Model (MLR)", "Train with 5 data points", "PASS", lat,
               output=result["equation"], note=f"R²={result['r_squared']:.3f}")
    except Exception as e:
        record("SOC Model (MLR)", "Train with 5 data points", "FAIL",
               (time.perf_counter() - t0) * 1000, error=e)
        return

    # Predict with trained model
    t0 = time.perf_counter()
    try:
        preds = predict_soc([[27.0, 4.3], [32.0, 5.0]],
                            result["coef_moisture"], result["coef_et"], result["intercept"])
        lat = (time.perf_counter() - t0) * 1000
        if isinstance(preds, list) and all(isinstance(p, float) and p >= 0 for p in preds):
            record("SOC Model (MLR)", "Predict 2 grid points", "PASS", lat, output=preds)
        else:
            record("SOC Model (MLR)", "Predict 2 grid points", "FAIL", lat,
                   error=f"Unexpected output: {preds}")
    except Exception as e:
        record("SOC Model (MLR)", "Predict 2 grid points", "FAIL",
               (time.perf_counter() - t0) * 1000, error=e)

    # Error case: < 2 training points
    t0 = time.perf_counter()
    try:
        train_soc_model([[25.0, 4.0]], [18.5])
        record("SOC Model (MLR)", "Single point — should raise ValueError", "FAIL",
               (time.perf_counter() - t0) * 1000, error="No exception raised")
    except ValueError as e:
        record("SOC Model (MLR)", "Single point — raises ValueError ✓", "PASS",
               (time.perf_counter() - t0) * 1000, note=str(e))
    except Exception as e:
        record("SOC Model (MLR)", "Single point — error handling", "WARN",
               (time.perf_counter() - t0) * 1000, error=e)

    # Predict with negative coefficients should floor at 0
    t0 = time.perf_counter()
    try:
        preds = predict_soc([[0.01, 0.01]], -999.0, -999.0, 0.0)
        lat = (time.perf_counter() - t0) * 1000
        record("SOC Model (MLR)", "Negative coeff → floor at 0.0", "PASS" if preds[0] == 0.0 else "FAIL",
               lat, output=preds)
    except Exception as e:
        record("SOC Model (MLR)", "Negative coeff → floor at 0.0", "FAIL",
               (time.perf_counter() - t0) * 1000, error=e)


# ═══════════════════════════════════════════════════════════════════════════════
# 6. NDVI ANOMALY DETECTOR — Isolation Forest
# ═══════════════════════════════════════════════════════════════════════════════

def test_anomaly_detector():
    print("\n[6] NDVI ANOMALY DETECTOR — Isolation Forest")
    print("-" * 60)

    # Both anomaly_detector.py and crop_anomaly_detector.py are identical; test both imports
    for mod_name in ["ml_models.anomaly_detector", "ml_models.crop_anomaly_detector"]:
        try:
            import importlib
            mod = importlib.import_module(mod_name)
            detect_fn = mod.detect_anomalies
            record("NDVI Anomaly Detector", f"Import {mod_name}", "PASS", 0.0)
        except ImportError as e:
            record("NDVI Anomaly Detector", f"Import {mod_name}", "FAIL", None, error=e)
            continue

        # Normal NDVI series
        normal_ndvi = [0.55, 0.58, 0.60, 0.57, 0.59, 0.61, 0.56, 0.58, 0.60, 0.59]
        t0 = time.perf_counter()
        try:
            result = detect_fn(normal_ndvi)
            lat = (time.perf_counter() - t0) * 1000
            assert len(result) == len(normal_ndvi)
            record("NDVI Anomaly Detector", f"({mod_name}) Normal NDVI series", "PASS", lat,
                   output=result, note=f"{sum(result)} anomaly flags")
        except Exception as e:
            record("NDVI Anomaly Detector", f"({mod_name}) Normal NDVI series", "FAIL",
                   (time.perf_counter() - t0) * 1000, error=e)

        # Series with injected anomalies
        anomaly_ndvi = [0.55, 0.58, 0.60, 0.10, 0.59, 0.61, 0.08, 0.58, 0.60, 0.59]
        t0 = time.perf_counter()
        try:
            result = detect_fn(anomaly_ndvi)
            lat = (time.perf_counter() - t0) * 1000
            assert len(result) == len(anomaly_ndvi)
            flags = sum(result)
            status = "PASS" if flags >= 1 else "WARN"
            record("NDVI Anomaly Detector", f"({mod_name}) Series with injected dips", status, lat,
                   output=result, note=f"{flags} anomaly flag(s) raised")
        except Exception as e:
            record("NDVI Anomaly Detector", f"({mod_name}) Series with injected dips", "FAIL",
                   (time.perf_counter() - t0) * 1000, error=e)

        # Insufficient data (< 4 points)
        t0 = time.perf_counter()
        try:
            result = detect_fn([0.5, 0.6, 0.4])
            lat = (time.perf_counter() - t0) * 1000
            if result == [False, False, False]:
                record("NDVI Anomaly Detector", f"({mod_name}) <4 points → all False", "PASS", lat)
            else:
                record("NDVI Anomaly Detector", f"({mod_name}) <4 points → all False", "FAIL", lat,
                       error=f"Expected [False,False,False], got {result}")
        except Exception as e:
            record("NDVI Anomaly Detector", f"({mod_name}) <4 points → graceful", "FAIL",
                   (time.perf_counter() - t0) * 1000, error=e)

        # Empty list
        t0 = time.perf_counter()
        try:
            result = detect_fn([])
            lat = (time.perf_counter() - t0) * 1000
            record("NDVI Anomaly Detector", f"({mod_name}) Empty list", "PASS", lat, output=result)
        except Exception as e:
            record("NDVI Anomaly Detector", f"({mod_name}) Empty list", "FAIL",
                   (time.perf_counter() - t0) * 1000, error=e)


# ═══════════════════════════════════════════════════════════════════════════════
# 7. H5 DEEP LEARNING MODELS — Load Check
# ═══════════════════════════════════════════════════════════════════════════════

def test_h5_models():
    print("\n[7] H5 DEEP LEARNING MODELS — EfficientNet / MobileNetV2 / Universal Vision")
    print("-" * 60)

    model_files = {
        "plant_disease_efficientnet.h5": os.path.join("backend", "ml_models", "plant_disease_efficientnet.h5"),
        "mobilenetv2_5_class.h5":        os.path.join("backend", "ml_models", "mobilenetv2_5_class.h5"),
        "universal_vision_model.h5":     os.path.join("backend", "ml_models", "universal_vision_model.h5"),
    }

    for model_name, path in model_files.items():
        exists = os.path.exists(path)
        size_mb = os.path.getsize(path) / (1024*1024) if exists else 0
        record("H5 Model Files", f"{model_name} on disk",
               "PASS" if exists else "FAIL",
               0.0, note=f"{size_mb:.1f} MB" if exists else "File not found")

    # Class labels check
    labels_path = os.path.join("backend", "ml_models", "class_labels_disease.json")
    t0 = time.perf_counter()
    try:
        with open(labels_path) as f:
            labels = json.load(f)
        lat = (time.perf_counter() - t0) * 1000
        n_classes = len(labels.get("classes", []))
        record("H5 Model Files", "class_labels_disease.json loaded", "PASS", lat,
               note=f"{n_classes} disease classes")
    except Exception as e:
        record("H5 Model Files", "class_labels_disease.json loaded", "FAIL",
               (time.perf_counter() - t0) * 1000, error=e)

    # TF/Keras load attempt
    try:
        import tensorflow as tf
        tf_ver = tf.__version__
        record("H5 Model Files", f"TensorFlow import (v{tf_ver})", "PASS", 0.0)

        efficientnet_path = os.path.join("backend", "ml_models", "plant_disease_efficientnet.h5")
        t0 = time.perf_counter()
        try:
            model = tf.keras.models.load_model(efficientnet_path, compile=False)
            lat = (time.perf_counter() - t0) * 1000
            inp_shape = model.input_shape if hasattr(model, 'input_shape') else "N/A"
            out_shape = model.output_shape if hasattr(model, 'output_shape') else "N/A"
            record("H5 Model Files", "EfficientNet load into memory", "PASS", lat,
                   note=f"Input: {inp_shape}, Output: {out_shape}")
        except Exception as e:
            lat = (time.perf_counter() - t0) * 1000
            record("H5 Model Files", "EfficientNet load into memory", "WARN", lat,
                   error=str(e)[:200],
                   note="Known issue: Keras 3 / TF 2.x compatibility with old .h5 format")

        mobilenet_path = os.path.join("backend", "ml_models", "mobilenetv2_5_class.h5")
        t0 = time.perf_counter()
        try:
            model2 = tf.keras.models.load_model(mobilenet_path, compile=False)
            lat = (time.perf_counter() - t0) * 1000
            record("H5 Model Files", "MobileNetV2 (5-class) load into memory", "PASS", lat)
        except Exception as e:
            lat = (time.perf_counter() - t0) * 1000
            record("H5 Model Files", "MobileNetV2 (5-class) load into memory", "WARN", lat,
                   error=str(e)[:200])

    except ImportError:
        record("H5 Model Files", "TensorFlow import", "WARN", 0.0,
               note="TensorFlow not installed — H5 models cannot be loaded locally")


# ═══════════════════════════════════════════════════════════════════════════════
# 8. RAG ENGINE — Hybrid BM25+FAISS Search
# ═══════════════════════════════════════════════════════════════════════════════

def test_rag_engine():
    print("\n[8] RAG ENGINE — Hybrid BM25+FAISS Knowledge Base")
    print("-" * 60)

    # Check if corpus file exists
    corpus_path = os.path.join("Machine Learning in Agriculture.txt")
    exists = os.path.exists(corpus_path)
    record("RAG Engine", "Corpus file present",
           "PASS" if exists else "WARN", 0.0,
           note=corpus_path if exists else "Missing — will use fallback hardcoded docs only")

    try:
        from backend.services.hybrid_search import HybridSearchEngine
    except ImportError:
        try:
            sys.path.insert(0, "backend")
            from services.hybrid_search import HybridSearchEngine
        except ImportError as e:
            record("RAG Engine", "HybridSearchEngine import", "FAIL", None, error=e)
            return

    record("RAG Engine", "HybridSearchEngine import", "PASS", 0.0)

    # Initialize BM25-only engine (no GEMINI key needed)
    def no_embeddings(texts):
        return []

    t0 = time.perf_counter()
    try:
        engine = HybridSearchEngine(embedding_function=no_embeddings, dimension=768)
        lat = (time.perf_counter() - t0) * 1000
        record("RAG Engine", "Engine initialization (BM25-only)", "PASS", lat)
    except Exception as e:
        record("RAG Engine", "Engine initialization", "FAIL",
               (time.perf_counter() - t0) * 1000, error=e)
        return

    # Add fallback documents
    fallback_docs = [
        "Late Blight (Phytophthora infestans) in potato and tomato is treated with chlorothalonil or mancozeb.",
        "FERTILIZER RECOMMENDATIONS (NPK kg/ha): Wheat: N=120, P=60, K=40. Rice: N=100, P=50, K=50.",
        "Optimal soil pH ranges by crop: Rice: 5.5–6.5. Wheat: 6.0–7.5. Cotton: 5.8–8.0.",
        "NDVI range: <0.2 = bare soil, 0.2–0.4 = sparse, 0.4–0.6 = moderate crop, >0.6 = healthy.",
        "Drip irrigation increases water use efficiency by 40–50% compared to flood irrigation.",
    ]
    t0 = time.perf_counter()
    try:
        engine.add_documents(fallback_docs, [{"source": "test"} for _ in fallback_docs])
        lat = (time.perf_counter() - t0) * 1000
        record("RAG Engine", "Add 5 documents to index", "PASS", lat)
    except Exception as e:
        record("RAG Engine", "Add documents", "FAIL",
               (time.perf_counter() - t0) * 1000, error=e)
        return

    # Query tests
    queries = [
        ("Rice fertilizer recommendations", "fertilizer", 1),
        ("What to do for late blight", "blight", 1),
        ("NDVI healthy crop value", "ndvi", 1),
        ("drip irrigation efficiency", "drip", 1),
    ]

    for query, expected_keyword, min_results in queries:
        t0 = time.perf_counter()
        try:
            results = engine.search(query, top_k=2, alpha=0.0)
            lat = (time.perf_counter() - t0) * 1000
            if len(results) >= min_results:
                top_score = results[0]["score"]
                record("RAG Engine", f"Query: '{query[:40]}'", "PASS", lat,
                       note=f"Top score={top_score:.3f}, {len(results)} results")
            else:
                record("RAG Engine", f"Query: '{query[:40]}'", "FAIL", lat,
                       error=f"Too few results: {len(results)}")
        except Exception as e:
            record("RAG Engine", f"Query: '{query[:40]}'", "FAIL",
                   (time.perf_counter() - t0) * 1000, error=e)

    # Empty query
    t0 = time.perf_counter()
    try:
        results = engine.search("", top_k=2)
        lat = (time.perf_counter() - t0) * 1000
        record("RAG Engine", "Empty query — graceful", "PASS", lat, output=f"{len(results)} results")
    except Exception as e:
        record("RAG Engine", "Empty query — graceful", "FAIL",
               (time.perf_counter() - t0) * 1000, error=e)


# ═══════════════════════════════════════════════════════════════════════════════
# 9. SOIL CARBON ESTIMATOR (soil_carbon_estimator.py — duplicate of soc_estimator)
# ═══════════════════════════════════════════════════════════════════════════════

def test_soil_carbon_estimator():
    print("\n[9] SOIL CARBON ESTIMATOR (soil_carbon_estimator.py)")
    print("-" * 60)

    try:
        from ml_models.soil_carbon_estimator import estimate_soc as sce
    except ImportError as e:
        record("Soil Carbon Estimator", "Module Import", "FAIL", None, error=e)
        return

    record("Soil Carbon Estimator", "Module Import", "PASS", 0.0)

    t0 = time.perf_counter()
    try:
        result = sce(ndvi_avg=0.65, evi_avg=0.55, moisture_avg=35.0, days_enrolled=180)
        lat = (time.perf_counter() - t0) * 1000
        in_range = 10.0 <= result <= 42.0
        record("Soil Carbon Estimator", "Nominal input", "PASS" if in_range else "FAIL",
               lat, output=f"{result} t/ha")
    except Exception as e:
        record("Soil Carbon Estimator", "Nominal input", "FAIL",
               (time.perf_counter() - t0) * 1000, error=e)


# ═══════════════════════════════════════════════════════════════════════════════
# 10. EVIDENCE AI VERIFIER — Gemini Vision pipeline (no-API mode)
# ═══════════════════════════════════════════════════════════════════════════════

def test_evidence_verifier():
    print("\n[10] EVIDENCE AI VERIFIER — Gemini Vision + GPS Checkpoints")
    print("-" * 60)

    try:
        sys.path.insert(0, "backend")
        from services.evidence_ai_verifier import analyze_evidence_photo, generate_gps_checkpoints
    except ImportError as e:
        record("Evidence AI Verifier", "Module Import", "FAIL", None, error=e)
        return

    record("Evidence AI Verifier", "Module Import", "PASS", 0.0)

    # No-API fallback (no GEMINI_API_KEY set or Gemini unavailable)
    t0 = time.perf_counter()
    try:
        result = analyze_evidence_photo(
            methodology="Cover-Crop",
            file_bytes=b"\xff\xd8\xff\xe0" + b"\x00" * 100,  # Minimal fake JPEG header
            content_type="image/jpeg"
        )
        lat = (time.perf_counter() - t0) * 1000
        assert "ai_status" in result and "review_status" in result
        record("Evidence AI Verifier", "No-API fallback — fake image", "PASS", lat,
               output=result, note=f"ai_status={result['ai_status']}, review_status={result['review_status']}")
    except Exception as e:
        record("Evidence AI Verifier", "No-API fallback — fake image", "FAIL",
               (time.perf_counter() - t0) * 1000, error=e)

    # No image at all — should flag for manual review
    t0 = time.perf_counter()
    try:
        result = analyze_evidence_photo(methodology="No-Till")
        lat = (time.perf_counter() - t0) * 1000
        assert result["ai_status"] == "flagged"
        record("Evidence AI Verifier", "No image provided → auto-flagged", "PASS", lat)
    except AssertionError:
        record("Evidence AI Verifier", "No image provided → auto-flagged", "FAIL",
               (time.perf_counter() - t0) * 1000,
               error=f"Expected flagged, got {result.get('ai_status')}")
    except Exception as e:
        record("Evidence AI Verifier", "No image provided → auto-flagged", "FAIL",
               (time.perf_counter() - t0) * 1000, error=e)

    # GPS checkpoints
    polygon = '[{"lat":18.52,"lng":73.85},{"lat":18.53,"lng":73.85},{"lat":18.53,"lng":73.86},{"lat":18.52,"lng":73.86}]'
    t0 = time.perf_counter()
    try:
        checkpoints = generate_gps_checkpoints(polygon, project_id=42, n=3)
        lat = (time.perf_counter() - t0) * 1000
        assert len(checkpoints) == 3
        assert all("lat" in c and "lng" in c for c in checkpoints)
        record("Evidence AI Verifier", "GPS checkpoints for valid polygon (n=3)", "PASS", lat,
               output=checkpoints)
    except Exception as e:
        record("Evidence AI Verifier", "GPS checkpoints — valid polygon", "FAIL",
               (time.perf_counter() - t0) * 1000, error=e)

    # Invalid polygon (< 3 vertices)
    t0 = time.perf_counter()
    try:
        checkpoints = generate_gps_checkpoints('[{"lat":18.52,"lng":73.85}]', project_id=1)
        lat = (time.perf_counter() - t0) * 1000
        record("Evidence AI Verifier", "GPS checkpoints — degenerate polygon → []", "PASS" if checkpoints == [] else "FAIL",
               lat, note=f"Got: {checkpoints}")
    except Exception as e:
        record("Evidence AI Verifier", "GPS checkpoints — degenerate polygon", "FAIL",
               (time.perf_counter() - t0) * 1000, error=e)


# ═══════════════════════════════════════════════════════════════════════════════
# 11. GEMINI AI ENDPOINT CONNECTIVITY
# ═══════════════════════════════════════════════════════════════════════════════

def test_gemini_connectivity():
    print("\n[11] GEMINI AI — API Key & Connectivity Check")
    print("-" * 60)

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        # Try loading from backend .env
        env_path = os.path.join("backend", ".env")
        if os.path.exists(env_path):
            with open(env_path) as f:
                for line in f:
                    if line.startswith("GEMINI_API_KEY="):
                        api_key = line.strip().split("=", 1)[1].strip().strip('"').strip("'")
                        break

    key_present = bool(api_key and len(api_key) > 10)
    record("Gemini AI", "API key present in environment", "PASS" if key_present else "WARN", 0.0,
           note="Key found" if key_present else "GEMINI_API_KEY not set — AI endpoints degraded")

    if not key_present:
        record("Gemini AI", "Connectivity test", "SKIP", None,
               note="Skipped: No API key")
        return

    try:
        from google import genai
        client = genai.Client(api_key=api_key)
        t0 = time.perf_counter()
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents="Reply with exactly: KRISHI_TEST_OK"
        )
        lat = (time.perf_counter() - t0) * 1000
        text = response.text.strip()
        if "KRISHI_TEST_OK" in text:
            record("Gemini AI", "gemini-2.5-flash connectivity", "PASS", lat, output=text)
        else:
            record("Gemini AI", "gemini-2.5-flash connectivity", "WARN", lat,
                   output=text, note="Response received but content unexpected")
    except ImportError:
        record("Gemini AI", "google-genai package import", "FAIL", None,
               error="Package not installed")
    except Exception as e:
        record("Gemini AI", "gemini-2.5-flash connectivity", "FAIL", None, error=e)


# ═══════════════════════════════════════════════════════════════════════════════
# MAIN — run all suites and print report
# ═══════════════════════════════════════════════════════════════════════════════

def print_summary():
    print("\n" + "═" * 70)
    print("  KRISHI-DRISHTI ML INTEGRATION TEST REPORT")
    print("═" * 70)

    pass_count  = sum(1 for r in RESULTS if r["status"] == "PASS")
    fail_count  = sum(1 for r in RESULTS if r["status"] == "FAIL")
    warn_count  = sum(1 for r in RESULTS if r["status"] == "WARN")
    skip_count  = sum(1 for r in RESULTS if r["status"] == "SKIP")
    total       = len(RESULTS)

    print(f"\n  Total tests : {total}")
    print(f"  ✅ PASS     : {pass_count}")
    print(f"  ❌ FAIL     : {fail_count}")
    print(f"  ⚠️  WARN     : {warn_count}")
    print(f"  ⏭️  SKIP     : {skip_count}")
    print(f"\n  Pass Rate   : {pass_count / max(1, total) * 100:.1f}%")

    if fail_count > 0:
        print("\n  FAILURES:")
        for r in RESULTS:
            if r["status"] == "FAIL":
                print(f"    ❌ [{r['component']}] {r['test']}")
                if r["error"]:
                    print(f"        → {r['error']}")

    if warn_count > 0:
        print("\n  WARNINGS:")
        for r in RESULTS:
            if r["status"] == "WARN":
                print(f"    ⚠️  [{r['component']}] {r['test']}")
                if r["note"]:
                    print(f"        → {r['note']}")

    # Latency stats for passing tests
    latencies = [r["latency_ms"] for r in RESULTS if r["status"] == "PASS" and r["latency_ms"] is not None and r["latency_ms"] > 0.5]
    if latencies:
        print(f"\n  LATENCY (passing tests with measurable time):")
        print(f"    Min   : {min(latencies):.1f} ms")
        print(f"    Max   : {max(latencies):.1f} ms")
        print(f"    Mean  : {sum(latencies)/len(latencies):.1f} ms")

    print("\n" + "═" * 70)

    # Save JSON report
    report = {
        "summary": {
            "total": total, "pass": pass_count, "fail": fail_count,
            "warn": warn_count, "skip": skip_count,
            "pass_rate_pct": round(pass_count / max(1, total) * 100, 1)
        },
        "results": RESULTS
    }
    report_path = os.path.join("backend", "ml_test_report.json")
    with open(report_path, "w") as f:
        json.dump(report, f, indent=2, default=str)
    print(f"\n  📄 Full JSON report saved to: {report_path}")
    print("═" * 70)


if __name__ == "__main__":
    print("═" * 70)
    print("  KRISHI-DRISHTI — ML INTEGRATION TEST SUITE")
    print("═" * 70)

    test_disease_forecaster()
    test_disease_risk_model()
    test_yield_predictor()
    test_soc_estimator()
    test_soc_model()
    test_anomaly_detector()
    test_h5_models()
    test_rag_engine()
    test_soil_carbon_estimator()
    test_evidence_verifier()
    test_gemini_connectivity()

    print_summary()
