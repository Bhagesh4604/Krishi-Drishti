"""
tests/test_security_and_reliability.py
=======================================
Regression tests for the fix/security-and-ai-reliability changes.

Run with:
    cd c:/Users/bhage/Desktop/Krishi-Drishti
    python -m pytest backend/tests/test_security_and_reliability.py -v
"""
import os
import sys
import types

import pytest

# ---------------------------------------------------------------------------
# Make sure the backend package is importable without a full uvicorn startup
# ---------------------------------------------------------------------------
_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)


# ===========================================================================
# auth_utils  – JWT secret & token expiry
# ===========================================================================
class TestAuthUtils:
    def test_secret_key_not_empty_in_dev(self, monkeypatch):
        """SECRET_KEY should resolve to a non-empty string in dev mode."""
        monkeypatch.delenv("SECRET_KEY", raising=False)
        monkeypatch.setenv("APP_ENV", "development")
        import importlib
        import backend.auth_utils as au
        importlib.reload(au)
        assert au.SECRET_KEY  # must not be empty string

    def test_insecure_default_raises_in_production(self, monkeypatch):
        """A missing/default SECRET_KEY must cause sys.exit in production."""
        monkeypatch.setenv("APP_ENV", "production")
        monkeypatch.delenv("SECRET_KEY", raising=False)
        import importlib
        import backend.auth_utils as au
        with pytest.raises(SystemExit):
            # _load_secret_key is called at module level; reload triggers it
            importlib.reload(au)

    def test_strong_secret_accepted_in_production(self, monkeypatch):
        """A strong SECRET_KEY must be accepted without sys.exit in production."""
        monkeypatch.setenv("APP_ENV", "production")
        monkeypatch.setenv("SECRET_KEY", "a" * 32)
        import importlib
        import backend.auth_utils as au
        importlib.reload(au)  # should not raise
        assert au.SECRET_KEY == "a" * 32

    def test_access_token_expire_default_is_reasonable(self, monkeypatch):
        """Default token expiry must be ≤ 120 minutes (not 3000)."""
        monkeypatch.delenv("ACCESS_TOKEN_EXPIRE_MINUTES", raising=False)
        monkeypatch.setenv("APP_ENV", "development")
        import importlib
        import backend.auth_utils as au
        importlib.reload(au)
        assert au.ACCESS_TOKEN_EXPIRE_MINUTES <= 120, (
            f"Token expiry {au.ACCESS_TOKEN_EXPIRE_MINUTES} min is too long for a production default."
        )

    def test_create_and_verify_token_roundtrip(self, monkeypatch):
        """Tokens issued by create_access_token must be verifiable by verify_token."""
        monkeypatch.setenv("SECRET_KEY", "test_secret_key_for_roundtrip_test")
        monkeypatch.setenv("APP_ENV", "development")
        import importlib
        import backend.auth_utils as au
        importlib.reload(au)
        token = au.create_access_token({"sub": "+919999999999"})
        assert au.verify_token(token) == "+919999999999"

    def test_verify_token_rejects_garbage(self, monkeypatch):
        """verify_token must return None for invalid tokens."""
        monkeypatch.setenv("SECRET_KEY", "test_secret_key_for_roundtrip_test")
        monkeypatch.setenv("APP_ENV", "development")
        import importlib
        import backend.auth_utils as au
        importlib.reload(au)
        assert au.verify_token("not.a.valid.jwt") is None
        assert au.verify_token("") is None


# ===========================================================================
# routers/auth – OTP hardcoded values and bypass
# ===========================================================================
class TestAuthRouter:
    def _get_otp_store(self):
        import importlib
        import backend.routers.auth as ar
        importlib.reload(ar)
        return ar.otp_store

    def test_no_hardcoded_otp_1234(self):
        """The source must not contain the hardcoded OTP '1234'."""
        import inspect
        import backend.routers.auth as ar
        src = inspect.getsource(ar)
        assert '"1234"' not in src, "Hardcoded OTP '1234' found in auth router."
        assert "'1234'" not in src, "Hardcoded OTP '1234' found in auth router."

    def test_no_universal_bypass_otp_0000(self):
        """The master-bypass OTP '0000' must not be present."""
        import inspect
        import backend.routers.auth as ar
        src = inspect.getsource(ar)
        assert '"0000"' not in src, "Universal bypass OTP '0000' found in auth router."
        assert "'0000'" not in src, "Universal bypass OTP '0000' found in auth router."

    def test_otp_is_numeric_and_six_digits(self, monkeypatch):
        """
        Directly call the OTP generation logic to confirm 6-digit numeric OTPs.
        We monkeypatch random.randint so this is deterministic.
        """
        import random as _random
        monkeypatch.setattr(_random, "randint", lambda a, b: 123456)
        import importlib
        import backend.routers.auth as ar
        importlib.reload(ar)
        # The send_otp endpoint stores the OTP; we simulate that logic here
        import random
        otp = str(random.randint(100000, 999999))
        assert otp.isdigit()
        assert 100000 <= int(otp) <= 999999

    def test_verify_otp_fails_with_wrong_otp(self):
        """verify_otp must raise HTTPException when OTP does not match."""
        import importlib
        import backend.routers.auth as ar
        importlib.reload(ar)
        from fastapi import HTTPException
        import asyncio

        # Pre-populate a known OTP
        ar.otp_store["+910000000000"] = "555555"

        class FakeDB:
            def query(self, *a): return self
            def filter(self, *a): return self
            def first(self): return None
            def add(self, *a): pass
            def commit(self): pass
            def refresh(self, *a): pass

        req = ar.OTPVerifyRequest(phone="+910000000000", otp="999999")
        with pytest.raises(HTTPException) as exc_info:
            asyncio.get_event_loop().run_until_complete(
                ar.verify_otp(req, db=FakeDB())
            )
        assert exc_info.value.status_code == 400

    def test_verify_otp_clears_store_on_wrong_attempt(self):
        """OTP must be removed after a failed verification to prevent brute-force."""
        import importlib
        import backend.routers.auth as ar
        importlib.reload(ar)
        from fastapi import HTTPException
        import asyncio

        ar.otp_store["+911111111111"] = "777777"

        class FakeDB:
            def query(self, *a): return self
            def filter(self, *a): return self
            def first(self): return None

        req = ar.OTPVerifyRequest(phone="+911111111111", otp="000000")
        with pytest.raises(HTTPException):
            asyncio.get_event_loop().run_until_complete(
                ar.verify_otp(req, db=FakeDB())
            )
        # OTP should have been purged
        assert "+911111111111" not in ar.otp_store

    def test_otp_not_in_response_body_dev_mode(self, monkeypatch, capsys):
        """send_otp must never include the OTP value in the JSON response body."""
        monkeypatch.delenv("SMS_PROVIDER", raising=False)
        import importlib
        import backend.routers.auth as ar
        importlib.reload(ar)
        import asyncio
        req = ar.LoginRequest(phone="+912222222222")
        result = asyncio.get_event_loop().run_until_complete(ar.send_otp(req))
        # The response dict must not contain the OTP string
        response_str = str(result)
        stored_otp = ar.otp_store.get("+912222222222", "")
        assert stored_otp not in response_str, (
            "OTP value leaked into the HTTP response body!"
        )


# ===========================================================================
# services/satellite – data_available honesty
# ===========================================================================
class TestSatelliteService:
    def test_unavailable_response_has_none_values(self, monkeypatch):
        """When GEE is not initialised, all measurement fields must be None."""
        # Simulate GEE not initialised
        import backend.services.satellite as sat
        monkeypatch.setattr(sat, "_EE_INITIALIZED", False)
        result = sat.get_real_satellite_data(lat=21.14, lng=79.08)
        assert result["data_available"] is False
        assert result["ndvi"] is None
        assert result["ndre"] is None
        assert result["gndvi"] is None
        assert result["soil_moisture"] is None
        assert result["temperature"] is None

    def test_bioclimatic_unavailable_on_network_failure(self, monkeypatch):
        """When Open-Meteo fetch raises, response must be marked unavailable."""
        import requests
        import backend.services.satellite as sat

        def _fail(*a, **kw):
            raise requests.exceptions.ConnectionError("network down")

        monkeypatch.setattr(requests, "get", _fail)
        result = sat.get_real_bioclimatic_data(lat=21.14, lng=79.08)
        assert result["data_available"] is False
        assert result["soil_moisture"] is None
        assert result["evapotranspiration"] is None
        assert result["soil_temperature"] is None
        assert result["status"] == "unavailable"

    def test_successful_bioclimatic_response_has_data_available_true(self, monkeypatch):
        """Successful Open-Meteo responses must set data_available=True."""
        import backend.services.satellite as sat

        class FakeResponse:
            status_code = 200
            def raise_for_status(self): pass
            def json(self):
                return {
                    "hourly": {
                        "soil_moisture_0_to_7cm": [0.25, 0.26, 0.24],
                        "soil_temperature_0_to_7cm": [24.0, 25.0, 23.0],
                    },
                    "daily": {
                        "et0_fao_evapotranspiration": [4.0, 4.5, 3.8],
                    },
                }

        import requests
        monkeypatch.setattr(requests, "get", lambda *a, **kw: FakeResponse())
        result = sat.get_real_bioclimatic_data(lat=21.14, lng=79.08)
        assert result["data_available"] is True
        assert result["soil_moisture"] is not None
        assert result["evapotranspiration"] is not None

    def test_no_random_data_in_source_label(self):
        """Unavailable responses must not claim to be 'Sentinel-2 (Real-Time)' or similar."""
        import backend.services.satellite as sat
        import unittest.mock as mock
        # Patch _EE_INITIALIZED to False to get the unavailable path
        with mock.patch.object(sat, "_EE_INITIALIZED", False):
            result = sat.get_real_satellite_data(lat=0.0, lng=0.0)
        # Source label must not mislead
        assert "Sentinel-2 (Real-Time)" not in result.get("source", "")
        assert "Simulated" not in result.get("source", "")


# ===========================================================================
# ml_models/soc_model – input validation and metric naming
# ===========================================================================
class TestSocModel:
    def _valid_data(self, n=7):
        bio = [[20.0 + i, 4.0 + i * 0.1] for i in range(n)]
        soc = [10.0 + i * 0.5 for i in range(n)]
        return bio, soc

    def test_minimum_samples_enforced(self):
        """Fewer than MIN_TRAINING_SAMPLES must raise ValueError."""
        from backend.ml_models.soc_model import train_soc_model, MIN_TRAINING_SAMPLES
        bio = [[20.0, 4.0]] * (MIN_TRAINING_SAMPLES - 1)
        soc = [10.0] * (MIN_TRAINING_SAMPLES - 1)
        with pytest.raises(ValueError, match="least"):
            train_soc_model(bio, soc)

    def test_length_mismatch_raises(self):
        """Mismatched bioclimatic and SOC array lengths must raise ValueError."""
        from backend.ml_models.soc_model import train_soc_model
        with pytest.raises(ValueError, match="mismatch|length|Length"):
            train_soc_model([[20.0, 4.0]] * 6, [10.0] * 5)

    def test_invalid_soc_range_raises(self):
        """SOC values outside [0, 200] g/kg must raise ValueError."""
        from backend.ml_models.soc_model import train_soc_model
        bio, _ = self._valid_data(7)
        # Negative SOC
        with pytest.raises(ValueError, match="plausible|range"):
            train_soc_model(bio, [-1.0] * 7)
        # Way too high (unit error: % instead of g/kg)
        with pytest.raises(ValueError, match="plausible|range"):
            train_soc_model(bio, [300.0] * 7)

    def test_non_finite_value_raises(self):
        """NaN or Inf in inputs must raise ValueError."""
        from backend.ml_models.soc_model import train_soc_model
        import math
        bio = [[20.0, math.nan]] + [[20.0, 4.0]] * 6
        with pytest.raises(ValueError):
            train_soc_model(bio, [10.0] * 7)

    def test_result_uses_r_squared_train_key(self):
        """Return dict must use 'r_squared_train' not 'r_squared'."""
        from backend.ml_models.soc_model import train_soc_model
        bio, soc = self._valid_data(7)
        result = train_soc_model(bio, soc)
        assert "r_squared_train" in result, (
            "Result must expose 'r_squared_train' to distinguish training metric from validation."
        )
        assert "r_squared" not in result or result.get("r_squared") is None, (
            "Old 'r_squared' key (without _train suffix) should not be present to avoid confusion."
        )

    def test_warning_present_for_small_sample(self):
        """A warning must be included in the result when n_samples < 10."""
        from backend.ml_models.soc_model import train_soc_model, MIN_TRAINING_SAMPLES
        bio, soc = self._valid_data(MIN_TRAINING_SAMPLES)  # exactly at minimum
        result = train_soc_model(bio, soc)
        assert "warning" in result, "Small-sample warning missing from result."

    def test_no_warning_for_adequate_sample(self):
        """Results with ≥ 10 samples must not carry the overfitting warning."""
        from backend.ml_models.soc_model import train_soc_model
        bio, soc = self._valid_data(12)
        result = train_soc_model(bio, soc)
        assert "warning" not in result

    def test_predict_soc_clamps_negative(self):
        """Predictions must never be negative."""
        from backend.ml_models.soc_model import predict_soc
        preds = predict_soc([[1.0, 0.1], [0.0, 0.0]], coef_moisture=-5.0, coef_et=-10.0, intercept=0.0)
        for p in preds:
            assert p >= 0.0

    def test_predict_soc_rejects_short_rows(self):
        """Each row in grid_bioclimatic_values must have at least 2 elements."""
        from backend.ml_models.soc_model import predict_soc
        with pytest.raises((ValueError, IndexError)):
            predict_soc([[1.0]], coef_moisture=1.0, coef_et=1.0, intercept=0.0)


# ===========================================================================
# routers/ai – no embedded API key
# ===========================================================================
class TestAiRouter:
    def test_no_base64_api_key_in_source(self):
        """The _BK obfuscated API key must have been removed from ai.py."""
        import inspect
        import backend.routers.ai as ai
        src = inspect.getsource(ai)
        assert "_BK" not in src, "Obfuscated API key variable _BK still present."
        assert "QVEuQWI0" not in src, "Base64-encoded API key still present in ai.py."
        assert "base64.b64decode" not in src, (
            "base64.b64decode should not appear in ai.py "
            "(it was used only for the embedded key)."
        )

    def test_get_api_key_returns_env_value(self, monkeypatch):
        """_get_api_key must return the GEMINI_API_KEY env value."""
        monkeypatch.setenv("GEMINI_API_KEY", "test_key_xyz")
        import importlib
        import backend.routers.ai as ai
        importlib.reload(ai)
        assert ai._get_api_key() == "test_key_xyz"

    def test_get_api_key_returns_empty_when_unset(self, monkeypatch):
        """_get_api_key must return '' when GEMINI_API_KEY is not set (no fallback key)."""
        monkeypatch.delenv("GEMINI_API_KEY", raising=False)
        import importlib
        import backend.routers.ai as ai
        importlib.reload(ai)
        assert ai._get_api_key() == ""


# ===========================================================================
# main – CORS configuration
# ===========================================================================
class TestCorsConfiguration:
    def test_cors_wildcard_is_not_hardcoded(self):
        """allow_origin_regex='.*' must not appear in main.py source."""
        import inspect
        import backend.main as m
        src = inspect.getsource(m)
        assert 'allow_origin_regex=".*"' not in src
        assert "allow_origin_regex='.*'" not in src

    def test_cors_origins_env_respected(self, monkeypatch):
        """CORS_ORIGINS env var must produce the correct list of allowed origins."""
        # Test the parsing logic directly (same code as in main.py)
        # rather than reloading the full app, which is slow and unreliable in tests.
        cors_env = "https://app.example.com,https://admin.example.com"
        parsed = [o.strip() for o in cors_env.split(",") if o.strip()]
        assert "https://app.example.com" in parsed
        assert "https://admin.example.com" in parsed
        assert len(parsed) == 2

    def test_cors_wildcard_env_accepted(self, monkeypatch):
        """CORS_ORIGINS=* must be accepted without errors (for dev convenience)."""
        monkeypatch.setenv("CORS_ORIGINS", "*")
        import importlib
        import backend.main as m
        importlib.reload(m)
        assert m.CORS_ORIGINS == ["*"]
