"""
Evidence Integrity Service — Krishi-Drishti dMRV Pipeline
==========================================================
Pillar 1: Cryptographic hashing + EXIF metadata extraction
Pillar 2: GPS proximity validation (evidence vs plot polygon centroid)

Called immediately when a farmer uploads evidence to carbon_projects.py.
Results are stored on the CarbonEvidence record before AI screening begins.
"""

import hashlib
import json
import math
import struct
from datetime import datetime, timedelta
from typing import Optional

# piexif is optional — gracefully degrade if not installed
try:
    import piexif
    PIEXIF_AVAILABLE = True
except ImportError:
    PIEXIF_AVAILABLE = False


# ── SHA-256 Hashing ────────────────────────────────────────────────────────────

def compute_evidence_hash(file_bytes: bytes) -> str:
    """
    Compute SHA-256 hash of raw file bytes.
    This hash is the cryptographic fingerprint of the evidence —
    any post-upload tampering would invalidate it.
    """
    return hashlib.sha256(file_bytes).hexdigest()


# ── EXIF Metadata Extraction ───────────────────────────────────────────────────

def _dms_to_decimal(dms_tuple, ref: str) -> Optional[float]:
    """Convert EXIF DMS rational tuples to decimal degrees."""
    try:
        degrees = dms_tuple[0][0] / dms_tuple[0][1]
        minutes = dms_tuple[1][0] / dms_tuple[1][1]
        seconds = dms_tuple[2][0] / dms_tuple[2][1]
        decimal = degrees + (minutes / 60.0) + (seconds / 3600.0)
        if ref in ("S", "W"):
            decimal = -decimal
        return round(decimal, 7)
    except Exception:
        return None


def extract_exif_metadata(file_bytes: bytes) -> dict:
    """
    Extract EXIF GPS, timestamp, and device info from image bytes.

    Returns a dict with:
      - exif_lat, exif_lng: GPS coordinates from EXIF (None if not present)
      - exif_timestamp: datetime the photo was taken (None if not present)
      - exif_device: 'Make Model' string from camera
      - exif_available: whether EXIF data was parseable
    """
    result = {
        "exif_lat": None,
        "exif_lng": None,
        "exif_timestamp": None,
        "exif_device": None,
        "exif_available": False,
    }

    if not PIEXIF_AVAILABLE:
        return result

    try:
        exif_dict = piexif.load(file_bytes)
        result["exif_available"] = True

        # GPS IFD
        gps = exif_dict.get("GPS", {})
        lat_dms = gps.get(piexif.GPSIFD.GPSLatitude)
        lat_ref = gps.get(piexif.GPSIFD.GPSLatitudeRef, b"N").decode()
        lng_dms = gps.get(piexif.GPSIFD.GPSLongitude)
        lng_ref = gps.get(piexif.GPSIFD.GPSLongitudeRef, b"E").decode()

        if lat_dms and lng_dms:
            result["exif_lat"] = _dms_to_decimal(lat_dms, lat_ref)
            result["exif_lng"] = _dms_to_decimal(lng_dms, lng_ref)

        # DateTimeOriginal from Exif IFD
        exif_ifd = exif_dict.get("Exif", {})
        dt_str = exif_ifd.get(piexif.ExifIFD.DateTimeOriginal)
        if dt_str:
            try:
                result["exif_timestamp"] = datetime.strptime(
                    dt_str.decode(), "%Y:%m:%d %H:%M:%S"
                )
            except Exception:
                pass

        # Make + Model from 0th IFD
        ifd0 = exif_dict.get("0th", {})
        make = ifd0.get(piexif.ImageIFD.Make, b"")
        model = ifd0.get(piexif.ImageIFD.Model, b"")
        if make or model:
            result["exif_device"] = f"{make.decode(errors='replace').strip()} {model.decode(errors='replace').strip()}".strip()

    except Exception:
        # Non-JPEG or no EXIF — not an error, just no metadata
        pass

    return result


# ── GPS Proximity Check ────────────────────────────────────────────────────────

def _haversine_m(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Haversine distance in metres between two GPS coordinates."""
    R = 6_371_000  # Earth radius in metres
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


def _plot_centroid(coordinates_json: str) -> Optional[tuple]:
    """
    Compute the centroid (mean lat, mean lng) of a plot polygon.
    plot.coordinates is stored as JSON: [{"lat": x, "lng": y}, ...]
    """
    try:
        coords = json.loads(coordinates_json)
        if not coords:
            return None
        lats = [c["lat"] for c in coords]
        lngs = [c["lng"] for c in coords]
        return (sum(lats) / len(lats), sum(lngs) / len(lngs))
    except Exception:
        return None


def check_gps_proximity(
    evidence_lat: float,
    evidence_lng: float,
    plot_coordinates_json: str,
    threshold_m: float = 500.0,
) -> dict:
    """
    Check whether the evidence GPS is within `threshold_m` metres of the
    registered plot polygon centroid.

    Returns:
      - gps_distance_m: distance in metres (None if plot coords unavailable)
      - gps_valid: True if within threshold
    """
    centroid = _plot_centroid(plot_coordinates_json)
    if centroid is None:
        return {"gps_distance_m": None, "gps_valid": None}

    distance = _haversine_m(evidence_lat, evidence_lng, centroid[0], centroid[1])
    return {
        "gps_distance_m": round(distance, 1),
        "gps_valid": distance <= threshold_m,
    }


# ── EXIF vs Form GPS Consistency ──────────────────────────────────────────────

def is_exif_suspicious(
    form_lat: float,
    form_lng: float,
    exif_lat: Optional[float],
    exif_lng: Optional[float],
    exif_timestamp: Optional[datetime],
    threshold_km: float = 1.0,
    max_age_days: int = 30,
) -> tuple[bool, str]:
    """
    Flag evidence as suspicious if:
    1. EXIF GPS differs from form-submitted GPS by > threshold_km
    2. Photo was taken more than max_age_days before upload (pre-captured evidence)

    Returns (is_suspicious: bool, reason: str)
    """
    reasons = []

    # GPS mismatch check
    if exif_lat is not None and exif_lng is not None:
        dist_km = _haversine_m(form_lat, form_lng, exif_lat, exif_lng) / 1000
        if dist_km > threshold_km:
            reasons.append(
                f"Form GPS ({form_lat:.4f},{form_lng:.4f}) differs from "
                f"photo EXIF GPS ({exif_lat:.4f},{exif_lng:.4f}) by {dist_km:.1f}km"
            )

    # Timestamp staleness check
    if exif_timestamp is not None:
        age = datetime.utcnow() - exif_timestamp
        if age > timedelta(days=max_age_days):
            reasons.append(
                f"Photo was taken {age.days} days ago — "
                f"exceeds the {max_age_days}-day freshness requirement"
            )

    return (len(reasons) > 0, "; ".join(reasons))


# ── Master Integrity Check ─────────────────────────────────────────────────────

def run_integrity_check(
    file_bytes: bytes,
    form_lat: float,
    form_lng: float,
    plot_coordinates_json: str,
) -> dict:
    """
    Run all Pillar 1 + Pillar 2 checks on an uploaded evidence file.
    Returns a dict ready to update CarbonEvidence fields.
    """
    # Pillar 1A: Cryptographic hash
    sha256 = compute_evidence_hash(file_bytes)

    # Pillar 1B: EXIF metadata
    exif = extract_exif_metadata(file_bytes)

    # Pillar 1C: EXIF vs form GPS consistency
    suspicious, suspicious_reason = is_exif_suspicious(
        form_lat, form_lng,
        exif["exif_lat"], exif["exif_lng"],
        exif["exif_timestamp"],
    )

    # Pillar 2: GPS proximity to plot
    proximity = check_gps_proximity(form_lat, form_lng, plot_coordinates_json)

    if not proximity.get("gps_valid", True):
        suspicious = True
        suspicious_reason = (
            f"{suspicious_reason}; " if suspicious_reason else ""
        ) + "Geotag location exceeds 500m plot boundary limit."

    return {
        # Integrity
        "evidence_hash": sha256,
        "exif_lat": exif["exif_lat"],
        "exif_lng": exif["exif_lng"],
        "exif_timestamp": exif["exif_timestamp"],
        "exif_device": exif["exif_device"],
        "exif_suspicious": suspicious,
        # Geospatial
        "gps_distance_m": proximity["gps_distance_m"],
        "gps_valid": proximity["gps_valid"],
        # Notes for admin (stored in ai_analysis temporarily)
        "_integrity_notes": suspicious_reason if suspicious else None,
    }
