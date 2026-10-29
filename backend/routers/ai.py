from typing import Optional
from fastapi import APIRouter, Depends, UploadFile, File, Form, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
import os
import logging

try:
    from google import genai
except ModuleNotFoundError:
    genai = None

from PIL import Image
import io
from ..database import get_db
from ..models import ChatMessage, User, StressReport
from ..dependencies import get_current_user, get_current_user_optional
from ..services.satellite import get_real_satellite_data
from ..services.rag_indexer import get_rag_engine
from ..services.weather_fetcher import get_bioclimatic_data
from ..ml_models.soc_model import train_soc_model
from ..ml_models.local_disease_predictor import predict as _local_predict

router = APIRouter(prefix="/api/ai", tags=["ai"])

from ..rate_limiter import limiter

logger = logging.getLogger(__name__)


def _use_local_model() -> bool:
    """Return True when USE_LOCAL_DISEASE_MODEL is 'true' or 'auto' (when model files are present)."""
    val = os.getenv("USE_LOCAL_DISEASE_MODEL", "auto").strip().lower()
    if val == "true":
        return True
    if val == "false":
        return False
    # In 'auto' mode, prefer local universal model if model files exist
    try:
        from ..ml_models.local_disease_predictor import is_model_ready
        ready, _ = is_model_ready()
        return ready
    except Exception:
        return False


def _get_api_key() -> str:
    """Return the Gemini API key from the environment. Never falls back to a hardcoded value."""
    key = (os.getenv("GEMINI_API_KEY") or "").strip()
    if not key:
        logger.warning(
            "[ai] GEMINI_API_KEY is not set. AI features requiring Gemini will be unavailable. "
            "Set GEMINI_API_KEY in your environment or .env file."
        )
    return key

class GeminiWrapper:
    def __init__(self, model_names=None):
        self.model_names = model_names or ["gemini-2.5-flash", "gemini-3.5-flash-lite"]
        self.api_key = _get_api_key()
        if genai:
            self.client = genai.Client(api_key=self.api_key)
        else:
            self.client = None
        
    def generate_content(self, contents):
        if not self.client:
            raise RuntimeError("google-genai client unavailable")
        last_exc = None
        for m in self.model_names:
            try:
                logger.info("[GeminiWrapper] Requesting generation with model: %s", m)
                resp = self.client.models.generate_content(
                    model=m,
                    contents=contents
                )
                if resp and resp.text:
                    return resp
            except Exception as e:
                logger.warning("[GeminiWrapper] Model %s failed: %s. Trying next candidate...", m, e)
                last_exc = e
        if last_exc:
            raise last_exc
        raise RuntimeError("All configured Gemini models failed to generate content.")

def _get_gemini_model():
    if genai is None:
        return None
    return GeminiWrapper()


class StressAnalysisRequest(BaseModel):
    lat: float
    lng: float
    crop_type: str
    sensor_data: dict = {}

@limiter.limit("10/minute")
@router.post("/analyze/stress")
async def analyze_stress(
    _req: Request,
    request: StressAnalysisRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 1. Get Satellite Data (from Google Earth Engine)
    sat_data = get_real_satellite_data(request.lat, request.lng)

    # 2. Prepare defaults – only trust values when data_available is True
    sat_available = sat_data.get("data_available", False)
    final_stress = sat_data.get("stress_level") or "Unknown"
    recommendation = sat_data.get("satellite_analysis", "Satellite data unavailable.")
    vra_nitrogen = "Standard application"
    vra_water = "Standard application"
    vra_pesticide = "Standard application"
    
    # 3. AI Analysis using Gemini (Precision Agronomist)
    try:
        model = _get_gemini_model()
        if model is not None:
            
            prompt = f"""
            You are an expert Precision Agronomist. Analyze the following crop status:
            Crop: {request.crop_type}
            Location: Lat {request.lat}, Lng {request.lng}
            Spectral Indices from Satellite:
            - NDVI (Overall Health): {sat_data.get('ndvi', 0)}
            - NDRE (Nitrogen/Early Stress): {sat_data.get('ndre', 0)}
            - GNDVI (Water/Nutrient): {sat_data.get('gndvi', 0)}
            On-Ground Sensor Data: {request.sensor_data}
            
            Your job is to provide highly localized Variable Rate Application (VRA) recommendations.
            Consider the specific needs of {request.crop_type} when evaluating these spectral numbers.
            For example, low NDRE in Wheat might mean a Nitrogen deficiency.
            
            Format response EXACTLY as a JSON object:
            {{
                "stress_level": "Low" or "Medium" or "High",
                "recommendation": "Overall 2-sentence summary of the health and immediate action required.",
                "precision_ag_vra": {{
                    "nitrogen": "Specific VRA recommendation for Fertilizer (e.g., 'Increase by 15% due to low NDRE').",
                    "water": "Specific VRA recommendation for Irrigation.",
                    "pesticide": "Specific VRA recommendation for Pesticides/Fungicides."
                }}
            }}
            """
            
            response = model.generate_content(prompt)
            
            ai_text = response.text
            import json
            import re
            try:
                cleaned = re.sub(r'```json|```', '', ai_text).strip()
                parsed = json.loads(cleaned)
                final_stress = parsed.get("stress_level", final_stress)
                recommendation = parsed.get("recommendation", recommendation)
                
                vra = parsed.get("precision_ag_vra", {})
                vra_nitrogen = vra.get("nitrogen", vra_nitrogen)
                vra_water = vra.get("water", vra_water)
                vra_pesticide = vra.get("pesticide", vra_pesticide)
            except Exception as e:
                print(f"[AI AI-Agronomist] JSON Parsing failed: {e}")
                # Fallbacks already set
        else:
             print("Warning: Gemini client unavailable. Using simulation fallback.")
             
    except Exception as e:
        print(f"AI Analysis Failed: {e}")
        # Continue with satellite fallback
    
    # 4. Save Report
    report = StressReport(
        user_id=current_user.id,
        location_lat=request.lat,
        location_lng=request.lng,
        crop_type=request.crop_type,
        ndvi_score=sat_data.get('ndvi', 0),
        stress_level=final_stress,
        recommendation=recommendation
    )
    db.add(report)
    db.commit()
    
    # 5. Format and Return to UI
    return {
        "satellite_data": {
            "source": sat_data.get("source", "Unknown"),
            "ndvi": sat_data.get("ndvi", 0),
            "ndre": sat_data.get("ndre", 0),
            "gndvi": sat_data.get("gndvi", 0),
            "soil_moisture": sat_data.get("soil_moisture", 0)
        },
        "thermal_data": {
            "water_stress_index": final_stress, # Mapping overall stress to water stress loosely for MVP
            "canopy_temperature": f"{sat_data.get('temperature', 25)}Ã‚Â°C"
        },
        "hyperspectral_data": {
            "fungal_risk": "High" if final_stress == "High" else "Low" # Simplification for MVP
        },
        "precision_ag_vra": {
            "nitrogen": vra_nitrogen,
            "water": vra_water,
            "pesticide": vra_pesticide
        },
        "ai_analysis": {
            "stress_level": final_stress,
            "recommendation": recommendation
        }
    }


class SocTrainingPoint(BaseModel):
    lat: float
    lng: float
    soc_value: float # Laboratory confirmed Soil Organic Carbon (g/kg)

class SocTrainingRequest(BaseModel):
    points: list[SocTrainingPoint]

@limiter.limit("5/minute")
@router.post("/train-soc")
async def train_soc_calibration(
    _req: Request,
    request: SocTrainingRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Accepts ground-truthed SOC data points, fetches real bioclimatic data from
    Open-Meteo, trains a Multiple Linear Regression model for this specific farm.
    """
    if len(request.points) < 2:
        return {"error": "At least 2 unique physical data points are required to train the model."}

    bioclimatic_array = []
    soc_array = []
    total_moisture = 0
    total_et = 0

    for point in request.points:
        climate_data = get_bioclimatic_data(point.lat, point.lng)
        moisture = climate_data.get("soil_moisture", 25.0)
        et = climate_data.get("evapotranspiration", 4.0)
        bioclimatic_array.append([moisture, et])
        soc_array.append(point.soc_value)
        total_moisture += moisture
        total_et += et

    logger.info("[train_soc] Training SOC model with %d data points.", len(bioclimatic_array))

    
    # 2. Train Multiple Linear Regression Model (Scikit-Learn)
    try:
        model_result = train_soc_model(bioclimatic_array, soc_array)
        
        # Calculate Averages for AI prompting
        avg_soc = sum(soc_array) / len(soc_array)
        avg_moisture = total_moisture / len(request.points)
        avg_et = total_et / len(request.points)
        
        # Give Actionable AI Insights via Gemini using the real data
        try:
            model = _get_gemini_model()
            if model is not None:
                
                prompt = f"""
                You are an expert Agricultural Data Scientist and Carbon Market Analyst.
                A farmer just trained a Machine Learning model for their field correlating clinical soil tests with real Open-Meteo satellite data.
                
                FARM DATA AVERAGES:
                - Soil Organic Carbon (SOC) from physical lab samples: {avg_soc:.1f} g/kg
                - Historical Soil Moisture (Top 7cm): {avg_moisture:.1f}%
                - Historical Evapotranspiration (ET): {avg_et:.1f} mm/day
                
                Please provide:
                1. A brief (2 sentence) explanation of what this SOC level combined with their moisture/ET means for their soil health and crop yield potential.
                2. Two very specific, highly actionable farming practices they can implement THIS season to increase their SOC, specifically considering their {avg_moisture:.1f}% average moisture.
                3. A brief (1 sentence) estimation of their potential to earn Carbon Credits in the voluntary market based on this baseline.
                
                IMPORTANT: YOU MUST TRANSLATE YOUR ENTIRE RESPONSE INTO THE LANGUAGE CORRESPONDING TO THIS CODE: '{current_user.language}'.
                DO NOT USE ENGLISH UNLESS THE CODE IS 'en'. For example, if the code is 'hi', output entirely in Hindi.
                
                Format EXACTLY as JSON:
                {{
                    "soil_health_summary": "...",
                    "actionable_practices": ["Practice 1: ...", "Practice 2: ..."],
                    "carbon_credit_potential": "..."
                }}
                """
                response = model.generate_content(prompt)
                
                import json
                import re
                cleaned = re.sub(r'```json|```', '', response.text).strip()
                ai_insights = json.loads(cleaned)
            else:
                raise RuntimeError("Gemini client unavailable")
        except Exception as ai_e:
            print(f"[SOC AI] Failed to generate insights: {ai_e}")
            ai_insights = {
                "soil_health_summary": f"Your average SOC is {avg_soc:.1f} g/kg.",
                "actionable_practices": ["Consider cover cropping to increase organic matter.", "Minimize tillage where possible."],
                "carbon_credit_potential": "Build a baseline history of 3 years to enter carbon markets."
            }

        response_payload = {
            "success": True,
            "model": model_result,
            "n_samples": len(soc_array),
            "ai_insights": ai_insights,
        }
        # Surface the overfitting warning (if any) at the top level for easy UI display
        if model_result.get("warning"):
            response_payload["model_warning"] = model_result["warning"]
        return response_payload
    except Exception as e:
        return {"error": f"Failed to train SOC Multiple Linear Regression: {e}"}

class ChatRequest(BaseModel):
    message: str


def _query_local_agri_service(message: str, language: str) -> dict | None:
    """
    Connect to local AgriculturelLLM microservice (agri_ai_service) if running on port 8001.
    Allows local LLaMA-3 (Dhenu) with full agricultural context & regional TTS.
    """
    service_url = os.getenv("AGRI_AI_SERVICE_URL", "http://127.0.0.1:8001/agent")
    try:
        import httpx
        with httpx.Client(timeout=3.0) as client:
            resp = client.post(
                service_url,
                json={"text": message, "language": language.lower()}
            )
            if resp.status_code == 200:
                data = resp.json()
                if isinstance(data, dict) and data.get("text"):
                    return data
    except Exception:
        pass
    return None

@limiter.limit("20/minute")
@router.post("/chat")
async def ai_chat(
    _req: Request,
    request: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    
    try:
        # 1. Fetch History (Last 5 messages)
        history = db.query(ChatMessage).filter(ChatMessage.user_id == current_user.id).order_by(ChatMessage.timestamp.desc()).limit(5).all()
        history.reverse()
        
        # 2. RAG Retrieval Ã¢â‚¬â€ search the real corpus (688KB agriculture knowledge base)
        rag_context = ""
        try:
            engine = get_rag_engine()
            rag_results = engine.search(request.message, top_k=3, alpha=0.6)
            if rag_results:
                rag_context = "\n--- Verified Agricultural Knowledge Base References ---\n"
                for res in rag_results:
                    rag_context += f"Ã¢â‚¬Â¢ {res['content']}\n"
                rag_context += "--- End of References ---\n"
        except Exception as rag_err:
            print(f"[AI Chat] RAG retrieval failed: {rag_err}")

        # 3. Build user profile context for Gemini
        user_crops = current_user.crops or "Not specified"
        user_lang_map = {
            'en': 'English', 'hi': 'Hindi', 'mr': 'Marathi', 'bn': 'Bengali',
            'te': 'Telugu', 'ta': 'Tamil', 'pa': 'Punjabi', 'kn': 'Kannada'
        }
        user_lang_name = user_lang_map.get(current_user.language or 'en', 'English')

        system_prompt = f"""You are Krishi-AI, an expert agricultural advisor for Indian farmers.

FARMER PROFILE:
- Name: {current_user.name or 'Farmer'}
- District: {current_user.district or 'India'}
- Crops grown: {user_crops}
- Farming type: {current_user.farming_type or 'Mixed'}
- Category: {current_user.category or 'General'}
- Land: {current_user.land_size or 'Unknown'} acres

KNOWLEDGE BASE (use these facts to ground your answer Ã¢â‚¬â€ do NOT ignore them):
{rag_context}

INSTRUCTIONS:
1. Answer specifically for the farmer's crops and district.
2. Give actionable, practical advice Ã¢â‚¬â€ not generic text.
3. Cite specific numbers (kg/ha, dosage, timing) when relevant.
4. If the knowledge base has relevant data, ALWAYS use it.
5. Respond ENTIRELY in {user_lang_name}. Do not mix languages.
6. Keep answers concise Ã¢â‚¬â€ 3Ã¢â‚¬â€œ5 sentences max unless a detailed list is needed.
"""
        
        chat_history = "\n".join([f"{msg.role}: {msg.text}" for msg in history])
        full_prompt = f"{system_prompt}\nConversation History:\n{chat_history}\n\nFarmer: {request.message}\nKrishi-AI:"

        
        # 3. Call Local Microservice or Gemini (Async Wrapper)
        local_service_resp = _query_local_agri_service(request.message, user_lang_name)
        if local_service_resp and local_service_resp.get("text"):
            answer = local_service_resp["text"]
            logger.info("[ai_chat] Successfully answered via local AgriculturelLLM service.")
        else:
            import asyncio
            loop = asyncio.get_event_loop()
            answer = await loop.run_in_executor(None, lambda: _generate_chat_response(full_prompt, request.message, current_user))

        # 4. Save User & AI Message safely (non-blocking on commit errors)
        try:
            user_msg = ChatMessage(user_id=current_user.id, role="user", text=request.message)
            db.add(user_msg)
            ai_msg = ChatMessage(user_id=current_user.id, role="model", text=answer)
            db.add(ai_msg)
            db.commit()
        except Exception as db_err:
            logger.warning("[ai_chat] DB commit failed (non-critical): %s", db_err)
            db.rollback()

        return {"response": answer}

    except Exception as e:
        import traceback
        traceback.print_exc()
        logger.error("[ai_chat] Exception in chat endpoint: %s", e)
        try:
            fallback = _build_agronomic_fallback(
                request.message,
                user_name=current_user.name if current_user else "Farmer",
                district=current_user.district if current_user else "India",
                crops=current_user.crops if current_user else ""
            )
        except Exception:
            fallback = "Namaste! October is the Rabi season. Top recommended crops for your region are Chickpea (Chana), Rabi Jowar, Wheat, and Mustard. Sowing late Oct–Nov with balanced NPK fertilizer ensures optimum yield."
        return {"response": fallback}

def _build_agronomic_fallback(message: str, user_name: str = "Farmer", district: str = "India", crops: str = "") -> str:
    """
    Intelligent domain-grounded agronomic fallback when external LLM APIs are momentarily unreachable.
    Provides actionable seasonal advice, NPK dosage, sowing dates, and crop suggestions for the Indian sub-continent.
    """
    msg_lower = (message or "").lower()
    name = user_name or "Farmer"
    dist = district or "your district"
    crops_text = crops or "staple regional crops"
    
    import datetime
    month = datetime.date.today().month
    # Oct - March: Rabi
    if month in [10, 11, 12, 1, 2, 3]:
        season_name = "Rabi Season (Winter/Spring)"
        top_crops = (
            "1. Chickpea / Chana (Bengal Gram): Sowing in late Oct–Nov, optimal seed rate 65–75 kg/ha. Apply NPK 20:50:20 kg/ha. Excellent drought tolerance and high market demand.\n"
            "2. Rabi Jowar (Sorghum): Late Sep–Oct sowing, ideal for semi-arid black soils. High yield of both grain and livestock fodder.\n"
            "3. Wheat: Optimal sowing Nov 1–25. Recommended varieties: HD-2967, GW-322. Apply NPK 120:60:40 kg/ha with irrigation at Crown Root Initiation (CRI).\n"
            "4. Mustard / Rapeseed: Early Oct–late Oct sowing, seed rate 4–5 kg/ha. Highly lucrative oilseed with low water requirement.\n"
            "5. Safflower (Kardi): Ideal for moisture retentive soils, deep root system withstands mid-season dry spells."
        )
    elif month in [4, 5, 6]:
        season_name = "Zaid Season (Summer)"
        top_crops = (
            "1. Summer Moong / Urad: 60-day maturity crop, enriches soil nitrogen.\n"
            "2. Watermelon & Muskmelon: High market value with drip irrigation.\n"
            "3. Cucumber & Gourds: Continuous harvesting with trellis support.\n"
            "4. Fodder Crops (Maize + Cowpea): Sustains livestock during summer dry months."
        )
    else:
        season_name = "Kharif Season (Monsoon)"
        top_crops = (
            "1. Soybean: Sowing with onset of monsoon, seed treatment with Rhizobium + PSB.\n"
            "2. Cotton: Deep black soil, spacing 90x60 cm. Integrated Pest Management for bollworm.\n"
            "3. Rice / Paddy: Nursery preparation in June, transplanting 20–25 day seedlings.\n"
            "4. Maize & Jowar: High biomass potential with balanced NPK."
        )

    if any(k in msg_lower for k in ["crop", "season", "grow", "sow", "plant", "produce", "what to"]):
        return (
            f"Namaste {name}! For {dist} during the current {season_name}, here are the best recommended crops:\n\n"
            f"{top_crops}\n\n"
            f"Key Advisory for your field:\n"
            f"• Soil Prep: Incorporate 4–5 tonnes/acre of well-rotted FYM or compost.\n"
            f"• Seed Treatment: Treat seeds with Trichoderma (5g/kg) or Carbendazim to prevent root rot.\n"
            f"• Soil Testing: Verify NPK and micro-nutrients (Zinc & Boron) before sowing."
        )

    if any(k in msg_lower for k in ["fertilizer", "npk", "urea", "dap", "dose", "manure"]):
        return (
            f"Namaste {name}! General balanced fertilizer recommendations for {season_name} crops:\n\n"
            f"• Wheat: N:P:K = 120:60:40 kg/ha (Apply 50% N + 100% P & K as basal; top dress remaining N in 2 splits).\n"
            f"• Chickpea / Pulses: N:P:K = 20:50:20 kg/ha + 20 kg/ha Sulphur for maximum nodulation.\n"
            f"• Mustard: N:P:K = 80:40:40 kg/ha + 30 kg/ha Elemental Sulphur.\n"
            f"• Organic Boost: Apply Vermicompost (2 tonnes/acre) or Jeevamrut every 15 days with irrigation."
        )

    if any(k in msg_lower for k in ["pest", "disease", "yellow", "spot", "insect", "fungus", "spray"]):
        return (
            f"Namaste {name}! For pest and disease control in {crops_text} ({dist}):\n\n"
            f"• Fungal Leaf Spots / Blight: Spray Mancozeb 75% WP @ 2.5 g/L or Azoxystrobin @ 1 mL/L.\n"
            f"• Sucking Pests (Aphids/Thrips/Whitefly): Spray Neem Oil 10,000 ppm @ 3 mL/L or Imidacloprid 17.8% SL @ 0.5 mL/L.\n"
            f"• Caterpillar / Pod Borer: Install Pheromone traps (5/acre) and spray Emamectin Benzoate 5% SG @ 0.4 g/L.\n"
            f"Always spray in late afternoon and wear protective equipment."
        )

    return (
        f"Namaste {name}! Krishi-AI expert advisor here for your farm in {dist} (Crops: {crops_text}).\n\n"
        f"We are currently in {season_name}. Key field priorities:\n"
        f"• Timely sowing of Rabi crops (Chickpea, Rabi Jowar, Wheat, Mustard)\n"
        f"• Seed treatment with biofertilizers (Rhizobium + PSB)\n"
        f"• Preserving residual soil moisture with light mulching\n\n"
        f"Feel free to ask about specific crop varieties, fertilizer doses, disease remedies, or Mandi APMC rates!"
    )

def _generate_chat_response(prompt: str, user_message: str = "", user: User = None) -> str:
    """Helper to run Gemini call with multi-model cascade and domain fallback"""
    model = _get_gemini_model()
    if model:
        try:
            response = model.generate_content(prompt)
            if response and response.text and response.text.strip():
                return response.text.strip()
        except Exception as exc:
            logger.warning("[_generate_chat_response] Gemini generation failed: %s. Using domain agronomic advisory.", exc)
    
    # Domain fallback ensures 100% uptime and instant high-value response
    user_name = user.name if user else "Farmer"
    district = user.district if user else "India"
    crops = user.crops if user else ""
    return _build_agronomic_fallback(user_message, user_name=user_name, district=district, crops=crops)


DISEASE_INFERENCE_TIMEOUT = float(os.getenv("DISEASE_INFERENCE_TIMEOUT_SECONDS", "60.0"))  # 60s covers Keras cold-load + inference
GEMINI_INFERENCE_TIMEOUT = float(os.getenv("GEMINI_INFERENCE_TIMEOUT_SECONDS", "10.0"))


def _safe_delayed_fallback(reason: str = "server load") -> dict:
    """
    Construct a clean HTTP 200 fallback response that strictly adheres to the exact
    JSON schema expected by VisionResultScreen and the Android mobile application.
    Guarantees the mobile app never drops connection, encounters unhandled 500/504 errors,
    or displays a white screen during Render server-side delays.
    """
    return {
        "diagnosis":    "Analysis Delayed",
        "confidence":   0,
        "summary":      (
            f"Crop image analysis is taking longer than expected under current {reason}. "
            "Please retry with a clear, well-lit crop photo."
        ),
        "health_score": 50,
        "remedies":     [
            {
                "title": "Camera Focus & Lighting",
                "desc":  "Ensure clear daylight and steady camera focus directly on the symptomatic leaf area.",
                "type":  "cultural",
            },
            {
                "title": "Retry Leaf Diagnosis",
                "desc":  "Tap the scan button again to submit a new scan for immediate processing.",
                "type":  "cultural",
            },
        ],
    }


@limiter.limit("10/minute")
@router.post("/diagnose")
async def diagnose_crop(
    request: Request,
    file: UploadFile = File(...),
    mode: str = Form("diagnosis"),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """
    Crop disease diagnosis endpoint.

    Contract Preservation:
      Returns the EXACT SAME JSON schema whether processed by local model or Gemini:
        { diagnosis, confidence, summary, health_score, remedies[] }
      Frontend and Android application remain completely untouched.

    Render Deployment Optimization & Connection Stability:
      - Asynchronous thread-pool inference with strict timeout handling.
      - Never drops connections or returns raw 500/504 errors.
      - Dual cascade: Local Model <-> Gemini Vision fallback.
    """
    import asyncio
    loop = asyncio.get_event_loop()

    try:
        content = await file.read()
        image = Image.open(io.BytesIO(content))
    except Exception as img_err:
        logger.error("[diagnose] Invalid image payload: %s", img_err)
        return _safe_delayed_fallback("image decoding")

    def _clean(resp: dict) -> dict:
        resp.pop("_source", None)
        return resp

    # ════════════════════════════════════════════════════════════════════════
    # BRANCH A — Local model is PRIMARY (USE_LOCAL_DISEASE_MODEL=true or auto)
    # ════════════════════════════════════════════════════════════════════════
    if _use_local_model():
        logger.info("[diagnose] Running local model (mode=%s, timeout=%ss)...", mode, DISEASE_INFERENCE_TIMEOUT)
        try:
            result = await asyncio.wait_for(
                loop.run_in_executor(None, lambda: _local_predict(image, mode=mode)),
                timeout=DISEASE_INFERENCE_TIMEOUT,
            )
            source = result.get("_source", "local")
            if "error" not in source:
                logger.info("[diagnose] Local model success: %s (%s%%)",
                            result.get("diagnosis"), result.get("confidence"))
                return _clean(result)
            logger.warning("[diagnose] Local model error reported: %s", result.get("summary"))
        except asyncio.TimeoutError:
            logger.warning("[diagnose] Local inference timed out after %ss on Render", DISEASE_INFERENCE_TIMEOUT)
        except Exception as exc:
            logger.warning("[diagnose] Local inference exception: %s", exc)

        # Local model failed or timed out — cascade to Gemini as safety net
        logger.warning("[diagnose] Cascading to Gemini API fallback...")

    # ════════════════════════════════════════════════════════════════════════
    # BRANCH B — Gemini Vision is PRIMARY (USE_LOCAL_DISEASE_MODEL=false)
    # Also serves as cascade fallback when local model errors or times out.
    # ════════════════════════════════════════════════════════════════════════
    gemini = _get_gemini_model()

    if gemini is None:
        # No Gemini key configured
        if not _use_local_model():
            logger.info("[diagnose] Gemini unconfigured, attempting local model...")
            try:
                result = await asyncio.wait_for(
                    loop.run_in_executor(None, lambda: _local_predict(image, mode=mode)),
                    timeout=DISEASE_INFERENCE_TIMEOUT,
                )
                source = result.get("_source", "local")
                if "error" not in source:
                    return _clean(result)
            except Exception as e:
                logger.warning("[diagnose] Local model fallback failed: %s", e)
        return _safe_delayed_fallback("AI services busy")

    # Build prompt based on mode
    if mode == "grading":
        prompt = """
        You are an expert quality grader. Grade this produce.
        Format your response EXACTLY as a JSON object with the following fields:
        {
            "diagnosis": "Grade A/B/C",
            "confidence": 0-100 (integer),
            "summary": "Reason for grading",
            "health_score": 0-100 (visual quality score),
            "remedies": []
        }
        """
    else:
        prompt = """
        You are an expert agronomist. Analyze this crop image.
        Format your response EXACTLY as a JSON object with the following fields:
        {
            "diagnosis": "Name of disease or pest (or 'Healthy')",
            "confidence": 0-100 (integer),
            "summary": "Brief 1-sentence explanation",
            "health_score": 0-100 (integer),
            "remedies": [
                { "title": "Remedy Name", "desc": "Short description", "type": "organic" },
                { "title": "Remedy Name", "desc": "Short description", "type": "chemical" }
            ]
        }
        """

    try:
        response = await asyncio.wait_for(
            loop.run_in_executor(None, lambda: gemini.generate_content([prompt, image])),
            timeout=GEMINI_INFERENCE_TIMEOUT,
        )
        import json
        import re
        cleaned = re.sub(r'```json|```', '', response.text).strip()
        analysis = json.loads(cleaned)
        if "health_score" not in analysis:
            analysis["health_score"] = 100 if "healthy" in analysis.get("diagnosis", "").lower() else 50
        if "remedies" not in analysis or not isinstance(analysis["remedies"], list):
            analysis["remedies"] = []
        return analysis
    except asyncio.TimeoutError:
        logger.warning("[diagnose] Gemini API timed out after %ss", GEMINI_INFERENCE_TIMEOUT)
        # If local model hasn't been tried yet, try it now
        if not _use_local_model():
            try:
                result = await asyncio.wait_for(
                    loop.run_in_executor(None, lambda: _local_predict(image, mode=mode)),
                    timeout=DISEASE_INFERENCE_TIMEOUT,
                )
                source = result.get("_source", "local")
                if "error" not in source:
                    return _clean(result)
            except Exception:
                pass
        return _safe_delayed_fallback("Gemini API timeout")
    except Exception as exc:
        logger.warning("[diagnose] Gemini API call/parse failed: %s", exc)
        if not _use_local_model():
            try:
                result = await asyncio.wait_for(
                    loop.run_in_executor(None, lambda: _local_predict(image, mode=mode)),
                    timeout=DISEASE_INFERENCE_TIMEOUT,
                )
                source = result.get("_source", "local")
                if "error" not in source:
                    return _clean(result)
            except Exception:
                pass
        return _safe_delayed_fallback("AI service response")


