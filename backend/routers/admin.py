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
import json
import os
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
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

def require_admin(authorization: Optional[str] = Query(None, alias="token")):
    """
    Verifies the static admin bearer token from ?token= query param.
    Token is read from env at request time (not module load time) to
    correctly pick up load_dotenv() values.
    """
    admin_token = os.getenv("ADMIN_SECRET_TOKEN", "kd_admin_changeme_in_env")
    if not authorization or authorization != admin_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing admin token.",
        )
    return True


# ─── Pydantic ─────────────────────────────────────────────────────────────

class ApproveRequest(BaseModel):
    credits_to_issue: float
    admin_note: Optional[str] = None


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


# ─── KPI ──────────────────────────────────────────────────────────────────

@router.get("/stats")
def platform_stats(db: Session = Depends(get_db), _: bool = Depends(require_admin)):
    """Top-level platform KPIs for the admin dashboard banner."""
    total_farmers = db.query(func.count(User.id)).scalar() or 0
    total_plots = db.query(func.count(Plot.id)).scalar() or 0
    total_projects = db.query(func.count(CarbonProject.id)).scalar() or 0

    pending_queue = (
        db.query(func.count(CarbonProject.id))
        .filter(CarbonProject.status == "Evidence_Pending")
        .scalar() or 0
    )

    total_credits_issued = (
        db.query(func.coalesce(func.sum(CarbonProject.verified_credits), 0.0))
        .filter(CarbonProject.status.in_(["Verified", "Issued"]))
        .scalar() or 0.0
    )

    total_credits_available = (
        db.query(func.coalesce(func.sum(CarbonProject.available_credits), 0.0))
        .scalar() or 0.0
    )

    total_transactions = db.query(func.count(CarbonTransaction.id)).scalar() or 0
    total_payout_inr = (
        db.query(func.coalesce(func.sum(CarbonTransaction.farmer_payout_inr), 0.0))
        .scalar() or 0.0
    )

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

    # Monthly credits issued (last 6 months by transaction created_at)
    monthly_credits = (
        db.query(
            func.strftime("%Y-%m", CarbonTransaction.created_at).label("month"),
            func.sum(CarbonTransaction.amount_credits).label("credits"),
        )
        .group_by("month")
        .order_by("month")
        .limit(12)
        .all()
    )

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
        "monthly_credits": [
            {"month": m, "credits": round(float(c or 0), 2)}
            for m, c in monthly_credits
        ],
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
        total_credits = sum(p.verified_credits for p in projects)
        total_available = sum(p.available_credits for p in projects)

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
                "carbon_credits": p.carbon_credits,
                "last_scan_date": p.last_scan_date.isoformat() if p.last_scan_date else None,
            }
            for p in plots
        ],
        "projects": [
            {
                "id": pr.id,
                "methodology": pr.methodology,
                "status": pr.status,
                "verified_credits": pr.verified_credits,
                "available_credits": pr.available_credits,
                "additionality_score": pr.additionality_score,
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
        q = q.filter(CarbonProject.status == "Evidence_Pending")

    projects = q.order_by(CarbonProject.start_date.asc()).all()

    result = []
    for p in projects:
        farmer = db.query(User).filter(User.id == p.user_id).first()
        plot = db.query(Plot).filter(Plot.id == p.plot_id).first()
        evidence = db.query(CarbonEvidence).filter(CarbonEvidence.project_id == p.id).all()
        ndvi_history = (
            db.query(PlotHistory)
            .filter(PlotHistory.plot_id == p.plot_id)
            .order_by(PlotHistory.date.asc())
            .all()
        )

        result.append({
            "project_id": p.id,
            "farmer_name": farmer.name if farmer else "—",
            "farmer_phone": farmer.phone if farmer else "—",
            "district": farmer.district if farmer else "—",
            "plot_name": plot.name if plot else "—",
            "plot_area": plot.area if plot else 0,
            "crop_type": plot.crop_type if plot else "—",
            "methodology": p.methodology,
            "status": p.status,
            "start_date": p.start_date.isoformat() if p.start_date else None,
            "projected_credits": round(p.projected_sequestration, 2),
            "additionality_score": round(p.additionality_score, 3),
            "additionality_passes": p.additionality_score < 0.5,
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
    """Ops team approves a carbon project and issues credits manually."""
    project = db.query(CarbonProject).filter(CarbonProject.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if project.status not in ["Evidence_Pending", "Verified"]:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot approve project in status '{project.status}'",
        )

    credits = body.credits_to_issue
    buffer_pct = project.buffer_pool_percentage / 100.0
    buffer_locked = round(credits * buffer_pct, 3)
    credits_available = round(credits - buffer_locked, 3)

    project.verified_credits = credits
    project.available_credits = credits_available
    project.locked_credits = buffer_locked
    project.status = "Issued"
    project.admin_reviewed_at = datetime.utcnow()
    project.admin_notes = body.admin_note

    # Update linked plot
    plot = db.query(Plot).filter(Plot.id == project.plot_id).first()
    if plot:
        plot.carbon_credits = credits_available

    # Audit decision record
    decision = AdminCreditDecision(
        project_id=project.id,
        action="approved",
        credits_issued=credits,
        admin_note=body.admin_note,
    )
    db.add(decision)

    # Operation log
    _log_operation(
        db,
        user_id=project.user_id,
        operation="credit_issued",
        plot_id=project.plot_id,
        project_id=project.id,
        detail={
            "credits_issued": credits,
            "available": credits_available,
            "buffer_locked": buffer_locked,
            "admin_note": body.admin_note,
        },
    )

    db.commit()

    return {
        "message": f"Credits approved and issued: {credits} tCO2e",
        "project_id": project_id,
        "credits_issued": credits,
        "available_for_farmer": credits_available,
        "buffer_locked": buffer_locked,
        "status": "Issued",
    }


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


# ─── Field Monitor ─────────────────────────────────────────────────────────

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
            "carbon_credits": p.carbon_credits,
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
            "carbon_credits": plot.carbon_credits,
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
    """Export all issued credits as CSV for CCTS/BEE submission."""
    projects = db.query(CarbonProject).filter(
        CarbonProject.status.in_(["Verified", "Issued"])
    ).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Project_ID", "Farmer_Name", "Farmer_Phone", "District",
        "Plot_Name", "Plot_Area_Ha", "Crop_Type",
        "Methodology", "Status", "Verified_Credits_tCO2e",
        "Available_Credits", "Buffer_Locked", "Additionality_Score",
        "Start_Date", "Admin_Reviewed_At",
    ])

    for p in projects:
        farmer = db.query(User).filter(User.id == p.user_id).first()
        plot = db.query(Plot).filter(Plot.id == p.plot_id).first()
        writer.writerow([
            p.id,
            farmer.name if farmer else "—",
            farmer.phone if farmer else "—",
            farmer.district if farmer else "—",
            plot.name if plot else "—",
            round(plot.area / 2.471, 2) if plot else 0,  # acres → ha
            plot.crop_type if plot else "—",
            p.methodology,
            p.status,
            round(p.verified_credits, 3),
            round(p.available_credits, 3),
            round(p.locked_credits, 3),
            round(p.additionality_score, 3),
            p.start_date.isoformat() if p.start_date else "—",
            p.admin_reviewed_at.isoformat() if p.admin_reviewed_at else "—",
        ])

    output.seek(0)
    filename = f"krishi_drishti_credits_{datetime.utcnow().strftime('%Y%m%d')}.csv"

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
