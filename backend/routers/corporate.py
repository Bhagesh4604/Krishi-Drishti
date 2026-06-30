from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from datetime import datetime, timedelta
import math
import json
import random

from ..database import get_db
from ..models import User, Plot
from ..dependencies import get_current_user

router = APIRouter(prefix="/api/corporate", tags=["corporate"])

@router.get("/portfolio")
def get_corporate_portfolio(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns an aggregated bird's-eye view of all farmers/plots in the system,
    simulating a corporate supply chain view for agri-processors.
    In a real app, this would filter by 'corporation_id' or similar.
    """
    
    # 1. Fetch all plots and their associated users
    plots = db.query(Plot).all()
    
    farmers_data = []
    
    now = datetime.utcnow()
    
    for plot in plots:
        user = db.query(User).filter(User.id == plot.user_id).first()
        if not user:
            continue
            
        # Parse coordinates to determine region if possible, or fallback
        region = user.district or "Unknown Region"
        
        # Simulate NDVI and moisture based on plot's health_score (if available)
        # or generate a pseudo-random value based on plot ID for consistency
        seed = float(plot.id)
        ndvi = max(0.15, min(0.85, (math.sin(seed * 7.3) * 0.35) + 0.45))
        if plot.health_score:
            # If the plot actually has a health score saved, lean on it
            ndvi = (plot.health_score + ndvi) / 2
            
        moisture = max(15.0, min(65.0, (math.sin(seed * 2.1) * 25) + 35))
        
        # Determine crop type
        crop = plot.crop_type or "Wheat"
        
        # Estimate days to harvest (pseudo-random between 10 and 90)
        days_to_harvest = int(abs(math.sin(seed * 3.1)) * 80) + 10
        
        # Estimate yield (tons per hectare)
        # Wheat ~3-4, Rice ~4-6, Sugarcane ~60-80
        yield_per_ha = 3.5
        if crop.lower() == "rice" or crop.lower() == "paddy":
            yield_per_ha = 5.0
        elif crop.lower() == "sugarcane":
            yield_per_ha = 70.0
        elif crop.lower() == "cotton":
            yield_per_ha = 1.5
            
        # Adjust yield based on health (NDVI)
        yield_per_ha = yield_per_ha * (ndvi / 0.6)
        
        area_acres = plot.area or 5.0
        area_ha = area_acres * 0.404686
        
        total_yield_tons = round(yield_per_ha * area_ha, 1)
        
        # Simulated last scan date (1 to 5 days ago)
        scan_days_ago = int(abs(math.sin(seed * 1.7)) * 4) + 1
        
        farmers_data.append({
            "id": plot.id,
            "name": user.name or f"Farmer #{user.id}",
            "farmName": plot.name or f"Plot #{plot.id}",
            "region": region,
            "crop": crop,
            "area": round(area_acres, 1),
            "ndvi": round(ndvi, 3),
            "moisture": round(moisture, 1),
            "daysToHarvest": days_to_harvest,
            "estimatedYieldTons": total_yield_tons,
            "lastSatelliteScan": f"{scan_days_ago}d ago",
            "hasAlert": ndvi < 0.35 or moisture < 18.0
        })
        
    # Sort by NDVI descending by default
    farmers_data.sort(key=lambda x: x["ndvi"], reverse=True)
    
    return {
        "status": "success",
        "total_farmers": len(farmers_data),
        "portfolio": farmers_data
    }
