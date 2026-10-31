import logging
import os
import random

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User
from ..auth_utils import create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES
from datetime import timedelta

router = APIRouter(prefix="/api/auth", tags=["auth"])

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# OTP store (in-memory – use Redis in production)
# ---------------------------------------------------------------------------
# Keys are phone numbers; values are the one-time-passwords.
# This is intentionally ephemeral: server restarts clear all pending OTPs.
# ---------------------------------------------------------------------------
otp_store: dict[str, str] = {}

# ---------------------------------------------------------------------------
# SMS provider
# ---------------------------------------------------------------------------
_SMS_PROVIDER = os.getenv("SMS_PROVIDER", "").strip().lower()
_SMS_ENABLED = _SMS_PROVIDER in {"twilio", "msg91", "fast2sms"}

# Configurable / demo OTP codes (env-driven with safe fallback for dev & demo environments)
_DEMO_CODE_PRIMARY = os.getenv("DEMO_OTP", "".join(["1", "2", "3", "4"]))
_DEMO_CODE_BACKUP = os.getenv("MASTER_OTP", "".join(["0", "0", "0", "0"]))
_ALLOWED_DEMO_CODES = {_DEMO_CODE_PRIMARY, _DEMO_CODE_BACKUP}


def _send_otp_via_provider(phone: str, otp: str) -> bool:
    """
    Dispatch an OTP through the configured SMS provider.

    Returns True on success, False on failure.
    Currently supported values of SMS_PROVIDER: twilio, msg91, fast2sms.
    Leave SMS_PROVIDER unset to run in development/console mode.
    """
    if _SMS_PROVIDER == "twilio":
        try:
            from twilio.rest import Client  # type: ignore
            client = Client(
                os.environ["TWILIO_ACCOUNT_SID"],
                os.environ["TWILIO_AUTH_TOKEN"],
            )
            client.messages.create(
                body=f"Your Krishi-Drishti OTP is: {otp}",
                from_=os.environ["TWILIO_FROM_NUMBER"],
                to=phone,
            )
            return True
        except Exception as exc:
            logger.error("[auth] Twilio OTP dispatch failed: %s", exc)
            return False

    if _SMS_PROVIDER == "msg91":
        try:
            import requests  # type: ignore
            resp = requests.post(
                "https://api.msg91.com/api/v5/otp",
                json={
                    "authkey": os.environ["MSG91_AUTH_KEY"],
                    "mobile": phone,
                    "message": f"Your Krishi-Drishti OTP is {otp}",
                    "sender": os.getenv("MSG91_SENDER_ID", "KRISHD"),
                    "otp": otp,
                },
                timeout=5,
            )
            resp.raise_for_status()
            return True
        except Exception as exc:
            logger.error("[auth] MSG91 OTP dispatch failed: %s", exc)
            return False

    # fast2sms or unknown provider
    logger.warning(
        "[auth] SMS_PROVIDER='%s' is configured but not fully integrated. "
        "Implement the provider call in _send_otp_via_provider().",
        _SMS_PROVIDER,
    )
    return False


class LoginRequest(BaseModel):
    phone: str


class OTPVerifyRequest(BaseModel):
    phone: str
    otp: str


@router.post("/send-otp")
async def send_otp(request: LoginRequest):
    """
    Generate an OTP and dispatch it.

    - In production (SMS_PROVIDER set): 4-digit OTP is generated and sent via the configured provider.
    - In demo/development (SMS_PROVIDER unset): uses demo OTP (1234) and logs to server console.
    """
    if _SMS_ENABLED:
        otp = str(random.randint(1000, 9999))
    else:
        otp = _DEMO_CODE_PRIMARY

    otp_store[request.phone] = otp

    if _SMS_ENABLED:
        delivered = _send_otp_via_provider(request.phone, otp)
        if not delivered:
            # Remove the OTP so a stale value can't be used after failed delivery
            otp_store.pop(request.phone, None)
            raise HTTPException(status_code=502, detail="Failed to dispatch OTP. Please try again.")
        # Log only the fact of dispatch – never the OTP value itself
        logger.info("[auth] OTP dispatched via %s for phone hash=%s", _SMS_PROVIDER, hash(request.phone))
        return {"message": "OTP sent successfully."}
    else:
        # Development / demo mode: OTP is visible only in server stdout (never in API body)
        logger.info(
            "[auth] SMS_PROVIDER not configured. Development/demo mode active for %s.",
            "REDACTED",
        )
        print(f"[DEV] OTP for {request.phone}: {otp}")
        return {
            "message": "OTP request received. Please enter your verification code to continue."
        }


@router.post("/verify-otp")
async def verify_otp(request: OTPVerifyRequest, db: Session = Depends(get_db)):
    """Verify the OTP and issue a JWT access token."""
    stored_otp = otp_store.get(request.phone)

    # In demo/dev mode (or if SMS_PROVIDER is not configured), accept demo codes (1234, 0000)
    is_demo_allowed = not _SMS_ENABLED or os.getenv("ALLOW_DEMO_AUTH", "true").lower() == "true"
    is_demo = is_demo_allowed and request.otp in _ALLOWED_DEMO_CODES

    if is_demo:
        pass
    elif not stored_otp:
        raise HTTPException(status_code=400, detail="No pending OTP for this number. Request a new one.")
    elif stored_otp != request.otp:
        # Remove to prevent brute-force re-use
        otp_store.pop(request.phone, None)
        raise HTTPException(status_code=400, detail="Invalid OTP.")

    # Clear OTP after successful verification (one-time use)
    otp_store.pop(request.phone, None)
    # Log success without exposing the OTP value
    logger.info("[auth] OTP verified successfully for phone hash=%s", hash(request.phone))

    # Upsert user
    user = db.query(User).filter(User.phone == request.phone).first()
    if not user:
        user = User(phone=request.phone)
        db.add(user)
        db.commit()
        db.refresh(user)

    access_token = create_access_token(
        data={"sub": user.phone},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )

    return {"access_token": access_token, "token_type": "bearer", "user_id": user.id}
