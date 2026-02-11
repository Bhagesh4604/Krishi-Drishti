from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
import os
import google.generativeai as genai
from ..database import get_db
from ..models import Listing, User
from ..dependencies import get_current_user

router = APIRouter(prefix="/api/market", tags=["market"])

class ListingCreate(BaseModel):
    crop_name: str
    quantity: str
    price: str
    location: str
    description: Optional[str] = None
    is_organic: bool = False

class ListingResponse(BaseModel):
    id: int
    crop_name: str
    quantity: str
    price: str
    location: str
    description: Optional[str]
    is_organic: bool
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
    api_key = os.getenv("GEMINI_API_KEY")
    if not query: return {"error": "Query required"}
    
    # Use Gemini with Google Search Tool
    genai.configure(api_key=api_key)
    
    location_context = ""
    if lat and lng:
        location_context = f"near coordinates {lat}, {lng}"
    
    model = genai.GenerativeModel('gemini-1.5-flash')
    response = model.generate_content(
        f"What is the current market price of {query} in Indian mandis {location_context}? Provide a concise summary with prices specific to the nearest known location/district.",
        # tools='google_search_retrieval' # Uncomment if your API key supports it directly in this SDK version
    )
    
    return {"text": response.text, "sources": []} 
