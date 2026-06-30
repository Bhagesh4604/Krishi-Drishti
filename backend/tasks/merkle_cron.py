"""
Merkle Daily Anchor (Upgrade C)
================================
Runs at midnight daily. Collects all CropCycleEvent hashes from the day,
computes a cryptographic Merkle Root, and stores it in MerkleAnchor.

This makes it mathematically impossible to alter past event records
without breaking the published Merkle root — a verifier can always compare.

To run manually: python -c "from backend.tasks.merkle_cron import run_daily_anchor; run_daily_anchor()"
To schedule via Celery Beat: registered in celery_app.py
"""

import hashlib
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from ..database import SessionLocal
from ..models import CropCycleEvent, MerkleAnchor


def _hash_pair(left: str, right: str) -> str:
    """Hash two leaf nodes together."""
    return hashlib.sha256((left + right).encode()).hexdigest()


def build_merkle_root(hashes: list[str]) -> str:
    """
    Build a Merkle tree from a list of leaf hashes and return the root.
    If the list has an odd number of elements, the last element is duplicated.
    """
    if not hashes:
        return hashlib.sha256(b"EMPTY_DAY").hexdigest()
    if len(hashes) == 1:
        return hashes[0]

    layer = hashes[:]
    while len(layer) > 1:
        if len(layer) % 2 != 0:
            layer.append(layer[-1])  # Duplicate last leaf for odd count
        new_layer = []
        for i in range(0, len(layer), 2):
            new_layer.append(_hash_pair(layer[i], layer[i + 1]))
        layer = new_layer

    return layer[0]


def run_daily_anchor():
    """
    Main CRON function. Collects today's event hashes, builds a Merkle tree,
    and writes the root to the MerkleAnchor table.
    """
    db: Session = SessionLocal()
    try:
        # Anchor events from the past 24 hours
        start_of_day = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        end_of_day = start_of_day + timedelta(days=1)

        events_today = db.query(CropCycleEvent).filter(
            CropCycleEvent.event_date >= start_of_day,
            CropCycleEvent.event_date < end_of_day,
            CropCycleEvent.event_hash.isnot(None)
        ).order_by(CropCycleEvent.event_date.asc()).all()

        leaf_hashes = [e.event_hash for e in events_today if e.event_hash]
        merkle_root = build_merkle_root(leaf_hashes)

        anchor = MerkleAnchor(
            anchor_date=start_of_day,
            merkle_root=merkle_root,
            event_count=len(leaf_hashes),
            # In production: replace with L2 transaction hash after submitting to Base/Polygon
            chain_id="internal-postgres-v1",
            l2_tx_hash=None
        )
        db.add(anchor)
        db.commit()

        print(f"[MerkleAnchor] {start_of_day.date()} | Events: {len(leaf_hashes)} | Root: {merkle_root[:16]}...")
        return merkle_root

    except Exception as e:
        db.rollback()
        print(f"[MerkleAnchor] FAILED: {e}")
        raise
    finally:
        db.close()
