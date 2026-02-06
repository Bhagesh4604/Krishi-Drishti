from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
import os
import google.generativeai as genai
from ..database import get_db
from ..models import User
from ..dependencies import get_current_user
import random

router = APIRouter(prefix="/api/finance", tags=["finance"])

@router.get("/status")
async def get_finance_status(current_user: User = Depends(get_current_user)):
    # 1. Calculate Trust Score (Mock Logic based on Profile Completeness in Real DB)
    score = current_user.trust_score
    
    # 2. Get Weather (Simulated Real-time fetch placeholder)
    # In prod: Call OpenWeatherMap API with current_user.district
    rainfall_mm = 112.5 + random.uniform(-5, 5) 
    
    return {
        "trust_score": score,
        "rainfall_mm": rainfall_mm,
        "payout_eligible": rainfall_mm < 100
    }

@router.get("/schemes")
async def recommend_schemes(current_user: User = Depends(get_current_user)):
    api_key = os.getenv("GEMINI_API_KEY")
    genai.configure(api_key=api_key)
    
    profile_summary = f"Farmer in {current_user.district}, Land: {current_user.land_size} acres, Category: {current_user.category}."
    
    model = genai.GenerativeModel('gemini-1.5-flash')
    response = model.generate_content(
        f"Recommend 3 specific government schemes for this Indian farmer: {profile_summary}. Return strictly valid JSON array with keys: name, benefits, link."
    )
    
    # Clean cleanup of markdown json block if present
    text = response.text.replace("```json", "").replace("```", "").strip()
    
    return {"schemes": text} # Frontend parses JSON
