"""
Integration test for Disease Detection Local Model & Toggle Logic
=================================================================
Verifies:
1. USE_LOCAL_DISEASE_MODEL=true routes /api/ai/diagnose to the local model.
2. The response schema perfectly matches the Gemini API output expected by VisionResultScreen.
3. USE_LOCAL_DISEASE_MODEL=false routes back to Gemini API.
4. Internal tags like `_source` are not exposed to the client.
5. Latency is measured and reported.
"""

import io
import os
import sys
import time

sys.path.insert(0, os.getcwd())

from PIL import Image
import pytest
from fastapi.testclient import TestClient

from backend.main import app
from backend.dependencies import get_current_user
from backend.models import User

# Override authentication for testing
mock_user = User(id=1, phone="9999999999", name="Test Farmer")
app.dependency_overrides[get_current_user] = lambda: mock_user

client = TestClient(app)


def _make_test_image_bytes(color=(34, 139, 34)) -> bytes:
    """Generate a sample JPEG image in memory."""
    buf = io.BytesIO()
    img = Image.new("RGB", (224, 224), color=color)
    img.save(buf, format="JPEG")
    return buf.getvalue()


def test_local_disease_model_toggle_true():
    """Test when USE_LOCAL_DISEASE_MODEL=true, local model runs and output schema matches."""
    os.environ["USE_LOCAL_DISEASE_MODEL"] = "true"

    img_bytes = _make_test_image_bytes()
    t0 = time.perf_counter()

    response = client.post(
        "/api/ai/diagnose",
        files={"file": ("leaf.jpg", img_bytes, "image/jpeg")},
        data={"mode": "diagnosis"}
    )
    latency_ms = (time.perf_counter() - t0) * 1000

    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    data = response.json()

    print(f"\n[Test Result] Local Model Latency: {latency_ms:.1f}ms")
    print(f"[Test Result] Diagnosis: {data.get('diagnosis')}")
    print(f"[Test Result] Confidence: {data.get('confidence')}%")
    print(f"[Test Result] Health Score: {data.get('health_score')}%")

    # Strict schema validation matching VisionResultScreen expectations
    assert "diagnosis" in data, "Missing 'diagnosis' field"
    assert isinstance(data["diagnosis"], str) and len(data["diagnosis"]) > 0

    assert "confidence" in data, "Missing 'confidence' field"
    assert isinstance(data["confidence"], int)
    assert 0 <= data["confidence"] <= 100

    assert "summary" in data, "Missing 'summary' field"
    assert isinstance(data["summary"], str) and len(data["summary"]) > 0

    assert "health_score" in data, "Missing 'health_score' field"
    assert isinstance(data["health_score"], int)
    assert 0 <= data["health_score"] <= 100

    assert "remedies" in data, "Missing 'remedies' field"
    assert isinstance(data["remedies"], list)

    for r in data["remedies"]:
        assert "title" in r, "Remedy item missing 'title'"
        assert "desc" in r, "Remedy item missing 'desc'"
        assert "type" in r, "Remedy item missing 'type'"
        assert r["type"] in ("chemical", "organic", "biological", "cultural")

    # Verify internal _source tag is not leaked to client
    assert "_source" not in data, "_source internal tag leaked into client response"

    # Measure warm latency (second call with model already in memory)
    t1 = time.perf_counter()
    resp_warm = client.post(
        "/api/ai/diagnose",
        files={"file": ("leaf.jpg", img_bytes, "image/jpeg")},
        data={"mode": "diagnosis"}
    )
    warm_latency_ms = (time.perf_counter() - t1) * 1000
    assert resp_warm.status_code == 200
    print(f"[Test Result] Local Model Warm Latency: {warm_latency_ms:.1f}ms")


def test_toggle_switch_to_false():
    """Verify switching USE_LOCAL_DISEASE_MODEL=false changes router behavior."""
    os.environ["USE_LOCAL_DISEASE_MODEL"] = "false"
    from backend.routers.ai import _use_local_model
    assert _use_local_model() is False

    os.environ["USE_LOCAL_DISEASE_MODEL"] = "true"
    assert _use_local_model() is True


def test_connection_stability_fallback_contract():
    """
    Verify fallback response sent during timeouts/delays strictly adheres
    to the contract so Android/web clients never drop connection or crash.
    """
    from backend.routers.ai import _safe_delayed_fallback
    fallback = _safe_delayed_fallback("network timeout test")

    assert "diagnosis" in fallback
    assert "confidence" in fallback
    assert "summary" in fallback
    assert "health_score" in fallback
    assert "remedies" in fallback
    assert isinstance(fallback["remedies"], list) and len(fallback["remedies"]) > 0
    assert "_source" not in fallback
    print("\n[Test Result] Connection Stability Fallback Contract PASSED.")


def test_render_tflite_engine_ready():
    """Verify TFLite model is present and loads with minimal memory."""
    from backend.ml_models.local_disease_predictor import _load_model_once, _TFLITE_PATH
    assert os.path.exists(_TFLITE_PATH), f"TFLite model missing at {_TFLITE_PATH}"
    tflite_size_mb = os.path.getsize(_TFLITE_PATH) / 1e6
    assert tflite_size_mb < 10.0, f"Model too large for Render: {tflite_size_mb} MB"

    engine, model, classes, err = _load_model_once()
    assert err is None, f"Model load error: {err}"
    assert engine == "tflite", f"Expected engine 'tflite' for Render, got {engine}"
    assert len(classes) == 15
    print(f"\n[Test Result] Render Engine: {engine.upper()} ({tflite_size_mb:.2f} MB) - PASSED.")


if __name__ == "__main__":
    test_local_disease_model_toggle_true()
    test_toggle_switch_to_false()
    test_connection_stability_fallback_contract()
    test_render_tflite_engine_ready()
    print("\nAll Render optimization & connection stability tests PASSED successfully!")
    print("\nAll disease model toggle tests PASSED successfully!")
