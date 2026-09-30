"""
Soil Sample Chain-of-Custody Endpoints (Phase 4)
Anti-fraud layer for the VM0042 soil sampling workflow.

Endpoints:
  POST /api/soil/bags/request           — Farmer requests QR bags
  GET  /api/soil/bags                   — List my issued bags
  POST /api/soil/samples                — Create new sample (with QR scan + geo check)
  POST /api/soil/samples/{id}/video     — Upload collection video
  POST /api/soil/samples/{id}/report    — Upload lab PDF report
  GET  /api/soil/samples/{project_id}   — List samples for a project

Admin:
  GET  /api/admin/soil-samples/queue    — Pending review queue (now calls real model)
  POST /api/admin/soil-samples/{id}/verify — Admin verifies/rejects with SOC entry
"""
import hashlib
import hmac
import json
import math
import os
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database import get_db
from ..dependencies import get_current_user
from ..models import SoilSampleRecord, SoilQRBag, CarbonProject, Plot, User

router = APIRouter(prefix="/api/soil", tags=["soil"])

UPLOAD_DIR = Path("backend/uploads/soil")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

MAX_GPS_DISTANCE_M = 1000  # Flag if sample taken > 1km from plot centroid
BASELINE_VIDEO_REQUIRED = True   # Require video for Baseline samples
BAIT_SWITCH_SOC_MULTIPLIER = 2.0  # Flag if admin SOC > 2× satellite estimate

# HMAC secret for signing bag codes — set via environment variable
BAG_HMAC_SECRET = os.getenv("BAG_HMAC_SECRET", "krishi_bag_secret_changeme_in_env")


# ── Helpers ───────────────────────────────────────────────────────────────────

def _haversine_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Return distance in metres between two GPS points."""
    R = 6_371_000  # earth radius metres
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


def _plot_centroid(plot: Plot) -> Optional[tuple]:
    """Return (lat, lng) centroid from plot boundary JSON, or None."""
    try:
        geom = json.loads(plot.boundary or "null")
        if not geom:
            return None
        coords = geom.get("coordinates", [[]])[0]
        lats = [c[1] for c in coords]
        lngs = [c[0] for c in coords]
        return (sum(lats) / len(lats), sum(lngs) / len(lngs))
    except Exception:
        return None


def _compute_fraud_flags(
    distance_m: Optional[float],
    sample_type: str,
    video_url: Optional[str],
    soc_percent: Optional[float],
    geo_lat: Optional[float] = None,
    geo_lng: Optional[float] = None,
) -> list:
    flags = []
    if distance_m is not None and distance_m > MAX_GPS_DISTANCE_M:
        flags.append(f"GPS_TOO_FAR_FROM_PLOT:{distance_m:.0f}m")
    if sample_type == "Baseline" and not video_url and BASELINE_VIDEO_REQUIRED:
        flags.append("BASELINE_VIDEO_MISSING")
    # Flag when no GPS provided at all for Baseline samples
    if sample_type == "Baseline" and (geo_lat is None or geo_lng is None):
        flags.append("GPS_NOT_PROVIDED")
    return flags


def _next_bag_code(db: Session) -> str:
    count = db.query(SoilQRBag).count() + 1
    year  = datetime.utcnow().year
    return f"KD-BAG-{year}-{count:05d}"


def _sign_bag_code(bag_code: str) -> str:
    """HMAC-SHA256 signature for a bag code (first 12 hex chars shown to admin)."""
    sig = hmac.new(BAG_HMAC_SECRET.encode(), bag_code.encode(), hashlib.sha256).hexdigest()
    return sig[:16]


def _sha256_file(file_bytes: bytes) -> str:
    """Return hex SHA-256 hash of file bytes."""
    return hashlib.sha256(file_bytes).hexdigest()


def _save_upload(file: UploadFile, subfolder: str) -> tuple:
    """Save file to disk; returns (local_path, public_url_path)."""
    ext = Path(file.filename).suffix.lower() if file.filename else ".bin"
    fname = f"{uuid.uuid4().hex}{ext}"
    folder = UPLOAD_DIR / subfolder
    folder.mkdir(parents=True, exist_ok=True)
    dest = folder / fname
    with open(dest, "wb") as f:
        f.write(file.file.read())
    return str(dest), f"/uploads/soil/{subfolder}/{fname}"


# ── Pydantic Schemas ──────────────────────────────────────────────────────────

class SoilSampleCreate(BaseModel):
    project_id          : int
    sample_type         : str = "Baseline"        # Baseline | M&R | Spot-check
    depth_cm            : int = 30
    lab_name            : Optional[str] = None
    lab_accreditation_no: Optional[str] = None
    collection_method   : str = "Farmer-Collected"
    soc_percent         : Optional[float] = None
    bulk_density_g_cm3  : Optional[float] = None
    ph                  : Optional[float] = None
    nitrogen_percent    : Optional[float] = None
    geo_lat             : Optional[float] = None
    geo_lng             : Optional[float] = None
    notes               : Optional[str] = None
    # QR bag code scanned by farmer in the field
    qr_bag_code         : Optional[str] = None


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/bags/request")
def request_bags(
    project_id: int,
    quantity  : int = 1,
    db        : Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Farmer requests platform-issued QR bag codes for a project."""
    if quantity < 1 or quantity > 10:
        raise HTTPException(status_code=400, detail="Request between 1 and 10 bags at a time.")

    project = db.query(CarbonProject).filter(
        CarbonProject.id == project_id,
        CarbonProject.user_id == current_user.id,
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found or not owned by you.")

    issued = []
    for _ in range(quantity):
        code = _next_bag_code(db)
        sig  = _sign_bag_code(code)
        bag = SoilQRBag(
            bag_code   = code,
            plot_id    = project.plot_id,
            project_id = project_id,
            user_id    = current_user.id,
        )
        db.add(bag)
        db.flush()  # get ID before commit
        issued.append({
            "bag_code"  : code,
            "id"        : bag.id,
            "hmac_sig"  : sig,
            # QR data string — encode both code and signature for tamper detection
            "qr_data"   : f"KDSOIL:{code}:SIG={sig}",
        })

    db.commit()
    return {
        "issued": issued,
        "instructions": (
            "Your tamper-proof bag code has been issued. "
            "Open 'Soil Lab Test', enter this code WHILE STANDING IN YOUR FIELD, "
            "take a 30-second video of the open soil hole with the sealed bag visible, "
            "then mail to your accredited lab. Each bag can only be used once."
        ),
    }


@router.get("/bags")
def list_my_bags(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    bags = db.query(SoilQRBag).filter(
        SoilQRBag.user_id == current_user.id
    ).order_by(SoilQRBag.issued_at.desc()).all()
    return [
        {
            "id"          : b.id,
            "bag_code"    : b.bag_code,
            "project_id"  : b.project_id,
            "status"      : b.status,
            "issued_at"   : b.issued_at.isoformat() + "Z",
        }
        for b in bags
    ]


@router.post("/samples")
def create_soil_sample(
    body: SoilSampleCreate,
    db  : Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Register a new soil sample collection event.
    Runs geo-distance fraud check immediately.
    """
    project = db.query(CarbonProject).filter(
        CarbonProject.id   == body.project_id,
        CarbonProject.user_id == current_user.id,
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")

    # ── QR Bag Validation ─────────────────────────────────────────────────────
    qr_bag = None
    if body.qr_bag_code:
        qr_bag = db.query(SoilQRBag).filter(
            SoilQRBag.bag_code  == body.qr_bag_code,
            SoilQRBag.user_id   == current_user.id,
            SoilQRBag.status    == "unused",
        ).first()
        if not qr_bag:
            raise HTTPException(
                status_code=400,
                detail=(
                    "QR bag code not found, already used, or doesn't belong to you. "
                    "Each bag can only be used once. Request a new bag if needed."
                ),
            )
        # Validate bag is for this project
        if qr_bag.project_id and qr_bag.project_id != body.project_id:
            raise HTTPException(
                status_code=400,
                detail="This QR bag was issued for a different project.",
            )

    # ── Geo-Distance Fraud Check ──────────────────────────────────────────────
    distance_m = None
    if body.geo_lat and body.geo_lng:
        plot = db.query(Plot).filter(Plot.id == project.plot_id).first()
        centroid = _plot_centroid(plot) if plot else None
        if centroid:
            distance_m = _haversine_m(body.geo_lat, body.geo_lng, centroid[0], centroid[1])

    fraud_flags = _compute_fraud_flags(
        distance_m   = distance_m,
        sample_type  = body.sample_type,
        video_url    = None,   # video uploaded separately
        soc_percent  = body.soc_percent,
        geo_lat      = body.geo_lat,
        geo_lng      = body.geo_lng,
    )

    sample = SoilSampleRecord(
        project_id           = body.project_id,
        user_id              = current_user.id,
        sample_type          = body.sample_type,
        depth_cm             = body.depth_cm,
        lab_name             = body.lab_name,
        lab_accreditation_no = body.lab_accreditation_no,
        collection_method    = body.collection_method,
        soc_percent          = body.soc_percent,
        bulk_density_g_cm3   = body.bulk_density_g_cm3,
        ph                   = body.ph,
        nitrogen_percent     = body.nitrogen_percent,
        geo_lat              = body.geo_lat,
        geo_lng              = body.geo_lng,
        notes                = body.notes,
        geo_distance_from_plot_m = distance_m,
        fraud_flags          = json.dumps(fraud_flags),
        qr_bag_id            = qr_bag.id if qr_bag else None,
        # Auto-reject if GPS is way off (> 1km) — admin can override
        status               = "rejected" if any("GPS_TOO_FAR" in f for f in fraud_flags) else "pending_upload",
    )
    db.add(sample)
    db.flush()

    # Mark bag as used
    if qr_bag:
        qr_bag.status           = "used"
        qr_bag.used_at          = datetime.utcnow()
        qr_bag.sample_record_id = sample.id

    db.commit()
    db.refresh(sample)

    return {
        "id"                     : sample.id,
        "status"                 : sample.status,
        "geo_distance_from_plot_m": distance_m,
        "fraud_flags"            : fraud_flags,
        "warning"                : (
            f"⚠️ GPS is {distance_m:.0f}m from your registered plot. "
            "Sample auto-rejected — contact admin for review."
        ) if any("GPS_TOO_FAR" in f for f in fraud_flags) else None,
        "next_step": (
            "Upload a collection video (required for Baseline samples), "
            "then mail the sealed bag to your lab."
        ),
    }


@router.post("/samples/{sample_id}/video")
async def upload_collection_video(
    sample_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upload 30-60 second collection video. Required for Baseline samples."""
    sample = db.query(SoilSampleRecord).filter(
        SoilSampleRecord.id == sample_id,
        SoilSampleRecord.user_id == current_user.id,
    ).first()
    if not sample:
        raise HTTPException(status_code=404, detail="Sample not found.")

    # Validate file type
    allowed = {"video/mp4", "video/quicktime", "video/webm", "video/3gpp"}
    ct = file.content_type or ""
    if ct not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type '{ct}'. Upload MP4, MOV, or WebM video."
        )

    local_path, url_path = _save_upload(file, "videos")
    sample.video_url        = url_path
    sample.video_local_path = local_path

    # Re-evaluate fraud flags — remove BASELINE_VIDEO_MISSING if it was there
    flags = json.loads(sample.fraud_flags or "[]")
    flags = [f for f in flags if f != "BASELINE_VIDEO_MISSING"]
    sample.fraud_flags = json.dumps(flags)

    # Advance status if not already rejected
    if sample.status == "pending_upload":
        sample.status = "pending_verification"

    db.commit()
    return {"status": sample.status, "video_url": url_path, "fraud_flags": flags}


@router.post("/samples/{sample_id}/report")
async def upload_lab_report(
    sample_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upload the lab PDF/image report."""
    sample = db.query(SoilSampleRecord).filter(
        SoilSampleRecord.id == sample_id,
        SoilSampleRecord.user_id == current_user.id,
    ).first()
    if not sample:
        raise HTTPException(status_code=404, detail="Sample not found.")
    if sample.status == "rejected":
        raise HTTPException(
            status_code=400,
            detail="Cannot upload report for a rejected sample. Contact admin."
        )

    # Read file bytes for hashing (before saving so we have the bytes)
    file_bytes = await file.read()
    file_sha256 = _sha256_file(file_bytes)

    # ── Duplicate Lab Report Detection ───────────────────────────────────────
    duplicate = db.query(SoilSampleRecord).filter(
        SoilSampleRecord.lab_report_hash == file_sha256,
        SoilSampleRecord.id != sample_id,
    ).first()
    dup_flag = None
    if duplicate:
        dup_flag = f"DUPLICATE_LAB_REPORT:MATCHES_SAMPLE_{duplicate.id}"
        flags = json.loads(sample.fraud_flags or "[]")
        if dup_flag not in flags:
            flags.append(dup_flag)
            sample.fraud_flags = json.dumps(flags)

    # Save file to disk
    ext = Path(file.filename).suffix.lower() if file.filename else ".bin"
    fname = f"{uuid.uuid4().hex}{ext}"
    folder = UPLOAD_DIR / "reports"
    folder.mkdir(parents=True, exist_ok=True)
    dest = folder / fname
    with open(dest, "wb") as f:
        f.write(file_bytes)
    local_path = str(dest)
    url_path = f"/uploads/soil/reports/{fname}"

    sample.lab_certificate_local = local_path
    sample.lab_certificate_url   = url_path
    sample.lab_report_hash       = file_sha256
    sample.status = "pending_verification"

    db.commit()
    return {
        "status"          : sample.status,
        "lab_report_path" : url_path,
        "lab_report_sha256": file_sha256,
        "duplicate_warning": (
            f"⚠️ This lab report matches a file uploaded for Sample #{duplicate.id}. "
            "Admin will review for potential duplicate submission."
        ) if duplicate else None,
        "message"         : "Lab report uploaded. Submitted to admin for verification.",
    }


@router.get("/samples/{project_id}")
def list_samples(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    samples = db.query(SoilSampleRecord).filter(
        SoilSampleRecord.project_id == project_id,
        SoilSampleRecord.user_id    == current_user.id,
    ).order_by(SoilSampleRecord.sample_date.desc()).all()

    return [
        {
            "id"                      : s.id,
            "sample_type"             : s.sample_type,
            "depth_cm"                : s.depth_cm,
            "lab_name"                : s.lab_name,
            "lab_accreditation_no"    : s.lab_accreditation_no,
            "soc_percent"             : s.soc_percent,
            "bulk_density_g_cm3"      : s.bulk_density_g_cm3,
            "ph"                      : s.ph,
            "status"                  : s.status,
            "verified_by_admin"       : s.verified_by_admin,
            "admin_soc_percent"       : s.admin_soc_percent,
            "admin_bulk_density"      : s.admin_bulk_density,
            "soc_stock_t_ha"          : _compute_soc_stock(
                                            s.admin_soc_percent or s.soc_percent,
                                            s.admin_bulk_density or s.bulk_density_g_cm3,
                                            s.depth_cm,
                                        ),
            "fraud_flags"             : json.loads(s.fraud_flags or "[]"),
            "geo_distance_from_plot_m": s.geo_distance_from_plot_m,
            "has_video"               : bool(s.video_url),
            "lab_report_path"         : s.lab_certificate_url or s.lab_certificate_local,
            "bag_seal_status"         : s.bag_seal_status,
            "soc_discrepancy_flag"    : s.soc_discrepancy_flag,
        }
        for s in samples
    ]


def _compute_soc_stock(
    soc_pct: Optional[float],
    bulk_density: Optional[float],
    depth_cm: int = 30,
) -> Optional[float]:
    """SOC Stock (t C/ha) = SOC% × BD (g/cm³) × depth (cm) × 100"""
    if soc_pct is None or bulk_density is None:
        return None
    return round((soc_pct / 100) * bulk_density * depth_cm * 100, 3)
