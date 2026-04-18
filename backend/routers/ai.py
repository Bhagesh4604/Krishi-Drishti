from fastapi import APIRouter, Depends, UploadFile, File, Form
from sqlalchemy.orm import Session
from pydantic import BaseModel
import os

try:
    import google.generativeai as genai
except ModuleNotFoundError:
    genai = None

from PIL import Image
import io
from ..database import get_db
from ..models import ChatMessage, User, StressReport
from ..dependencies import get_current_user
from ..database import get_db
from ..models import ChatMessage, User, StressReport
from ..dependencies import get_current_user
from ..services.satellite import get_real_satellite_data
from ..services.rag_indexer import get_rag_engine
from ..services.weather_fetcher import get_bioclimatic_data
from ..ml_models.soc_model import train_soc_model

router = APIRouter(prefix="/api/ai", tags=["ai"])


def _get_gemini_model():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key or genai is None:
        return None

    genai.configure(api_key=api_key)
    return genai.GenerativeModel("gemini-1.5-flash")


class StressAnalysisRequest(BaseModel):
    lat: float
    lng: float
    crop_type: str
    sensor_data: dict = {}

@router.post("/analyze/stress")
async def analyze_stress(
    request: StressAnalysisRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 1. Get Satellite Data (from Google Earth Engine or local fallback)
    sat_data = get_real_satellite_data(request.lat, request.lng)
    
    # 2. Prepare Default/Fallback response
    final_stress = sat_data['stress_level']
    recommendation = sat_data['satellite_analysis']
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
            "canopy_temperature": f"{sat_data.get('temperature', 25)}°C"
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

@router.post("/train-soc")
async def train_soc_calibration(
    request: SocTrainingRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Accepts physical ground-truthed Soil Organic Carbon (SOC) data points.
    It fetches REAL historical bioclimatic data (Moisture, ET) from Open-Meteo for each point,
    then trains a custom Multiple Linear Regression model for this specific farm.
    Builds the equation: SOC = (m1 * Moisture) + (m2 * ET) + Intercept
    """
    if len(request.points) < 2:
        return {"error": "At least 2 unique physical data points are required to train the model."}
        
    bioclimatic_array = []
    soc_array = []
    
    # Track averages for the AI prompt
    total_moisture = 0
    total_et = 0
    
    # 1. Match Physical Data to Real Bioclimatic Data
    for point in request.points:
        # Get historical soil moisture and ET from Open-Meteo
        climate_data = get_bioclimatic_data(point.lat, point.lng)
        
        moisture = climate_data.get("soil_moisture", 25.0)
        et = climate_data.get("evapotranspiration", 4.0)
        
        bioclimatic_array.append([moisture, et])
        soc_array.append(point.soc_value)
        
        total_moisture += moisture
        total_et += et
        
    print(f"Training SOC Model. X (Bioclimatic): {bioclimatic_array}, y (SOC): {soc_array}")
    
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

        return {
            "success": True,
            "model": model_result,
            "data_points": {
                "bioclimatic_values": bioclimatic_array,
                "soc_values": soc_array
            },
            "ai_insights": ai_insights
        }
    except Exception as e:
        return {"error": f"Failed to train SOC Multiple Linear Regression: {e}"}

class ChatRequest(BaseModel):
    message: str

@router.post("/chat")
async def ai_chat(
    request: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    
    try:
        # 1. Fetch History (Last 5 messages)
        history = db.query(ChatMessage).filter(ChatMessage.user_id == current_user.id).order_by(ChatMessage.timestamp.desc()).limit(5).all()
        history.reverse()
        
        # 2. RAG Retrieval — search the real corpus (688KB agriculture knowledge base)
        rag_context = ""
        try:
            engine = get_rag_engine()
            rag_results = engine.search(request.message, top_k=3, alpha=0.6)
            if rag_results:
                rag_context = "\n--- Verified Agricultural Knowledge Base References ---\n"
                for res in rag_results:
                    rag_context += f"• {res['content']}\n"
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

KNOWLEDGE BASE (use these facts to ground your answer — do NOT ignore them):
{rag_context}

INSTRUCTIONS:
1. Answer specifically for the farmer's crops and district.
2. Give actionable, practical advice — not generic text.
3. Cite specific numbers (kg/ha, dosage, timing) when relevant.
4. If the knowledge base has relevant data, ALWAYS use it.
5. Respond ENTIRELY in {user_lang_name}. Do not mix languages.
6. Keep answers concise — 3–5 sentences max unless a detailed list is needed.
"""
        
        chat_history = "\n".join([f"{msg.role}: {msg.text}" for msg in history])
        full_prompt = f"{system_prompt}\nConversation History:\n{chat_history}\n\nFarmer: {request.message}\nKrishi-AI:"

        
        # 3. Call Gemini (Async Wrapper)
        import asyncio
        from concurrent.futures import ThreadPoolExecutor
        
        # Use run_in_executor to prevent blocking the main event loop
        loop = asyncio.get_event_loop()
        answer = await loop.run_in_executor(None, lambda: _generate_chat_response(full_prompt))

        # 4. Save User Message
        user_msg = ChatMessage(user_id=current_user.id, role="user", text=request.message)
        db.add(user_msg)
        
        # 5. Save AI Message
        ai_msg = ChatMessage(user_id=current_user.id, role="model", text=answer)
        db.add(ai_msg)
        
        db.commit()
        
        return {"response": answer}

    except Exception as e:
        import traceback
        traceback.print_exc()
        # Fallback response so user isn't invalid
        return {"response": "I am having trouble connecting to the brain. Please try again or check API keys."}

def _generate_chat_response(prompt):
    """Helper to run blocking Gemini call in thread"""
    model = _get_gemini_model()
    if model is None:
        return "AI chat is unavailable right now because the Gemini dependency is not installed in this Python environment."
    response = model.generate_content(prompt)
    return response.text


@router.post("/diagnose")
async def diagnose_crop(
    file: UploadFile = File(...),
    mode: str = Form("diagnosis"),
    current_user: User = Depends(get_current_user)
):
    content = await file.read()
    image = Image.open(io.BytesIO(content))
    
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
        
    model = _get_gemini_model()
    if model is None:
        return {
            "diagnosis": "AI unavailable",
            "confidence": 0,
            "summary": "Gemini image analysis is not available because the required Python package is missing.",
            "health_score": 0,
            "remedies": []
        }

    response = model.generate_content([prompt, image])
    
    try:
        import json
        import re
        # Clean markdown code blocks if present
        cleaned = re.sub(r'```json|```', '', response.text).strip()
        analysis = json.loads(cleaned)
        return analysis
    except:
        # Fallback if JSON parsing fails
        return {
            "diagnosis": "Analysis Failed",
            "confidence": 0,
            "summary": "Could not parse AI response. Raw: " + response.text[:50] + "...",
            "healthScore": 0,
            "remedies": []
        }
