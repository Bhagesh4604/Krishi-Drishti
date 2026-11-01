"""
Admin API Router — Krishi-Drishti Ops Team
==========================================
All endpoints require: Authorization: Bearer <ADMIN_SECRET_TOKEN>
(stored in .env — never exposed to the farmer-facing mobile app)
Provides:
  - Platform KPIs
  - Farmer registry
  - Carbon credit issuance queue + approve/reject
  - Field monitor (all plots across all farmers)
  - Operations audit log
  - CSV export
"""
import csv
import io
import hmac
import json
import math
import os
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import (
    AdminCreditDecision,
    CarbonEvidence,
    CarbonProject,
    CarbonTransaction,
    DiseaseRiskAlert,
    FarmerOperationLog,
    Plot,
    PlotHistory,
    User,
)
router = APIRouter(prefix="/api/admin", tags=["admin"])
# ─── Token auth ────────────────────────────────────────────────────────────
def require_admin(authorization: Optional[str] = Header(None, alias="Authorization")):
    """Verify the admin secret from an Authorization header, never a URL query."""
    admin_token = os.getenv("ADMIN_SECRET_TOKEN", "").strip()
    if not admin_token:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Admin access is disabled until ADMIN_SECRET_TOKEN is configured.",
        )
    supplied = (authorization or "").strip()
    if supplied.lower().startswith("bearer "):
        supplied = supplied[7:].strip()
    if not supplied or not hmac.compare_digest(supplied, admin_token):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or missing admin token.")
    return True
# ─── Pydantic ─────────────────────────────────────────────────────────────
class ApproveRequest(BaseModel):
    verified_credits: float
    crediting_program: Optional[str] = None
    methodology_code: Optional[str] = None
    project_registry_reference: str
    validation_agency: str
    validation_report_reference: str
    verification_agency: str
    verification_report_reference: str
    monitoring_period_start: str
    monitoring_period_end: str
    aggregate_monitoring_report_reference: Optional[str] = None
    external_report_confirmed: bool = False
    admin_note: Optional[str] = None
class RegistryIssueRequest(BaseModel):
    registry_name: str
    registry_project_reference: str
    registry_issuance_reference: str
    registry_serial_reference: str
    credits_issued: float
    farmer_allocation_credits: Optional[float] = None
    farmer_allocation_agreement_reference: Optional[str] = None
    registry_issuance_confirmed: bool = False
    admin_note: Optional[str] = None
class WorkflowAdvanceRequest(BaseModel):
    to_stage: str
    metadata: dict = Field(default_factory=dict)
class AllocationProposalRequest(BaseModel):
    registry_issuance_reference: str
    credits: float
    agreement_reference: str
    farmer_share_percentage: Optional[float] = Field(None, ge=0, le=100)
    admin_note: Optional[str] = None
class BuyerSaleRequest(BaseModel):
    registry_issuance_reference: str
    sale_reference: str
    buyer_name: str
    credits_sold: float
    gross_proceeds_inr: float
    deductions_inr: float = 0.0
    farmer_share_percentage: Optional[float] = None
    agreement_reference: str
    settlement_reference: str
    settlement_date: str
    buyer_settlement_confirmed: bool = False
    admin_note: Optional[str] = None
class FarmerPayoutRequest(BaseModel):
    sale_reference: str
    amount_paid_inr: float
    payment_method: str
    payment_reference: str
    payment_date: str
    payment_confirmed: bool = False
    admin_note: Optional[str] = None
class RegistryTransferRequest(BaseModel):
    registry_issuance_reference: str
    transfer_reference: str
    registry_account_reference: str
    serial_reference: str
    credits_transferred: float
    agreement_reference: str
    transfer_date: str
    transfer_confirmed: bool = False
    admin_note: Optional[str] = None
class EvidenceReviewRequest(BaseModel):
    decision: str
    admin_note: Optional[str] = None
    confirmed: bool = False
class RejectRequest(BaseModel):
    rejection_reason: str
    admin_note: Optional[str] = None
# ─── Helper ───────────────────────────────────────────────────────────────
def _log_operation(
    db: Session,
    user_id: int,
    operation: str,
    plot_id: Optional[int] = None,
    project_id: Optional[int] = None,
    detail: Optional[dict] = None,
):
    """Insert a FarmerOperationLog entry. Called from other routers too."""
    entry = FarmerOperationLog(
        user_id=user_id,
        plot_id=plot_id,
        project_id=project_id,
        operation=operation,
        detail=json.dumps(detail) if detail else None,
    )
    db.add(entry)
    # No commit here — caller commits
CARBON_WORKFLOW_TRANSITIONS = {
    "Enrolled": "Intake_Submitted",
    "Intake_Submitted": "Entity_Onboarding",
    "Entity_Onboarding": "PDD_Preparation",
    "PDD_Preparation": "Validation",
    "Validation": "Registered",
    "Registered": "Monitoring",
    "Participant_Records_Ready": "Aggregate_Report_Submitted_To_ACVA",
    "Monitoring_Report_Ready": "Aggregate_Report_Submitted_To_ACVA",
    "Aggregate_Report_Submitted_To_ACVA": "Verification_Pending",
    "Verified": "Issuance_Request_Submitted",
    "Issuance_Request_Submitted": "Issuance_Review",
    # Accept records saved by the older, longer review path and move them to the shared checkpoint.
    "Public_Consultation": "Validation",
    "Registration_Review": "Registered",
    "ICM_Administrator_Review": "Issuance_Review",
    "Technical_Committee_Review": "Issuance_Review",
    "NSC_Recommendation": "Issuance_Review",
}
def _workflow_event_payload(event: AdminCreditDecision) -> dict:
    try:
        payload = json.loads(event.admin_note or "{}")
        return payload if isinstance(payload, dict) else {}
    except (TypeError, ValueError):
        return {}
@router.post("/carbon/{project_id}/evidence-review")
def review_carbon_evidence(
    project_id: int,
    body: EvidenceReviewRequest,
    db: Session = Depends(get_db),
    _: bool = Depends(require_admin),
):
    """Record a human review of submitted farmer evidence; this never verifies credits."""
    project = db.query(CarbonProject).filter(CarbonProject.id == project_id).with_for_update().first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if project.status != "Under_Review":
        raise HTTPException(status_code=409, detail=f"Farmer evidence can only be reviewed after submission; current status is '{project.status}'.")
    evidence = db.query(CarbonEvidence).filter(CarbonEvidence.project_id == project.id).order_by(CarbonEvidence.created_at.asc()).all()
    if not evidence:
        raise HTTPException(status_code=409, detail="The farmer has not uploaded evidence for review.")
    decision = body.decision.strip().lower()
    if decision not in {"accept", "request_changes"}:
        raise HTTPException(status_code=422, detail="Decision must be 'accept' or 'request_changes'.")
    note = (body.admin_note or "").strip()
    if decision == "accept":
        if not body.confirmed:
            raise HTTPException(status_code=422, detail="Confirm that you reviewed the submitted evidence before accepting it.")
        if any(item.geo_lat is None or item.geo_lng is None for item in evidence):
            raise HTTPException(status_code=422, detail="Every evidence item must include GPS coordinates before it can be accepted.")
        to_status = "Intake_Submitted"
        for item in evidence:
            item.verified = True
    else:
        if not note:
            raise HTTPException(status_code=422, detail="Add a note explaining what the farmer needs to correct.")
        to_status = "Evidence_Pending"
        for item in evidence:
            item.verified = False
    from_status = project.status
    project.status = to_status
    project.admin_reviewed_at = datetime.utcnow()
    event_payload = {
        "decision": decision,
        "from_status": from_status,
        "to_status": to_status,
        "evidence_ids": [item.id for item in evidence],
        "admin_note": note,
        "recorded_by": "platform_admin",
        "credits_issued": False,
    }
    db.add(AdminCreditDecision(project_id=project.id, action="evidence_review", admin_note=json.dumps(event_payload)))
    _log_operation(db, project.user_id, "carbon_evidence_reviewed", project.plot_id, project.id, event_payload)
    db.commit()
    message = "Farmer evidence accepted for project onboarding. No external verification or credits were created." if decision == "accept" else "Evidence returned to the farmer for corrections."
    return {"project_id": project.id, "status": project.status, "decision": decision, "message": message}
@router.post("/carbon/{project_id}/workflow/advance")
def advance_carbon_workflow(
    project_id: int,
    body: WorkflowAdvanceRequest,
    db: Session = Depends(get_db),
    _: bool = Depends(require_admin),
):
    """Record the external partner's next project milestone; this does not submit it for them."""
    project = db.query(CarbonProject).filter(CarbonProject.id == project_id).with_for_update().first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    expected = CARBON_WORKFLOW_TRANSITIONS.get(project.status)
    if body.to_stage != expected:
        raise HTTPException(status_code=409, detail=f"Invalid stage transition from {project.status}; next stage must be {expected or 'none'}.")
    data = {str(key): value for key, value in body.metadata.items()}
    required_fields = {
        "Intake_Submitted": ("farmer_consent_reference",),
        "Entity_Onboarding": ("entity_name", "entity_account_reference"),
        "PDD_Preparation": ("project_coordinator", "project_plan_reference"),
        "Validation": ("validation_agency", "validation_report_reference"),
        "Registered": ("project_registry_reference", "participant_roster_reference"),
        "Monitoring": ("monitoring_period_start", "monitoring_period_end"),
        "Aggregate_Report_Submitted_To_ACVA": ("aggregate_monitoring_report_reference", "aggregate_monitoring_report_period_start", "aggregate_monitoring_report_period_end"),
        "Verification_Pending": ("verification_agency", "verifier_engagement_reference"),
        "Issuance_Request_Submitted": ("issuance_request_reference",),
        "Issuance_Review": ("issuance_review_reference",),
    }.get(body.to_stage, ())
    missing = [field for field in required_fields if not str(data.get(field, "")).strip()]
    if missing:
        raise HTTPException(status_code=422, detail=f"Add the external record reference(s): {', '.join(missing)}")
    date_fields = {
        "Monitoring": ("monitoring_period_start", "monitoring_period_end"),
        "Aggregate_Report_Submitted_To_ACVA": ("aggregate_monitoring_report_period_start", "aggregate_monitoring_report_period_end"),
    }.get(body.to_stage, ())
    for field in date_fields:
        try:
            parsed = datetime.fromisoformat(str(data[field])).date()
        except (TypeError, ValueError) as exc:
            raise HTTPException(status_code=422, detail=f"{field} must use ISO date format YYYY-MM-DD.") from exc
        if parsed > datetime.utcnow().date():
            raise HTTPException(status_code=422, detail=f"{field} cannot be in the future.")
    if body.to_stage in {"Monitoring", "Aggregate_Report_Submitted_To_ACVA"}:
        start_key, end_key = ("monitoring_period_start", "monitoring_period_end") if body.to_stage == "Monitoring" else ("aggregate_monitoring_report_period_start", "aggregate_monitoring_report_period_end")
        start_date = datetime.fromisoformat(str(data[start_key])).date()
        end_date = datetime.fromisoformat(str(data[end_key])).date()
        if end_date < start_date:
            raise HTTPException(status_code=422, detail="Monitoring period end must be on or after its start date.")
    if body.to_stage == "Verification_Pending":
        validation = next((
            _workflow_event_payload(event).get("metadata", {})
            for event in db.query(AdminCreditDecision).filter(
                AdminCreditDecision.project_id == project.id,
                AdminCreditDecision.action == "workflow_event",
            ).order_by(AdminCreditDecision.decided_at.desc()).all()
            if _workflow_event_payload(event).get("to_stage") in {"Validation", "Registration_Review"}
        ), {})
        validator = str(validation.get("validation_agency", "")).strip().casefold()
        verifier = str(data.get("verification_agency", "")).strip().casefold()
        if validator and verifier and validator == verifier:
            raise HTTPException(status_code=422, detail="Use an independent verifier that is separate from the project validator.")
    previous_stage = project.status
    data["recorded_by"] = "platform_admin"
    event = AdminCreditDecision(
        project_id=project.id,
        action="workflow_event",
        admin_note=json.dumps({"from_stage": previous_stage, "to_stage": body.to_stage, "metadata": data, "external_portal_submission_by_app": False}),
    )
    db.add(event)
    project.status = body.to_stage
    project.admin_reviewed_at = datetime.utcnow()
    _log_operation(db, project.user_id, "carbon_workflow_stage_recorded", project.plot_id, project.id, {"from_stage": previous_stage, "to_stage": body.to_stage, "metadata": data})
    db.commit()
    message = "Farmer consent was recorded. The project still needs partner onboarding and external review." if body.to_stage == "Intake_Submitted" else f"{body.to_stage.replace('_', ' ')} recorded from external project evidence. This app did not submit to the external partner or registry."
    return {"project_id": project.id, "status": project.status, "message": message}
# ─── KPI ──────────────────────────────────────────────────────────────────
@router.get("/stats")
def platform_stats(db: Session = Depends(get_db), _: bool = Depends(require_admin)):
    """Top-level platform KPIs for the admin dashboard banner."""
    total_farmers = db.query(func.count(User.id)).scalar() or 0
    total_plots = db.query(func.count(Plot.id)).scalar() or 0
    total_projects = db.query(func.count(CarbonProject.id)).scalar() or 0
    pending_queue = (
        db.query(func.count(CarbonProject.id))
        .filter(CarbonProject.status.notin_(["Withdrawn", "Audit_Failed", "Farmer_Allocated", "Rejected"]))
        .scalar() or 0
    )
    total_credits_issued = (
        db.query(func.coalesce(func.sum(AdminCreditDecision.credits_issued), 0.0))
        .filter(AdminCreditDecision.action == "registry_issued")
        .scalar() or 0.0
    )
    registry_events = db.query(AdminCreditDecision).filter(AdminCreditDecision.action == "registry_issued").all()
    accepted_allocation_events = db.query(AdminCreditDecision).filter(AdminCreditDecision.action == "farmer_allocation").all()
    total_credits_allocated = sum(float(event.credits_issued or 0.0) for event in accepted_allocation_events if _parse_decision_payload(event.admin_note).get("farmer_accepted") is True)
    sale_events = db.query(AdminCreditDecision).filter(AdminCreditDecision.action == "buyer_sale").all()
    transfer_events = db.query(AdminCreditDecision).filter(AdminCreditDecision.action == "farmer_transfer").all()
    total_credits_available = max(0.0, total_credits_allocated - sum(float(event.credits_issued or 0.0) for event in sale_events) - sum(float(event.credits_issued or 0.0) for event in transfer_events))
    payout_events = db.query(AdminCreditDecision).filter(AdminCreditDecision.action == "farmer_payout").all()
    total_transactions = len(sale_events)
    total_payout_inr = sum(float(_parse_decision_payload(event.admin_note).get("amount_paid_inr", 0.0) or 0.0) for event in payout_events)
    total_scan_ops = (
        db.query(func.count(FarmerOperationLog.id))
        .filter(FarmerOperationLog.operation == "plot_scan")
        .scalar() or 0
    )
    # District breakdown
    district_counts = (
        db.query(User.district, func.count(User.id))
        .group_by(User.district)
        .order_by(func.count(User.id).desc())
        .limit(10)
        .all()
    )
    # Methodology breakdown
    methodology_counts = (
        db.query(CarbonProject.methodology, func.count(CarbonProject.id))
        .group_by(CarbonProject.methodology)
        .all()
    )
    # Status breakdown
    status_counts = (
        db.query(CarbonProject.status, func.count(CarbonProject.id))
        .group_by(CarbonProject.status)
        .all()
    )
    # Group in Python so this works on both SQLite and Render/PostgreSQL.
    monthly_totals = {}
    for event in registry_events:
        if event.decided_at:
            month = event.decided_at.strftime("%Y-%m")
            monthly_totals[month] = monthly_totals.get(month, 0.0) + float(event.credits_issued or 0.0)
    monthly_credits = [
        {"month": month, "credits": round(monthly_totals[month], 2)}
        for month in sorted(monthly_totals)[-12:]
    ]
    return {
        "total_farmers": total_farmers,
        "total_plots": total_plots,
        "total_projects": total_projects,
        "pending_queue": pending_queue,
        "total_credits_issued": round(float(total_credits_issued), 2),
        "total_credits_available": round(float(total_credits_available), 2),
        "total_transactions": total_transactions,
        "total_payout_inr": round(float(total_payout_inr), 2),
        "total_field_scans": total_scan_ops,
        "districts": [
            {"district": d or "Unknown", "count": c}
            for d, c in district_counts
        ],
        "methodologies": [
            {"methodology": m or "Unknown", "count": c}
            for m, c in methodology_counts
        ],
        "project_statuses": [
            {"status": s, "count": c}
            for s, c in status_counts
        ],
        "monthly_credits": monthly_credits,
    }
# ─── Farmer Registry ──────────────────────────────────────────────────────
@router.get("/farmers")
def list_farmers(
    search: Optional[str] = Query(None),
    district: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, le=100),
    db: Session = Depends(get_db),
    _: bool = Depends(require_admin),
):
    q = db.query(User)
    if search:
        q = q.filter(
            (User.name.ilike(f"%{search}%")) | (User.phone.ilike(f"%{search}%"))
        )
    if district:
        q = q.filter(User.district == district)
    total = q.count()
    farmers = q.offset((page - 1) * limit).limit(limit).all()
    result = []
    for farmer in farmers:
        plots = db.query(Plot).filter(Plot.user_id == farmer.id).all()
        projects = db.query(CarbonProject).filter(CarbonProject.user_id == farmer.id).all()
        project_ids = [project.id for project in projects]
        allocation_events = db.query(AdminCreditDecision).filter(
            AdminCreditDecision.project_id.in_(project_ids or [-1]),
            AdminCreditDecision.action == "farmer_allocation",
        ).all()
        total_available = sum(
            float(event.credits_issued or 0.0)
            for event in allocation_events if _parse_decision_payload(event.admin_note).get("farmer_accepted") is True
        )
        total_credits = total_available
        result.append({
            "id": farmer.id,
            "name": farmer.name or "—",
            "phone": farmer.phone,
            "district": farmer.district or "—",
            "land_size": farmer.land_size,
            "farming_type": farmer.farming_type,
            "trust_score": farmer.trust_score,
            "plots_count": len(plots),
            "projects_count": len(projects),
            "total_credits": round(total_credits, 2),
            "available_credits": round(total_available, 2),
            "created_at": farmer.created_at.isoformat() if farmer.created_at else None,
        })
    return {"total": total, "page": page, "farmers": result}
@router.get("/farmers/{farmer_id}")
def get_farmer_detail(
    farmer_id: int,
    db: Session = Depends(get_db),
    _: bool = Depends(require_admin),
):
    farmer = db.query(User).filter(User.id == farmer_id).first()
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer not found")
    plots = db.query(Plot).filter(Plot.user_id == farmer_id).all()
    projects = db.query(CarbonProject).filter(CarbonProject.user_id == farmer_id).all()
    ops_logs = (
        db.query(FarmerOperationLog)
        .filter(FarmerOperationLog.user_id == farmer_id)
        .order_by(FarmerOperationLog.created_at.desc())
        .limit(50)
        .all()
    )
    credit_events = {
        project.id: {
            event.action: event
            for event in db.query(AdminCreditDecision).filter(
                AdminCreditDecision.project_id == project.id,
                AdminCreditDecision.action.in_(["verification_approved", "registry_issued"]),
            ).all()
        }
        for project in projects
    }
    allocation_events = db.query(AdminCreditDecision).filter(
        AdminCreditDecision.project_id.in_([project.id for project in projects] or [-1]),
        AdminCreditDecision.action == "farmer_allocation",
    ).all()
    project_allocation = {}
    plot_allocation = {}
    for event in allocation_events:
        if _parse_decision_payload(event.admin_note).get("farmer_accepted") is not True:
            continue
        project = next((item for item in projects if item.id == event.project_id), None)
        if not project:
            continue
        amount = float(event.credits_issued or 0.0)
        project_allocation[project.id] = project_allocation.get(project.id, 0.0) + amount
        plot_allocation[project.plot_id] = plot_allocation.get(project.plot_id, 0.0) + amount
    return {
        "farmer": {
            "id": farmer.id,
            "name": farmer.name,
            "phone": farmer.phone,
            "district": farmer.district,
            "land_size": farmer.land_size,
            "farming_type": farmer.farming_type,
            "category": farmer.category,
            "trust_score": farmer.trust_score,
            "created_at": farmer.created_at.isoformat() if farmer.created_at else None,
        },
        "plots": [
            {
                "id": p.id,
                "name": p.name,
                "area": p.area,
                "crop_type": p.crop_type,
                "health_score": p.health_score,
                "moisture": p.moisture,
                "carbon_credits": round(plot_allocation.get(p.id, 0.0), 3),
                "last_scan_date": p.last_scan_date.isoformat() if p.last_scan_date else None,
            }
            for p in plots
        ],
        "projects": [
            {
                "id": pr.id,
                "methodology": pr.methodology,
                "status": pr.status if credit_events[pr.id].get("registry_issued") or pr.status not in {"Verified", "Issued", "Allocation_Pending", "Farmer_Allocated"} else "Legacy_Unverified",
                "verified_credits": round(float(credit_events[pr.id]["verification_approved"].credits_issued or 0.0), 3) if credit_events[pr.id].get("verification_approved") else 0.0,
                "available_credits": round(float(project_allocation.get(pr.id, 0.0)), 3),
                "registry_issuance_reference": _parse_decision_payload(credit_events[pr.id]["registry_issued"].admin_note).get("registry_issuance_reference") if credit_events[pr.id].get("registry_issued") else None,
                "start_date": pr.start_date.isoformat() if pr.start_date else None,
                "admin_reviewed_at": pr.admin_reviewed_at.isoformat() if pr.admin_reviewed_at else None,
            }
            for pr in projects
        ],
        "operations": [
            {
                "id": op.id,
                "operation": op.operation,
                "plot_id": op.plot_id,
                "project_id": op.project_id,
                "detail": op.detail,
                "created_at": op.created_at.isoformat() if op.created_at else None,
            }
            for op in ops_logs
        ],
    }
# ─── Credit Issuance Queue ─────────────────────────────────────────────────
@router.get("/carbon/queue")
def credit_queue(
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db),
    _: bool = Depends(require_admin),
):
    """
    Returns all carbon projects pending admin action.
    Default: Evidence_Pending status. Can filter by any status.
    """
    q = db.query(CarbonProject)
    if status_filter:
        q = q.filter(CarbonProject.status == status_filter)
    else:
        q = q.filter(CarbonProject.status.notin_(["Withdrawn", "Audit_Failed", "Rejected"]))
    projects = q.order_by(CarbonProject.start_date.asc()).all()
    result = []
    for p in projects:
        farmer = db.query(User).filter(User.id == p.user_id).first()
        plot = db.query(Plot).filter(Plot.id == p.plot_id).first()
        evidence = db.query(CarbonEvidence).filter(CarbonEvidence.project_id == p.id).all()
        credit_events = {
            event.action: event
            for event in db.query(AdminCreditDecision).filter(
                AdminCreditDecision.project_id == p.id,
            AdminCreditDecision.action.in_(["verification_approved", "registry_issued"]),
            ).all()
        }
        verification = credit_events.get("verification_approved")
        issuance = credit_events.get("registry_issued")
        verification_payload = _parse_decision_payload(verification.admin_note) if verification else {}
        issuance_payload = _parse_decision_payload(issuance.admin_note) if issuance else {}
        stage_events = db.query(AdminCreditDecision).filter(
            AdminCreditDecision.project_id == p.id,
            AdminCreditDecision.action == "workflow_event",
        ).order_by(AdminCreditDecision.decided_at.asc(), AdminCreditDecision.id.asc()).all()
        registered_stage = next((
            _parse_decision_payload(event.admin_note).get("metadata", {})
            for event in reversed(stage_events)
            if _parse_decision_payload(event.admin_note).get("to_stage") == "Registered"
        ), {})
        registered_project_reference = verification_payload.get("project_registry_reference") or registered_stage.get("project_registry_reference")
        aggregate_report_stage = next((
            _parse_decision_payload(event.admin_note).get("metadata", {})
            for event in reversed(stage_events)
            if _parse_decision_payload(event.admin_note).get("to_stage") == "Aggregate_Report_Submitted_To_ACVA"
        ), {})
        participant_record_stage = next((
            _parse_decision_payload(event.admin_note).get("metadata", {})
            for event in reversed(stage_events)
            if _parse_decision_payload(event.admin_note).get("to_stage") in {"Participant_Records_Ready", "Monitoring_Report_Ready"}
        ), {})
        shared_issue = None
        if not issuance and registered_project_reference:
            candidates = db.query(AdminCreditDecision).filter(AdminCreditDecision.action == "registry_issued").order_by(AdminCreditDecision.decided_at.desc()).all()
            shared_issue = next((event for event in candidates if _parse_decision_payload(event.admin_note).get("registry_project_reference") == registered_project_reference), None)
            if shared_issue:
                issuance = shared_issue
                issuance_payload = _parse_decision_payload(shared_issue.admin_note)
        audit_events = db.query(AdminCreditDecision).filter(
            AdminCreditDecision.project_id == p.id,
            AdminCreditDecision.action.in_(["workflow_event", "evidence_review", "monitoring_record", "allocation_proposed", "farmer_allocation", "allocation_declined", "buyer_sale", "farmer_payout", "farmer_transfer"]),
        ).order_by(AdminCreditDecision.decided_at.asc(), AdminCreditDecision.id.asc()).all()
        row_status = p.status
        if row_status in {"Verified", "Issued"} and not verification:
            row_status = "Legacy_Unverified"
        if row_status == "Issued" and not issuance:
            row_status = "Legacy_Unverified"
        ndvi_history = (
            db.query(PlotHistory)
            .filter(PlotHistory.plot_id == p.plot_id)
            .order_by(PlotHistory.date.asc())
            .all()
        )
        accepted_allocations = [event for event in audit_events if event.action == "farmer_allocation" and _parse_decision_payload(event.admin_note).get("farmer_accepted") is True]
        sales = [
            {**_parse_decision_payload(event.admin_note), "recorded_at": event.decided_at.isoformat() if event.decided_at else None}
            for event in audit_events if event.action == "buyer_sale"
        ]
        payouts = [
            {**_parse_decision_payload(event.admin_note), "recorded_at": event.decided_at.isoformat() if event.decided_at else None}
            for event in audit_events if event.action == "farmer_payout"
        ]
        transfers = [
            {**_parse_decision_payload(event.admin_note), "recorded_at": event.decided_at.isoformat() if event.decided_at else None, "credits_transferred": round(float(event.credits_issued or 0.0), 4)}
            for event in audit_events if event.action == "farmer_transfer"
        ]
        allocated_credits = round(sum(float(event.credits_issued or 0.0) for event in accepted_allocations), 4)
        sold_credits = round(sum(float(event.credits_issued or 0.0) for event in audit_events if event.action == "buyer_sale"), 4)
        transferred_credits = round(sum(float(event.credits_issued or 0.0) for event in audit_events if event.action == "farmer_transfer"), 4)
        farmer_due = round(sum(float(item.get("farmer_share_due_inr", 0.0) or 0.0) for item in sales), 2)
        farmer_paid = round(sum(float(item.get("amount_paid_inr", 0.0) or 0.0) for item in payouts), 2)
        result.append({
            "project_id": p.id,
            "farmer_name": farmer.name if farmer else "—",
            "farmer_phone": farmer.phone if farmer else "—",
            "district": farmer.district if farmer else "—",
            "plot_name": plot.name if plot else "—",
            "plot_area": plot.area if plot else 0,
            "crop_type": plot.crop_type if plot else "—",
            "methodology": p.methodology,
            "status": row_status,
            "start_date": p.start_date.isoformat() if p.start_date else None,
            "projected_credits": None,
            "verified_credits": round(float(verification.credits_issued or 0.0), 4) if verification else 0.0,
            "crediting_program": verification_payload.get("crediting_program"),
            "methodology_code": verification_payload.get("methodology_code"),
            "project_registry_reference": registered_project_reference,
            "participant_roster_reference": registered_stage.get("participant_roster_reference"),
            "validation_agency": verification_payload.get("validation_agency"),
            "validation_report_reference": verification_payload.get("validation_report_reference"),
            "verification_agency": verification_payload.get("verification_agency"),
            "verification_report_reference": verification_payload.get("verification_report_reference"),
            "monitoring_period_start": verification_payload.get("monitoring_period_start") or aggregate_report_stage.get("aggregate_monitoring_report_period_start") or participant_record_stage.get("period_start"),
            "monitoring_period_end": verification_payload.get("monitoring_period_end") or aggregate_report_stage.get("aggregate_monitoring_report_period_end") or participant_record_stage.get("period_end"),
            "aggregate_monitoring_report_reference": aggregate_report_stage.get("aggregate_monitoring_report_reference"),
            "registry_name": issuance_payload.get("registry_name"),
            "registry_project_reference": issuance_payload.get("registry_project_reference"),
            "registry_issuance_reference": issuance_payload.get("registry_issuance_reference"),
            "registry_serial_reference": issuance_payload.get("registry_serial_reference"),
            "registry_issued_credits": round(float(issuance.credits_issued or 0.0), 4) if issuance else 0.0,
            "farmer_allocation_credits": allocated_credits,
            "credits_sold": sold_credits,
            "available_credits": round(max(0.0, allocated_credits - sold_credits - transferred_credits), 4),
            "credits_transferred": transferred_credits,
            "farmer_share_percentage": _parse_decision_payload(accepted_allocations[-1].admin_note).get("farmer_share_percentage") if accepted_allocations else None,
            "farmer_payout_due_inr": farmer_due,
            "farmer_payout_paid_inr": farmer_paid,
            "sales": sales,
            "payouts": payouts,
            "transfers": transfers,
            "farmer_allocation_agreement_reference": _parse_decision_payload(accepted_allocations[-1].admin_note).get("agreement_reference") if accepted_allocations else issuance_payload.get("farmer_allocation_agreement_reference"),
            "workflow_stage": p.status,
            "intake_data": next((_parse_decision_payload(e.admin_note).get("intake_data", {}) for e in audit_events if e.action == "workflow_event" and _parse_decision_payload(e.admin_note).get("event_type") == "farmer_intake"), {}),
            "workflow_history": [
                {"action": e.action, **_parse_decision_payload(e.admin_note), "recorded_at": e.decided_at.isoformat() if e.decided_at else None}
                for e in audit_events
            ] + ([{"action": "registry_issued", **_parse_decision_payload(shared_issue.admin_note), "credits": round(float(shared_issue.credits_issued or 0.0), 4), "recorded_at": shared_issue.decided_at.isoformat() if shared_issue.decided_at else None, "shared_project_issue": True}] if shared_issue else []),
            "monitoring_records": [
                {**_parse_decision_payload(e.admin_note), "recorded_at": e.decided_at.isoformat() if e.decided_at else None}
                for e in audit_events if e.action == "monitoring_record"
            ],
            "accepted_farmer_allocation": round(sum(float(e.credits_issued or 0.0) for e in audit_events if e.action == "farmer_allocation" and _parse_decision_payload(e.admin_note).get("farmer_accepted") is True), 4),
            "additionality_score": None,
            "additionality_passes": None,
            "eligibility_note": "The external project partner determines eligibility; this platform records declarations, evidence, and partner references.",
            "evidence_count": len(evidence),
            "evidence": [
                {
                    "id": e.id,
                    "description": e.description,
                    "image_url": e.image_url,
                    "geo_lat": e.geo_lat,
                    "geo_lng": e.geo_lng,
                    "verified": e.verified,
                    "created_at": e.created_at.isoformat() if e.created_at else None,
                }
                for e in evidence
            ],
            "ndvi_trend": [
                {
                    "date": h.date.isoformat() if h.date else None,
                    "ndvi": round(h.ndvi, 3) if h.ndvi else None,
                }
                for h in ndvi_history[-12:]
            ],
            "health_score": plot.health_score if plot else 0,
            "moisture": plot.moisture if plot else 0,
            "last_scan": plot.last_scan_date.isoformat() if plot and plot.last_scan_date else None,
        })
    return {"count": len(result), "projects": result}
@router.post("/carbon/{project_id}/approve")
def approve_credits(
    project_id: int,
    body: ApproveRequest,
    db: Session = Depends(get_db),
    _: bool = Depends(require_admin),
):
    """Record an external independent verification; this step does not issue credits."""
    project = db.query(CarbonProject).filter(CarbonProject.id == project_id).with_for_update().first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if project.status not in {"Verification_Pending", "Under_Review"}:
        raise HTTPException(status_code=409, detail=f"External verification can only be recorded after project monitoring and report submission; current status is '{project.status}'.")
    prior = db.query(AdminCreditDecision).filter(
        AdminCreditDecision.project_id == project.id,
        AdminCreditDecision.action == "verification_approved",
    ).first()
    if prior:
        raise HTTPException(status_code=409, detail="An external verification is already recorded for this project.")
    required_fields = {
        "project_registry_reference": body.project_registry_reference,
        "validation_agency": body.validation_agency,
        "validation_report_reference": body.validation_report_reference,
        "verification_agency": body.verification_agency,
        "verification_report_reference": body.verification_report_reference,
        "monitoring_period_start": body.monitoring_period_start,
        "monitoring_period_end": body.monitoring_period_end,
    }
    missing = [name for name, value in required_fields.items() if not str(value or "").strip()]
    if missing:
        raise HTTPException(status_code=422, detail=f"Missing independent project records: {', '.join(missing)}")
    if not body.external_report_confirmed:
        raise HTTPException(status_code=422, detail="Confirm that the independent verification report matches this project and monitoring period.")
    program = (body.crediting_program or "").strip()
    method_code = (body.methodology_code or "").strip()
    try:
        period_start = datetime.fromisoformat(body.monitoring_period_start.strip())
        period_end = datetime.fromisoformat(body.monitoring_period_end.strip())
    except ValueError as exc:
        raise HTTPException(status_code=422, detail="Monitoring period dates must use ISO format (YYYY-MM-DD).") from exc
    if period_start > period_end or period_end.date() > datetime.utcnow().date():
        raise HTTPException(status_code=422, detail="Monitoring period must be ordered and cannot end in the future.")
    if project.start_date and period_start.date() < project.start_date.date():
        raise HTTPException(status_code=422, detail="Monitoring period cannot begin before project enrollment.")
    verified = float(body.verified_credits)
    if not math.isfinite(verified) or verified <= 0:
        raise HTTPException(status_code=422, detail="Verified tCO2e must be greater than zero and come from the external verification report.")
    verified = round(verified, 4)
    if verified <= 0:
        raise HTTPException(status_code=422, detail="Verified quantity must be at least 0.0001 tCO2e at the recorded precision.")
    payload = {
        "crediting_program": program,
        "methodology_code": method_code,
        "project_registry_reference": body.project_registry_reference.strip(),
        "validation_agency": body.validation_agency.strip(),
        "validation_report_reference": body.validation_report_reference.strip(),
        "verification_agency": body.verification_agency.strip(),
        "verification_report_reference": body.verification_report_reference.strip(),
        "aggregate_monitoring_report_reference": (body.aggregate_monitoring_report_reference or "").strip(),
        "monitoring_period_start": period_start.date().isoformat(),
        "monitoring_period_end": period_end.date().isoformat(),
        "external_report_confirmed": True,
        "admin_note": (body.admin_note or "").strip(),
        "source": "external_verification_report",
    }
    project.verified_credits = verified
    project.available_credits = 0.0
    project.locked_credits = 0.0
    previous_stage = project.status
    project.status = "Verified"
    project.admin_reviewed_at = datetime.utcnow()
    project.admin_notes = body.admin_note
    db.add(AdminCreditDecision(
        project_id=project.id,
        action="verification_approved",
        credits_issued=verified,
        admin_note=json.dumps(payload),
    ))
    db.add(AdminCreditDecision(
        project_id=project.id,
        action="workflow_event",
        admin_note=json.dumps({
            "from_stage": previous_stage,
            "to_stage": "Verified",
            "metadata": {"verification_agency": body.verification_agency.strip(), "verification_report_reference": body.verification_report_reference.strip(), "verified_tco2e": verified},
            "external_portal_submission_by_app": False,
        }),
    ))
    _log_operation(
        db,
        user_id=project.user_id,
        operation="carbon_verification_recorded",
        plot_id=project.plot_id,
        project_id=project.id,
        detail={"verified_tco2e": verified, "crediting_program": program, "methodology_code": method_code},
    )
    db.commit()
    return {
        "message": "External verification recorded. No farmer credits are available until registry issuance is confirmed.",
        "project_id": project.id,
        "verified_credits": verified,
        "available_for_farmer": 0.0,
        "status": "Verified",
    }
@router.post("/carbon/{project_id}/issue")
def record_registry_issuance(
    project_id: int,
    body: RegistryIssueRequest,
    db: Session = Depends(get_db),
    _: bool = Depends(require_admin),
):
    """Record an issuance that already exists in an external registry."""
    project = db.query(CarbonProject).filter(CarbonProject.id == project_id).with_for_update().first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if project.status != "Issuance_Review":        raise HTTPException(status_code=409, detail="Record the external issue request and registry review stages before logging a registry issuance.")
    if not body.registry_issuance_confirmed:
        raise HTTPException(status_code=422, detail="Confirm that the final issuance is visible in the external registry before recording credits in this app.")
    verification = db.query(AdminCreditDecision).filter(
        AdminCreditDecision.project_id == project.id,
        AdminCreditDecision.action == "verification_approved",
    ).first()
    if not verification:
        raise HTTPException(status_code=409, detail="No external verification record exists for this project.")
    verification_payload = _parse_decision_payload(verification.admin_note)
    if db.query(AdminCreditDecision).filter(
        AdminCreditDecision.project_id == project.id,
        AdminCreditDecision.action == "registry_issued",
    ).first():
        raise HTTPException(status_code=409, detail="Registry issuance is already recorded; duplicate issuance is blocked.")
    required = {
        "registry_name": body.registry_name,
        "registry_project_reference": body.registry_project_reference,
        "registry_issuance_reference": body.registry_issuance_reference,
        "registry_serial_reference": body.registry_serial_reference,
    }
    missing = [name for name, value in required.items() if not str(value or "").strip()]
    if missing:
        raise HTTPException(status_code=422, detail=f"Missing external registry issue records: {', '.join(missing)}")
    issued_input = float(body.credits_issued)
    if not math.isfinite(issued_input):
        raise HTTPException(status_code=422, detail="Registry issuance must be a finite quantity.")
    issued = round(issued_input, 4)
    verified = round(float(verification.credits_issued or 0.0), 4)
    if issued <= 0:
        raise HTTPException(status_code=422, detail="Registry issuance must be at least 0.0001 tCO2e at the recorded precision.")
    if issued > verified:
        raise HTTPException(status_code=422, detail="Registry-issued quantity cannot exceed the independently verified quantity.")
    verification_payload = _parse_decision_payload(verification.admin_note)
    if body.registry_project_reference.strip() != verification_payload.get("project_registry_reference"):
        raise HTTPException(status_code=422, detail="Registry project reference must match the project approved during validation.")
    registry_name = body.registry_name.strip()
    issuance_reference = body.registry_issuance_reference.strip()
    serial_reference = body.registry_serial_reference.strip()
    prior_issues = db.query(AdminCreditDecision).filter(AdminCreditDecision.action == "registry_issued").all()
    for existing in prior_issues:
        details = _parse_decision_payload(existing.admin_note)
        if (
            (details.get("registry_name", "").casefold() == registry_name.casefold()
             and details.get("registry_issuance_reference", "").casefold() == issuance_reference.casefold())
            or (details.get("registry_name", "").casefold() == registry_name.casefold()
                and details.get("registry_serial_reference", "").casefold() == serial_reference.casefold())
        ):
            raise HTTPException(status_code=409, detail="This registry issuance or serial reference has already been recorded.")
    payload = {
        "crediting_program": verification_payload.get("crediting_program"),
        "methodology_code": verification_payload.get("methodology_code"),
        "registry_name": registry_name,
        "registry_project_reference": body.registry_project_reference.strip(),
        "registry_issuance_reference": issuance_reference,
        "registry_serial_reference": serial_reference,
        "registry_issuance_confirmed": body.registry_issuance_confirmed,
        "registry_confirmation_source": "admin_checked_official_registry",
        "admin_note": (body.admin_note or "").strip(),
        "source": "external_registry_record",
    }
    previous_stage = project.status
    project.status = "Issued"
    project.available_credits = 0.0
    project.locked_credits = 0.0
    project.admin_reviewed_at = datetime.utcnow()
    project.admin_notes = body.admin_note
    db.add(AdminCreditDecision(
        project_id=project.id,
        action="registry_issued",
        credits_issued=issued,
        admin_note=json.dumps(payload),
    ))
    db.add(AdminCreditDecision(
        project_id=project.id,
        action="workflow_event",
        admin_note=json.dumps({"from_stage": previous_stage, "to_stage": "Issued", "metadata": payload, "external_portal_submission_by_app": False}),
    ))
    _log_operation(
        db,
        user_id=project.user_id,
        operation="registry_issuance_recorded",
        plot_id=project.plot_id,
        project_id=project.id,
        detail={"registry_issued_tco2e": issued, "issuance_reference": issuance_reference},
    )
    db.commit()
    return {
        "message": "External registry issuance recorded. Farmer credits remain unavailable until a documented allocation is proposed and accepted.",
        "project_id": project.id,
        "registry_issued_credits": issued,
        "status": "Issued",
    }
@router.post("/carbon/{project_id}/allocate")
def propose_farmer_allocation(
    project_id: int,
    body: AllocationProposalRequest,
    db: Session = Depends(get_db),
    _: bool = Depends(require_admin),
):
    """Propose a documented farmer share from an existing external registry issue."""
    project = db.query(CarbonProject).filter(CarbonProject.id == project_id).with_for_update().first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if project.status not in {"Issued", "Verified", "Participant_Records_Ready", "Aggregate_Report_Submitted_To_ACVA", "Monitoring_Report_Ready", "Verification_Pending"}:
        raise HTTPException(status_code=409, detail="The farmer must be in the project roster and have a monitoring report for the issue period before allocation.")
    project_allocation_events = db.query(AdminCreditDecision).filter(
        AdminCreditDecision.project_id == project.id,
        AdminCreditDecision.action.in_(["allocation_proposed", "farmer_allocation", "allocation_declined"]),
    ).all()
    resolved_proposals_for_project = {
        str(_parse_decision_payload(event.admin_note).get("proposal_event_id"))
        for event in project_allocation_events if event.action in {"farmer_allocation", "allocation_declined"}
    }
    pending_proposal_for_project = any(
        event.action == "allocation_proposed" and str(event.id) not in resolved_proposals_for_project
        for event in project_allocation_events
    )
    accepted_for_project = any(event.action == "farmer_allocation" and _parse_decision_payload(event.admin_note).get("farmer_accepted") is True for event in project_allocation_events)
    if pending_proposal_for_project or accepted_for_project:
        raise HTTPException(status_code=409, detail="An allocation proposal is awaiting the farmer, or a farmer allocation has already been accepted.")
    reference = body.registry_issuance_reference.strip()
    # Serialize allocations against the same registry issue so concurrent admins
    # cannot reserve more credits than the official batch contains.
    issue_candidates = db.query(AdminCreditDecision).filter(AdminCreditDecision.action == "registry_issued").order_by(AdminCreditDecision.decided_at.asc()).with_for_update().all()
    issue_event = next((event for event in issue_candidates if _parse_decision_payload(event.admin_note).get("registry_issuance_reference", "").casefold() == reference.casefold()), None)
    if not issue_event:
        raise HTTPException(status_code=409, detail="No confirmed external registry issuance is recorded for this project.")
    issue = _parse_decision_payload(issue_event.admin_note)
    if not issue.get("registry_issuance_confirmed"):
        raise HTTPException(status_code=409, detail="The external registry issue is not confirmed.")
    if reference.casefold() != str(issue.get("registry_issuance_reference", "")).casefold():
        raise HTTPException(status_code=422, detail="Allocation must reference the exact external registry issue recorded for this project.")
    workflow_events = db.query(AdminCreditDecision).filter(
        AdminCreditDecision.project_id == project.id,
        AdminCreditDecision.action == "workflow_event",
    ).order_by(AdminCreditDecision.decided_at.asc(), AdminCreditDecision.id.asc()).all()
    registered = next((
        _parse_decision_payload(event.admin_note).get("metadata", {})
        for event in reversed(workflow_events)
        if _parse_decision_payload(event.admin_note).get("to_stage") == "Registered"
    ), {})
    if str(registered.get("project_registry_reference", "")).strip() != str(issue.get("registry_project_reference", "")).strip():
        raise HTTPException(status_code=422, detail="The farmer's registered project reference must match the external registry issue.")
    participant_reference = str(registered.get("participant_roster_reference", "")).strip()
    if not participant_reference:
        raise HTTPException(status_code=422, detail="Record the farmer's participant ID from the project entity's registered roster before allocation.")
    issue_project_verification = db.query(AdminCreditDecision).filter(
        AdminCreditDecision.project_id == issue_event.project_id,
        AdminCreditDecision.action == "verification_approved",
    ).order_by(AdminCreditDecision.decided_at.desc()).first()
    issue_verification_payload = _parse_decision_payload(issue_project_verification.admin_note) if issue_project_verification else {}
    if issue_verification_payload.get("project_registry_reference") != issue.get("registry_project_reference"):
        raise HTTPException(status_code=409, detail="The registry issue must link to a recorded independent verification.")
    report_event = next((
        _parse_decision_payload(event.admin_note).get("metadata", {})
        for event in reversed(workflow_events)
        if _parse_decision_payload(event.admin_note).get("to_stage") in {"Participant_Records_Ready", "Monitoring_Report_Ready"}
    ), {})
    if not report_event.get("monitoring_records_snapshot"):
        raise HTTPException(status_code=422, detail="Prepare the farmer's monitoring report package before proposing an allocation.")
    try:
        farmer_period_start = datetime.fromisoformat(str(report_event.get("period_start"))).date()
        farmer_period_end = datetime.fromisoformat(str(report_event.get("period_end"))).date()
        verified_period_start = datetime.fromisoformat(str(issue_verification_payload.get("monitoring_period_start"))).date()
        verified_period_end = datetime.fromisoformat(str(issue_verification_payload.get("monitoring_period_end"))).date()
    except (TypeError, ValueError) as exc:
        raise HTTPException(status_code=409, detail="Both the farmer report and independent verification must include valid monitoring dates.") from exc
    if farmer_period_start < verified_period_start or farmer_period_end > verified_period_end:
        raise HTTPException(status_code=422, detail="The farmer monitoring report must fall within the independently verified period.")
    agreement = body.agreement_reference.strip()
    if not agreement:
        raise HTTPException(status_code=422, detail="A signed farmer allocation agreement reference is required.")
    amount = float(body.credits)
    if not math.isfinite(amount) or amount <= 0:
        raise HTTPException(status_code=422, detail="Allocation quantity must be a finite amount greater than zero.")
    amount = round(amount, 4)
    share_percentage = body.farmer_share_percentage
    if share_percentage is not None:
        share_percentage = float(share_percentage)
        if not math.isfinite(share_percentage) or share_percentage < 0 or share_percentage > 100:
            raise HTTPException(status_code=422, detail="Farmer revenue share must match the signed agreement and be between 0 and 100 percent.")
    existing = db.query(AdminCreditDecision).filter(
        AdminCreditDecision.action.in_(["allocation_proposed", "farmer_allocation", "allocation_declined"]),
    ).all()
    resolved_proposals = {
        str(_parse_decision_payload(event.admin_note).get("proposal_event_id"))
        for event in existing if event.action in {"farmer_allocation", "allocation_declined"}
    }
    reserved = 0.0
    for event in existing:
        details = _parse_decision_payload(event.admin_note)
        if details.get("registry_issuance_reference") != reference:
            continue
        if event.action == "farmer_allocation":
            reserved += float(event.credits_issued or 0.0)
        elif event.action == "allocation_proposed" and str(event.id) not in resolved_proposals:
            reserved += float(event.credits_issued or 0.0)
    issue_quantity = round(float(issue_event.credits_issued or 0.0), 4)
    if reserved + amount > issue_quantity + 0.00001:
        raise HTTPException(status_code=422, detail=f"Allocation exceeds the unallocated registry issue balance ({max(0.0, issue_quantity - reserved):.4f} tCO₂e remaining).")
    proposal = AdminCreditDecision(
        project_id=project.id,
        action="allocation_proposed",
        credits_issued=amount,
        admin_note=json.dumps({"registry_issuance_reference": reference, "agreement_reference": agreement, "farmer_share_percentage": share_percentage, "admin_note": (body.admin_note or "").strip(), "farmer_accepted": False}),
    )
    db.add(proposal)
    db.flush()
    project.status = "Allocation_Pending"
    project.available_credits = 0.0
    project.admin_reviewed_at = datetime.utcnow()
    _log_operation(db, project.user_id, "farmer_allocation_proposed", project.plot_id, project.id, {"credits": amount, "registry_issuance_reference": reference, "agreement_reference": agreement, "proposal_event_id": proposal.id})
    db.commit()
    return {"project_id": project.id, "status": project.status, "allocation_proposed": amount, "farmer_share_percentage": share_percentage, "registry_issuance_reference": reference, "message": "Allocation proposal recorded. The farmer must accept the signed quantity and revenue share before it is counted in their wallet."}
def _parse_decision_payload(raw: Optional[str]) -> dict:
    try:
        value = json.loads(raw or "{}")
        return value if isinstance(value, dict) else {}
    except (TypeError, ValueError):
        return {}
@router.post("/carbon/{project_id}/reject")
def reject_project(
    project_id: int,
    body: RejectRequest,
    db: Session = Depends(get_db),
    _: bool = Depends(require_admin),
):
    """Ops team rejects a carbon project with a mandatory reason."""
    project = db.query(CarbonProject).filter(CarbonProject.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if project.status in {"Verified", "Issued", "Withdrawn"}:
        raise HTTPException(status_code=409, detail="A verified, issued, or withdrawn project cannot be rejected through the intake queue.")
    project.status = "Audit_Failed"
    project.rejection_reason = body.rejection_reason
    project.admin_reviewed_at = datetime.utcnow()
    project.admin_notes = body.admin_note
    decision = AdminCreditDecision(
        project_id=project.id,
        action="rejected",
        credits_issued=0.0,
        rejection_reason=body.rejection_reason,
        admin_note=body.admin_note,
    )
    db.add(decision)
    _log_operation(
        db,
        user_id=project.user_id,
        operation="credit_rejected",
        plot_id=project.plot_id,
        project_id=project.id,
        detail={"reason": body.rejection_reason},
    )
    db.commit()
    return {
        "message": "Project rejected",
        "project_id": project_id,
        "rejection_reason": body.rejection_reason,
        "status": "Audit_Failed",
    }
@router.post("/carbon/{project_id}/sale")
def record_carbon_sale(
    project_id: int,
    body: BuyerSaleRequest,
    db: Session = Depends(get_db),
    _: bool = Depends(require_admin),
):
    """Record a buyer sale only after the project entity confirms settlement."""
    project = db.query(CarbonProject).filter(CarbonProject.id == project_id).with_for_update().first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    reference = body.registry_issuance_reference.strip()
    agreement = body.agreement_reference.strip()
    sale_reference = body.sale_reference.strip()
    settlement_reference = body.settlement_reference.strip()
    buyer_name = body.buyer_name.strip()
    if not all((reference, agreement, sale_reference, settlement_reference, buyer_name)):
        raise HTTPException(status_code=422, detail="Registry issue, signed agreement, buyer, sale, and buyer settlement references are required.")
    if not body.buyer_settlement_confirmed:
        raise HTTPException(status_code=422, detail="Confirm that buyer funds have settled before recording a sale.")
    try:
        settlement_date = datetime.fromisoformat(body.settlement_date.strip()).date()
    except (TypeError, ValueError) as exc:
        raise HTTPException(status_code=422, detail="Settlement date must use ISO format YYYY-MM-DD.") from exc
    if settlement_date > datetime.utcnow().date():
        raise HTTPException(status_code=422, detail="Settlement date cannot be in the future.")
    accepted = db.query(AdminCreditDecision).filter(
        AdminCreditDecision.project_id == project.id,
        AdminCreditDecision.action == "farmer_allocation",
    ).order_by(AdminCreditDecision.decided_at.asc(), AdminCreditDecision.id.asc()).all()
    accepted = [event for event in accepted if _parse_decision_payload(event.admin_note).get("farmer_accepted") is True]
    matching_allocations = [
        event for event in accepted
        if str(_parse_decision_payload(event.admin_note).get("registry_issuance_reference", "")).casefold() == reference.casefold()
    ]
    if not matching_allocations:
        raise HTTPException(status_code=409, detail="No farmer-accepted allocation is linked to this registry issue.")
    if not any(str(_parse_decision_payload(event.admin_note).get("agreement_reference", "")).strip() == agreement for event in matching_allocations):
        raise HTTPException(status_code=422, detail="The sale agreement reference must match the farmer's accepted allocation agreement.")
    issue_events = db.query(AdminCreditDecision).filter(AdminCreditDecision.action == "registry_issued").all()
    issue_event = next((event for event in issue_events if str(_parse_decision_payload(event.admin_note).get("registry_issuance_reference", "")).casefold() == reference.casefold()), None)
    if not issue_event or not _parse_decision_payload(issue_event.admin_note).get("registry_issuance_confirmed"):
        raise HTTPException(status_code=409, detail="The linked registry issue is not confirmed in the external registry record.")
    duplicate_events = db.query(AdminCreditDecision).filter(AdminCreditDecision.action == "buyer_sale").all()
    for event in duplicate_events:
        prior = _parse_decision_payload(event.admin_note)
        if str(prior.get("sale_reference", "")).casefold() == sale_reference.casefold():
            raise HTTPException(status_code=409, detail="Sale reference already exists; duplicate buyer sales are blocked.")
        if str(prior.get("settlement_reference", "")).casefold() == settlement_reference.casefold():
            raise HTTPException(status_code=409, detail="Buyer settlement reference already exists; duplicate settlements are blocked.")    prior_payouts = db.query(AdminCreditDecision).filter(        AdminCreditDecision.project_id == project.id,        AdminCreditDecision.action == "farmer_payout",    ).all()    for prior_event in duplicate_events:        prior_sale = _parse_decision_payload(prior_event.admin_note)        paid_for_sale = sum(float(_parse_decision_payload(payout.admin_note).get("amount_paid_inr", 0.0) or 0.0) for payout in prior_payouts if _parse_decision_payload(payout.admin_note).get("sale_reference") == prior_sale.get("sale_reference"))        if float(prior_sale.get("farmer_share_due_inr", 0.0) or 0.0) > paid_for_sale + 0.009:            raise HTTPException(status_code=409, detail="Record the farmer's outstanding payment for the previous sale before recording another buyer sale.")
    try:
        credits_sold = round(float(body.credits_sold), 4)
        gross = round(float(body.gross_proceeds_inr), 2)
        deductions = round(float(body.deductions_inr), 2)
    except (TypeError, ValueError) as exc:
        raise HTTPException(status_code=422, detail="Sale quantity and proceeds must be valid numbers.") from exc
    if not all(math.isfinite(value) for value in (credits_sold, gross, deductions)) or credits_sold <= 0 or gross <= 0 or deductions < 0 or deductions >= gross:
        raise HTTPException(status_code=422, detail="Enter a positive credit quantity and gross proceeds; deductions must be non-negative and less than gross proceeds.")
    allocated = round(sum(float(event.credits_issued or 0.0) for event in matching_allocations), 4)
    prior_sales = db.query(AdminCreditDecision).filter(
        AdminCreditDecision.project_id == project.id,
        AdminCreditDecision.action == "buyer_sale",
    ).all()
    already_sold = sum(
        float(event.credits_issued or 0.0)
        for event in prior_sales
        if str(_parse_decision_payload(event.admin_note).get("registry_issuance_reference", "")).casefold() == reference.casefold()
    )    prior_transfers = db.query(AdminCreditDecision).filter(        AdminCreditDecision.project_id == project.id,        AdminCreditDecision.action == "farmer_transfer",    ).all()    already_transferred = sum(        float(event.credits_issued or 0.0)        for event in prior_transfers        if str(_parse_decision_payload(event.admin_note).get("registry_issuance_reference", "")).casefold() == reference.casefold()    )
    remaining = round(max(0.0, allocated - already_sold - already_transferred), 4)
    if credits_sold > remaining + 0.00001:
        raise HTTPException(status_code=422, detail=f"Sale exceeds the farmer's unsold allocation ({remaining:.4f} tCO₂e remaining).")
    configured_shares = [
        float(value)
        for value in (_parse_decision_payload(event.admin_note).get("farmer_share_percentage") for event in matching_allocations)
        if value is not None
    ]
    share_percentage = body.farmer_share_percentage
    if configured_shares:
        if max(configured_shares) - min(configured_shares) > 0.00001:
            raise HTTPException(status_code=409, detail="This issue has allocations with different revenue shares. Record separate farmer project allocations before a sale.")
        contracted_share = configured_shares[0]
        if share_percentage is not None and abs(float(share_percentage) - contracted_share) > 0.00001:
            raise HTTPException(status_code=422, detail="Revenue share must match the share saved with the farmer's accepted allocation.")
        share_percentage = contracted_share
    if share_percentage is None:
        raise HTTPException(status_code=422, detail="This older allocation has no saved revenue share. Enter the percentage from the signed farmer agreement.")
    try:
        share_percentage = float(share_percentage)
    except (TypeError, ValueError) as exc:
        raise HTTPException(status_code=422, detail="Farmer revenue share must be a valid percentage.") from exc
    if not math.isfinite(share_percentage) or share_percentage <= 0 or share_percentage > 100:
        raise HTTPException(status_code=422, detail="Farmer revenue share must be between 0 and 100 percent.")
    net = round(gross - deductions, 2)
    farmer_share_due = round(net * share_percentage / 100.0, 2)
    if share_percentage is None or share_percentage <= 0:
        raise HTTPException(status_code=422, detail="A positive farmer revenue share must be recorded in the signed allocation before a cash sale.")
    payload = {
        "registry_issuance_reference": reference,
        "sale_reference": sale_reference,
        "buyer_name": buyer_name,
        "credits_sold": credits_sold,
        "gross_proceeds_inr": gross,
        "deductions_inr": deductions,
        "net_proceeds_inr": net,
        "farmer_share_percentage": share_percentage,
        "farmer_share_due_inr": farmer_share_due,
        "agreement_reference": agreement,
        "settlement_reference": settlement_reference,
        "settlement_date": settlement_date.isoformat(),
        "buyer_settlement_confirmed": True,
        "source": "externally_settled_buyer_sale_record",
        "admin_note": (body.admin_note or "").strip(),
    }
    db.add(AdminCreditDecision(project_id=project.id, action="buyer_sale", credits_issued=credits_sold, admin_note=json.dumps(payload, ensure_ascii=False)))
    _log_operation(db, project.user_id, "carbon_buyer_sale_recorded", project.plot_id, project.id, payload)
    db.commit()
    return {"project_id": project.id, "sale_reference": sale_reference, "credits_sold": credits_sold, "net_proceeds_inr": net, "farmer_share_due_inr": farmer_share_due, "message": "Settled buyer sale recorded. Farmer payment remains pending until an external transfer reference is recorded."}
@router.post("/carbon/{project_id}/payout")
def record_farmer_payout(
    project_id: int,
    body: FarmerPayoutRequest,
    db: Session = Depends(get_db),
    _: bool = Depends(require_admin),
):
    """Record an already-completed farmer transfer; does not initiate payment."""
    project = db.query(CarbonProject).filter(CarbonProject.id == project_id).with_for_update().first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    sale_reference = body.sale_reference.strip()
    payment_reference = body.payment_reference.strip()
    payment_method = body.payment_method.strip()
    if not all((sale_reference, payment_reference, payment_method)):
        raise HTTPException(status_code=422, detail="Sale, payment method, and completed transfer reference are required.")
    if not body.payment_confirmed:
        raise HTTPException(status_code=422, detail="Confirm that the farmer transfer has completed before recording it as paid.")
    try:
        payment_date = datetime.fromisoformat(body.payment_date.strip()).date()
        amount_paid = round(float(body.amount_paid_inr), 2)
    except (TypeError, ValueError) as exc:
        raise HTTPException(status_code=422, detail="Payment date and amount must be valid.") from exc
    if payment_date > datetime.utcnow().date() or not math.isfinite(amount_paid) or amount_paid <= 0:
        raise HTTPException(status_code=422, detail="Payment date cannot be in the future and payment amount must be positive.")
    sale_events = db.query(AdminCreditDecision).filter(
        AdminCreditDecision.project_id == project.id,
        AdminCreditDecision.action == "buyer_sale",
    ).all()
    sale_event = next((event for event in sale_events if str(_parse_decision_payload(event.admin_note).get("sale_reference", "")).casefold() == sale_reference.casefold()), None)
    if not sale_event:
        raise HTTPException(status_code=409, detail="No settled buyer sale with this reference exists for the farmer.")
    sale = _parse_decision_payload(sale_event.admin_note)
    all_payouts = db.query(AdminCreditDecision).filter(AdminCreditDecision.action == "farmer_payout").all()
    for event in all_payouts:
        if str(_parse_decision_payload(event.admin_note).get("payment_reference", "")).casefold() == payment_reference.casefold():
            raise HTTPException(status_code=409, detail="Payment reference already exists; duplicate farmer payments are blocked.")
    paid_so_far = sum(
        float(_parse_decision_payload(event.admin_note).get("amount_paid_inr", 0.0) or 0.0)
        for event in all_payouts
        if event.project_id == project.id and str(_parse_decision_payload(event.admin_note).get("sale_reference", "")).casefold() == sale_reference.casefold()
    )
    due = round(float(sale.get("farmer_share_due_inr", 0.0) or 0.0), 2)
    remaining_due = round(max(0.0, due - paid_so_far), 2)
    if amount_paid > remaining_due + 0.01:
        raise HTTPException(status_code=422, detail=f"Payment exceeds the unpaid farmer share (₹{remaining_due:.2f} remaining).")
    payload = {
        "sale_reference": sale_reference,
        "payment_method": payment_method,
        "payment_reference": payment_reference,
        "amount_paid_inr": amount_paid,
        "payment_date": payment_date.isoformat(),
        "payment_confirmed": True,
        "source": "externally_completed_farmer_transfer_record",
        "admin_note": (body.admin_note or "").strip(),
    }
    db.add(AdminCreditDecision(project_id=project.id, action="farmer_payout", admin_note=json.dumps(payload, ensure_ascii=False)))
    _log_operation(db, project.user_id, "carbon_farmer_payout_recorded", project.plot_id, project.id, payload)
    db.commit()
    return {"project_id": project.id, "sale_reference": sale_reference, "amount_paid_inr": amount_paid, "remaining_due_inr": round(max(0.0, remaining_due - amount_paid), 2), "message": "Completed farmer transfer recorded with its payment reference."}
@router.post("/carbon/{project_id}/transfer")
def record_farmer_registry_transfer(
    project_id: int,
    body: RegistryTransferRequest,
    db: Session = Depends(get_db),
    _: bool = Depends(require_admin),
):
    """Record registry units already transferred to the farmer's own account."""
    project = db.query(CarbonProject).filter(CarbonProject.id == project_id).with_for_update().first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    reference = body.registry_issuance_reference.strip()
    transfer_reference = body.transfer_reference.strip()
    account_reference = body.registry_account_reference.strip()
    serial_reference = body.serial_reference.strip()
    agreement = body.agreement_reference.strip()
    if not all((reference, transfer_reference, account_reference, serial_reference, agreement)):
        raise HTTPException(status_code=422, detail="Registry issue, completed transfer, farmer account, serials, and signed agreement references are required.")
    if not body.transfer_confirmed:
        raise HTTPException(status_code=422, detail="Confirm the registry already shows the units in the farmer's account before recording this transfer.")
    try:
        transfer_date = datetime.fromisoformat(body.transfer_date.strip()).date()
        quantity = round(float(body.credits_transferred), 4)
    except (TypeError, ValueError) as exc:
        raise HTTPException(status_code=422, detail="Transfer date and credit quantity must be valid.") from exc
    if transfer_date > datetime.utcnow().date() or not math.isfinite(quantity) or quantity <= 0:
        raise HTTPException(status_code=422, detail="Transfer date cannot be in the future and quantity must be positive.")
    accepted = db.query(AdminCreditDecision).filter(
        AdminCreditDecision.project_id == project.id,
        AdminCreditDecision.action == "farmer_allocation",
    ).order_by(AdminCreditDecision.decided_at.asc(), AdminCreditDecision.id.asc()).all()
    matching_allocations = [event for event in accepted if _parse_decision_payload(event.admin_note).get("farmer_accepted") is True and str(_parse_decision_payload(event.admin_note).get("registry_issuance_reference", "")).casefold() == reference.casefold()]
    if not matching_allocations:
        raise HTTPException(status_code=409, detail="No farmer-accepted allocation is linked to this registry issue.")
    if not any(str(_parse_decision_payload(event.admin_note).get("agreement_reference", "")).strip() == agreement for event in matching_allocations):
        raise HTTPException(status_code=422, detail="The transfer agreement must match the farmer's accepted allocation agreement.")
    issue_events = db.query(AdminCreditDecision).filter(AdminCreditDecision.action == "registry_issued").all()
    issue_event = next((event for event in issue_events if str(_parse_decision_payload(event.admin_note).get("registry_issuance_reference", "")).casefold() == reference.casefold()), None)
    if not issue_event or not _parse_decision_payload(issue_event.admin_note).get("registry_issuance_confirmed"):
        raise HTTPException(status_code=409, detail="The linked registry issue is not confirmed in the external registry.")
    transfer_events = db.query(AdminCreditDecision).filter(AdminCreditDecision.action == "farmer_transfer").all()
    for event in transfer_events:
        prior_transfer = _parse_decision_payload(event.admin_note)        if str(prior_transfer.get("transfer_reference", "")).casefold() == transfer_reference.casefold():
            raise HTTPException(status_code=409, detail="Registry transfer reference already exists; duplicate transfers are blocked.")        if str(prior_transfer.get("registry_issuance_reference", "")).casefold() == reference.casefold() and str(prior_transfer.get("serial_reference", "")).casefold() == serial_reference.casefold():            raise HTTPException(status_code=409, detail="These serial numbers are already recorded as transferred for this registry issue.")
    all_sales = db.query(AdminCreditDecision).filter(AdminCreditDecision.project_id == project.id, AdminCreditDecision.action == "buyer_sale").all()
    all_transfers = db.query(AdminCreditDecision).filter(AdminCreditDecision.project_id == project.id, AdminCreditDecision.action == "farmer_transfer").all()
    allocated = sum(float(event.credits_issued or 0.0) for event in matching_allocations)
    already_sold = sum(float(event.credits_issued or 0.0) for event in all_sales if str(_parse_decision_payload(event.admin_note).get("registry_issuance_reference", "")).casefold() == reference.casefold())
    already_transferred = sum(float(event.credits_issued or 0.0) for event in all_transfers if str(_parse_decision_payload(event.admin_note).get("registry_issuance_reference", "")).casefold() == reference.casefold())
    remaining = round(max(0.0, allocated - already_sold - already_transferred), 4)
    if quantity > remaining + 0.00001:
        raise HTTPException(status_code=422, detail=f"Transfer exceeds the farmer's remaining allocation ({remaining:.4f} tCO₂e remaining).")
    payload = {
        "registry_issuance_reference": reference,
        "transfer_reference": transfer_reference,
        "registry_account_reference": account_reference,
        "serial_reference": serial_reference,
        "agreement_reference": agreement,
        "transfer_date": transfer_date.isoformat(),
        "transfer_confirmed": True,
        "source": "externally_completed_registry_transfer_record",
        "admin_note": (body.admin_note or "").strip(),
    }
    db.add(AdminCreditDecision(project_id=project.id, action="farmer_transfer", credits_issued=quantity, admin_note=json.dumps(payload, ensure_ascii=False)))
    _log_operation(db, project.user_id, "carbon_farmer_registry_transfer_recorded", project.plot_id, project.id, {**payload, "credits_transferred": quantity})
    db.commit()
    return {"project_id": project.id, "credits_transferred": quantity, "remaining_credits": round(max(0.0, remaining - quantity), 4), "message": "Completed registry transfer recorded with farmer account and serial references."}

# ─── Field Monitor ─────────────────────────────────────────────────────────
def _plot_registry_allocation(db: Session, plot_id: int) -> float:
    project_ids = [
        row[0] for row in db.query(CarbonProject.id).filter(CarbonProject.plot_id == plot_id).all()
    ]
    if not project_ids:
        return 0.0
    events = db.query(AdminCreditDecision).filter(
        AdminCreditDecision.project_id.in_(project_ids),
        AdminCreditDecision.action == "farmer_allocation",
    ).all()
    return round(sum(
        float(event.credits_issued or 0.0)
        for event in events if _parse_decision_payload(event.admin_note).get("farmer_accepted") is True
    ), 3)
@router.get("/plots")
def list_all_plots(
    page: int = Query(1, ge=1),
    limit: int = Query(30, le=100),
    stale_days: int = Query(30),
    db: Session = Depends(get_db),
    _: bool = Depends(require_admin),
):
    """All plots across all farmers — sorted by last scan date."""
    from datetime import timedelta
    stale_threshold = datetime.utcnow() - timedelta(days=stale_days)
    plots = db.query(Plot).offset((page - 1) * limit).limit(limit).all()
    total = db.query(func.count(Plot.id)).scalar() or 0
    result = []
    for p in plots:
        farmer = db.query(User).filter(User.id == p.user_id).first()
        is_stale = (p.last_scan_date is None) or (p.last_scan_date < stale_threshold)
        active_alerts = (
            db.query(func.count(DiseaseRiskAlert.id))
            .filter(DiseaseRiskAlert.plot_id == p.id, DiseaseRiskAlert.is_active == True)
            .scalar() or 0
        )
        result.append({
            "id": p.id,
            "name": p.name,
            "farmer_name": farmer.name if farmer else "—",
            "farmer_id": p.user_id,
            "district": farmer.district if farmer else "—",
            "area": p.area,
            "crop_type": p.crop_type or "—",
            "health_score": round(p.health_score, 3),
            "moisture": round(p.moisture, 1),
            "carbon_credits": _plot_registry_allocation(db, p.id),
            "last_scan_date": p.last_scan_date.isoformat() if p.last_scan_date else None,
            "is_stale": is_stale,
            "active_disease_alerts": active_alerts,
        })
    return {"total": total, "page": page, "plots": result}
@router.get("/plots/{plot_id}")
def get_plot_detail(
    plot_id: int,
    db: Session = Depends(get_db),
    _: bool = Depends(require_admin),
):
    plot = db.query(Plot).filter(Plot.id == plot_id).first()
    if not plot:
        raise HTTPException(status_code=404, detail="Plot not found")
    farmer = db.query(User).filter(User.id == plot.user_id).first()
    history = (
        db.query(PlotHistory)
        .filter(PlotHistory.plot_id == plot_id)
        .order_by(PlotHistory.date.asc())
        .all()
    )
    disease_alerts = (
        db.query(DiseaseRiskAlert)
        .filter(DiseaseRiskAlert.plot_id == plot_id)
        .order_by(DiseaseRiskAlert.trigger_date.desc())
        .all()
    )
    ops_logs = (
        db.query(FarmerOperationLog)
        .filter(FarmerOperationLog.plot_id == plot_id)
        .order_by(FarmerOperationLog.created_at.desc())
        .all()
    )
    return {
        "plot": {
            "id": plot.id,
            "name": plot.name,
            "area": plot.area,
            "crop_type": plot.crop_type,
            "health_score": plot.health_score,
            "moisture": plot.moisture,
            "carbon_credits": _plot_registry_allocation(db, plot.id),
            "organic_score": plot.organic_score,
            "last_scan_date": plot.last_scan_date.isoformat() if plot.last_scan_date else None,
            "image_url": plot.image_url,
        },
        "farmer": {
            "id": farmer.id if farmer else None,
            "name": farmer.name if farmer else "—",
            "phone": farmer.phone if farmer else "—",
            "district": farmer.district if farmer else "—",
        },
        "ndvi_history": [
            {
                "date": h.date.isoformat() if h.date else None,
                "ndvi": round(h.ndvi, 3) if h.ndvi else None,
                "evi": round(h.evi, 3) if h.evi else None,
                "is_anomaly": h.is_anomaly,
            }
            for h in history
        ],
        "disease_alerts": [
            {
                "id": a.id,
                "disease_name": a.disease_name,
                "risk_level": a.risk_level,
                "recommendation": a.recommendation,
                "trigger_date": a.trigger_date.isoformat() if a.trigger_date else None,
                "is_active": a.is_active,
            }
            for a in disease_alerts
        ],
        "operation_log": [
            {
                "id": op.id,
                "operation": op.operation,
                "detail": op.detail,
                "created_at": op.created_at.isoformat() if op.created_at else None,
            }
            for op in ops_logs
        ],
    }
# ─── Operations Log ────────────────────────────────────────────────────────
@router.get("/operations")
def operations_log(
    page: int = Query(1, ge=1),
    limit: int = Query(50, le=200),
    farmer_id: Optional[int] = Query(None),
    operation: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _: bool = Depends(require_admin),
):
    q = db.query(FarmerOperationLog).order_by(FarmerOperationLog.created_at.desc())
    if farmer_id:
        q = q.filter(FarmerOperationLog.user_id == farmer_id)
    if operation:
        q = q.filter(FarmerOperationLog.operation == operation)
    total = q.count()
    logs = q.offset((page - 1) * limit).limit(limit).all()
    result = []
    for log in logs:
        farmer = db.query(User).filter(User.id == log.user_id).first()
        result.append({
            "id": log.id,
            "farmer_name": farmer.name if farmer else "—",
            "farmer_id": log.user_id,
            "plot_id": log.plot_id,
            "project_id": log.project_id,
            "operation": log.operation,
            "detail": log.detail,
            "created_at": log.created_at.isoformat() if log.created_at else None,
        })
    return {"total": total, "page": page, "logs": result}
# ─── CSV Export ────────────────────────────────────────────────────────────
@router.get("/export/credits")
def export_credits_csv(
    db: Session = Depends(get_db),
    _: bool = Depends(require_admin),
):
    """Export only registry-issued credits and documented farmer allocations."""
    issue_events = db.query(AdminCreditDecision).filter(
        AdminCreditDecision.action == "registry_issued"
    ).order_by(AdminCreditDecision.decided_at.asc()).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Project_ID", "Farmer_Name", "Farmer_Phone", "District",
        "Plot_Name", "Plot_Area_Ha", "Crop_Type",
        "Methodology", "Registry_Issued_tCO2e", "Farmer_Allocation_tCO2e",
        "Registry_Name", "Registry_Project_Reference", "Registry_Issuance_Reference",
        "Registry_Serial_Reference", "Allocation_Agreement_Reference", "Issued_At",
    ])
    for event in issue_events:
        p = db.query(CarbonProject).filter(CarbonProject.id == event.project_id).first()
        if not p:
            continue
        farmer = db.query(User).filter(User.id == p.user_id).first()
        plot = db.query(Plot).filter(Plot.id == p.plot_id).first()
        payload = _parse_decision_payload(event.admin_note)
        accepted_allocations = db.query(AdminCreditDecision).filter(
            AdminCreditDecision.action == "farmer_allocation",
        ).order_by(AdminCreditDecision.decided_at.asc()).all()
        accepted_allocations = [row for row in accepted_allocations if _parse_decision_payload(row.admin_note).get("farmer_accepted") is True and _parse_decision_payload(row.admin_note).get("registry_issuance_reference") == payload.get("registry_issuance_reference")]
        allocated = sum(float(row.credits_issued or 0.0) for row in accepted_allocations)
        agreement_reference = _parse_decision_payload(accepted_allocations[-1].admin_note).get("agreement_reference", "") if accepted_allocations else ""
        writer.writerow([
            p.id,
            farmer.name if farmer else "—",
            farmer.phone if farmer else "—",
            farmer.district if farmer else "—",
            plot.name if plot else "—",
            plot.area if plot else 0,
            plot.crop_type if plot else "—",
            p.methodology,
            round(float(event.credits_issued or 0.0), 4),
            round(allocated, 4),
            payload.get("registry_name", ""),
            payload.get("registry_project_reference", ""),
            payload.get("registry_issuance_reference", ""),
            payload.get("registry_serial_reference", ""),
            agreement_reference,
            event.decided_at.isoformat() if event.decided_at else "—",
        ])
    output.seek(0)
    filename = f"krishi_drishti_credits_{datetime.utcnow().strftime('%Y%m%d')}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
