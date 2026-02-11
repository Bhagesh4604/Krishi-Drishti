from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional, Any
from pydantic import BaseModel
from sqlalchemy.orm import Session
from datetime import datetime
from datetime import datetime
import json
# from ..services.agromonitoring import satellite_service as agro_service
from ..services.earth_engine import earth_engine_service
import random

from ..database import get_db
from ..models import Plot, User
from ..dependencies import get_current_user

router = APIRouter(prefix="/api/plots", tags=["plots"])

# --- Pydantic Models ---

class Coordinate(BaseModel):
    lat: float
    lng: float

class PlotCreate(BaseModel):
    name: str
    coordinates: List[Coordinate]
    area: float
    crop_type: Optional[str] = None

class PlotResponse(BaseModel):
    id: int
    name: str
    coordinates: List[Coordinate]
    area: float
    crop_type: Optional[str]
    health_score: float
    moisture: float
    created_at: str
    image_url: Optional[str] = None
    last_scan_date: Optional[datetime] = None

    class Config:
        from_attributes = True

# --- Endpoints ---

@router.get("/", response_model=List[PlotResponse])
async def get_my_plots(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    plots = db.query(Plot).filter(Plot.user_id == current_user.id).all()
    
    # Parse JSON coordinates for response
    results = []
    for p in plots:
        try:
            coords = json.loads(p.coordinates)
        except:
            coords = []
            
        results.append(PlotResponse(
            id=p.id,
            name=p.name,
            coordinates=coords,
            area=p.area,
            crop_type=p.crop_type,
            health_score=p.health_score,
            moisture=p.moisture,
            created_at=p.created_at.isoformat()
        ))
    return results

@router.post("/", response_model=PlotResponse, status_code=status.HTTP_201_CREATED)
async def create_plot(
    plot: PlotCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    print(f"Creating Plot: {plot.name}")
    try:
        # Serialize coordinates (Support Pydantic v1 & v2)
        try:
            coords_list = [c.model_dump() for c in plot.coordinates]
        except AttributeError:
            coords_list = [c.dict() for c in plot.coordinates]
            
        coords_json = json.dumps(coords_list)
        
        # Simulate initial health metrics based on crop
        base_health = 0.85
        if plot.crop_type and plot.crop_type.lower() == "cotton":
            base_health = 0.75 # Just for variety
            
        # Register with Satellite Service (Real or Simulated)
        # GEE doesn't require registration, so we just generate a placeholder ID
        # This ID is legacy from AgroMonitoring but might be useful for caching keys
        polygon_id = f"gee_{random.randint(10000, 99999)}"

        new_plot = Plot(
            user_id=current_user.id,
            name=plot.name,
            coordinates=coords_json,
            area=plot.area,
            crop_type=plot.crop_type,
            health_score=base_health,
            moisture=random.uniform(20.0, 45.0),
            polygon_id=polygon_id,
            image_url=None # Will be populated on first analysis
        )
    except Exception as e:
        print(f"CREATE PLOT ERROR: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Server Error: {str(e)}")
    
    db.add(new_plot)
    db.commit()
    db.refresh(new_plot)
    
    return PlotResponse(
        id=new_plot.id, 
        name=new_plot.name,
        coordinates=plot.coordinates,
        area=new_plot.area,
        crop_type=new_plot.crop_type,
        health_score=new_plot.health_score,
        moisture=new_plot.moisture,
        created_at=new_plot.created_at.isoformat(),
        image_url=new_plot.image_url,
        last_scan_date=new_plot.last_scan_date
    )

@router.get("/{plot_id}/analyze")
async def analyze_plot(
    plot_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    plot = db.query(Plot).filter(Plot.id == plot_id, Plot.user_id == current_user.id).first()
    if not plot:
        raise HTTPException(status_code=404, detail="Plot not found")
        
    # Parse coordinates
    coords = []
    try:
        coords = json.loads(plot.coordinates)
    except:
        pass
        
    # Call Earth Engine Service
    # Note: geo_json in DB is a string, needs parsing
    try:
        coords = json.loads(plot.coordinates)
        # Convert from [{lat, lng}] to [[lng, lat]] for GEE
        gee_coords = [[c['lng'], c['lat']] for c in coords]
        # Close loop
        if gee_coords and gee_coords[0] != gee_coords[-1]:
            gee_coords.append(gee_coords[0])
            
        analysis = earth_engine_service.get_analysis(
            geometry_coords=gee_coords,
            crop_type=plot.crop_type
        )
    except Exception as e:
        print(f"Analysis Failed: {e}")
        analysis = None

    if not analysis or "error" in analysis:
        # Fallback to simulation if GEE fails (e.g. not auth'd)
        print("GEE Failed, using fallback simulation")
        analysis = {
            "health_score": 0.5,
            "moisture": 30.0,
            "image_url": None,
            "source": "Simulation (GEE Failed)"
        }
    
    # Persist Results
    plot.health_score = analysis['health_score']
    plot.moisture = analysis['moisture']
    plot.image_url = analysis['image_url']
    plot.last_scan_date = datetime.utcnow()
    
    # Smart Organic Calculation based on persistent health
    # If health is consistently high, organic score improves
    plot.organic_score = min(100, plot.health_score * 100)
    
    db.commit()

    return {
        "plot_id": plot.id,
        "ndvi_avg": plot.health_score,
        "chlorophyll_index": plot.health_score * 45, 
        "soil_moisture": plot.moisture,
        "alerts": [
            "Vegetation index low" if plot.health_score < 0.4 else "Crop health optimal",
            "Irrigation valid" if plot.moisture > 30 else "Irrigation needed"
        ],
        "satellite_image": plot.image_url,
        "source": analysis['source']
    }

@router.get("/{plot_id}/carbon")
async def analyze_carbon(
    plot_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    plot = db.query(Plot).filter(Plot.id == plot_id, Plot.user_id == current_user.id).first()
    if not plot:
        raise HTTPException(status_code=404, detail="Plot not found")
    
    # Calculate Credit Potential based on Area + Health
    # 1 Credit per Acre for Healthy Crop (>0.7)
    base_rate = 1.0 if plot.health_score > 0.7 else 0.2
    potential_credits = plot.area * base_rate
    
    return {
        "plot_id": plot.id,
        "carbon_credits": plot.carbon_credits,
        "potential_credits": potential_credits,
        "organic_score": plot.organic_score,
        "currency_value": plot.carbon_credits * 1200, 
        "sequestration_rate": f"{round(potential_credits, 2)} tons/season",
        "verification_status": "Verified" if plot.organic_score > 80 else "Pending",
        "last_scan": plot.last_scan_date
    }
