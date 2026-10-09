from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
import os

try:
    from google import genai
except ModuleNotFoundError:
    genai = None

from ..database import get_db
from ..models import Listing, User
from ..dependencies import get_current_user

router = APIRouter(prefix="/api/market", tags=["market"])

class GeminiWrapper:
    def __init__(self, model_name="gemini-2.5-flash"):
        self.model_name = model_name
        self.client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
        
    def generate_content(self, contents):
        return self.client.models.generate_content(
            model=self.model_name,
            contents=contents
        )

def _get_gemini_model():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key or genai is None:
        return None
    return GeminiWrapper()

class ListingCreate(BaseModel):
    crop_name: str
    quantity: str
    price: str
    location: str
    description: Optional[str] = None
    is_organic: bool = False
    image_url: Optional[str] = None

class ListingResponse(BaseModel):
    id: int
    crop_name: str
    quantity: str
    price: str
    location: str
    description: Optional[str]
    is_organic: bool
    image_url: Optional[str]
    grade: str
    seller_name: Optional[str] = None
    seller_phone: Optional[str] = None
    seller_district: Optional[str] = None
    
    class Config:
        from_attributes = True

@router.get("/", response_model=List[ListingResponse])
async def get_listings(
    crop: Optional[str] = None, 
    location: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Listing)
    if crop:
        query = query.filter(Listing.crop_name.ilike(f"%{crop}%"))
    if location:
        query = query.filter(Listing.location.ilike(f"%{location}%"))
    
    listings = query.all()
    # Manual mapping for seller_name to keep Pydantic simple or use joinedload
    results = []
    for l in listings:
        resp = ListingResponse.model_validate(l)
        resp.seller_name = l.seller.name if l.seller else "Unknown"
        resp.seller_phone = l.seller.phone if l.seller else None
        resp.seller_district = l.seller.district if l.seller else None
        results.append(resp)
    return results

@router.post("/", response_model=ListingResponse)
async def create_listing(
    listing: ListingCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        db_listing = Listing(**listing.dict(), seller_id=current_user.id)
        db.add(db_listing)
        db.commit()
        db.refresh(db_listing)
        
        resp = ListingResponse.model_validate(db_listing)
        resp.seller_name = current_user.name
        resp.seller_phone = current_user.phone
        resp.seller_district = current_user.district
        return resp
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")

@router.get("/price-check")
async def check_price(query: str, lat: Optional[float] = None, lng: Optional[float] = None):
    if not query:
        return {"error": "Query required"}

    model = _get_gemini_model()
    if model is None:
        return {
            "text": "Gemini market-price lookup is unavailable right now. Install google-generativeai or configure the AI dependency first.",
            "sources": [],
        }
    
    location_context = ""
    if lat and lng:
        location_context = f"near coordinates {lat}, {lng}"
        
    prompt = f"What is the current market price of {query} in Indian mandis {location_context}? Provide a concise summary with prices specific to the nearest known location/district."
    response = model.generate_content(prompt)
    
    return {"text": response.text, "sources": []} 

import urllib.request
import json

@router.get("/live-prices")
def get_live_prices():
    api_key = os.getenv("DATA_GOV_IN_API_KEY", "579b464db66ec23bdd000001cdd3946e44ce4aad7209ff7b23ac571b")
    url = f'https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070?api-key={api_key}&format=json&limit=50'
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
            return data
    except Exception as e:
        print("Live price proxy error:", e)
        raise HTTPException(status_code=500, detail=f"Failed to fetch live prices from AGMARKNET: {str(e)}")

