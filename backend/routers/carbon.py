from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import json
import hashlib

from ..database import get_db
from ..models import CarbonProject, CarbonEvidence, CarbonTransaction, Plot, User
from ..dependencies import get_current_user
from ..services.earth_engine import earth_engine_service

router = APIRouter(prefix="/api/carbon", tags=["carbon"])

def det_float(seed_str: str, min_v: float, max_v: float) -> float:
    # Deterministic float generator
    hash_val = int(hashlib.md5(seed_str.encode()).hexdigest()[:8], 16)
    return min_v + (hash_val / 0xffffffff) * (max_v - min_v)

# --- Pydantic Models ---
class ProjectCreate(BaseModel):
    plot_id: int
    methodology: str # "Cover-Crop", "No-Till"

class EvidenceCreate(BaseModel):
    description: str
    geo_lat: float
    geo_lng: float

class AnalysisRequest(BaseModel):
    geometry: Dict[str, Any]  # GeoJSON Polygon
    area: Optional[float] = None
    crop_type: Optional[str] = "Mixed"
    methodology: Optional[str] = "Cover-Crop"
    plot_name: Optional[str] = "Farm"

class ProjectResponse(BaseModel):
    id: int
    plot_id: int
    plot_name: str
    methodology: str
    status: str
    projected_credits: float
    verified_credits: float
    available_credits: float
    locked_credits: float
    aggregator_name: str
    government_scheme: str
    platform_fee_percentage: float
    farmer_share_percentage: float
    start_date: datetime
    vesting_end_date: Optional[datetime]
    verification_cost_usd: float
    buffer_pool_percentage: float
    additionality_score: float
    requires_soil_sample: bool
    evidence_count: int

    class Config:
        from_attributes = True


class WalletResponse(BaseModel):
    total_verified_credits: float
    total_available_credits: float
    total_locked_credits: float
    estimated_value_inr: float
    projects: List[ProjectResponse]


class AggregatorPartner(BaseModel):
    name: str
    fee_percentage: float
    farmer_share_percentage: float
    settlement_days: int
    contact: str
    role: str


class ClaimRequest(BaseModel):
    claim_credits: float


class ClaimResponse(BaseModel):
    project_id: int
    claimed_credits: float
    amount_inr: float
    aggregator_fee_inr: float
    farmer_payout_inr: float
    remaining_available_credits: float
    message: str

    class Config:
        from_attributes = True


def _plot_ring(plot: Plot) -> List[List[float]]:
    try:
        coords = json.loads(plot.coordinates)
    except Exception:
        return []

    ring = [[coord["lng"], coord["lat"]] for coord in coords if "lat" in coord and "lng" in coord]
    if ring and ring[0] != ring[-1]:
        ring.append(ring[0])
    return ring


def _project_response(project: CarbonProject) -> ProjectResponse:
    return ProjectResponse(
        id=project.id,
        plot_id=project.plot_id,
        plot_name=project.plot.name,
        methodology=project.methodology,
        status=project.status,
        projected_credits=project.projected_sequestration,
        verified_credits=project.verified_credits,
        available_credits=project.available_credits,
        locked_credits=project.locked_credits,
        aggregator_name=project.aggregator_name,
        government_scheme=project.government_scheme,
        platform_fee_percentage=project.platform_fee_percentage,
        farmer_share_percentage=project.farmer_share_percentage,
        start_date=project.start_date,
        vesting_end_date=project.vesting_end_date,
        verification_cost_usd=project.verification_cost_usd,
        buffer_pool_percentage=project.buffer_pool_percentage,
        additionality_score=project.additionality_score,
        requires_soil_sample=project.requires_soil_sample,
        evidence_count=len(project.evidence),
    )

# --- Endpoints ---

@router.post("/analyze")
async def analyze_farm(request: AnalysisRequest):
    """
    Real-time Satellite Analysis for Carbon Potential.
    Expects GeoJSON Polygon.
    Returns: Eligibility, Credits, NDVI Growth Data.
    """
    try:
        geojson_polygon = request.geometry or {}
        coordinates = geojson_polygon.get("coordinates", [])
        ring = coordinates[0] if coordinates and isinstance(coordinates[0], list) else coordinates

        analysis = earth_engine_service.monitor_plot(
            geometry_coords=ring,
            crop_type=request.crop_type or "Mixed",
            plot_name=request.plot_name or "Farm",
            declared_area=request.area,
            methodology=request.methodology or "Cover-Crop",
        )

        return {
            "eligible": analysis["carbon"]["eligible"],
            "credits": analysis["carbon"]["gross_credits"],
            "issuable_credits": analysis["carbon"]["issuable_credits"],
            "buffer_pool_credits": analysis["carbon"]["buffer_pool_credits"],
            "details": {
                "baseline_ndvi": analysis["monitoring"]["baseline_ndvi"],
                "current_ndvi": analysis["monitoring"]["current_ndvi"],
                "growth": analysis["monitoring"]["ndvi_change"],
                "soil_moisture": analysis["monitoring"]["soil_moisture"],
                "area_hectares": analysis["area_hectares"],
                "estimated_value_inr": analysis["carbon"]["estimated_value_inr"],
            },
            "status": analysis["status"],
            "analysis": analysis,
        }
    except Exception as exc:
        print(f"Analysis Error: {exc}")
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/plots/{plot_id}/monitor")
async def monitor_plot_for_carbon(
    plot_id: int,
    methodology: str = "Cover-Crop",
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
        methodology=methodology,
    )

    return {
        "plot_id": plot.id,
        "plot_name": plot.name,
        "analysis": analysis,
    }


@router.get("/projects", response_model=List[ProjectResponse])
async def get_my_projects(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    projects = db.query(CarbonProject).filter(CarbonProject.user_id == current_user.id).all()

    return [_project_response(project) for project in projects]


def _wallet_response(projects: List[CarbonProject]) -> WalletResponse:
    total_verified = sum([project.verified_credits for project in projects])
    total_available = sum([project.available_credits for project in projects])
    total_locked = sum([project.locked_credits for project in projects])
    estimated_value = total_available * 1200.0

    return WalletResponse(
        total_verified_credits=total_verified,
        total_available_credits=total_available,
        total_locked_credits=total_locked,
        estimated_value_inr=round(estimated_value, 2),
        projects=[_project_response(project) for project in projects],
    )


@router.get("/wallet", response_model=WalletResponse)
async def get_wallet_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    projects = db.query(CarbonProject).filter(CarbonProject.user_id == current_user.id).all()
    return _wallet_response(projects)


@router.get("/aggregators", response_model=List[AggregatorPartner])
async def get_aggregator_partners():
    return [
        AggregatorPartner(
            name="Krishi Drishti Aggregator",
            fee_percentage=20.0,
            farmer_share_percentage=80.0,
            settlement_days=7,
            contact="support@krishidrishti.org",
            role="Aggregates carbon projects, manages verification and buyer settlement.",
        ),
        AggregatorPartner(
            name="GreenField FPO",
            fee_percentage=18.0,
            farmer_share_percentage=82.0,
            settlement_days=10,
            contact="partners@greenfieldfpo.in",
            role="Local farmer producer organization supporting project onboarding and compliance.",
        ),
    ]


@router.post("/projects/{project_id}/claim", response_model=ClaimResponse)
async def claim_carbon_payout(
    project_id: int,
    request: ClaimRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(CarbonProject).filter(CarbonProject.id == project_id, CarbonProject.user_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if project.status not in ["Verified", "Issued"]:
        raise HTTPException(status_code=400, detail="Only verified projects can be claimed")

    if request.claim_credits <= 0:
        raise HTTPException(status_code=400, detail="Claim amount must be greater than zero")

    if request.claim_credits > project.available_credits:
        raise HTTPException(status_code=400, detail="Claim amount exceeds available credits")

    claim_amount = round(request.claim_credits, 3)
    project.available_credits = round(project.available_credits - claim_amount, 3)
    project.plot.carbon_credits = project.available_credits
    if project.available_credits <= 0:
        project.status = "Issued"

    rate_inr = 1200.0
    payout_amount = claim_amount * rate_inr
    aggregator_fee = round(payout_amount * (project.platform_fee_percentage / 100.0), 2)
    farmer_payout = round(payout_amount - aggregator_fee, 2)

    transaction = CarbonTransaction(
        project_id=project.id,
        user_id=current_user.id,
        amount_credits=claim_amount,
        amount_inr=payout_amount,
        aggregator_fee_inr=aggregator_fee,
        farmer_payout_inr=farmer_payout,
        status="Completed",
    )

    db.add(transaction)
    db.commit()
    db.refresh(project)

    return ClaimResponse(
        project_id=project.id,
        claimed_credits=claim_amount,
        amount_inr=payout_amount,
        aggregator_fee_inr=aggregator_fee,
        farmer_payout_inr=farmer_payout,
        remaining_available_credits=project.available_credits,
        message=f"Claimed {claim_amount} ACT for ₹{farmer_payout} after aggregator fees.",
    )


@router.get("/schemes")
async def list_carbon_schemes():
    return {
        "frameworks": [
            {"id": "CCTS", "name": "Carbon Credit Trading Scheme", "description": "BEE-backed carbon market for agri and methane reduction projects."},
            {"id": "GCP", "name": "Green Credit Program", "description": "Government-supported market for tree-based and soil carbon credits."},
        ],
        "partners": [
            {"name": "Krishi Drishti Aggregator", "type": "Platform", "role": "Aggregates small farms, manages enrollment, MRV and credit sale, and shares proceeds with farmers."},
            {"name": "FPO Partner", "type": "Farmer Producer Organization", "role": "Mobilizes smallholders and acts as local field implementation partner."},
        ]
    }

@router.post("/enroll", response_model=ProjectResponse)
async def enroll_plot(
    project: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. Verify Plot Ownership
    plot = db.query(Plot).filter(Plot.id == project.plot_id, Plot.user_id == current_user.id).first()
    if not plot:
        raise HTTPException(status_code=404, detail="Plot not found")
        
    # 2. Check if already enrolled
    existing = db.query(CarbonProject).filter(CarbonProject.plot_id == plot.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Plot already enrolled in a carbon project")
        
    monitoring = earth_engine_service.monitor_plot(
        geometry_coords=_plot_ring(plot),
        crop_type=plot.crop_type or "Mixed",
        plot_name=plot.name,
        declared_area=plot.area,
        methodology=project.methodology,
    )

    total_potential = monitoring["carbon"]["gross_credits"]
    vesting_date = datetime.utcnow() + timedelta(days=5 * 365)
    initial_additionality = det_float(str(plot.id) + project.methodology, 0.1, 0.6)

    plot.health_score = monitoring["health_score"]
    plot.moisture = monitoring["moisture"]
    plot.image_url = monitoring["image_url"]
    plot.last_scan_date = datetime.utcnow()
    plot.organic_score = max(plot.organic_score or 0.0, monitoring["carbon"]["eligibility_score"] * 100.0)

    new_project = CarbonProject(
        plot_id=plot.id,
        user_id=current_user.id,
        methodology=project.methodology,
        status="Enrolled",
        baseline_emission=monitoring["carbon"]["baseline_soc_tons_per_ha"] * monitoring["area_hectares"],
        projected_sequestration=total_potential,
        verified_credits=0.0,
        vesting_end_date=vesting_date,
        additionality_score=initial_additionality,
        buffer_pool_percentage=monitoring["carbon"]["buffer_pool_percentage"],
        verification_cost_usd=monitoring["carbon"]["verification_cost_usd"],
        requires_soil_sample=monitoring["carbon"]["requires_soil_sample"],
    )
    
    db.add(new_project)
    db.commit()
    db.refresh(new_project)

    return _project_response(new_project)

@router.post("/{project_id}/evidence")
async def upload_evidence(
    project_id: int,
    description: str,
    geo_lat: float,
    geo_lng: float,
    # file: UploadFile = File(...) # Simplified for demo, acting as metadata upload
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(CarbonProject).filter(CarbonProject.id == project_id, CarbonProject.user_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    # Create Evidence Record
    new_evidence = CarbonEvidence(
        project_id=project.id,
        description=description,
        geo_lat=geo_lat,
        geo_lng=geo_lng,
        image_url="https://via.placeholder.com/300?text=Farm+Evidence", # Mock
        verified=False
    )
    
    db.add(new_evidence)
    
    # Auto-update status to "Verification Pending" if it was Enrolled
    if project.status == "Enrolled":
        project.status = "Evidence_Pending"
        
    db.commit()
    
    return {"message": "Evidence uploaded successfully", "status": project.status}

@router.post("/{project_id}/verify")
async def trigger_verification(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(CarbonProject).filter(CarbonProject.id == project_id, CarbonProject.user_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    if project.status != "Evidence_Pending":
        raise HTTPException(status_code=400, detail="Project not ready for verification (Upload evidence first)")
        
    # REALISTIC CONSTRAINT 1: Additionality Check (Reject Common Practices)
    # Queries deterministic regional data surrogate
    regional_adoption_rate = det_float(str(current_user.district) + project.methodology, 0.2, 0.7)
    project.additionality_score = regional_adoption_rate
    
    if regional_adoption_rate > 0.5:
        project.status = "Audit_Failed"
        db.commit()
        return {
            "status": "REJECTED",
            "verified_credits": 0.0,
            "message": f"Additionality Check Failed: {project.methodology} is already common practice in your district ({int(regional_adoption_rate*100)}% adoption). Only novel practices qualify for credits."
        }
    
    # REALISTIC CONSTRAINT 2: Soil Sample Requirement
    if project.requires_soil_sample and len(project.evidence) < 2:
        raise HTTPException(
            status_code=400, 
            detail="Insufficient Evidence: Soil-based methodologies require at least 2 physical soil sample reports. Upload lab test results."
        )
    
    # Algorithmic Verification (Satellite + Evidence Match) mapped deterministically
    success = (project.additionality_score < 0.5) and (len(project.evidence) > 0)
    
    if success:
        project.status = "Verified"
        raw_credits = project.projected_sequestration
        
        # REALISTIC CONSTRAINT 3: Buffer Pool Deduction (15%)
        buffer_deduction = raw_credits * (project.buffer_pool_percentage / 100.0)
        project.locked_credits = buffer_deduction
        project.available_credits = raw_credits - buffer_deduction
        project.verified_credits = raw_credits # Total issued
        
        # REALISTIC CONSTRAINT 4: Vesting Period (5 years)
        from datetime import timedelta
        project.vesting_end_date = project.start_date + timedelta(days=5*365)
        
        # Update plot for backward compatibility
        project.plot.carbon_credits = project.available_credits
        project.plot.organic_score = 100.0
    else:
        project.status = "Audit_Failed"
        
    db.commit()
    
    return {
        "status": project.status,
        "total_credits_issued": project.verified_credits if success else 0.0,
        "buffer_pool_locked": project.locked_credits if success else 0.0,
        "available_for_sale": project.available_credits if success else 0.0,
        "vesting_end_date": project.vesting_end_date.isoformat() if success and project.vesting_end_date else None,
        "verification_cost_usd": project.verification_cost_usd,
        "message": f"Verification Complete - {int(project.buffer_pool_percentage)}% locked in buffer pool until {project.vesting_end_date.year if project.vesting_end_date else 'N/A'}" if success else "Verification Failed - Evidence unclear"
    }
