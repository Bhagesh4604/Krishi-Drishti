"""
KYC Router — Krishi-Drishti dMRV Pipeline
==========================================
Pillar 3: Identity + Land-Tenure Verification

Endpoints:
  Farmer-facing:
    POST /api/kyc/submit      — Farmer uploads ID + land documents
    GET  /api/kyc/status      — Farmer checks their KYC status

  Admin-facing (requires admin token):
    GET  /api/admin/kyc/queue          — All pending KYC submissions
    POST /api/admin/kyc/{id}/approve   — Admin verifies KYC
    POST /api/admin/kyc/{id}/reject    — Admin rejects with reason

KYC must be "Verified" before a farmer can enroll in carbon credits.
"""

import os
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database import get_db
from ..dependencies import get_current_user
from ..models import FarmerKYC, User
from ..services.upload_service import is_configured as cloudinary_ready

router = APIRouter(prefix="/api/kyc", tags=["kyc"])


# ── Admin auth (reuse same pattern as admin.py) ───────────────────────────────

def require_admin(authorization: Optional[str] = None):
    from fastapi import Query
    admin_token = os.getenv("ADMIN_SECRET_TOKEN", "kd_admin_changeme_in_env")
    if not authorization or authorization != admin_token:
        raise HTTPException(status_code=401, detail="Invalid or missing admin token.")
    return True


# ── Pydantic ──────────────────────────────────────────────────────────────────

class KYCStatusResponse(BaseModel):
    kyc_status: str
    id_type: Optional[str]
    land_area_acres: Optional[float]
    land_ownership_type: Optional[str]
    submitted_at: Optional[datetime]
    kyc_verified_at: Optional[datetime]
    kyc_notes: Optional[str]
    message: str

    class Config:
        from_attributes = True


class KYCAdminApprove(BaseModel):
    notes: Optional[str] = None


class KYCAdminReject(BaseModel):
    reason: str


# ── Farmer Endpoints ──────────────────────────────────────────────────────────

@router.post("/submit")
async def submit_kyc(
    id_type: str = Form(..., description="Aadhaar | Voter_ID | Kisan_Card | PAN"),
    id_number_last4: str = Form(..., description="Last 4 digits of ID number only"),
    land_area_acres: float = Form(...),
    land_ownership_type: str = Form(..., description="Owned | Leased | Cooperative"),
    id_doc: UploadFile = File(..., description="Scan of identity document (JPG/PNG/PDF)"),
    land_deed: UploadFile = File(None, description="Land deed / Patta / 7-12 extract"),
    land_survey: UploadFile = File(None, description="Agricultural survey document"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Farmer submits KYC documents for identity and land-tenure verification.
    Documents are uploaded to Cloudinary. Status set to 'Pending' until admin approves.

    Required:
    - Government-issued photo ID (Aadhaar / Voter ID / Kisan Credit Card / PAN)
    - Last 4 digits of ID number (we never store the full number)
    - Land ownership type and area
    - Scanned copy of ID document

    Optional but recommended:
    - Land deed / Patta / 7-12 extract (required for Verra/CCTS compliance)
    - Agricultural survey document
    """
    # Validate id_type
    valid_id_types = {"Aadhaar", "Voter_ID", "Kisan_Card", "PAN"}
    if id_type not in valid_id_types:
        raise HTTPException(400, detail=f"id_type must be one of: {', '.join(valid_id_types)}")

    # Validate last 4 digits
    if not id_number_last4.isdigit() or len(id_number_last4) != 4:
        raise HTTPException(400, detail="id_number_last4 must be exactly 4 digits")

    # Validate ownership type
    valid_ownership = {"Owned", "Leased", "Cooperative"}
    if land_ownership_type not in valid_ownership:
        raise HTTPException(400, detail=f"land_ownership_type must be one of: {', '.join(valid_ownership)}")

    # Check if KYC already verified
    existing = db.query(FarmerKYC).filter(FarmerKYC.user_id == current_user.id).first()
    if existing and existing.kyc_status == "Verified":
        raise HTTPException(400, detail="Your KYC is already verified. No changes needed.")

    # Upload identity document
    id_doc_url = None
    land_deed_url = None
    land_survey_url = None

    if cloudinary_ready():
        try:
            from ..services.upload_service import upload_evidence_photo
            id_content = await id_doc.read()
            result = upload_evidence_photo(
                file_bytes=id_content,
                content_type=id_doc.content_type,
                farmer_id=current_user.id,
                project_id=0,  # KYC docs go to a separate folder
            )
            id_doc_url = result["url"]
        except Exception as e:
            print(f"[KYC] ID doc upload failed: {e}")

        if land_deed:
            try:
                deed_content = await land_deed.read()
                result = upload_evidence_photo(
                    file_bytes=deed_content,
                    content_type=land_deed.content_type,
                    farmer_id=current_user.id,
                    project_id=0,
                )
                land_deed_url = result["url"]
            except Exception as e:
                print(f"[KYC] Land deed upload failed: {e}")

        if land_survey:
            try:
                survey_content = await land_survey.read()
                result = upload_evidence_photo(
                    file_bytes=survey_content,
                    content_type=land_survey.content_type,
                    farmer_id=current_user.id,
                    project_id=0,
                )
                land_survey_url = result["url"]
            except Exception as e:
                print(f"[KYC] Survey upload failed: {e}")

    # Upsert KYC record
    if existing:
        existing.id_type = id_type
        existing.id_number_masked = f"xxxx-{id_number_last4}"
        existing.id_doc_url = id_doc_url or existing.id_doc_url
        existing.land_deed_url = land_deed_url or existing.land_deed_url
        existing.land_survey_url = land_survey_url or existing.land_survey_url
        existing.land_area_acres = land_area_acres
        existing.land_ownership_type = land_ownership_type
        existing.kyc_status = "Pending"
        existing.submitted_at = datetime.utcnow()
        kyc_record = existing
    else:
        kyc_record = FarmerKYC(
            user_id=current_user.id,
            id_type=id_type,
            id_number_masked=f"xxxx-{id_number_last4}",
            id_doc_url=id_doc_url,
            land_deed_url=land_deed_url,
            land_survey_url=land_survey_url,
            land_area_acres=land_area_acres,
            land_ownership_type=land_ownership_type,
            kyc_status="Pending",
        )
        db.add(kyc_record)

    # Update user KYC status
    current_user.kyc_status = "Pending"
    db.commit()

    return {
        "message": "KYC documents submitted successfully. Our team will verify within 2-3 business days.",
        "kyc_status": "Pending",
        "id_type": id_type,
        "documents_uploaded": {
            "id_document": id_doc_url is not None,
            "land_deed": land_deed_url is not None,
            "land_survey": land_survey_url is not None,
        },
    }


@router.get("/status", response_model=KYCStatusResponse)
def get_kyc_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Farmer checks their current KYC verification status."""
    kyc = db.query(FarmerKYC).filter(FarmerKYC.user_id == current_user.id).first()

    if not kyc:
        return KYCStatusResponse(
            kyc_status="Not_Submitted",
            id_type=None,
            land_area_acres=None,
            land_ownership_type=None,
            submitted_at=None,
            kyc_verified_at=None,
            kyc_notes=None,
            message="You have not submitted KYC documents yet. Complete KYC to enroll in carbon credits.",
        )

    messages = {
        "Pending": "Your KYC documents are under review. This typically takes 2-3 business days.",
        "Verified": "✅ KYC verified! You can now enroll your plots in carbon credit projects.",
        "Rejected": f"❌ KYC was rejected: {kyc.kyc_notes or 'Please re-submit with correct documents.'}",
    }

    return KYCStatusResponse(
        kyc_status=kyc.kyc_status,
        id_type=kyc.id_type,
        land_area_acres=kyc.land_area_acres,
        land_ownership_type=kyc.land_ownership_type,
        submitted_at=kyc.submitted_at,
        kyc_verified_at=kyc.kyc_verified_at,
        kyc_notes=kyc.kyc_notes,
        message=messages.get(kyc.kyc_status, "Unknown status"),
    )


# ── Admin KYC Review Endpoints ────────────────────────────────────────────────

admin_router = APIRouter(prefix="/api/admin/kyc", tags=["admin-kyc"])


@admin_router.get("/queue")
def kyc_queue(
    db: Session = Depends(get_db),
    token: Optional[str] = None,
):
    """Admin: list all KYC submissions pending review."""
    require_admin(token)
    records = (
        db.query(FarmerKYC)
        .filter(FarmerKYC.kyc_status == "Pending")
        .order_by(FarmerKYC.submitted_at.asc())
        .all()
    )
    result = []
    for k in records:
        user = db.query(User).filter(User.id == k.user_id).first()
        result.append({
            "kyc_id": k.id,
            "user_id": k.user_id,
            "farmer_name": user.name if user else "Unknown",
            "farmer_phone": user.phone if user else "—",
            "id_type": k.id_type,
            "id_number_masked": k.id_number_masked,
            "land_area_acres": k.land_area_acres,
            "land_ownership_type": k.land_ownership_type,
            "id_doc_url": k.id_doc_url,
            "land_deed_url": k.land_deed_url,
            "land_survey_url": k.land_survey_url,
            "submitted_at": k.submitted_at.isoformat() if k.submitted_at else None,
        })
    return {"count": len(result), "queue": result}


@admin_router.post("/{kyc_id}/approve")
def approve_kyc(
    kyc_id: int,
    body: KYCAdminApprove,
    db: Session = Depends(get_db),
    token: Optional[str] = None,
):
    """Admin: approve a KYC submission — unlocks carbon credit enrollment."""
    require_admin(token)
    kyc = db.query(FarmerKYC).filter(FarmerKYC.id == kyc_id).first()
    if not kyc:
        raise HTTPException(404, detail="KYC record not found")

    kyc.kyc_status = "Verified"
    kyc.kyc_verified_at = datetime.utcnow()
    kyc.kyc_notes = body.notes

    # Sync to User.kyc_status
    user = db.query(User).filter(User.id == kyc.user_id).first()
    if user:
        user.kyc_status = "Verified"

    db.commit()
    return {
        "message": f"KYC approved for user {kyc.user_id}. They can now enroll in carbon credit projects.",
        "kyc_id": kyc_id,
        "kyc_status": "Verified",
    }


@admin_router.post("/{kyc_id}/reject")
def reject_kyc(
    kyc_id: int,
    body: KYCAdminReject,
    db: Session = Depends(get_db),
    token: Optional[str] = None,
):
    """Admin: reject a KYC submission with a reason."""
    require_admin(token)
    kyc = db.query(FarmerKYC).filter(FarmerKYC.id == kyc_id).first()
    if not kyc:
        raise HTTPException(404, detail="KYC record not found")

    kyc.kyc_status = "Rejected"
    kyc.kyc_notes = body.reason
    kyc.kyc_verified_at = datetime.utcnow()

    user = db.query(User).filter(User.id == kyc.user_id).first()
    if user:
        user.kyc_status = "Rejected"

    db.commit()
    return {
        "message": f"KYC rejected for user {kyc.user_id}.",
        "reason": body.reason,
    }
