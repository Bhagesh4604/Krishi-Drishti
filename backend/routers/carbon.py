from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from datetime import datetime
import json
import math
import hashlib
from ..database import get_db
from ..models import AdminCreditDecision, CarbonProject, CarbonEvidence, CarbonTransaction, Plot, User, FarmerOperationLog, CarbonCreditToken
from ..dependencies import get_current_user
from ..services.earth_engine import earth_engine_service
from ..services.upload_service import upload_evidence_photo, is_configured as cloudinary_ready
from ..services.carbon_verifier import verify_evidence_image
import urllib.request
from ..tasks.gee_tasks import run_gee_analysis
from ..job_store import save_job_result
import uuid
router = APIRouter(prefix="/api/carbon", tags=["carbon"])
# --- Pydantic Models ---
class ProjectCreate(BaseModel):
    plot_id: int
    methodology: str # Farmer-selected practice or programme activity
    intake_data: Dict[str, Any] = Field(default_factory=dict)
class MonitoringRecordRequest(BaseModel):
    record_date: str
    record_type: str
    observations: Dict[str, Any]
    note: Optional[str] = None
class AllocationAcceptanceRequest(BaseModel):
    accepted: bool
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
    projected_credits: Optional[float]
    verified_credits: float
    available_credits: float
    locked_credits: float
    aggregator_name: str
    government_scheme: str
    platform_fee_percentage: Optional[float]
    farmer_share_percentage: Optional[float]
    start_date: datetime
    vesting_end_date: Optional[datetime]
    verification_cost_usd: Optional[float]
    buffer_pool_percentage: Optional[float]
    additionality_score: Optional[float]
    requires_soil_sample: Optional[bool]
    issued_credits: float
    crediting_program: Optional[str]
    methodology_code: Optional[str]
    project_registry_reference: Optional[str]
    project_participant_reference: Optional[str]
    validation_agency: Optional[str]
    validation_report_reference: Optional[str]
    verification_agency: Optional[str]
    verification_report_reference: Optional[str]
    monitoring_period_start: Optional[str]
    monitoring_period_end: Optional[str]
    aggregate_monitoring_report_reference: Optional[str]
    registry_name: Optional[str]
    registry_project_reference: Optional[str]
    registry_issuance_reference: Optional[str]
    registry_serial_reference: Optional[str]
    farmer_allocation_agreement_reference: Optional[str]
    registry_recorded_at: Optional[datetime]
    shared_registry_issue: bool
    workflow_stage: str
    intake_data: Dict[str, Any]
    workflow_history: List[Dict[str, Any]]
    monitoring_records: List[Dict[str, Any]]
    allocation_agreement_reference: Optional[str]
    allocation_confirmed_at: Optional[datetime]
    allocated_credits: float
    credits_sold: float
    credits_transferred: float
    farmer_share_percentage: Optional[float]
    pending_allocation: Optional[Dict[str, Any]]
    farmer_payout_due_inr: float
    farmer_payout_paid_inr: float
    sales: List[Dict[str, Any]]
    payouts: List[Dict[str, Any]]
    transfers: List[Dict[str, Any]]
    evidence_count: int
    class Config:
        from_attributes = True
class WalletResponse(BaseModel):
    total_verified_credits: float
    total_available_credits: float
    total_locked_credits: float
    estimated_value_inr: Optional[float] = None
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
    if not plot or not plot.coordinates:
        return []
    raw = plot.coordinates
    coords = None
    if isinstance(raw, str):
        try:
            coords = json.loads(raw)
        except Exception:
            coords = []
    elif isinstance(raw, (list, dict)):
        coords = raw
    if isinstance(coords, dict):
        if "coordinates" in coords:
            coords = coords["coordinates"]
            if coords and isinstance(coords[0], list) and coords[0] and isinstance(coords[0][0], list):
                coords = coords[0]
        else:
            coords = []
    if not isinstance(coords, list):
        return []
    ring: List[List[float]] = []
    for coord in coords:
        if isinstance(coord, dict):
            lat = coord.get("lat") or coord.get("latitude")
            lng = coord.get("lng") or coord.get("longitude") or coord.get("lon")
            if lat is not None and lng is not None:
                try:
                    ring.append([float(lng), float(lat)])
                except (ValueError, TypeError):
                    pass
        elif isinstance(coord, (list, tuple)) and len(coord) >= 2:
            try:
                # GeoJSON coordinates are [lng, lat]
                ring.append([float(coord[0]), float(coord[1])])
            except (ValueError, TypeError):
                pass
    if ring and ring[0] != ring[-1]:
        ring.append(ring[0])
    return ring
def _event_payload(event: Optional[AdminCreditDecision]) -> Dict[str, Any]:
    if not event or not event.admin_note:
        return {}
    try:
        payload = json.loads(event.admin_note)
        return payload if isinstance(payload, dict) else {}
    except (TypeError, ValueError):
        return {}
def _workflow_events(db: Session, project_id: int, action: str) -> List[AdminCreditDecision]:
    return (
        db.query(AdminCreditDecision)
        .filter(
            AdminCreditDecision.project_id == project_id,
            AdminCreditDecision.action == action,
        )
        .order_by(AdminCreditDecision.decided_at.asc(), AdminCreditDecision.id.asc())
        .all()
    )
def _append_workflow_event(
    db: Session,
    project_id: int,
    action: str,
    payload: Dict[str, Any],
    credits: float = 0.0,
) -> AdminCreditDecision:
    event = AdminCreditDecision(
        project_id=project_id,
        action=action,
        credits_issued=credits,
        admin_note=json.dumps(payload, ensure_ascii=False, default=str),
    )
    db.add(event)
    return event
def _project_response(project: CarbonProject, db: Session) -> ProjectResponse:
    verification_event = (
        db.query(AdminCreditDecision)
        .filter(
            AdminCreditDecision.project_id == project.id,
            AdminCreditDecision.action == "verification_approved",
        )
        .order_by(AdminCreditDecision.decided_at.desc())
        .first()
    )
    issuance_event = (
        db.query(AdminCreditDecision)
        .filter(
            AdminCreditDecision.project_id == project.id,
            AdminCreditDecision.action == "registry_issued",
        )
        .order_by(AdminCreditDecision.decided_at.desc())
        .first()
    )
    verification = _event_payload(verification_event)
    issuance = _event_payload(issuance_event)
    workflow_events = _workflow_events(db, project.id, "workflow_event")
    stage_metadata = {
        _event_payload(event).get("to_stage"): _event_payload(event).get("metadata", {})
        for event in workflow_events if _event_payload(event).get("to_stage")
    }
    registration_data = stage_metadata.get("Registered", {})
    registered_project_reference = verification.get("project_registry_reference") or registration_data.get("project_registry_reference")
    if not issuance_event and registered_project_reference:
        shared_issues = db.query(AdminCreditDecision).filter(AdminCreditDecision.action == "registry_issued").order_by(AdminCreditDecision.decided_at.desc()).all()
        issuance_event = next((event for event in shared_issues if _event_payload(event).get("registry_project_reference") == registered_project_reference), None)
        issuance = _event_payload(issuance_event)
    validation_data = stage_metadata.get("Validation", {}) or stage_metadata.get("Registration_Review", {})
    monitoring_data = stage_metadata.get("Monitoring", {})
    participant_data = stage_metadata.get("Participant_Records_Ready", {}) or stage_metadata.get("Monitoring_Report_Ready", {})
    aggregate_report_data = stage_metadata.get("Aggregate_Report_Submitted_To_ACVA", {})
    verification_handoff = stage_metadata.get("Verification_Pending", {})
    intake_event = next((event for event in workflow_events if _event_payload(event).get("event_type") == "farmer_intake"), None)
    allocation_events = _workflow_events(db, project.id, "farmer_allocation")
    accepted_allocations = [event for event in allocation_events if _event_payload(event).get("farmer_accepted") is True]
    latest_allocation = accepted_allocations[-1] if accepted_allocations else None
    proposal_events = _workflow_events(db, project.id, "allocation_proposed")
    resolved_proposal_ids = {
        str(_event_payload(event).get("proposal_event_id"))
        for action in ("farmer_allocation", "allocation_declined")
        for event in _workflow_events(db, project.id, action)
    }
    pending_proposal = next((event for event in reversed(proposal_events) if str(event.id) not in resolved_proposal_ids), None)
    pending_payload = _event_payload(pending_proposal)
    pending_allocation = ({
        "credits": round(float(pending_proposal.credits_issued or 0.0), 4),
        "registry_issuance_reference": pending_payload.get("registry_issuance_reference"),
        "agreement_reference": pending_payload.get("agreement_reference"),
        "farmer_share_percentage": pending_payload.get("farmer_share_percentage"),
        "admin_note": pending_payload.get("admin_note"),
    } if pending_proposal else None)
    sale_events = _workflow_events(db, project.id, "buyer_sale")
    payout_events = _workflow_events(db, project.id, "farmer_payout")
    transfer_events = _workflow_events(db, project.id, "farmer_transfer")
    allocated_credits = round(sum(float(event.credits_issued or 0.0) for event in accepted_allocations), 4)
    credits_sold = round(sum(float(event.credits_issued or 0.0) for event in sale_events), 4)
    credits_transferred = round(sum(float(event.credits_issued or 0.0) for event in transfer_events), 4)
    sales = []
    for event in sale_events:
        details = _event_payload(event)
        sales.append({key: details.get(key) for key in (
            "registry_issuance_reference", "sale_reference", "buyer_name", "gross_proceeds_inr",
            "deductions_inr", "net_proceeds_inr", "farmer_share_percentage", "farmer_share_due_inr",
            "agreement_reference", "settlement_reference", "settlement_date",
        )} | {"credits_sold": round(float(event.credits_issued or 0.0), 4), "recorded_at": event.decided_at.isoformat() if event.decided_at else None})
    payouts = []
    for event in payout_events:
        details = _event_payload(event)
        payouts.append({key: details.get(key) for key in (
            "sale_reference", "payment_method", "payment_reference", "amount_paid_inr", "payment_date",
        )} | {"recorded_at": event.decided_at.isoformat() if event.decided_at else None})
    transfers = []
    for event in transfer_events:
        details = _event_payload(event)
        transfers.append({key: details.get(key) for key in (
            "registry_issuance_reference", "transfer_reference", "registry_account_reference",
            "serial_reference", "agreement_reference", "transfer_date",
        )} | {"credits_transferred": round(float(event.credits_issued or 0.0), 4), "recorded_at": event.decided_at.isoformat() if event.decided_at else None})
    farmer_payout_due = round(sum(float(item.get("farmer_share_due_inr", 0.0) or 0.0) for item in sales), 2)
    farmer_payout_paid = round(sum(float(item.get("amount_paid_inr", 0.0) or 0.0) for item in payouts), 2)
    monitoring_events = _workflow_events(db, project.id, "monitoring_record")
    workflow_history = [
        {
            "action": "stage_change",
            "from_stage": _event_payload(event).get("from_stage"),
            "to_stage": _event_payload(event).get("to_stage"),
            "metadata": _event_payload(event).get("metadata", {}),
            "recorded_at": event.decided_at.isoformat() if event.decided_at else None,
        }
        for event in workflow_events if _event_payload(event).get("event_type") != "farmer_intake"
    ]
    for action in ("registry_issued", "allocation_proposed", "allocation_declined", "farmer_allocation", "buyer_sale", "farmer_payout", "farmer_transfer"):
        for event in _workflow_events(db, project.id, action):
            workflow_history.append({"action": action, "metadata": _event_payload(event), "credits": round(float(event.credits_issued or 0.0), 4), "recorded_at": event.decided_at.isoformat() if event.decided_at else None})
    if issuance_event and not any(item.get("action") == "registry_issued" and item.get("metadata", {}).get("registry_issuance_reference") == issuance.get("registry_issuance_reference") for item in workflow_history):
        workflow_history.append({"action": "registry_issued", "metadata": issuance, "credits": round(float(issuance_event.credits_issued or 0.0), 4), "recorded_at": issuance_event.decided_at.isoformat() if issuance_event.decided_at else None, "shared_project_issue": issuance_event.project_id != project.id})
    workflow_history.sort(key=lambda item: item.get("recorded_at") or "")
    response_status = project.status or "Enrolled"
    if response_status in {"Verified", "Issued"} and not verification_event:
        response_status = "Legacy_Unverified"
    if response_status == "Issued" and not issuance_event:
        response_status = "Legacy_Unverified"
    latest_workflow_stage = next((
        _event_payload(event).get("to_stage")
        for event in reversed(workflow_events)
        if _event_payload(event).get("to_stage")
    ), None)
    workflow_stage = response_status if response_status in {"Verified", "Issued", "Allocation_Pending", "Farmer_Allocated"} else latest_workflow_stage or response_status
    if workflow_stage in {"Evidence_Pending", "Under_Review", "Enrolled", "Analyzing"}:
        workflow_stage = "Intake_Submitted"
    return ProjectResponse(
        id=project.id,
        plot_id=project.plot_id,
        plot_name=project.plot.name,
        methodology=project.methodology,
        status=response_status,
        projected_credits=None,
        verified_credits=round(float(verification_event.credits_issued or 0.0), 2) if verification_event else 0.0,
        available_credits=round(max(0.0, allocated_credits - credits_sold - credits_transferred), 4),
        locked_credits=0.0,
        aggregator_name=project.aggregator_name,
        government_scheme=project.government_scheme,
        platform_fee_percentage=None,
        start_date=project.start_date,
        vesting_end_date=None,
        verification_cost_usd=None,
        buffer_pool_percentage=None,
        additionality_score=None,
        requires_soil_sample=None,
        issued_credits=round(float(issuance_event.credits_issued or 0.0), 2) if issuance_event else 0.0,
        crediting_program=verification.get("crediting_program"),
        methodology_code=verification.get("methodology_code"),
        project_registry_reference=registered_project_reference,
        project_participant_reference=registration_data.get("participant_roster_reference"),
        validation_agency=verification.get("validation_agency") or validation_data.get("validation_agency"),
        validation_report_reference=verification.get("validation_report_reference") or validation_data.get("validation_report_reference"),
        verification_agency=verification.get("verification_agency") or verification_handoff.get("verification_agency"),
        verification_report_reference=verification.get("verification_report_reference"),
        monitoring_period_start=verification.get("monitoring_period_start") or aggregate_report_data.get("aggregate_monitoring_report_period_start") or participant_data.get("period_start") or monitoring_data.get("monitoring_period_start"),
        monitoring_period_end=verification.get("monitoring_period_end") or aggregate_report_data.get("aggregate_monitoring_report_period_end") or participant_data.get("period_end") or monitoring_data.get("monitoring_period_end"),
        aggregate_monitoring_report_reference=aggregate_report_data.get("aggregate_monitoring_report_reference"),
        registry_name=issuance.get("registry_name"),
        registry_project_reference=issuance.get("registry_project_reference"),
        registry_issuance_reference=issuance.get("registry_issuance_reference"),
        registry_serial_reference=issuance.get("registry_serial_reference"),
        farmer_allocation_agreement_reference=issuance.get("farmer_allocation_agreement_reference"),
        registry_recorded_at=issuance_event.decided_at if issuance_event else None,
        shared_registry_issue=bool(issuance_event and issuance_event.project_id != project.id),
        workflow_stage=workflow_stage,
        intake_data=_event_payload(intake_event).get("intake_data", {}) if intake_event else {},
        workflow_history=workflow_history,
        monitoring_records=[
            {
                "record_date": _event_payload(event).get("record_date"),
                "record_type": _event_payload(event).get("record_type"),
                "observations": _event_payload(event).get("observations", {}),
                "note": _event_payload(event).get("note"),
                "recorded_at": event.decided_at.isoformat() if event.decided_at else None,
            }
            for event in monitoring_events
        ],
        allocation_agreement_reference=_event_payload(latest_allocation).get("agreement_reference") if latest_allocation else None,
        allocation_confirmed_at=latest_allocation.decided_at if latest_allocation else None,
        allocated_credits=allocated_credits,
        credits_sold=credits_sold,
        credits_transferred=credits_transferred,
        pending_allocation=pending_allocation,
        farmer_share_percentage=_event_payload(latest_allocation).get("farmer_share_percentage") if latest_allocation else None,
        farmer_payout_due_inr=farmer_payout_due,
        farmer_payout_paid_inr=farmer_payout_paid,
        sales=sales,
        payouts=payouts,
        transfers=transfers,
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
    geojson_polygon = request.geometry or {}
    coordinates = geojson_polygon.get("coordinates", [])
    ring = coordinates[0] if coordinates and isinstance(coordinates[0], list) else coordinates
    crop_type = request.crop_type or "Mixed"
    plot_name = request.plot_name or "Farm"
    declared_area = request.area
    methodology = request.methodology or "Cover-Crop"
    job_id = None
    try:
        task = run_gee_analysis.delay(
            geometry_coords=ring,
            crop_type=crop_type,
            plot_name=plot_name,
            declared_area=declared_area,
            methodology=methodology,
        )
        job_id = getattr(task, "id", None)
    except Exception as exc:
        print(f"[Analyze Farm] Celery dispatch fallback: {exc}")
    if not job_id:
        job_id = f"job-{uuid.uuid4().hex[:12]}"
        analysis = earth_engine_service.monitor_plot(
            geometry_coords=ring if isinstance(ring, list) else [],
            crop_type=crop_type,
            plot_name=plot_name,
            declared_area=declared_area,
            methodology=methodology,
        )
        save_job_result(job_id, analysis, status="success")
    return {
        "job_id": job_id,
        "status": "queued",
        "poll_url": f"/api/jobs/{job_id}",
        "stream_url": f"/api/jobs/{job_id}/stream",
        "message": "Analysis started. Poll poll_url for results.",
    }
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
        # Check without user_id restriction for seeded demo plots
        plot = db.query(Plot).filter(Plot.id == plot_id).first()
        if not plot:
            raise HTTPException(status_code=404, detail="Plot not found")
    ring = _plot_ring(plot)
    crop_type = plot.crop_type or "Mixed"
    plot_name = plot.name or "Farm"
    declared_area = plot.area
    job_id = None
    try:
        task = run_gee_analysis.delay(
            geometry_coords=ring,
            crop_type=crop_type,
            plot_name=plot_name,
            declared_area=declared_area,
            methodology=methodology,
            plot_id=plot.id,
            user_id=current_user.id,
        )
        job_id = getattr(task, "id", None)
    except Exception as exc:
        print(f"[Carbon Monitor] Celery dispatch fallback: {exc}")
    if not job_id:
        job_id = f"job-{uuid.uuid4().hex[:12]}"
        analysis = earth_engine_service.monitor_plot(
            geometry_coords=ring,
            crop_type=crop_type,
            plot_name=plot_name,
            declared_area=declared_area,
            methodology=methodology,
        )
        save_job_result(job_id, analysis, status="success")
    return {
        "job_id": job_id,
        "status": "queued",
        "plot_id": plot.id,
        "plot_name": plot.name,
        "methodology": methodology,
        "poll_url": f"/api/jobs/{job_id}",
        "stream_url": f"/api/jobs/{job_id}/stream",
    }
@router.get("/projects", response_model=List[ProjectResponse])
async def get_my_projects(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    projects = db.query(CarbonProject).filter(CarbonProject.user_id == current_user.id).all()
    return [_project_response(project, db) for project in projects]
@router.post("/projects/{project_id}/monitoring-records")
async def add_monitoring_record(
    project_id: int,
    body: MonitoringRecordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = db.query(CarbonProject).filter(
        CarbonProject.id == project_id,
        CarbonProject.user_id == current_user.id,
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if project.status != "Monitoring":
        raise HTTPException(status_code=409, detail="Field logs can be added after the project monitoring period is recorded.")
    allowed_record_types = {
        "practice_observation", "field_operation", "input_application", "planting",
        "water_management", "harvest", "training", "field_observation", "farmer_note",
    }
    if body.record_type not in allowed_record_types:
        raise HTTPException(status_code=422, detail="Choose a supported field activity log type.")
    observations = {str(key).strip(): value for key, value in body.observations.items() if str(key).strip() and value not in (None, "")}
    if not observations and not (body.note or "").strip():
        raise HTTPException(status_code=422, detail="Add an observation or note to the field activity record.")
    positive_numeric_fields = {"area_ha", "yield_kg", "average_animal_count", "manure_to_digester_kg", "biogas_consumed_m3", "attendee_count", "quantity"}
    for field in positive_numeric_fields.intersection(observations):
        try:
            numeric = float(observations[field])
        except (TypeError, ValueError) as exc:
            raise HTTPException(status_code=422, detail=f"{field} must be a positive measured number.") from exc
        if not math.isfinite(numeric) or numeric <= 0:
            raise HTTPException(status_code=422, detail=f"{field} must be a positive measured number.")
        observations[field] = numeric
    for field in {"nitrogen_kg_per_ha", "operation_amount"}.intersection(observations):
        try:
            numeric = float(observations[field])
        except (TypeError, ValueError) as exc:
            raise HTTPException(status_code=422, detail=f"{field} must be a finite measured number of zero or more.") from exc
        if not math.isfinite(numeric) or numeric < 0:
            raise HTTPException(status_code=422, detail=f"{field} must be a finite measured number of zero or more.")
        observations[field] = numeric
    try:
        record_date = datetime.fromisoformat(body.record_date.strip()).date()
    except (TypeError, ValueError) as exc:
        raise HTTPException(status_code=422, detail="Record date must use ISO format (YYYY-MM-DD).") from exc
    if record_date > datetime.utcnow().date() or (project.start_date and record_date < project.start_date.date()):
        raise HTTPException(status_code=422, detail="Monitoring record date must be between project intake and today.")
    monitoring_events = _workflow_events(db, project.id, "workflow_event")
    monitoring_stage = next((
        _event_payload(event).get("metadata", {})
        for event in reversed(monitoring_events)
        if _event_payload(event).get("to_stage") == "Monitoring"
    ), {})
    try:
        monitoring_start = datetime.fromisoformat(str(monitoring_stage.get("monitoring_period_start"))).date()
        monitoring_end = datetime.fromisoformat(str(monitoring_stage.get("monitoring_period_end"))).date()
    except (TypeError, ValueError) as exc:
        raise HTTPException(status_code=409, detail="The project monitoring period is incomplete. Ask the project operator to record its start and end dates.") from exc
    if record_date < monitoring_start or record_date > monitoring_end:
        raise HTTPException(status_code=422, detail="Monitoring record date must fall within the registered monitoring period.")
    if "planting_date" in observations:
        try:
            planting_date = datetime.fromisoformat(str(observations["planting_date"])).date()
        except (TypeError, ValueError) as exc:
            raise HTTPException(status_code=422, detail="Planting date must use ISO format YYYY-MM-DD.") from exc
        if planting_date > record_date:
            raise HTTPException(status_code=422, detail="Planting date cannot be after the monitoring record date.")
    if "area_ha" in observations:
        plot = db.query(Plot).filter(Plot.id == project.plot_id).first()
        registered_area_ha = max(0.0, float(plot.area or 0.0) * 0.4046856422) if plot else 0.0
        if registered_area_ha and observations["area_ha"] > registered_area_ha + 0.01:
            raise HTTPException(status_code=422, detail=f"Reported area cannot exceed the registered plot area ({registered_area_ha:.3f} ha).")
    payload = {
        "record_date": record_date.isoformat(),
        "record_type": body.record_type,
        "observations": observations,
        "note": (body.note or "").strip(),
    }
    _append_workflow_event(db, project.id, "monitoring_record", payload)
    db.add(FarmerOperationLog(
        user_id=current_user.id,
        plot_id=project.plot_id,
        project_id=project.id,
        operation="carbon_monitoring_record",
        detail=json.dumps(payload, ensure_ascii=False, default=str),
    ))
    db.commit()
    return {"message": "Dated field activity saved to the project evidence log. It is not a credit calculation.", "status": project.status}
@router.post("/projects/{project_id}/submit-monitoring-report")
async def submit_monitoring_report(
    project_id: int,
    period_start: str = Form(...),
    period_end: str = Form(...),
    farmer_report_note: str = Form(""),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = db.query(CarbonProject).filter(
        CarbonProject.id == project_id,
        CarbonProject.user_id == current_user.id,
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if project.status != "Monitoring":
        raise HTTPException(status_code=409, detail="A farmer monitoring report can be prepared only while the project is in its monitoring period.")
    records = _workflow_events(db, project.id, "monitoring_record")
    if not records:
        raise HTTPException(status_code=422, detail="Add method-specific field records before preparing the participant package.")
    if not records:
        raise HTTPException(status_code=422, detail="Add dated field activity records before preparing the farmer monitoring report.")
    try:
        start = datetime.fromisoformat(period_start.strip()).date()
        end = datetime.fromisoformat(period_end.strip()).date()
    except ValueError as exc:
        raise HTTPException(status_code=422, detail="Monitoring dates must use ISO format (YYYY-MM-DD).") from exc
    if start > end or end > datetime.utcnow().date() or (project.start_date and start < project.start_date.date()):
        raise HTTPException(status_code=422, detail="Monitoring period is invalid or outside this project's active dates.")
    monitoring_events = _workflow_events(db, project.id, "workflow_event")
    monitoring_stage = next((
        _event_payload(event).get("metadata", {})
        for event in reversed(monitoring_events)
        if _event_payload(event).get("to_stage") == "Monitoring"
    ), {})
    try:
        registered_start = datetime.fromisoformat(str(monitoring_stage.get("monitoring_period_start"))).date()
        registered_end = datetime.fromisoformat(str(monitoring_stage.get("monitoring_period_end"))).date()
    except (TypeError, ValueError) as exc:
        raise HTTPException(status_code=409, detail="The registered monitoring period is incomplete.") from exc
    if start < registered_start or end > registered_end:
        raise HTTPException(status_code=422, detail="Report dates must remain within the project's recorded monitoring period.")
    outside = [
        _event_payload(event).get("record_date") for event in records
        if not start.isoformat() <= str(_event_payload(event).get("record_date") or "") <= end.isoformat()
    ]
    if outside:
        raise HTTPException(status_code=422, detail="Every field activity record must fall within the report period.")
    report_snapshot = [
        {"record_date": _event_payload(event).get("record_date"), "record_type": _event_payload(event).get("record_type"), "observations": _event_payload(event).get("observations", {}), "note": _event_payload(event).get("note", "")}
        for event in records
    ]
    report_manifest = {
        "project_id": project.id,
        "methodology": project.methodology,
        "period_start": start.isoformat(),
        "period_end": end.isoformat(),
        "records": report_snapshot,
    }
    snapshot_json = json.dumps(report_manifest, ensure_ascii=False, sort_keys=True, separators=(",", ":"), default=str)
    metadata = {
        "period_start": start.isoformat(),
        "period_end": end.isoformat(),
        "farmer_report_note": farmer_report_note.strip(),
        "record_count": len(records),
        "report_digest_sha256": hashlib.sha256(snapshot_json.encode("utf-8")).hexdigest(),
        "report_digest_scope": "project, methodology, monitoring dates, and saved monitoring records",
        "report_digest_note": "Checksum detects changes to this saved package; it is not a digital signature or proof that the field observations are true.",
        "monitoring_records_snapshot": report_snapshot,
    }
    _append_workflow_event(db, project.id, "workflow_event", {"from_stage": "Monitoring", "to_stage": "Participant_Records_Ready", "metadata": metadata})
    project.status = "Participant_Records_Ready"
    db.add(FarmerOperationLog(
        user_id=current_user.id,
        plot_id=project.plot_id,
        project_id=project.id,
        operation="carbon_participant_package_prepared",
        detail=json.dumps(metadata, ensure_ascii=False),
    ))
    db.commit()
    return {"message": "Farmer monitoring records packaged for the project partner. The partner must prepare the project report and submit it to an independent verifier.", "status": project.status, "participant_package": metadata}
@router.post("/projects/{project_id}/allocation/confirm")
async def confirm_farmer_allocation(
    project_id: int,
    body: AllocationAcceptanceRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = db.query(CarbonProject).filter(
        CarbonProject.id == project_id,
        CarbonProject.user_id == current_user.id,
    ).with_for_update().first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if project.status != "Allocation_Pending":
        raise HTTPException(status_code=409, detail="There is no allocation proposal awaiting your decision.")
    proposals = _workflow_events(db, project.id, "allocation_proposed")
    proposal = proposals[-1] if proposals else None
    if not proposal:
        raise HTTPException(status_code=409, detail="No allocation agreement is available to accept.")
    details = _event_payload(proposal)
    if not body.accepted:
        _append_workflow_event(db, project.id, "allocation_declined", {
            "proposal_event_id": proposal.id,
            "registry_issuance_reference": details.get("registry_issuance_reference"),
            "farmer_accepted": False,
        })
        project.status = "Issued"
        db.add(FarmerOperationLog(user_id=current_user.id, plot_id=project.plot_id, project_id=project.id, operation="farmer_allocation_declined", detail=json.dumps({"proposal_event_id": proposal.id})))
        db.commit()
        return {"message": "Allocation declined. No credits were added to your wallet.", "credits": 0.0, "status": project.status}
    credits = round(float(proposal.credits_issued or 0.0), 4)
    if credits <= 0:
        raise HTTPException(status_code=409, detail="The proposed allocation has no valid credit quantity.")
    _append_workflow_event(db, project.id, "farmer_allocation", {
        "farmer_accepted": True,
        "proposal_event_id": proposal.id,
        "agreement_reference": details.get("agreement_reference"),
        "registry_issuance_reference": details.get("registry_issuance_reference"),
        "farmer_share_percentage": details.get("farmer_share_percentage"),
    }, credits=credits)
    project.status = "Farmer_Allocated"
    project.available_credits = round(float(project.available_credits or 0.0) + credits, 4)
    db.add(FarmerOperationLog(
        user_id=current_user.id,
        plot_id=project.plot_id,
        project_id=project.id,
        operation="farmer_allocation_accepted",
        detail=json.dumps({"credits": credits, "agreement_reference": details.get("agreement_reference")}),
    ))
    db.commit()
    return {"message": "Farmer allocation accepted. Your agreed share is recorded; payment is shown only after a buyer sale and completed transfer are documented.", "credits": credits, "farmer_share_percentage": details.get("farmer_share_percentage"), "status": project.status}
def _wallet_response(projects: List[CarbonProject], db: Session) -> WalletResponse:
    responses = [_project_response(project, db) for project in projects]
    total_verified = round(sum(item.verified_credits for item in responses), 2)
    total_available = round(sum(item.available_credits for item in responses), 2)
    total_locked = 0.0
    # No fixed carbon price is configured. A wallet balance is not a payout estimate.
    estimated_value = None
    return WalletResponse(
        total_verified_credits=total_verified,
        total_available_credits=total_available,
        total_locked_credits=total_locked,
        estimated_value_inr=estimated_value,
        projects=responses,
    )
@router.get("/wallet", response_model=WalletResponse)
async def get_wallet_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    projects = db.query(CarbonProject).filter(CarbonProject.user_id == current_user.id).all()
    return _wallet_response(projects, db)
@router.get("/aggregators", response_model=List[AggregatorPartner])
async def get_aggregator_partners():
    """List only partner integrations that have been contracted and configured."""
    return []
@router.post("/projects/{project_id}/claim", response_model=ClaimResponse)
async def claim_carbon_payout(
    project_id: int,
    request: ClaimRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = db.query(CarbonProject).filter(
        CarbonProject.id == project_id,
        CarbonProject.user_id == current_user.id,
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    raise HTTPException(
        status_code=409,
        detail=(
            "Credits are not cash. A payout can only be recorded after a buyer sale and settlement "
            "are confirmed; this platform does not currently process registry sales or settlements."
        ),
    )
@router.get("/schemes")
async def list_carbon_schemes():
    """Describe the app's generic workflow and current external connection state."""
    return {
        "frameworks": [],
        "registry_workflow": {
            "registry": None,
            "connection_status": "manual_reference_tracking",
            "automatic_issuance_connected": False,
            "connection_note": "This app records evidence-backed project milestones. Registry submissions, issuance, sales, and payments are handled by external parties and require their references to be recorded here.",
            "stages": [
                {"id": "Intake_Submitted", "label": "Farmer enrollment and consent"},
                {"id": "Entity_Onboarding", "label": "Project partner onboarding"},
                {"id": "PDD_Preparation", "label": "Baseline and project plan"},
                {"id": "Validation", "label": "Independent project validation"},
                {"id": "Registered", "label": "Project and farmer roster registered"},
                {"id": "Monitoring", "label": "Field monitoring"},
                {"id": "Participant_Records_Ready", "label": "Farmer monitoring report"},
                {"id": "Aggregate_Report_Submitted_To_ACVA", "label": "Project report submitted"},
                {"id": "Verification_Pending", "label": "Independent verification"},
                {"id": "Verified", "label": "Verified quantity recorded"},
                {"id": "Issuance_Request_Submitted", "label": "Registry issue requested"},
                {"id": "Issuance_Review", "label": "Registry review"},
                {"id": "Issued", "label": "External issue confirmed"},
                {"id": "Allocation_Pending", "label": "Farmer allocation awaiting consent"},
                {"id": "Farmer_Allocated", "label": "Farmer allocation accepted"},
            ],
        },
        "partners": [],
    }
@router.post("/enroll", response_model=ProjectResponse)
async def enroll_plot(
    project: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Enroll a plot in a carbon project.
    Enrollment records opt-in immediately. Satellite analysis is optional
    screening and is never used to determine verified credits or block evidence.
    """
    # 1. Verify Plot Ownership
    plot = db.query(Plot).filter(Plot.id == project.plot_id, Plot.user_id == current_user.id).first()
    if not plot:
        raise HTTPException(status_code=404, detail="Plot not found")
    methodology = "-".join((project.methodology or "").strip().lower().replace("_", "-").split())
    if not methodology or len(methodology) > 80:
        raise HTTPException(status_code=422, detail="Choose a farming practice or programme activity to track.")
    intake_data = dict(project.intake_data or {})
    if intake_data.get("farmer_consent") is not True:
        raise HTTPException(status_code=422, detail="Farmer consent is required to create an intake record.")
    current_practice = str(intake_data.get("current_practice") or intake_data.get("current_water_practice") or intake_data.get("manure_handling") or "").strip()
    planned_practice = str(intake_data.get("planned_practice") or "").strip()
    if not current_practice or not planned_practice:
        raise HTTPException(status_code=422, detail="Record the current practice and the practice the farmer plans to adopt.")
    intake_data["current_practice"] = current_practice
    intake_data["planned_practice"] = planned_practice
    intake_data["consent_recorded_at"] = datetime.utcnow().isoformat()
    # 2. Check if already enrolled
    existing = db.query(CarbonProject).filter(
        CarbonProject.plot_id == plot.id,
        CarbonProject.status != "Withdrawn",
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Plot already enrolled in a carbon project")
    # Enrollment is a farmer opt-in only. Eligibility, baselines, crediting period,
    # and quantification must be established under the selected external methodology.
    new_project = CarbonProject(
        plot_id=plot.id,
        user_id=current_user.id,
        methodology=methodology,
        status="Intake_Submitted",     # Farmer intake only; no satellite credit estimate
        projected_sequestration=None,  # Satellite screening does not quantify project credits
        verified_credits=0.0,
        vesting_end_date=None,
        additionality_score=None,
        baseline_emission=None,
        buffer_pool_percentage=None,
        verification_cost_usd=None,
        requires_soil_sample=None,
    )
    db.add(new_project)
    db.commit()
    db.refresh(new_project)
    # Screening data does not quantify credits. Enrollment is independent of satellite jobs.
    job_id = None
    # 6. Audit log
    log = FarmerOperationLog(
        user_id=current_user.id,
        plot_id=plot.id,
        project_id=new_project.id,
        operation="project_enrolled",
        detail=json.dumps({
            "methodology": methodology,
            "practice_to_track": methodology,
            "area_acres": plot.area,
            "gee_job_id": None,
            "async": False,
        }),
    )
    db.add(log)
    _append_workflow_event(
        db,
        new_project.id,
        "workflow_event",
        {"event_type": "farmer_intake", "intake_data": intake_data},
    )
    db.commit()
    # 7. Return the project + the job_id so frontend can poll
    response = _project_response(new_project, db)
    # Attach job tracking info (extra fields beyond the response model)
    return {
        **response.model_dump(),
        "gee_job_id": None,
        "poll_url": None,
        "stream_url": None,
        "message": "Farmer consent, current practice, and planned practice recorded. The project partner manages onboarding, review, registry submission, and farmer benefits; this app does not estimate or issue credits.",
    }
@router.delete("/projects/{project_id}")
async def unenroll_carbon_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = db.query(CarbonProject).filter(
        CarbonProject.id == project_id,
        CarbonProject.user_id == current_user.id,
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Carbon project not found")
    if project.status in {"Under_Review", "Verified", "Issued"}:
        raise HTTPException(
            status_code=409,
            detail="A project under independent review or beyond verification must be withdrawn through its external programme; its audit records cannot be deleted.",
        )
    project.status = "Withdrawn"
    db.add(FarmerOperationLog(
        user_id=current_user.id,
        plot_id=project.plot_id,
        project_id=project.id,
        operation="project_withdrawn",
        detail=json.dumps({"reason": "Farmer requested withdrawal"}),
    ))
    db.commit()
    return {"status": "Withdrawn", "message": "Project withdrawn. Evidence and audit history were retained."}
def _point_inside_ring(lat: float, lng: float, ring: List[List[float]]) -> bool:
    """Ray-cast point-in-polygon check using the plot's GeoJSON [lng, lat] ring."""
    inside = False
    x, y = float(lng), float(lat)
    for index in range(len(ring) - 1):
        x1, y1 = ring[index]
        x2, y2 = ring[index + 1]
        intersects = ((y1 > y) != (y2 > y)) and (
            x < (x2 - x1) * (y - y1) / ((y2 - y1) or 1e-12) + x1
        )
        if intersects:
            inside = not inside
    return inside
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
    Stores a geotagged photo for review. Evidence metadata without a retained image is rejected.
    """
    project = db.query(CarbonProject).filter(
        CarbonProject.id == project_id,
        CarbonProject.user_id == current_user.id,
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    evidence_stages = {
        "Intake_Submitted", "Entity_Onboarding", "PDD_Preparation", "Public_Consultation",
        "Validation", "Registration_Review", "Registered", "Monitoring", "Analyzing",
        "Enrolled", "Evidence_Pending", "Audit_Failed",
    }
    if project.status not in evidence_stages:
        raise HTTPException(status_code=409, detail="Evidence can only be added before independent verification review.")
    if not file:
        raise HTTPException(status_code=400, detail="A field photo is required; metadata-only evidence is not accepted.")
    if not (file.content_type or "").lower().startswith("image/"):
        raise HTTPException(status_code=415, detail="Upload a supported image file.")
    if not (-90 <= geo_lat <= 90 and -180 <= geo_lng <= 180):
        raise HTTPException(status_code=400, detail="GPS coordinates are outside valid latitude/longitude ranges.")
    plot = db.query(Plot).filter(Plot.id == project.plot_id, Plot.user_id == current_user.id).first()
    ring = _plot_ring(plot) if plot else []
    if len(ring) < 4 or not _point_inside_ring(geo_lat, geo_lng, ring):
        raise HTTPException(status_code=400, detail="Evidence GPS location must fall inside this project's plot boundary.")
    image_url = None
    content = await file.read()
    if not content or len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Image must be non-empty and no larger than 10 MB.")
    try:
        import io
        from PIL import Image
        with Image.open(io.BytesIO(content)) as uploaded_image:
            uploaded_image.verify()
    except Exception as exc:
        raise HTTPException(status_code=400, detail="The uploaded file is not a valid image.") from exc
    # Keep an app-local copy for review even when remote storage is configured.
    local_dir = Path("uploads/evidence")
    local_dir.mkdir(parents=True, exist_ok=True)
    local_filename = f"evidence_{project.id}_{uuid.uuid4().hex[:8]}.jpg"
    local_path = local_dir / local_filename
    try:
        with open(local_path, "wb") as f_out:
            f_out.write(content)
        image_url = f"/uploads/evidence/{local_filename}"
    except Exception as save_err:
        logger.warning("[upload_evidence] Could not save local copy: %s", save_err)
    if cloudinary_ready():
        try:
            result = upload_evidence_photo(
                file_bytes=content,
                content_type=file.content_type,
                farmer_id=current_user.id,
                project_id=project.id,
            )
            image_url = result["url"]
        except Exception as exc:
            logger.warning("[upload_evidence] Cloudinary upload failed: %s", exc)
    if not image_url:
        raise HTTPException(status_code=503, detail="Evidence storage is unavailable. Please try again later.")
    new_evidence = CarbonEvidence(
        project_id=project.id,
        description=description,
        geo_lat=geo_lat,
        geo_lng=geo_lng,
        image_url=image_url,
        verified=False,
    )
    db.add(new_evidence)
    if project.status in {"Analyzing", "Enrolled", "Audit_Failed"}:
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
    """Place collected evidence in the platform review queue.
    This places evidence in the app review queue. AI can assist with image triage
    but cannot independently verify results or issue credits.
    """
    project = db.query(CarbonProject).filter(
        CarbonProject.id == project_id,
        CarbonProject.user_id == current_user.id,
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if project.status != "Evidence_Pending":
        raise HTTPException(status_code=400, detail="Upload plot evidence before submitting it for review.")
    evidence_items = list(project.evidence or [])
    if not evidence_items or any(not item.image_url for item in evidence_items):
        raise HTTPException(status_code=400, detail="At least one retained field photo is required for review.")
    latest = evidence_items[-1]
    image_bytes = None
    try:
        if latest.image_url and latest.image_url.startswith("/uploads/"):
            local_path = Path(latest.image_url.lstrip("/"))
            if local_path.exists():
                image_bytes = local_path.read_bytes()
        elif latest.image_url and latest.image_url.startswith(("http://", "https://")):
            req = urllib.request.Request(latest.image_url, headers={"User-Agent": "KrishiDrishti-EvidenceReview/1.0"})
            with urllib.request.urlopen(req, timeout=10) as response:
                image_bytes = response.read(10 * 1024 * 1024 + 1)
    except Exception as exc:
        logger.warning("[carbon intake] Evidence image unavailable for triage: %s", exc)
    triage = {"status": "unavailable", "reason": "No automated image assessment was available."}
    if image_bytes and len(image_bytes) <= 10 * 1024 * 1024:
        try:
            triage = await verify_evidence_image(
                image_bytes=image_bytes,
                methodology=project.methodology,
                description=latest.description or "",
            )
        except Exception as exc:
            logger.warning("[carbon intake] AI triage failed: %s", exc)
            triage = {"status": "unavailable", "reason": "Automated image assessment failed."}
    triage_summary = {
        "result": "pass" if triage.get("is_valid") else "flagged_or_unavailable",
        "confidence": triage.get("confidence"),
        "detected_practice": triage.get("detected_practice"),
        "reason": triage.get("reason"),
        "is_independent_verification": False,
    }
    latest.verified = False
    project.status = "Under_Review"
    db.add(FarmerOperationLog(
        user_id=current_user.id,
        plot_id=project.plot_id,
        project_id=project.id,
        operation="evidence_submitted_for_external_review",
        detail=json.dumps(triage_summary),
    ))
    db.commit()
    return {
        "status": "Under_Review",
        "ai_triage": triage_summary,
        "message": "Evidence added to the project review queue. Independent verification and external registry submission are separate steps; AI triage does not issue credits.",
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
            "amount": round(float(token.amount or 0.0), 2),
            "token_hash": token.token_hash,
            "status": token.status,
            "created_at": token.created_at.isoformat() if token.created_at else None,
        }
        for token in tokens
    ]
