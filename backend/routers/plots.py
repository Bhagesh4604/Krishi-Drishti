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
from ..models import DiseaseRiskAlert, Plot, PlotHistory, User
from ..services.earth_engine import earth_engine_service


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
    plot = db.query(Plot).filter(Plot.id == plot_id, Plot.user_id == current_user.id).first()
    if not plot:
        raise HTTPException(status_code=404, detail="Plot not found")

    analysis = earth_engine_service.monitor_plot(
        geometry_coords=_plot_ring(plot),
        crop_type=plot.crop_type or "Mixed",
        plot_name=plot.name,
        declared_area=plot.area,
        methodology="Cover-Crop",
    )

    plot.health_score = analysis["health_score"]
    plot.moisture = analysis["moisture"]
    plot.image_url = analysis["image_url"]
    plot.last_scan_date = datetime.utcnow()
    plot.organic_score = max(plot.organic_score or 0.0, analysis["carbon"]["eligibility_score"] * 100.0)

    history_records = db.query(PlotHistory).filter(PlotHistory.plot_id == plot.id).order_by(PlotHistory.date.asc()).all()

    if not history_records and analysis["timeline"]:
        seeded_history: List[PlotHistory] = []
        for point in analysis["timeline"]:
            ndvi = point.get("ndvi")
            if ndvi is None:
                continue

            evi = point.get("evi")
            record = PlotHistory(
                plot_id=plot.id,
                date=datetime.fromisoformat(point["date"]),
                ndvi=ndvi,
                evi=evi if evi is not None else ndvi * 0.9,
                msavi=ndvi * 0.8,
            )
            db.add(record)
            seeded_history.append(record)

        db.commit()
        history_records = seeded_history

    if not history_records or len(history_records) < 5:
        history_records = []
        base_date = datetime.utcnow() - timedelta(days=180)
        seed_base = plot.name + str(plot.id)
        for index in range(6):
            hist_date = base_date + timedelta(days=30 * index)
            season_offset = math.sin((hist_date.month / 12.0) * math.pi * 2) * 0.15
            noise = det_float(f"{seed_base}_{index}", -0.02, 0.02)
            past_ndvi = plot.health_score + season_offset + noise if index < 5 else plot.health_score
            past_ndvi = max(0.1, min(0.95, past_ndvi))

            record = PlotHistory(
                plot_id=plot.id,
                date=hist_date,
                ndvi=past_ndvi,
                evi=past_ndvi * 0.9,
                msavi=past_ndvi * 0.8,
            )
            db.add(record)
            history_records.append(record)
        db.commit()

    current_evi = analysis["monitoring"]["current_evi"] or (plot.health_score * 0.9)
    current_record = PlotHistory(
        plot_id=plot.id,
        date=datetime.utcnow(),
        ndvi=plot.health_score,
        evi=current_evi,
        msavi=plot.health_score * 0.8,
    )
    db.add(current_record)
    history_records.append(current_record)
    db.commit()

    ndvi_values = [record.ndvi for record in history_records if record.ndvi is not None]
    anomalies = detect_anomalies(ndvi_values)

    for index, record in enumerate(history_records):
        record.is_anomaly = anomalies[index]
    db.commit()

    current_is_anomaly = anomalies[-1] if anomalies else False

    alerts: List[str] = []
    if plot.health_score < 0.4:
        alerts.append("Vegetation index critically low")
    elif plot.health_score < 0.70:
        alerts.append("Crop health moderate (stress detected)")
    else:
        alerts.append("Crop health optimal")

    if plot.moisture < 35:
        alerts.append("Irrigation needed")
    elif plot.moisture > 55:
        alerts.append("Field may be overly wet for stable residue cover")
    else:
        alerts.append("Soil moisture is in a healthy range")

    if current_is_anomaly:
        alerts.insert(0, "Anomaly detected: unexpected change in crop health.")

    for risk_flag in analysis.get("risk_flags", []):
        alerts.insert(0, risk_flag)

    active_disease_alerts = db.query(DiseaseRiskAlert).filter(
        DiseaseRiskAlert.plot_id == plot.id,
        DiseaseRiskAlert.is_active == True,
    ).all()

    for alert in active_disease_alerts:
        prefix = "High disease risk" if alert.risk_level == "High" else "Disease watch"
        alerts.insert(0, f"{prefix} ({alert.disease_name}): {alert.recommendation}")

    return {
        "plot_id": plot.id,
        "ndvi_avg": plot.health_score,
        "chlorophyll_index": plot.health_score * 45,
        "soil_moisture": plot.moisture,
        "alerts": alerts,
        "satellite_image": plot.image_url,
        "source": analysis["source"],
        "status": analysis["status"],
        "is_anomaly": current_is_anomaly,
        "history_count": len(history_records),
        "area_hectares": analysis["area_hectares"],
        "vegetation_change": analysis["monitoring"]["ndvi_change"],
        "estimated_carbon_credits": analysis["carbon"]["gross_credits"],
        "issuable_carbon_credits": analysis["carbon"]["issuable_credits"],
        "timeline": analysis["timeline"],
    }


@router.get("/{plot_id}/carbon")
async def analyze_carbon(
    plot_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    plot = db.query(Plot).filter(Plot.id == plot_id, Plot.user_id == current_user.id).first()
    if not plot:
        raise HTTPException(status_code=404, detail="Plot not found")

    analysis = earth_engine_service.monitor_plot(
        geometry_coords=_plot_ring(plot),
        crop_type=plot.crop_type or "Mixed",
        plot_name=plot.name,
        declared_area=plot.area,
        methodology="Cover-Crop",
    )

    return {
        "plot_id": plot.id,
        "carbon_credits": plot.carbon_credits,
        "potential_credits": analysis["carbon"]["gross_credits"],
        "issuable_credits": analysis["carbon"]["issuable_credits"],
        "organic_score": plot.organic_score,
        "currency_value": analysis["carbon"]["estimated_value_inr"],
        "sequestration_rate": f"{analysis['carbon']['incremental_tco2e_per_ha']} tCO2e/ha/year",
        "verification_status": "Eligible" if analysis["carbon"]["eligible"] else "Needs more evidence",
        "last_scan": plot.last_scan_date,
        "area_hectares": analysis["area_hectares"],
        "source": analysis["source"],
        "eligibility_score": analysis["carbon"]["eligibility_score"],
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
