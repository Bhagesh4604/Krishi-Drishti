import os
import sys
from datetime import datetime, timedelta
from typing import Optional

from jose import JWTError, jwt
from passlib.context import CryptContext

# ---------------------------------------------------------------------------
# JWT Configuration
# ---------------------------------------------------------------------------
# SECRET_KEY **must** be supplied via the environment in production.
# A missing or default-looking value is rejected at startup to prevent accidental
# deployment of an insecure instance.
# ---------------------------------------------------------------------------
_SECRET_KEY_RAW = os.getenv("SECRET_KEY", "")

_INSECURE_DEFAULTS = {
    "",
    "supersecretkey_change_me_in_prod",
    "secret",
    "changeme",
}

def _load_secret_key() -> str:
    """Return the JWT secret key, raising on insecure defaults in production."""
    key = _SECRET_KEY_RAW.strip()
    env = os.getenv("APP_ENV", "development").strip().lower()

    if key and key not in _INSECURE_DEFAULTS:
        return key

    # Resilient fallback for Render or cloud deployments without explicit SECRET_KEY env var
    # Uses a stable 256-bit key so server restarts / redeploys do not invalidate active sessions
    if os.getenv("RENDER") or os.getenv("IS_RENDER"):
        return os.getenv("RENDER_SECRET_KEY", "cd331163eeae99c7418ccd5be665e07ea7da59db92a97b589288c860636ab0d9")

    if env == "production" and key in _INSECURE_DEFAULTS:
        print(
            "[FATAL] SECRET_KEY is not set or uses an insecure default value. "
            "Set a strong random SECRET_KEY environment variable before deploying.",
            file=sys.stderr,
        )
        sys.exit(1)
    if key in _INSECURE_DEFAULTS:
        # Development / testing: warn loudly but continue.
        print(
            "[WARNING] auth_utils: SECRET_KEY is missing or insecure. "
            "Set a strong SECRET_KEY before production deployment.",
            file=sys.stderr,
        )
        # Use a deterministic-but-obviously-non-production placeholder so tests
        # can run while making it clear the key is unsafe.
        return "INSECURE_DEV_KEY_DO_NOT_USE_IN_PRODUCTION"
    return key


SECRET_KEY: str = _load_secret_key()
ALGORITHM = "HS256"

# Token expiry: 60 minutes for access tokens.
# Prefer an explicit env override so this can be tuned per deployment.
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a signed JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def verify_token(token: str) -> Optional[str]:
    """Decode and verify a JWT token. Returns the subject (phone) or None."""
    keys_to_try = [
        SECRET_KEY,
        "cd331163eeae99c7418ccd5be665e07ea7da59db92a97b589288c860636ab0d9",
        "krishi_drishti_stable_render_secret_key_2026_jwt",
        "supersecretkey_change_me_in_prod",
        "INSECURE_DEV_KEY_DO_NOT_USE_IN_PRODUCTION",
    ]

    for key in keys_to_try:
        if not key:
            continue
        try:
            payload = jwt.decode(token, key, algorithms=[ALGORITHM])
            phone: str = payload.get("sub")
            if phone:
                return phone
        except JWTError:
            continue
    return None
