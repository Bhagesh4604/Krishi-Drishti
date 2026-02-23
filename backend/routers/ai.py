from fastapi import APIRouter, Depends, UploadFile, File, Form
from sqlalchemy.orm import Session
from pydantic import BaseModel
import os
import google.generativeai as genai
from PIL import Image
import io
from ..database import get_db
from ..models import ChatMessage, User, StressReport
from ..dependencies import get_current_user
from ..database import get_db
from ..models import ChatMessage, User, StressReport
from ..dependencies import get_current_user
from ..services.satellite import get_real_satellite_data
from ..services.hybrid_search import HybridSearchEngine
from ..services.document_parser import parse_agronomy_pdf

router = APIRouter(prefix="/api/ai", tags=["ai"])

# Global RAG Engine
rag_engine = None

def get_embeddings(texts):
    """Uses Gemini to get embeddings for the FAISS index."""
    import google.generativeai as genai
    embeddings = []
    for text in texts:
        result = genai.embed_content(
            model="models/text-embedding-004",
            content=text,
            task_type="retrieval_document",
        )
        embeddings.append(result['embedding'])
    return embeddings

def init_rag_engine():
    global rag_engine
    if rag_engine is None:
        print("Initializing Advanced RAG Hybrid Search Engine...")
        try:
            rag_engine = HybridSearchEngine(embedding_function=get_embeddings, dimension=768)
            # Add some mock document chunks representing parsed structured tables and text
            mock_docs = [
                "Late Blight is treated with chlorothalonil. Apply at first sign of disease.",
                "AGRONOMIC TABLE DATA:\n Crop | N (kg/ha) | P (kg/ha) | K (kg/ha) \n Wheat | 120 | 60 | 40 \n Potato | 150 | 80 | 100",
                "Optimal soil pH for cotton is between 5.8 and 8.0.",
                "For stem borer in rice, apply Cartap hydrochloride 4G at 18 kg/ha."
            ]
            rag_engine.add_documents(mock_docs)
        except Exception as e:
            print(f"Failed to init RAG: {e}")


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
        api_key = os.getenv("GEMINI_API_KEY")
        if api_key:
            genai.configure(api_key=api_key)
            
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
            
            model = genai.GenerativeModel('gemini-2.5-flash')
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
             print("Warning: GEMINI_API_KEY not found. Using simulation fallback.")
             
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

class ChatRequest(BaseModel):
    message: str

@router.post("/chat")
async def ai_chat(
    request: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    
    try:
        api_key = os.getenv("GEMINI_API_KEY")
        genai.configure(api_key=api_key)
        
        # 1. Fetch History (Last 5 messages)
        history = db.query(ChatMessage).filter(ChatMessage.user_id == current_user.id).order_by(ChatMessage.timestamp.desc()).limit(5).all()
        history.reverse()
        
        # 2. RAG Retrieval via Hybrid Search
        init_rag_engine()
        rag_context = ""
        if rag_engine:
            rag_results = rag_engine.search(request.message, top_k=2, alpha=0.5)
            if rag_results:
                rag_context = "\nVerified Agricultural Database References:\n"
                for res in rag_results:
                     rag_context += f"- {res['content']}\n"
        
        # 3. Construct Prompt
        context = f"User Profile: Name={current_user.name}, Location={current_user.district}, Crops={current_user.farming_type}. "
        chat_history = "\n".join([f"{msg.role}: {msg.text}" for msg in history])
        full_prompt = f"{context}\n{rag_context}\nHistory:\n{chat_history}\n\nUser: {request.message}\nAssistant:"

        
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
    model = genai.GenerativeModel('gemini-2.5-flash')
    response = model.generate_content(prompt)
    return response.text


@router.post("/diagnose")
async def diagnose_crop(
    file: UploadFile = File(...),
    mode: str = Form("diagnosis"),
    current_user: User = Depends(get_current_user)
):
    api_key = os.getenv("GEMINI_API_KEY")
    genai.configure(api_key=api_key)
    
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
        
    model = genai.GenerativeModel('gemini-2.5-flash')
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
