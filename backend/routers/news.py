from fastapi import APIRouter, HTTPException
import os
import google.generativeai as genai
from pydantic import BaseModel

router = APIRouter(prefix="/api/news", tags=["news"])

class NewsRequest(BaseModel):
    district: str = "Maharashtra"
    language: str = "English"

@router.post("/")
async def get_news(request: NewsRequest):
    try:
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
             # Fallback if no API key
             return {"news": "Market prices for Soybeans are up by 4% in Nagpur mandi due to export demand. Cloudy weather expected in Vidarbha region."}
             
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        prompt = f"Find the 2 most important agricultural news or price trends for {request.district} today. Keep it short and in {request.language}. Return only the text."
        
        response = model.generate_content(prompt)
        return {"news": response.text}
    except Exception as e:
        print(f"News fetch error: {e}")
        return {"news": "Market insights currently unavailable. Please check back later."}
