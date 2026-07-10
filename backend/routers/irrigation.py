"""
Smart Irrigation Engine — Krishi-Drishti
==========================================
Implements agronomic water-requirement modelling to produce a
definitive 7-day irrigation schedule for a given crop, soil type,
and weather forecast.  Gemini 2.0 Flash augments the schedule with
precision agronomic tips.
"""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import List, Optional
import os

try:
    from google import genai as google_genai
except ModuleNotFoundError:
    google_genai = None

from ..rate_limiter import limiter
from ..logger import api_logger

router = APIRouter(prefix="/api/irrigation", tags=["Smart Irrigation"])

# ── Agronomic constants ───────────────────────────────────────────────────────
# Baseline daily water requirement (liters / acre)
CROP_WATER_REQ: dict[str, float] = {
    "Rice":       1200.0,
    "Wheat":       800.0,
    "Cotton":      900.0,
    "Sugarcane":  1500.0,
    "Tomato":      500.0,
    "Maize":       700.0,
    "Soybean":     650.0,
    "Groundnut":   550.0,
    "Onion":       480.0,
    "Potato":      600.0,
    "Sugarbeet":   750.0,
    "Sunflower":   580.0,
}
DEFAULT_WATER_REQ = 650.0   # fallback for unlisted crops

# Fraction of water retained per irrigation cycle (higher = irrigate less often)
SOIL_RETENTION: dict[str, float] = {
    "Black Soil":  0.65,
    "Red Soil":    0.45,
    "Sandy Soil":  0.30,
    "Clay Soil":   0.70,
    "Loamy Soil":  0.55,
    "Silty Soil":  0.60,
}
DEFAULT_RETENTION = 0.50

# Weather evapotranspiration multiplier
WEATHER_ADJ: dict[str, float] = {
    "Sunny":  1.20,
    "Cloudy": 0.80,
    "Rainy":  0.30,
    "Hot":    1.40,
    "Normal": 1.00,
    "Windy":  1.15,
}
DEFAULT_WEATHER_ADJ = 1.00

# Crops that require daily irrigation
DAILY_IRRIGATION_CROPS = {"Rice", "Sugarcane"}


# ── Pydantic models ───────────────────────────────────────────────────────────
class IrrigationRequest(BaseModel):
    crop_type: str
    soil_type: str
    area_acres: float
    weather_forecast: Optional[str] = "Normal"


class DaySchedule(BaseModel):
    day: int
    day_name: str
    should_irrigate: bool
    duration_minutes: int
    water_amount_liters: float
    method: str
    note: str


class IrrigationRecommendation(BaseModel):
    crop_type: str
    soil_type: str
    area_acres: float
    water_requirement_per_acre: str
    weekly_schedule: List[DaySchedule]
    total_weekly_water_liters: float
    savings_estimate: str
    efficiency_score: int          # 0-100
    ai_tips: List[str]
    method_summary: str


# ── Helpers ───────────────────────────────────────────────────────────────────
DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]


def _get_gemini_client():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key or google_genai is None:
        return None
    return google_genai.Client(api_key=api_key)


# ── Endpoints ─────────────────────────────────────────────────────────────────
@limiter.limit("15/minute")
@router.post("/recommend", response_model=IrrigationRecommendation)
async def get_irrigation_recommendation(request: Request, body: IrrigationRequest):
    """
    Returns a mathematically grounded 7-day irrigation schedule augmented
    with Gemini-generated precision agronomic tips.
    """
    try:
        # ── 1. Retrieve constants ────────────────────────────────────────────
        daily_base    = CROP_WATER_REQ.get(body.crop_type, DEFAULT_WATER_REQ)
        soil_ret      = SOIL_RETENTION.get(body.soil_type, DEFAULT_RETENTION)
        weather_mult  = WEATHER_ADJ.get(body.weather_forecast, DEFAULT_WEATHER_ADJ)

        # ── 2. Calculate adjusted daily water per acre ───────────────────────
        # Soil retention reduces the net daily demand because the soil holds more
        water_per_acre = daily_base * weather_mult * (1 - soil_ret * 0.3)
        total_per_acre_per_day = water_per_acre

        # ── 3. Build 7-day schedule ──────────────────────────────────────────
        daily_crops = body.crop_type in DAILY_IRRIGATION_CROPS
        schedule: List[DaySchedule] = []

        for i in range(7):
            should_irrigate = daily_crops or (i % 2 == 0)

            if should_irrigate:
                # Duration: proportional to volume; drip at ~1000 L/hr, sprinkler at ~2000 L/hr
                volume_total = total_per_acre_per_day * body.area_acres
                method = "Drip Irrigation" if volume_total < 1200 else "Sprinkler"
                flow_rate = 1000 if method == "Drip Irrigation" else 2000  # liters/hour
                minutes = max(15, int((volume_total / flow_rate) * 60))
                note = "Irrigate early morning (5–7 AM) to minimize evaporation."
            else:
                volume_total = 0.0
                method = "Rest"
                minutes = 0
                note = "Allow soil to breathe; check moisture with finger test."

            schedule.append(DaySchedule(
                day=i + 1,
                day_name=DAY_NAMES[i],
                should_irrigate=should_irrigate,
                duration_minutes=minutes,
                water_amount_liters=round(volume_total, 1),
                method=method,
                note=note,
            ))

        # ── 4. Compute savings vs. flood irrigation baseline ────────────────
        total_weekly = sum(s.water_amount_liters for s in schedule)
        flood_baseline = 1800 * body.area_acres * 7   # typical flood irrigation
        savings_pct = max(0, ((flood_baseline - total_weekly) / flood_baseline) * 100)
        efficiency_score = min(100, int(40 + savings_pct * 0.6))

        # ── 5. LLM-augmented tips ───────────────────────────────────────────
        ai_tips: List[str] = []
        method_summary = "Optimized schedule based on crop evapotranspiration model."

        try:
            client = _get_gemini_client()
            if client:
                prompt = (
                    f"Provide exactly 3 concise, highly specific agronomic tips (max 20 words each) "
                    f"for irrigating {body.crop_type} grown in {body.soil_type} soil "
                    f"during {body.weather_forecast} weather conditions. "
                    f"Separate each tip with a semicolon. No numbering, no markdown."
                )
                resp = client.models.generate_content(model="gemini-2.0-flash", contents=prompt)
                raw_tips = resp.text.strip()
                ai_tips = [t.strip() for t in raw_tips.split(";") if t.strip()][:3]

                summary_prompt = (
                    f"In one sentence (max 25 words), summarize the optimal irrigation strategy "
                    f"for {body.crop_type} in {body.soil_type} during {body.weather_forecast} conditions."
                )
                summary_resp = client.models.generate_content(model="gemini-2.0-flash", contents=summary_prompt)
                method_summary = summary_resp.text.strip()

        except Exception as tip_err:
            api_logger.warning("[Irrigation] LLM tips failed, using defaults: %s", tip_err)
            ai_tips = [
                f"Water {body.crop_type} at root level to reduce leaf disease risk.",
                f"Check soil moisture at 10 cm depth before each irrigation cycle.",
                f"Adjust schedule weekly based on actual rainfall recorded.",
            ]

        api_logger.info(
            "[Irrigation] %s, %s, %.1f acres → %.0f L/week, %.1f%% savings",
            body.crop_type, body.soil_type, body.area_acres, total_weekly, savings_pct
        )

        return IrrigationRecommendation(
            crop_type=body.crop_type,
            soil_type=body.soil_type,
            area_acres=body.area_acres,
            water_requirement_per_acre=f"{round(water_per_acre, 1)} L/acre/day",
            weekly_schedule=schedule,
            total_weekly_water_liters=round(total_weekly, 1),
            savings_estimate=f"Save ~{round(savings_pct, 1)}% vs flood irrigation",
            efficiency_score=efficiency_score,
            ai_tips=ai_tips,
            method_summary=method_summary,
        )

    except Exception as e:
        api_logger.exception("[Irrigation] Recommendation failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/crops")
async def list_supported_crops():
    """Returns the list of crops with built-in water requirement data."""
    return {
        "crops": [
            {"name": k, "daily_water_liters_per_acre": v}
            for k, v in sorted(CROP_WATER_REQ.items())
        ]
    }


@router.get("/soils")
async def list_supported_soils():
    """Returns the list of soil types with retention factors."""
    return {
        "soils": [
            {"name": k, "retention_factor": v}
            for k, v in sorted(SOIL_RETENTION.items())
        ]
    }
