from fastapi import APIRouter, HTTPException, Depends
import os
from pydantic import BaseModel

try:
    from google import genai
except ModuleNotFoundError:
    genai = None

from ..dependencies import get_current_user
from ..models import User

router = APIRouter(prefix="/api/news", tags=["news"])

class NewsRequest(BaseModel):
    district: str
    language: str

@router.post("/")
async def get_local_news(request: NewsRequest, current_user: User = Depends(get_current_user)):
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key or genai is None:
        return {"news": f"[Fallback] Minimum Support Price for Rice increased by 5%. Expected good rainfall in {request.district}."}
        
    try:
        client = genai.Client(api_key=api_key)
        prompt = f"Find the 2 most important agricultural news or price trends for {request.district} today. Keep it short and in {request.language}. Return only the text."
        
        response = client.models.generate_content(
            model='gemini-1.5-flash',
            contents=prompt
        )
        return {"news": response.text}
    except Exception as e:
        print(f"News fetch error: {e}")
        return {"news": "Market insights currently unavailable. Please check back later."}
