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
from ..services.satellite import get_simulated_satellite_data

router = APIRouter(prefix="/api/ai", tags=["ai"])

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
    # 1. Get Satellite Data (Simulated)
    sat_data = get_simulated_satellite_data(request.lat, request.lng)
    
    # 2. AI Analysis using Gemini
    final_stress = sat_data['stress_level']
    recommendation = sat_data['satellite_analysis']
    
    try:
        api_key = os.getenv("GEMINI_API_KEY")
        if api_key:
            genai.configure(api_key=api_key)
            
            prompt = f"""
            You are an expert agronomist. Analyze the following crop status:
            Crop: {request.crop_type}
            Location: {request.lat}, {request.lng}
            Satellite Data: {sat_data}
            On-Ground Sensor Data: {request.sensor_data}
            
            Provide a concise assessment of the stress level (Low/Medium/High) and specific recommendations for the farmer.
            Format response as JSON: {{ "stress_level": "...", "recommendation": "..." }}
            """
            
            model = genai.GenerativeModel('gemini-1.5-flash')
            response = model.generate_content(prompt)
            
            ai_text = response.text
            
            if "stress_level" in ai_text.lower() and "recommendation" in ai_text.lower():
                import json
                import re
                try:
                    cleaned = re.sub(r'```json|```', '', ai_text).strip()
                    parsed = json.loads(cleaned)
                    final_stress = parsed.get("stress_level", final_stress)
                    recommendation = parsed.get("recommendation", recommendation)
                except:
                    recommendation = ai_text # Fallback to raw text if parsing fails
        else:
             print("Warning: GEMINI_API_KEY not found. Using simulation fallback.")
             
    except Exception as e:
        print(f"AI Analysis Failed: {e}")
        # Continue with satellite fallback
    
    # 3. Save Report
    report = StressReport(
        user_id=current_user.id,
        location_lat=request.lat,
        location_lng=request.lng,
        crop_type=request.crop_type,
        ndvi_score=sat_data['ndvi'],
        stress_level=final_stress,
        recommendation=recommendation
    )
    db.add(report)
    db.commit()
    
    return {
        "satellite_data": sat_data,
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
        
        # 2. Construct Prompt
        context = f"User Profile: Name={current_user.name}, Location={current_user.district}, Crops={current_user.farming_type}. "
        chat_history = "\n".join([f"{msg.role}: {msg.text}" for msg in history])
        full_prompt = f"{context}\n\nHistory:\n{chat_history}\n\nUser: {request.message}\nAssistant:"
        
        # 3. Call Gemini
        model = genai.GenerativeModel('gemini-1.5-flash')
        response = model.generate_content(full_prompt)
        answer = response.text
        
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
    
    prompt = "Analyze this crop image."
    if mode == "diagnosis":
        prompt = "Identify any diseases or pests in this crop. Provide cure and prevention steps."
    elif mode == "grading":
        prompt = "Grade this produce (A/B/C) based on visual quality, shape, and color. Explain why."
        
    model = genai.GenerativeModel('gemini-1.5-flash')
    response = model.generate_content([prompt, image])
    
    return {"analysis": response.text}
