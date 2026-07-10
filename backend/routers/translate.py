"""
Dynamic Translation Router — Krishi-Drishti
=============================================
Provides LLM-powered translation for dynamic agricultural content.
Uses a static dictionary for common UI terms and Gemini 2.0 Flash
as an LLM fallback for user-generated / dynamic content.
"""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
import os

try:
    from google import genai as google_genai
except ModuleNotFoundError:
    google_genai = None

from ..rate_limiter import limiter
from ..logger import api_logger

router = APIRouter(prefix="/api/translate", tags=["Translation"])

# ── Language map ──────────────────────────────────────────────────────────────
LANGUAGE_NAMES = {
    "en": "English",
    "hi": "Hindi",
    "mr": "Marathi",
    "bn": "Bengali",
    "te": "Telugu",
    "ta": "Tamil",
    "kn": "Kannada",
    "pa": "Punjabi",
}

# ── Static dictionary for common UI strings (fast, no API cost) ───────────────
STATIC_TRANSLATIONS: dict[str, dict[str, str]] = {
    "hi": {
        "dashboard": "डैशबोर्ड",
        "smart_irrigation": "स्मार्ट सिंचाई",
        "add_field": "खेत जोड़ें",
        "irrigation_schedule": "सिंचाई कार्यक्रम",
        "digital_twin": "डिजिटल ट्विन",
        "crop_health": "फसल स्वास्थ्य",
        "weather": "मौसम",
        "market": "बाज़ार",
        "settings": "सेटिंग्स",
        "save": "सहेजें",
        "cancel": "रद्द करें",
    },
    "kn": {
        "dashboard": "ಡ್ಯಾಶ್‌ಬೋರ್ಡ್",
        "smart_irrigation": "ಸ್ಮಾರ್ಟ್ ನೀರಾವರಿ",
        "add_field": "ಕ್ಷೇತ್ರ ಸೇರಿಸಿ",
        "irrigation_schedule": "ನೀರಾವರಿ ವೇಳಾಪಟ್ಟಿ",
        "digital_twin": "ಡಿಜಿಟಲ್ ಟ್ವಿನ್",
        "crop_health": "ಬೆಳೆ ಆರೋಗ್ಯ",
        "weather": "ಹವಾಮಾನ",
        "market": "ಮಾರುಕಟ್ಟೆ",
        "settings": "ಸೆಟ್ಟಿಂಗ್‌ಗಳು",
        "save": "ಉಳಿಸಿ",
        "cancel": "ರದ್ದು ಮಾಡಿ",
    },
    "mr": {
        "dashboard": "डॅशबोर्ड",
        "smart_irrigation": "स्मार्ट सिंचन",
        "add_field": "शेत जोडा",
        "irrigation_schedule": "सिंचन वेळापत्रक",
        "digital_twin": "डिजिटल ट्विन",
        "crop_health": "पीक आरोग्य",
        "weather": "हवामान",
        "market": "बाजार",
        "settings": "सेटिंग्ज",
        "save": "जतन करा",
        "cancel": "रद्द करा",
    },
}


def _get_gemini_client():
    """Return a Gemini client using the project-standard pattern."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key or google_genai is None:
        return None
    return google_genai.Client(api_key=api_key)


class TranslateRequest(BaseModel):
    text: str
    target_language: str   # e.g., 'kn', 'hi', 'en'
    source_language: str = "en"


class TranslateBatchRequest(BaseModel):
    texts: list[str]
    target_language: str
    source_language: str = "en"


@limiter.limit("30/minute")
@router.post("/")
async def translate_text(request: Request, body: TranslateRequest):
    """
    Translates dynamic agricultural content to the target language.
    Falls back to LLM (Gemini 2.0 Flash) when no static translation exists.
    """
    # No-op for English
    if body.target_language == "en" or body.target_language == body.source_language:
        return {"original": body.text, "translated": body.text, "language": "en"}

    target_name = LANGUAGE_NAMES.get(body.target_language, "English")

    try:
        client = _get_gemini_client()
        if client is None:
            api_logger.warning("[Translate] Gemini unavailable, returning original text.")
            return {"original": body.text, "translated": body.text, "language": body.target_language}

        prompt = (
            f"You are a professional agricultural translator. "
            f"Translate the following text to {target_name}. "
            f"Maintain agricultural terminology accurately. "
            f"Return ONLY the translated text — no markdown, no quotes, no explanation.\n\n"
            f"Text: {body.text}"
        )

        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt
        )
        translated = response.text.strip()
        api_logger.info("[Translate] %s → %s: OK", body.source_language, body.target_language)

        return {
            "original": body.text,
            "translated": translated,
            "language": body.target_language,
            "language_name": target_name,
        }

    except Exception as e:
        api_logger.exception("[Translate] LLM translation failed: %s", e)
        raise HTTPException(status_code=500, detail=f"Translation error: {str(e)}")


@limiter.limit("10/minute")
@router.post("/batch")
async def translate_batch(request: Request, body: TranslateBatchRequest):
    """Translate multiple strings in one request to minimize API round-trips."""
    if body.target_language == "en":
        return {"translations": body.texts, "language": "en"}

    target_name = LANGUAGE_NAMES.get(body.target_language, "English")

    try:
        client = _get_gemini_client()
        if client is None:
            return {"translations": body.texts, "language": body.target_language}

        numbered = "\n".join(f"{i+1}. {t}" for i, t in enumerate(body.texts))
        prompt = (
            f"Translate each numbered agricultural term/phrase to {target_name}. "
            f"Return ONLY the translated numbered list in the exact same format. "
            f"No explanations.\n\n{numbered}"
        )

        response = client.models.generate_content(model="gemini-2.0-flash", contents=prompt)
        lines = [line.split(". ", 1)[-1].strip() for line in response.text.strip().split("\n") if line.strip()]

        # Pad with originals if LLM returns fewer lines
        translated = lines + body.texts[len(lines):]

        return {"translations": translated[:len(body.texts)], "language": body.target_language}

    except Exception as e:
        api_logger.exception("[Translate/Batch] Failed: %s", e)
        raise HTTPException(status_code=500, detail=f"Batch translation error: {str(e)}")


@router.get("/static/{language}")
async def get_static_translations(language: str):
    """Return the full static translation dictionary for a language."""
    return STATIC_TRANSLATIONS.get(language, {})
