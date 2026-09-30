"""
Carbon Credit Marketplace + Razorpay Payments
Endpoints:
  GET  /api/marketplace/listings          — Browse active credit listings
  POST /api/marketplace/list              — Farmer lists credits for sale
  POST /api/marketplace/purchase          — Buyer initiates purchase (creates Razorpay order)
  POST /api/marketplace/payment/verify    — Verify Razorpay signature & capture
  GET  /api/marketplace/certificate/{id} — Download retirement certificate (JSON)
  GET  /api/marketplace/my-listings       — Farmer's own listings
  GET  /api/marketplace/my-purchases      — Buyer's purchase history
"""
import hashlib
import hmac
import json
import os
import uuid
from datetime import datetime
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database import get_db
from ..dependencies import get_current_user
from ..models import (
    CarbonProject, CarbonCreditToken, CreditListing, CreditPurchase, User
)

router = APIRouter(prefix="/api/marketplace", tags=["marketplace"])

RAZORPAY_KEY_ID     = os.getenv("RAZORPAY_KEY_ID", "")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET", "")
PLATFORM_FEE_PCT    = 0.20   # 20%

# ── Pydantic Schemas ──────────────────────────────────────────────────────────

class ListingCreate(BaseModel):
    project_id          : int
    quantity_tco2e      : float
    price_per_tco2e_inr : float
    methodology         : Optional[str] = None
    vintage_year        : Optional[int] = None
    description         : Optional[str] = None

class PurchaseInitiate(BaseModel):
    listing_id   : int
    buyer_name   : str
    buyer_email  : str
    buyer_entity : Optional[str] = None
    buyer_gstin  : Optional[str] = None

class PaymentVerify(BaseModel):
    razorpay_order_id   : str
    razorpay_payment_id : str
    razorpay_signature  : str
    purchase_id         : int


# ── Helpers ───────────────────────────────────────────────────────────────────

def _razorpay_available() -> bool:
    return bool(RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET)


def _create_razorpay_order(amount_inr: float, receipt: str) -> dict:
    """Create a Razorpay order. Returns order dict or raises HTTPException."""
    if not _razorpay_available():
        # Test/demo mode: return a fake order so UI can be tested without keys
        return {
            "id": f"order_DEMO_{receipt[:12]}",
            "amount": int(amount_inr * 100),
            "currency": "INR",
            "receipt": receipt,
            "_demo": True,
        }
    try:
        import razorpay  # type: ignore
        client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))
        order = client.order.create({
            "amount": int(amount_inr * 100),  # paise
            "currency": "INR",
            "receipt": receipt,
            "notes": {"platform": "Krishi-Drishti Carbon Marketplace"},
        })
        return order
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Razorpay order creation failed: {e}")


def _verify_razorpay_signature(order_id: str, payment_id: str, signature: str) -> bool:
    """Verify HMAC-SHA256 Razorpay webhook signature."""
    if not RAZORPAY_KEY_SECRET:
        return True  # demo mode — trust all
    body = f"{order_id}|{payment_id}"
    expected = hmac.new(
        RAZORPAY_KEY_SECRET.encode(),
        body.encode(),
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature)


def _generate_certificate(purchase: CreditPurchase, listing: CreditListing) -> dict:
    cert_data = {
        "certificate_id": purchase.certificate_id,
        "issued_at": datetime.utcnow().isoformat() + "Z",
        "platform": "Krishi-Drishti Carbon Registry",
        "standard": "VM0042 IALM (Verra)",
        "buyer": {
            "name": purchase.buyer_name,
            "email": purchase.buyer_email,
            "entity": purchase.buyer_entity or "Individual",
            "gstin": purchase.buyer_gstin or "N/A",
        },
        "credit": {
            "quantity_tco2e": purchase.quantity_tco2e,
            "methodology": listing.methodology or "Improved Agricultural Land Management",
            "vintage_year": listing.vintage_year or datetime.utcnow().year,
            "project_id": listing.project_id,
        },
        "payment": {
            "total_inr": purchase.total_inr,
            "razorpay_payment_id": purchase.razorpay_payment_id,
            "paid_at": purchase.paid_at.isoformat() + "Z" if purchase.paid_at else None,
        },
        "retirement_hash": purchase.certificate_hash,
    }
    return cert_data


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/listings")
def browse_listings(
    methodology: Optional[str] = None,
    min_qty: Optional[float] = None,
    max_price: Optional[float] = None,
    db: Session = Depends(get_db),
):
    """Browse active carbon credit listings — open to all (no auth required)."""
    q = db.query(CreditListing).filter(CreditListing.status == "active")
    if methodology:
        q = q.filter(CreditListing.methodology == methodology)
    if min_qty:
        q = q.filter(CreditListing.quantity_tco2e >= min_qty)
    if max_price:
        q = q.filter(CreditListing.price_per_tco2e_inr <= max_price)
    listings = q.order_by(CreditListing.created_at.desc()).limit(50).all()
    return [
        {
            "id": l.id,
            "project_id": l.project_id,
            "quantity_tco2e": l.quantity_tco2e,
            "price_per_tco2e_inr": l.price_per_tco2e_inr,
            "total_inr": l.total_inr,
            "methodology": l.methodology,
            "vintage_year": l.vintage_year,
            "description": l.description,
            "created_at": l.created_at.isoformat() + "Z",
        }
        for l in listings
    ]


@router.post("/list")
def create_listing(
    body: ListingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Farmer lists verified ACT credits for sale."""
    project = db.query(CarbonProject).filter(
        CarbonProject.id == body.project_id,
        CarbonProject.user_id == current_user.id,
        CarbonProject.status == "Verified",
    ).first()
    if not project:
        raise HTTPException(
            status_code=404,
            detail="Project not found, not owned by you, or not yet verified."
        )
    if body.quantity_tco2e > project.available_credits:
        raise HTTPException(
            status_code=400,
            detail=f"You only have {project.available_credits:.2f} available credits."
        )
    listing = CreditListing(
        user_id             = current_user.id,
        project_id          = body.project_id,
        quantity_tco2e      = body.quantity_tco2e,
        price_per_tco2e_inr = body.price_per_tco2e_inr,
        total_inr           = round(body.quantity_tco2e * body.price_per_tco2e_inr, 2),
        methodology         = body.methodology or project.methodology,
        vintage_year        = body.vintage_year or datetime.utcnow().year,
        description         = body.description,
    )
    # Reserve credits so farmer can't double-list
    project.available_credits -= body.quantity_tco2e
    db.add(listing)
    db.commit()
    db.refresh(listing)
    return {"id": listing.id, "status": "active", "total_inr": listing.total_inr}


@router.post("/purchase")
def initiate_purchase(
    body: PurchaseInitiate,
    db: Session = Depends(get_db),
):
    """Buyer initiates a purchase — creates a Razorpay order."""
    listing = db.query(CreditListing).filter(
        CreditListing.id == body.listing_id,
        CreditListing.status == "active",
    ).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found or already sold.")

    total_inr        = listing.total_inr
    platform_fee_inr = round(total_inr * PLATFORM_FEE_PCT, 2)
    farmer_payout    = round(total_inr - platform_fee_inr, 2)

    # Create Razorpay order
    receipt = f"KD-CARBON-{listing.id}-{uuid.uuid4().hex[:8]}"
    rz_order = _create_razorpay_order(total_inr, receipt)

    purchase = CreditPurchase(
        listing_id          = listing.id,
        buyer_name          = body.buyer_name,
        buyer_email         = body.buyer_email,
        buyer_entity        = body.buyer_entity,
        buyer_gstin         = body.buyer_gstin,
        quantity_tco2e      = listing.quantity_tco2e,
        price_per_tco2e_inr = listing.price_per_tco2e_inr,
        total_inr           = total_inr,
        platform_fee_inr    = platform_fee_inr,
        farmer_payout_inr   = farmer_payout,
        razorpay_order_id   = rz_order["id"],
        payment_status      = "pending",
    )
    db.add(purchase)
    db.commit()
    db.refresh(purchase)

    return {
        "purchase_id"       : purchase.id,
        "razorpay_order_id" : rz_order["id"],
        "razorpay_key_id"   : RAZORPAY_KEY_ID or "DEMO_MODE",
        "amount_paise"      : rz_order["amount"],
        "currency"          : "INR",
        "description"       : f"{listing.quantity_tco2e} tCO₂e — {listing.methodology or 'VM0042'}",
        "prefill"           : {"name": body.buyer_name, "email": body.buyer_email},
        "_demo"             : rz_order.get("_demo", False),
    }


@router.post("/payment/verify")
def verify_payment(
    body: PaymentVerify,
    db: Session = Depends(get_db),
):
    """
    Called by frontend after Razorpay checkout succeeds.
    1. Verifies HMAC signature
    2. Marks purchase as captured
    3. Marks listing as sold
    4. Generates retirement certificate
    """
    purchase = db.query(CreditPurchase).filter(
        CreditPurchase.id == body.purchase_id,
        CreditPurchase.razorpay_order_id == body.razorpay_order_id,
    ).first()
    if not purchase:
        raise HTTPException(status_code=404, detail="Purchase record not found.")
    if purchase.payment_status == "captured":
        return {"status": "already_captured", "certificate_id": purchase.certificate_id}

    # Signature verification
    if not _verify_razorpay_signature(
        body.razorpay_order_id, body.razorpay_payment_id, body.razorpay_signature
    ):
        purchase.payment_status = "failed"
        db.commit()
        raise HTTPException(status_code=400, detail="Payment signature verification failed.")

    # Capture
    purchase.razorpay_payment_id = body.razorpay_payment_id
    purchase.razorpay_signature  = body.razorpay_signature
    purchase.payment_status      = "captured"
    purchase.paid_at             = datetime.utcnow()

    # Generate retirement certificate
    cert_seq = db.query(CreditPurchase).filter(
        CreditPurchase.payment_status == "captured"
    ).count() + 1
    purchase.certificate_id = f"KD-RET-{datetime.utcnow().year}-{cert_seq:05d}"

    listing = db.query(CreditListing).filter(
        CreditListing.id == purchase.listing_id
    ).first()
    listing.status  = "sold"
    listing.sold_at = datetime.utcnow()

    cert_data = _generate_certificate(purchase, listing)
    purchase.certificate_hash = hashlib.sha256(
        json.dumps(cert_data, sort_keys=True).encode()
    ).hexdigest()

    db.commit()
    return {
        "status"         : "captured",
        "certificate_id" : purchase.certificate_id,
        "certificate_hash": purchase.certificate_hash,
        "farmer_payout_inr": purchase.farmer_payout_inr,
        "message"        : f"Payment captured. Certificate {purchase.certificate_id} issued.",
    }


@router.get("/certificate/{certificate_id}")
def get_certificate(certificate_id: str, db: Session = Depends(get_db)):
    """Download a carbon credit retirement certificate as JSON."""
    purchase = db.query(CreditPurchase).filter(
        CreditPurchase.certificate_id == certificate_id,
        CreditPurchase.payment_status == "captured",
    ).first()
    if not purchase:
        raise HTTPException(status_code=404, detail="Certificate not found.")
    listing = purchase.listing
    return _generate_certificate(purchase, listing)


@router.get("/my-listings")
def my_listings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    listings = db.query(CreditListing).filter(
        CreditListing.user_id == current_user.id
    ).order_by(CreditListing.created_at.desc()).all()
    return [
        {
            "id"                  : l.id,
            "project_id"          : l.project_id,
            "quantity_tco2e"      : l.quantity_tco2e,
            "price_per_tco2e_inr" : l.price_per_tco2e_inr,
            "total_inr"           : l.total_inr,
            "status"              : l.status,
            "methodology"         : l.methodology,
            "created_at"          : l.created_at.isoformat() + "Z",
        }
        for l in listings
    ]
