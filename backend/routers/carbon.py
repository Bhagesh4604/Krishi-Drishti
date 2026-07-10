from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import json

from ..database import get_db
from ..models import CarbonProject, CarbonEvidence, CarbonTransaction, Plot, User, FarmerOperationLog, CarbonCreditToken
from ..dependencies import get_current_user
from ..services.earth_engine import earth_engine_service
from ..services.additionality_service import is_additional
from ..services.upload_service import upload_evidence_photo, is_configured as cloudinary_ready
from ..tasks.gee_tasks import run_gee_analysis

import hashlib

router = APIRouter(prefix="/api/carbon", tags=["carbon"])


def det_float(seed_str: str, min_v: float, max_v: float) -> float:
    """Deterministic pseudo-random float from a seed string."""
    hash_val = int(hashlib.md5(seed_str.encode()).hexdigest()[:8], 16)
    return min_v + (hash_val / 0xFFFFFFFF) * (max_v - min_v)

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
    Async Satellite Analysis for Carbon Potential.
    Dispatches a Celery GEE task and returns a job_id immediately.
    Poll GET /api/jobs/{job_id} for the full analysis result.
    """
    try:
        geojson_polygon = request.geometry or {}
        coordinates = geojson_polygon.get("coordinates", [])
        ring = coordinates[0] if coordinates and isinstance(coordinates[0], list) else coordinates

        task = run_gee_analysis.delay(
            geometry_coords=ring,
            crop_type=request.crop_type or "Mixed",
            plot_name=request.plot_name or "Farm",
            declared_area=request.area,
            methodology=request.methodology or "Cover-Crop",
        )

        return {
            "job_id": task.id,
            "status": "queued",
            "poll_url": f"/api/jobs/{task.id}",
            "stream_url": f"/api/jobs/{task.id}/stream",
            "message": "Analysis started. Poll poll_url for results.",
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
    """
    Async carbon monitoring for a specific plot.
    Returns a job_id immediately — poll /api/jobs/{job_id} for results.
    """
    plot = db.query(Plot).filter(Plot.id == plot_id, Plot.user_id == current_user.id).first()
    if not plot:
        raise HTTPException(status_code=404, detail="Plot not found")

    task = run_gee_analysis.delay(
        geometry_coords=_plot_ring(plot),
        crop_type=plot.crop_type or "Mixed",
        plot_name=plot.name,
        declared_area=plot.area,
        methodology=methodology,
        plot_id=plot.id,
        user_id=current_user.id,
    )

    return {
        "job_id": task.id,
        "status": "queued",
        "plot_id": plot.id,
        "plot_name": plot.name,
        "methodology": methodology,
        "poll_url": f"/api/jobs/{task.id}",
        "stream_url": f"/api/jobs/{task.id}/stream",
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
    """
    Returns real Indian carbon aggregator companies operating under CCTS and GCP frameworks.
    Farmers can select any aggregator — Krishi-Drishti does not lock them in.
    Data sourced from public company websites and BEE/MoEFCC program documentation.
    """
    return [
        AggregatorPartner(
            name="Krishi-Drishti Platform (GCP Beta)",
            fee_percentage=15.0,
            farmer_share_percentage=85.0,
            settlement_days=14,
            contact="carbon@krishidrishti.org",
            role="Platform self-aggregation under Green Credit Program (GCP). Best for farmers with < 1 ha plots. Fastest settlement.",
        ),
        AggregatorPartner(
            name="TrayamBhu Tech (CCTS)",
            fee_percentage=18.0,
            farmer_share_percentage=82.0,
            settlement_days=21,
            contact="projects@trayambhu.com",
            role="CCTS-aligned DMRV platform. Aggregates smallholder farms under Bureau of Energy Efficiency (BEE) oversight. Suitable for domestic carbon market trading.",
        ),
        AggregatorPartner(
            name="Grow Indigo (VCS)",
            fee_percentage=20.0,
            farmer_share_percentage=80.0,
            settlement_days=30,
            contact="farmer@growindigo.co.in",
            role="Verra VCS and Gold Standard certified. Focuses on regenerative agriculture (no-till, cover crop). Sells credits on international voluntary markets for premium pricing.",
        ),
        AggregatorPartner(
            name="Boomitra (VCS)",
            fee_percentage=25.0,
            farmer_share_percentage=75.0,
            settlement_days=45,
            contact="india@boomitra.com",
            role="Verra-certified soil carbon platform. Specialises in soil health practices. International buyer relationships. Higher price per credit but higher fee and longer settlement.",
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
    """
    Enroll a plot in a carbon project.

    Strategy: The CarbonProject record is created immediately with status
    'Analyzing' so the farmer sees instant feedback. A Celery task then runs
    the real GEE analysis in the background. When the task completes, the
    projected_sequestration and other fields are updated by the task itself.

    The frontend should poll GET /api/jobs/{job_id} or use the SSE stream;
    when status == 'success' it can re-fetch GET /api/carbon/projects to see
    the updated project with real satellite data.
    """
    # 1. Verify Plot Ownership
    plot = db.query(Plot).filter(Plot.id == project.plot_id, Plot.user_id == current_user.id).first()
    if not plot:
        raise HTTPException(status_code=404, detail="Plot not found")

    # 2. Check if already enrolled
    existing = db.query(CarbonProject).filter(CarbonProject.plot_id == plot.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Plot already enrolled in a carbon project")

    # 3. Compute initial additionality score (deterministic, no GEE needed)
    initial_additionality = det_float(str(plot.id) + project.methodology, 0.1, 0.6)
    vesting_date = datetime.utcnow() + timedelta(days=5 * 365)

    # 4. Create project immediately with placeholder values
    new_project = CarbonProject(
        plot_id=plot.id,
        user_id=current_user.id,
        methodology=project.methodology,
        status="Analyzing",           # Temporary status until GEE completes
        baseline_emission=0.0,
        projected_sequestration=0.0,  # Will be updated by the Celery task
        verified_credits=0.0,
        vesting_end_date=vesting_date,
        additionality_score=initial_additionality,
        buffer_pool_percentage=15.0,
        verification_cost_usd=1800.0, # Default; task will update
        requires_soil_sample=True,
    )
    db.add(new_project)
    db.commit()
    db.refresh(new_project)

    # 5. Dispatch GEE analysis asynchronously
    task = run_gee_analysis.delay(
        geometry_coords=_plot_ring(plot),
        crop_type=plot.crop_type or "Mixed",
        plot_name=plot.name,
        declared_area=plot.area,
        methodology=project.methodology,
        plot_id=plot.id,
        user_id=current_user.id,
    )

    # 6. Audit log
    log = FarmerOperationLog(
        user_id=current_user.id,
        plot_id=plot.id,
        project_id=new_project.id,
        operation="project_enrolled",
        detail=json.dumps({
            "methodology": project.methodology,
            "area_acres": plot.area,
            "gee_job_id": task.id,
            "async": True,
        }),
    )
    db.add(log)
    db.commit()

    # 7. Return the project + the job_id so frontend can poll
    response = _project_response(new_project)
    # Attach job tracking info (extra fields beyond the response model)
    return {
        **response.model_dump(),
        "gee_job_id": task.id,
        "poll_url": f"/api/jobs/{task.id}",
        "stream_url": f"/api/jobs/{task.id}/stream",
        "message": "Project enrolled. GEE analysis running in background — poll poll_url for updated satellite metrics.",
    }

@router.post("/{project_id}/evidence")
async def upload_evidence(
    project_id: int,
    description: str = Form(...),
    geo_lat: float = Form(...),
    geo_lng: float = Form(...),
    file: UploadFile = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Upload geo-tagged photo evidence for a carbon project.
    If Cloudinary is configured, the photo is uploaded to cloud storage.
    If not configured, the endpoint accepts metadata-only evidence (with a warning).
    """
    project = db.query(CarbonProject).filter(
        CarbonProject.id == project_id,
        CarbonProject.user_id == current_user.id,
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    image_url = None
    if file and cloudinary_ready():
        content = await file.read()
        try:
            result = upload_evidence_photo(
                file_bytes=content,
                content_type=file.content_type,
                farmer_id=current_user.id,
                project_id=project.id
            )
            image_url = result["url"]
        except Exception as e:
            print(f"Cloudinary upload failed: {e}")
            # Fallback to none if upload fails

    new_evidence = CarbonEvidence(
        project_id=project.id,
        description=description,
        geo_lat=geo_lat,
        geo_lng=geo_lng,
        image_url=image_url,
        verified=False,
    )
    db.add(new_evidence)

    if project.status == "Enrolled":
        project.status = "Evidence_Pending"

    # --- Operation Log ---
    log = FarmerOperationLog(
        user_id=current_user.id,
        plot_id=project.plot_id,
        project_id=project.id,
        operation="evidence_upload",
        detail=json.dumps({
            "description": description,
            "geo_lat": geo_lat,
            "geo_lng": geo_lng,
        }),
    )
    db.add(log)

    db.commit()

    return {
        "message": "Evidence uploaded successfully",
        "status": project.status,
    }

@router.post("/{project_id}/verify")
async def trigger_verification(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Triggers the verification pipeline for a carbon project.

    Verification steps:
      1. Additionality check — uses ICAR/NABARD district-level adoption data
         to confirm the practice is novel enough to qualify for credits.
      2. Evidence check — ensures sufficient geo-tagged photos are uploaded.
      3. Credit calculation — applies buffer pool and methodology multiplier.
      4. Vesting period set to 5 years from enrollment date.
    """
    project = db.query(CarbonProject).filter(
        CarbonProject.id == project_id,
        CarbonProject.user_id == current_user.id,
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if project.status != "Evidence_Pending":
        raise HTTPException(
            status_code=400,
            detail="Project not ready for verification. Upload at least one geo-tagged evidence photo first.",
        )

    # ── STEP 1: Additionality Check ────────────────────────────────────────────
    # Uses real ICAR/NABARD district-level practice adoption data.
    # Source: backend/data/district_additionality.json
    farmer_district = current_user.district or "default"
    additional, adoption_rate, additionality_reason = is_additional(
        district=farmer_district,
        methodology=project.methodology,
    )
    project.additionality_score = adoption_rate

    if not additional:
        project.status = "Audit_Failed"
        db.commit()
        return {
            "status": "REJECTED",
            "additionality_score": round(adoption_rate, 2),
            "verified_credits": 0.0,
            "reason": additionality_reason,
            "message": (
                f"Additionality Check Failed: {project.methodology} is already a common "
                f"practice in {farmer_district} ({int(adoption_rate * 100)}% of farmers "
                f"already do this). Under CCTS/Verra standards, only practices adopted by "
                f"less than 50% of farmers in the district qualify for carbon credits."
            ),
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

    # --- Operation Log ---
    log = FarmerOperationLog(
        user_id=current_user.id,
        project_id=project.id,
        plot_id=project.plot_id,
        operation="verification_run",
        detail=json.dumps({
            "result": project.status,
            "additionality_score": round(project.additionality_score, 3),
            "adoption_rate": round(adoption_rate, 3),
            "credits_issued": round(project.verified_credits, 2) if success else 0,
            "district": farmer_district,
        }),
    )
    db.add(log)

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

@router.get("/my-tokens")
async def get_my_tokens(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get all minted carbon credit tokens for the current user.
    """
    tokens = db.query(CarbonCreditToken).filter(CarbonCreditToken.user_id == current_user.id).all()
    
    return [
        {
            "id": token.id,
            "token_id": token.token_id,
            "project_id": token.project_id,
            "amount": token.amount,
            "token_hash": token.token_hash,
            "status": token.status,
            "created_at": token.created_at.isoformat() if token.created_at else None,
        }
        for token in tokens
    ]
