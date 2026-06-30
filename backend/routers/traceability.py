"""
Traceability Router — Blockchain Harvest Token API
===================================================
Provides end-to-end provenance tracking for harvested crops, meeting
CBAM and CCTS regulatory requirements.

Token lifecycle:
  Draft → Minted → Transferred

Hash chain:
  token_hash = sha256(token_id + all field values + previous_hash)
  This creates a tamper-evident ledger without a live blockchain node.

Public endpoint (no auth):
  GET /api/trace/verify/{token_id}
  Used by downstream buyers who scan a QR code on the shipment.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime
from typing import List, Optional
import json
import hashlib

from ..database import get_db
from ..models import (
    HarvestToken, TokenTransferLog,
    Plot, User, CarbonProject, FarmerOperationLog,
    CropCycle, CropCycleEvent
)
from ..dependencies import get_current_user
from pydantic import BaseModel

router = APIRouter(prefix="/api/trace", tags=["traceability"])


# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------

class ChemicalInput(BaseModel):
    name: str
    quantity: str
    unit: str = "kg/acre"
    applied_date: str  # ISO date string


class MintTokenRequest(BaseModel):
    plot_id: int
    crop_type: str
    variety: Optional[str] = None
    harvest_date: str          # ISO date string: "2025-10-15"
    yield_kg: float
    area_harvested_acres: float
    chemical_inputs: List[ChemicalInput] = []
    geo_lat: Optional[float] = None
    geo_lng: Optional[float] = None
    carbon_project_id: Optional[int] = None
    crop_cycle_id: Optional[int] = None

class StartCycleRequest(BaseModel):
    plot_id: int
    crop_type: str
    variety: Optional[str] = None

class LogEventRequest(BaseModel):
    event_type: str
    geo_lat: Optional[float] = None
    geo_lng: Optional[float] = None
    media_url: Optional[str] = None
    notes: Optional[str] = None


class TransferTokenRequest(BaseModel):
    buyer_name: str
    buyer_entity: str
    notes: Optional[str] = None


class TokenSummary(BaseModel):
    token_id: str
    crop_type: str
    variety: Optional[str]
    harvest_date: datetime
    yield_kg: float
    area_harvested_acres: float
    carbon_footprint_kg_co2e: float
    carbon_credits_linked: float
    farming_methodology: Optional[str]
    ndvi_at_harvest: Optional[float]
    status: str
    token_hash: Optional[str]
    previous_hash: Optional[str]
    sequence_number: int
    qr_url: Optional[str]
    minted_at: Optional[datetime]
    buyer_name: Optional[str]
    buyer_entity: Optional[str]
    chemical_inputs: List[dict]
    transfer_logs: List[dict]
    plot_name: str
    farmer_initials: str
    farmer_district: str

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

# Emission factors (kg CO2e per kg yield) by methodology
# Source: IPCC AR6 WG3 Ch.7, ICAR soil carbon baseline data
EMISSION_FACTORS = {
    "No-Till":       0.18,   # Lower tillage = less soil disturbance
    "Cover-Crop":    0.21,
    "Agroforestry":  0.14,   # Carbon sink benefit
    "Conventional":  0.35,   # Baseline conventional farming
    "Mixed":         0.28,
}

# Max biological yield per acre (kg/acre) for fraud detection
MAX_YIELD_KG_PER_ACRE = {
    "Wheat": 4500,
    "Rice": 5000,
    "Cotton": 1500,
    "Sugarcane": 40000,
    "Corn": 5500,
    "Soybean": 1800,
    "Default": 10000, # Fallback
}


def _compute_hash(data: str) -> str:
    return hashlib.sha256(data.encode("utf-8")).hexdigest()


def _build_token_payload(token: HarvestToken) -> str:
    """Canonical string for hashing — deterministic field ordering."""
    cycle_events_hash = "None"
    if token.crop_cycle and token.crop_cycle.events:
        # Create a combined hash of all event hashes to prove the timeline
        event_hashes = "".join([e.event_hash for e in token.crop_cycle.events if e.event_hash])
        if event_hashes:
            cycle_events_hash = _compute_hash(event_hashes)

    return "|".join([
        token.token_id,
        str(token.plot_id),
        str(token.user_id),
        token.crop_type,
        str(token.variety or ""),
        token.harvest_date.isoformat(),
        f"{token.yield_kg:.4f}",
        f"{token.area_harvested_acres:.4f}",
        f"{token.carbon_footprint_kg_co2e:.4f}",
        f"{token.carbon_credits_linked:.4f}",
        str(token.farming_methodology or ""),
        f"{token.ndvi_at_harvest:.4f}" if token.ndvi_at_harvest else "None",
        token.chemical_inputs or "[]",
        token.previous_hash or "GENESIS",
        cycle_events_hash,
    ])


def _token_to_summary(token: HarvestToken) -> dict:
    try:
        chem = json.loads(token.chemical_inputs or "[]")
    except Exception:
        chem = []

    return {
        "token_id": token.token_id,
        "crop_type": token.crop_type,
        "variety": token.variety,
        "harvest_date": token.harvest_date.isoformat(),
        "yield_kg": token.yield_kg,
        "area_harvested_acres": token.area_harvested_acres,
        "carbon_footprint_kg_co2e": round(token.carbon_footprint_kg_co2e, 4),
        "carbon_credits_linked": round(token.carbon_credits_linked, 4),
        "farming_methodology": token.farming_methodology,
        "ndvi_at_harvest": token.ndvi_at_harvest,
        "status": token.status,
        "token_hash": token.token_hash,
        "previous_hash": token.previous_hash,
        "sequence_number": token.sequence_number,
        "qr_url": token.qr_url,
        "minted_at": token.minted_at.isoformat() if token.minted_at else None,
        "buyer_name": token.buyer_name,
        "buyer_entity": token.buyer_entity,
        "transferred_at": token.transferred_at.isoformat() if token.transferred_at else None,
        "chemical_inputs": chem,
        "transfer_logs": [
            {
                "from_entity": tl.from_entity,
                "to_entity": tl.to_entity,
                "transfer_date": tl.transfer_date.isoformat(),
                "transfer_hash": tl.transfer_hash,
                "notes": tl.notes,
            }
            for tl in (token.transfer_logs or [])
        ],
        "plot_name": token.plot.name if token.plot else "Unknown",
        "farmer_initials": _initials(token.user.name) if token.user else "?",
        "farmer_district": token.user.district if token.user else "Unknown",
        "geo_lat": token.geo_lat,
        "geo_lng": token.geo_lng,
        "crop_cycle": {
            "id": token.crop_cycle.id,
            "start_date": token.crop_cycle.start_date.isoformat(),
            "events": [
                {
                    "type": e.event_type,
                    "date": e.event_date.isoformat(),
                    "media": e.media_url,
                    "lat": e.geo_lat,
                    "lng": e.geo_lng,
                    "hash": e.event_hash
                } for e in token.crop_cycle.events
            ]
        } if token.crop_cycle else None
    }


def _initials(name: Optional[str]) -> str:
    if not name:
        return "?"
    parts = name.strip().split()
    return "".join(p[0].upper() for p in parts[:2])


@router.get("/marketplace", response_model=List[TokenSummary])
async def get_marketplace_tokens(
    crop: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Public endpoint: Fetch all available tokens for the public buyer marketplace.
    """
    query = db.query(HarvestToken).filter(HarvestToken.status == "Minted")
    if crop:
        query = query.filter(HarvestToken.crop_type.ilike(f"%{crop}%"))
    
    tokens = query.order_by(HarvestToken.created_at.desc()).limit(100).all()
    
    return [_token_to_summary(t) for t in tokens]

# ---------------------------------------------------------------------------
# Endpoints — Auth Required
# ---------------------------------------------------------------------------

@router.get("/cycle/active")
async def get_active_cycles(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Fetch active crop cycles for the farmer to log events on."""
    cycles = db.query(CropCycle).filter(
        CropCycle.user_id == current_user.id,
        CropCycle.status == "Active"
    ).all()
    
    return [
        {
            "id": c.id,
            "plot_id": c.plot_id,
            "crop_type": c.crop_type,
            "start_date": c.start_date.isoformat(),
            "events_count": len(c.events)
        } for c in cycles
    ]

@router.post("/cycle/start")
async def start_crop_cycle(
    req: StartCycleRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Start a new crop cycle on a plot (Sowing phase)."""
    plot = db.query(Plot).filter(Plot.id == req.plot_id, Plot.user_id == current_user.id).first()
    if not plot:
        raise HTTPException(status_code=404, detail="Plot not found")

    cycle = CropCycle(
        plot_id=req.plot_id,
        user_id=current_user.id,
        crop_type=req.crop_type,
        variety=req.variety,
        status="Active"
    )
    db.add(cycle)
    db.commit()
    db.refresh(cycle)
    return {"message": "Crop cycle started", "cycle_id": cycle.id}

@router.post("/cycle/{cycle_id}/event")
async def log_cycle_event(
    cycle_id: int,
    req: LogEventRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Log an event (e.g., fertilizing, photo proof) to an active cycle."""
    cycle = db.query(CropCycle).filter(CropCycle.id == cycle_id, CropCycle.user_id == current_user.id).first()
    if not cycle or cycle.status != "Active":
        raise HTTPException(status_code=400, detail="Active crop cycle not found")

    event_payload = f"{cycle.id}|{req.event_type}|{datetime.utcnow().isoformat()}|{req.geo_lat}|{req.geo_lng}|{req.media_url}"
    event_hash = _compute_hash(event_payload)

    event = CropCycleEvent(
        cycle_id=cycle.id,
        event_type=req.event_type,
        geo_lat=req.geo_lat,
        geo_lng=req.geo_lng,
        media_url=req.media_url,
        notes=req.notes,
        event_hash=event_hash
    )
    db.add(event)
    db.commit()
    return {"message": "Event logged securely", "event_hash": event_hash}

@router.post("/mint")
async def mint_harvest_token(
    req: MintTokenRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Mint a new HarvestToken for a harvested crop batch.

    Steps:
      1. Validate plot ownership.
      2. Look up linked CarbonProject (if provided) for verified credit data.
      3. Compute carbon footprint from yield × emission factor.
      4. Build hash chain (fetch last token's hash).
      5. Compute sha256 token hash over all fields.
      6. Generate unique token_id (KD-HTK-YYYY-NNNNN).
      7. Persist + audit log.
    """
    # 1. Validate plot ownership
    plot = db.query(Plot).filter(
        Plot.id == req.plot_id,
        Plot.user_id == current_user.id
    ).first()
    if not plot:
        raise HTTPException(status_code=404, detail="Plot not found or not owned by you")

    # FRAUD DETECTION RULES:
    # Rule A: Area Validation
    if req.area_harvested_acres > (plot.area * 1.05): # 5% margin
        raise HTTPException(status_code=400, detail="Fraud Prevention: Harvested area exceeds registered plot size.")

    # Rule B: Biological Yield Limits
    max_yield = MAX_YIELD_KG_PER_ACRE.get(req.crop_type, MAX_YIELD_KG_PER_ACRE["Default"])
    claimed_yield_per_acre = req.yield_kg / max(req.area_harvested_acres, 0.01)
    if claimed_yield_per_acre > max_yield:
        raise HTTPException(status_code=400, detail=f"Fraud Prevention: Biologically impossible yield for {req.crop_type} ({claimed_yield_per_acre:.0f} kg/acre).")

    # Rule C: Cooldown (Double-Minting Prevention - 90 days)
    last_harvest = db.query(HarvestToken).filter(HarvestToken.plot_id == req.plot_id).order_by(HarvestToken.harvest_date.desc()).first()
    if last_harvest:
        days_since = (datetime.utcnow() - last_harvest.harvest_date).days
        if days_since < 90:
            raise HTTPException(status_code=400, detail=f"Fraud Prevention: Plot was already harvested {days_since} days ago. Minimum cooldown is 90 days.")

    # Rule D: Satellite Health Check (NDVI Proof of Life)
    if plot.health_score < 0.2:
        raise HTTPException(status_code=400, detail="Fraud Prevention: Satellite NDVI score indicates barren land. Cannot mint harvest.")

    # 2. Link carbon project (optional)
    carbon_project = None
    carbon_credits = 0.0
    methodology = plot.crop_type or "Mixed"
    ndvi_at_harvest = plot.health_score  # Best available proxy

    if req.carbon_project_id:
        carbon_project = db.query(CarbonProject).filter(
            CarbonProject.id == req.carbon_project_id,
            CarbonProject.user_id == current_user.id,
        ).first()
        if carbon_project:
            carbon_credits = round(carbon_project.available_credits, 4)
            methodology = carbon_project.methodology
            ndvi_at_harvest = (
                db.query(func.avg(Plot.health_score))
                .filter(Plot.id == req.plot_id)
                .scalar() or plot.health_score
            )

    # 3. Carbon footprint: yield × emission factor (kg CO2e)
    ef = EMISSION_FACTORS.get(methodology, EMISSION_FACTORS["Mixed"])
    carbon_footprint = round(req.yield_kg * ef, 4)

    # 4. Build hash chain — get last minted token
    last_token = (
        db.query(HarvestToken)
        .order_by(HarvestToken.sequence_number.desc())
        .first()
    )
    previous_hash = last_token.token_hash if last_token else None
    sequence_number = (last_token.sequence_number + 1) if last_token else 1

    # 5. Generate token_id
    year = datetime.utcnow().year
    token_id = f"KD-HTK-{year}-{sequence_number:05d}"

    # 6. Parse harvest date
    try:
        harvest_dt = datetime.fromisoformat(req.harvest_date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid harvest_date format. Use ISO 8601: YYYY-MM-DD")

    # 7. Build token record (without hash first, so we can compute it)
    chemical_inputs_json = json.dumps(
        [ci.model_dump() for ci in req.chemical_inputs]
    )

    new_token = HarvestToken(
        token_id=token_id,
        plot_id=req.plot_id,
        user_id=current_user.id,
        carbon_project_id=req.carbon_project_id,
        crop_type=req.crop_type,
        variety=req.variety,
        harvest_date=harvest_dt,
        yield_kg=req.yield_kg,
        area_harvested_acres=req.area_harvested_acres,
        geo_lat=req.geo_lat,
        geo_lng=req.geo_lng,
        carbon_footprint_kg_co2e=carbon_footprint,
        carbon_credits_linked=carbon_credits,
        farming_methodology=methodology,
        ndvi_at_harvest=ndvi_at_harvest,
        chemical_inputs=chemical_inputs_json,
        status="Minted",
        previous_hash=previous_hash,
        sequence_number=sequence_number,
        minted_at=datetime.utcnow(),
        crop_cycle_id=req.crop_cycle_id,
    )

    # Link cycle and mark harvested
    if req.crop_cycle_id:
        cycle = db.query(CropCycle).filter(CropCycle.id == req.crop_cycle_id).first()
        if cycle:
            cycle.status = "Harvested"
            cycle.end_date = datetime.utcnow()
            new_token.crop_cycle = cycle

    # Compute token hash from canonical payload (which now includes cycle events)
    payload = _build_token_payload(new_token)
    new_token.token_hash = _compute_hash(payload)
    new_token.qr_url = f"/api/trace/verify/{token_id}"

    db.add(new_token)

    # 8. Audit log
    log = FarmerOperationLog(
        user_id=current_user.id,
        plot_id=req.plot_id,
        project_id=req.carbon_project_id,
        operation="harvest_minted",
        detail=json.dumps({
            "token_id": token_id,
            "crop_type": req.crop_type,
            "yield_kg": req.yield_kg,
            "carbon_footprint_kg_co2e": carbon_footprint,
            "sequence_number": sequence_number,
            "token_hash": new_token.token_hash,
        }),
    )
    db.add(log)
    db.commit()
    db.refresh(new_token)

    return {
        **_token_to_summary(new_token),
        "message": f"Harvest token {token_id} minted successfully.",
        "verify_url": new_token.qr_url,
    }


@router.get("/my-tokens")
async def get_my_tokens(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all HarvestTokens owned by the current farmer."""
    tokens = (
        db.query(HarvestToken)
        .filter(HarvestToken.user_id == current_user.id)
        .order_by(HarvestToken.sequence_number.desc())
        .all()
    )
    return [_token_to_summary(t) for t in tokens]


@router.post("/{token_id}/transfer")
async def transfer_token(
    token_id: str,
    req: TransferTokenRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Transfer custody of a HarvestToken to a buyer or processor.
    Creates an immutable TokenTransferLog entry and updates token status.
    """
    token = db.query(HarvestToken).filter(
        HarvestToken.token_id == token_id,
        HarvestToken.user_id == current_user.id,
    ).first()
    if not token:
        raise HTTPException(status_code=404, detail="Token not found")

    if token.status == "Transferred":
        raise HTTPException(status_code=400, detail="Token already transferred")

    from_entity = current_user.name or f"Farmer #{current_user.id}"

    # Compute transfer hash
    transfer_payload = f"{token_id}|{from_entity}|{req.buyer_entity}|{datetime.utcnow().isoformat()}"
    transfer_hash = _compute_hash(transfer_payload)

    # Record transfer log
    log_entry = TokenTransferLog(
        token_id=token_id,
        from_entity=from_entity,
        to_entity=req.buyer_entity,
        transfer_date=datetime.utcnow(),
        transfer_hash=transfer_hash,
        notes=req.notes,
    )
    db.add(log_entry)

    # Update token
    token.status = "Transferred"
    token.buyer_name = req.buyer_name
    token.buyer_entity = req.buyer_entity
    token.transferred_at = datetime.utcnow()
    token.transfer_signature = transfer_hash

    # Audit log
    audit = FarmerOperationLog(
        user_id=current_user.id,
        plot_id=token.plot_id,
        operation="token_transferred",
        detail=json.dumps({
            "token_id": token_id,
            "to_entity": req.buyer_entity,
            "transfer_hash": transfer_hash,
        }),
    )
    db.add(audit)
    db.commit()
    db.refresh(token)

    return {
        **_token_to_summary(token),
        "message": f"Token {token_id} transferred to {req.buyer_entity}.",
        "transfer_hash": transfer_hash,
    }


@router.get("/{token_id}/audit")
async def get_audit_trail(
    token_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Full audit trail for a token (auth required — farmer view)."""
    token = db.query(HarvestToken).filter(
        HarvestToken.token_id == token_id,
        HarvestToken.user_id == current_user.id,
    ).first()
    if not token:
        raise HTTPException(status_code=404, detail="Token not found")

    return _token_to_summary(token)


# ---------------------------------------------------------------------------
# Public endpoint — No auth required (buyer QR scan)
# ---------------------------------------------------------------------------

@router.get("/verify/{token_id}")
async def public_verify_token(
    token_id: str,
    db: Session = Depends(get_db),
):
    """
    Public provenance verification endpoint.
    No authentication required — designed for buyer QR code scanning.

    Returns full token data with hash integrity information.
    The client re-computes the sha256 and compares with stored token_hash
    to prove data has not been tampered with.
    """
    token = db.query(HarvestToken).filter(
        HarvestToken.token_id == token_id,
    ).first()
    if not token:
        raise HTTPException(status_code=404, detail="Token not found or invalid QR code")

    summary = _token_to_summary(token)

    # Supply the canonical hash payload so the client can re-verify
    summary["hash_payload"] = _build_token_payload(token)
    summary["hash_algorithm"] = "sha256"
    summary["cbam_eligible"] = token.status == "Minted" or token.status == "Transferred"
    summary["ccts_eligible"] = token.carbon_credits_linked > 0

    return summary
