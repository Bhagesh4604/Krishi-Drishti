from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta
import hashlib
import math
from pydantic import BaseModel

from ..database import get_db
from ..models import User, Plot, CropCycle, CropCycleEvent
from ..dependencies import get_current_user

router = APIRouter(prefix="/api/cycles", tags=["crop_cycles"])

# Pydantic Schemas
class EventCreate(BaseModel):
    event_type: str  # "Sowing", "Fertilizing", "Weeding", "Irrigation", "Inspection", "Harvest"
    geo_lat: Optional[float] = None
    geo_lng: Optional[float] = None
    notes: Optional[str] = None
    media_url: Optional[str] = None  # Required for Sowing and Harvest

class CycleCreate(BaseModel):
    crop_type: str
    variety: Optional[str] = None

# ─── EVENTS REQUIRING PHOTO PROOF ────────────────────────────────────────────
PHOTO_REQUIRED_EVENTS = {"Sowing", "Harvest"}

def compute_event_hash(event_data: dict, previous_hash: str = "") -> str:
    """Creates a cryptographic hash of the event data to prove immutability."""
    payload = str(event_data) + previous_hash
    return hashlib.sha256(payload.encode('utf-8')).hexdigest()

def haversine_distance_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Calculate great-circle distance between two GPS points in kilometers."""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

def get_plot_center(plot: Plot) -> Optional[tuple]:
    """Returns the centroid of a plot's coordinates."""
    import json
    try:
        coords = json.loads(plot.coordinates)
        if not coords:
            return None
        avg_lat = sum(c["lat"] for c in coords) / len(coords)
        avg_lng = sum(c["lng"] for c in coords) / len(coords)
        return (avg_lat, avg_lng)
    except Exception:
        return None


@router.get("/plot/{plot_id}")
def get_cycles_for_plot(
    plot_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get the active crop cycle and its events for a specific plot."""
    plot = db.query(Plot).filter(Plot.id == plot_id).first()
    if not plot:
        raise HTTPException(status_code=404, detail="Plot not found")

    cycle = db.query(CropCycle).filter(
        CropCycle.plot_id == plot_id
    ).order_by(CropCycle.start_date.desc()).first()

    if not cycle:
        return {"status": "none", "cycle": None, "events": []}

    events = db.query(CropCycleEvent).filter(
        CropCycleEvent.cycle_id == cycle.id
    ).order_by(CropCycleEvent.event_date.asc()).all()

    return {
        "status": "success",
        "cycle": {
            "id": cycle.id,
            "crop_type": cycle.crop_type,
            "variety": cycle.variety,
            "status": cycle.status,
            "start_date": cycle.start_date
        },
        "events": [
            {
                "id": e.id,
                "event_type": e.event_type,
                "event_date": e.event_date,
                "geo_lat": e.geo_lat,
                "geo_lng": e.geo_lng,
                "notes": e.notes,
                "media_url": e.media_url,
                "event_hash": e.event_hash
            } for e in events
        ]
    }

@router.post("/plot/{plot_id}/start")
def start_new_cycle(
    plot_id: int,
    payload: CycleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Start a new crop cycle for a plot."""
    active_cycles = db.query(CropCycle).filter(CropCycle.plot_id == plot_id, CropCycle.status == "Active").all()
    for c in active_cycles:
        c.status = "Harvested"
        c.end_date = datetime.utcnow()

    new_cycle = CropCycle(
        plot_id=plot_id,
        user_id=current_user.id,
        crop_type=payload.crop_type,
        variety=payload.variety,
        status="Active",
        start_date=datetime.utcnow()
    )
    db.add(new_cycle)
    db.commit()
    db.refresh(new_cycle)

    plot = db.query(Plot).filter(Plot.id == plot_id).first()
    if plot:
        plot.crop_type = payload.crop_type
        db.commit()

    return {"status": "success", "cycle_id": new_cycle.id}

@router.post("/{cycle_id}/events")
def log_cycle_event(
    cycle_id: int,
    payload: EventCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Log a new event in the crop timeline with GPS and timestamp."""
    cycle = db.query(CropCycle).filter(CropCycle.id == cycle_id).first()
    if not cycle:
        raise HTTPException(status_code=404, detail="Crop cycle not found")

    if cycle.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    # ─── Upgrade A-1: Photo Proof Requirement ────────────────────────────────
    if payload.event_type in PHOTO_REQUIRED_EVENTS and not payload.media_url:
        raise HTTPException(
            status_code=422,
            detail=f"'{payload.event_type}' events require a photo upload (media_url) "
                   "for carbon credit MRV verification. Please capture a field photo."
        )

    # ─── Upgrade A-2: Duplicate Event Guard (prevents scripted spam) ─────────
    one_hour_ago = datetime.utcnow() - timedelta(hours=1)
    recent_duplicate = db.query(CropCycleEvent).filter(
        CropCycleEvent.cycle_id == cycle_id,
        CropCycleEvent.event_type == payload.event_type,
        CropCycleEvent.event_date >= one_hour_ago
    ).first()
    if recent_duplicate:
        raise HTTPException(
            status_code=429,
            detail=f"A '{payload.event_type}' event was already logged within the last hour. "
                   "Please wait before logging another event of the same type."
        )

    # ─── Upgrade A-3: Server-Side Geofence Check (50 km radius) ─────────────
    is_flagged = False
    plot = db.query(Plot).filter(Plot.id == cycle.plot_id).first()
    if payload.geo_lat is not None and payload.geo_lng is not None and plot:
        center = get_plot_center(plot)
        if center:
            dist_km = haversine_distance_km(
                payload.geo_lat, payload.geo_lng,
                center[0], center[1]
            )
            if dist_km > 50.0:
                raise HTTPException(
                    status_code=422,
                    detail=f"GPS location is {dist_km:.1f} km from the registered plot boundary. "
                           "Maximum allowed distance is 50 km. If you are at the farm, please ensure "
                           "location services are enabled and try again."
                )

    # ─── Upgrade A-4: Time-of-Day Suspect Flagging ───────────────────────────
    current_hour = datetime.utcnow().hour
    if 1 <= current_hour <= 4:
        is_flagged = True  # Events logged at 1–4 AM UTC are suspicious

    # Get previous event to chain hashes
    last_event = db.query(CropCycleEvent).filter(
        CropCycleEvent.cycle_id == cycle_id
    ).order_by(CropCycleEvent.event_date.desc()).first()
    previous_hash = last_event.event_hash if last_event else "GENESIS"

    event_data_dict = {
        "cycle_id": cycle_id,
        "type": payload.event_type,
        "lat": payload.geo_lat,
        "lng": payload.geo_lng,
        "notes": payload.notes,
        "media_url": payload.media_url,
        "timestamp": datetime.utcnow().isoformat(),
        "flagged": is_flagged
    }

    new_hash = compute_event_hash(event_data_dict, previous_hash)

    new_event = CropCycleEvent(
        cycle_id=cycle_id,
        event_type=payload.event_type,
        event_date=datetime.utcnow(),
        geo_lat=payload.geo_lat,
        geo_lng=payload.geo_lng,
        notes=payload.notes,
        media_url=payload.media_url,
        event_hash=new_hash
    )

    db.add(new_event)

    # If harvest, close the cycle
    if payload.event_type == "Harvest":
        cycle.status = "Harvested"
        cycle.end_date = datetime.utcnow()

    db.commit()
    db.refresh(new_event)

    return {
        "status": "success",
        "event_id": new_event.id,
        "hash": new_hash,
        "flagged": is_flagged,
        "warning": "Event logged outside normal farming hours and flagged for audit review." if is_flagged else None
    }


# Pydantic Schemas
class EventCreate(BaseModel):
    event_type: str # "Sowing", "Fertilizing", "Weeding", "Irrigation", "Inspection", "Harvest"
    geo_lat: Optional[float] = None
    geo_lng: Optional[float] = None
    notes: Optional[str] = None
    media_url: Optional[str] = None

class CycleCreate(BaseModel):
    crop_type: str
    variety: Optional[str] = None

def compute_event_hash(event_data: dict, previous_hash: str = "") -> str:
    """Creates a cryptographic hash of the event data to prove immutability"""
    payload = str(event_data) + previous_hash
    return hashlib.sha256(payload.encode('utf-8')).hexdigest()

@router.get("/plot/{plot_id}")
def get_cycles_for_plot(
    plot_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get the active crop cycle and its events for a specific plot."""
    plot = db.query(Plot).filter(Plot.id == plot_id).first()
    if not plot:
        raise HTTPException(status_code=404, detail="Plot not found")
        
    # Get active cycle (or most recent)
    cycle = db.query(CropCycle).filter(
        CropCycle.plot_id == plot_id
    ).order_by(CropCycle.start_date.desc()).first()
    
    if not cycle:
        return {"status": "none", "cycle": None, "events": []}
        
    events = db.query(CropCycleEvent).filter(CropCycleEvent.cycle_id == cycle.id).order_by(CropCycleEvent.event_date.asc()).all()
    
    return {
        "status": "success",
        "cycle": {
            "id": cycle.id,
            "crop_type": cycle.crop_type,
            "variety": cycle.variety,
            "status": cycle.status,
            "start_date": cycle.start_date
        },
        "events": [
            {
                "id": e.id,
                "event_type": e.event_type,
                "event_date": e.event_date,
                "geo_lat": e.geo_lat,
                "geo_lng": e.geo_lng,
                "notes": e.notes,
                "media_url": e.media_url,
                "event_hash": e.event_hash
            } for e in events
        ]
    }

@router.post("/plot/{plot_id}/start")
def start_new_cycle(
    plot_id: int,
    payload: CycleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Start a new crop cycle for a plot."""
    # Complete existing active cycles
    active_cycles = db.query(CropCycle).filter(CropCycle.plot_id == plot_id, CropCycle.status == "Active").all()
    for c in active_cycles:
        c.status = "Harvested"
        c.end_date = datetime.utcnow()
        
    new_cycle = CropCycle(
        plot_id=plot_id,
        user_id=current_user.id,
        crop_type=payload.crop_type,
        variety=payload.variety,
        status="Active",
        start_date=datetime.utcnow()
    )
    db.add(new_cycle)
    db.commit()
    db.refresh(new_cycle)
    
    # Also update the Plot's current crop type
    plot = db.query(Plot).filter(Plot.id == plot_id).first()
    if plot:
        plot.crop_type = payload.crop_type
        db.commit()
        
    return {"status": "success", "cycle_id": new_cycle.id}

@router.post("/{cycle_id}/events")
def log_cycle_event(
    cycle_id: int,
    payload: EventCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Log a new event in the crop timeline with GPS and timestamp."""
    cycle = db.query(CropCycle).filter(CropCycle.id == cycle_id).first()
    if not cycle:
        raise HTTPException(status_code=404, detail="Crop cycle not found")
        
    if cycle.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    # Get previous event to chain hashes
    last_event = db.query(CropCycleEvent).filter(CropCycleEvent.cycle_id == cycle_id).order_by(CropCycleEvent.event_date.desc()).first()
    previous_hash = last_event.event_hash if last_event else "GENESIS"
    
    event_data_dict = {
        "cycle_id": cycle_id,
        "type": payload.event_type,
        "lat": payload.geo_lat,
        "lng": payload.geo_lng,
        "notes": payload.notes,
        "timestamp": datetime.utcnow().isoformat()
    }
    
    new_hash = compute_event_hash(event_data_dict, previous_hash)
    
    new_event = CropCycleEvent(
        cycle_id=cycle_id,
        event_type=payload.event_type,
        event_date=datetime.utcnow(),
        geo_lat=payload.geo_lat,
        geo_lng=payload.geo_lng,
        notes=payload.notes,
        media_url=payload.media_url,
        event_hash=new_hash
    )
    
    db.add(new_event)
    
    # If harvest, close the cycle
    if payload.event_type == "Harvest":
        cycle.status = "Harvested"
        cycle.end_date = datetime.utcnow()
        
    db.commit()
    db.refresh(new_event)
    
    return {"status": "success", "event_id": new_event.id, "hash": new_hash}
