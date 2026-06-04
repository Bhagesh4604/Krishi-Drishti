from datetime import datetime, timedelta
import hashlib
import json
import math
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database import get_db
from ..dependencies import get_current_user
from ..ml_models.anomaly_detector import detect_anomalies
from ..models import DiseaseRiskAlert, FarmerOperationLog, Plot, PlotHistory, User
from ..services.earth_engine import earth_engine_service
from ..tasks.gee_tasks import run_gee_analysis


def det_float(seed_str: str, min_v: float, max_v: float) -> float:
    hash_val = int(hashlib.md5(seed_str.encode()).hexdigest()[:8], 16)
    return min_v + (hash_val / 0xFFFFFFFF) * (max_v - min_v)


router = APIRouter(prefix="/api/plots", tags=["plots"])


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


def _parse_coordinates(plot: Plot) -> List[dict]:
    try:
        return json.loads(plot.coordinates)
    except Exception:
        return []


def _plot_ring(plot: Plot) -> List[List[float]]:
    coords = _parse_coordinates(plot)
    ring = [[coord["lng"], coord["lat"]] for coord in coords if "lat" in coord and "lng" in coord]
    if ring and ring[0] != ring[-1]:
        ring.append(ring[0])
    return ring


@router.get("/", response_model=List[PlotResponse])
async def get_my_plots(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    plots = db.query(Plot).filter(Plot.user_id == current_user.id).all()

    results: List[PlotResponse] = []
    for plot in plots:
        results.append(
            PlotResponse(
                id=plot.id,
                name=plot.name,
                coordinates=_parse_coordinates(plot),
                area=plot.area,
                crop_type=plot.crop_type,
                health_score=plot.health_score,
                moisture=plot.moisture,
                created_at=plot.created_at.isoformat(),
                image_url=plot.image_url,
                last_scan_date=plot.last_scan_date,
            )
        )
    return results


@router.post("/", response_model=PlotResponse, status_code=status.HTTP_201_CREATED)
async def create_plot(
    plot: PlotCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    print(f"Creating Plot: {plot.name}")
    try:
        try:
            coords_list = [coord.model_dump() for coord in plot.coordinates]
        except AttributeError:
            coords_list = [coord.dict() for coord in plot.coordinates]

        coords_json = json.dumps(coords_list)
        base_health = 0.75 if (plot.crop_type or "").lower() == "cotton" else 0.85
        polygon_id = f"gee_{int(det_float(plot.name + str(current_user.id), 10000, 99999))}"

        new_plot = Plot(
            user_id=current_user.id,
            name=plot.name,
            coordinates=coords_json,
            area=plot.area,
            crop_type=plot.crop_type,
            health_score=base_health,
            moisture=det_float(coords_json, 25.0, 45.0),
            polygon_id=polygon_id,
            image_url=None,
        )
    except Exception as exc:
        print(f"CREATE PLOT ERROR: {exc}")
        raise HTTPException(status_code=500, detail=f"Server Error: {str(exc)}")

    db.add(new_plot)
    db.commit()
    db.refresh(new_plot)

    # --- Operation Log ---
    log = FarmerOperationLog(
        user_id=current_user.id,
        plot_id=new_plot.id,
        operation="plot_created",
        detail=json.dumps({"name": new_plot.name, "area_acres": new_plot.area, "crop_type": new_plot.crop_type}),
    )
    db.add(log)
    db.commit()

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
        last_scan_date=new_plot.last_scan_date,
    )


@router.get("/{plot_id}/analyze")
async def analyze_plot(
    plot_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Triggers an asynchronous GEE analysis for the plot.

    Returns immediately with a job_id. Poll GET /api/jobs/{job_id} every
    2-3 seconds until status == 'success', then read the 'result' field.
    Alternatively, connect to GET /api/jobs/{job_id}/stream for SSE push.
    """
    plot = db.query(Plot).filter(Plot.id == plot_id, Plot.user_id == current_user.id).first()
    if not plot:
        raise HTTPException(status_code=404, detail="Plot not found")

    ring = _plot_ring(plot)

    task = run_gee_analysis.delay(
        geometry_coords=ring,
        crop_type=plot.crop_type or "Mixed",
        plot_name=plot.name,
        declared_area=plot.area,
        methodology="Cover-Crop",
        plot_id=plot.id,
        user_id=current_user.id,
    )

    return {
        "job_id": task.id,
        "status": "queued",
        "plot_id": plot.id,
        "plot_name": plot.name,
        "poll_url": f"/api/jobs/{task.id}",
        "stream_url": f"/api/jobs/{task.id}/stream",
        "message": "GEE analysis started. Poll poll_url or connect to stream_url for live results.",
    }


@router.get("/{plot_id}/carbon")
async def analyze_carbon(
    plot_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Triggers an async GEE carbon analysis for the plot.
    Returns immediately with a job_id — poll /api/jobs/{job_id} for results.
    """
    plot = db.query(Plot).filter(Plot.id == plot_id, Plot.user_id == current_user.id).first()
    if not plot:
        raise HTTPException(status_code=404, detail="Plot not found")

    task = run_gee_analysis.delay(
        geometry_coords=_plot_ring(plot),
        crop_type=plot.crop_type or "Mixed",
        plot_name=plot.name,
        declared_area=plot.area,
        methodology="Cover-Crop",
        plot_id=plot.id,
        user_id=current_user.id,
    )

    return {
        "job_id": task.id,
        "status": "queued",
        "plot_id": plot.id,
        "plot_name": plot.name,
        "poll_url": f"/api/jobs/{task.id}",
        "stream_url": f"/api/jobs/{task.id}/stream",
        "carbon_credits_cached": plot.carbon_credits,
        "organic_score_cached": plot.organic_score,
        "last_scan": plot.last_scan_date,
        "message": "Carbon analysis started. Cached values are shown above; poll poll_url for fresh satellite data.",
    }


@router.get("/{plot_id}/yield-forecast")
async def forecast_yield(
    plot_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    plot = db.query(Plot).filter(Plot.id == plot_id, Plot.user_id == current_user.id).first()
    if not plot:
        raise HTTPException(status_code=404, detail="Plot not found")

    from ..ml_models.yield_predictor import predict_yield

    predicted_yield = predict_yield(
        health_score=plot.health_score,
        moisture=plot.moisture,
        crop_type=plot.crop_type,
    )

    prices = {
        "wheat": 25000,
        "rice": 30000,
        "cotton": 60000,
        "potato": 12000,
        "tomato": 15000,
        "mixed": 20000,
    }
    crop_str = plot.crop_type.lower() if plot.crop_type else "mixed"

    base_price = 20000
    for key, value in prices.items():
        if key in crop_str:
            base_price = value
            break

    quality_multiplier = 1.0 + ((plot.organic_score or 0) / 100.0) * 0.15
    price_per_ton = base_price * quality_multiplier

    area_ha = plot.area / 2.471
    total_yield = round(predicted_yield * area_ha, 2)
    estimated_revenue = round(total_yield * price_per_ton, 2)
    confidence = min(95, 70 + (plot.health_score * 15) + ((plot.organic_score or 0) / 10))

    return {
        "plot_id": plot.id,
        "crop_type": plot.crop_type,
        "predicted_yield_tons_per_ha": predicted_yield,
        "total_estimated_yield_tons": total_yield,
        "estimated_revenue_inr": estimated_revenue,
        "confidence_score": round(confidence, 1),
    }
