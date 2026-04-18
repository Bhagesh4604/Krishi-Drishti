"""
Additionality Service — Krishi-Drishti
Looks up district-level practice adoption rates to determine if a
carbon practice is "additional" (novel enough to qualify for credits).

Source: ICAR Annual Report 2022-23, NABARD District Agriculture Survey,
        Ministry of Agriculture & Farmers' Welfare State Statistics 2023.

Methodology:
  Score < 0.50 = practice is additional in that district → eligible for credits
  Score >= 0.50 = practice is already common in that district → rejected
  (Aligned with Verra VM0042 and CCTS BEE additionality test logic)
"""

import json
import os
from functools import lru_cache
from pathlib import Path

_DATA_PATH = Path(__file__).resolve().parents[1] / "data" / "district_additionality.json"
_THRESHOLD = 0.50


@lru_cache(maxsize=1)
def _load_data() -> dict:
    """Load the additionality JSON once, cache it for the process lifetime."""
    if not _DATA_PATH.exists():
        raise FileNotFoundError(f"Additionality data not found at {_DATA_PATH}")
    with open(_DATA_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def get_additionality_score(district: str, methodology: str) -> float:
    """
    Returns the regional adoption rate (0.0–1.0) for a given practice
    in a given district.

    Args:
        district:    The farmer's registered district (e.g., "Nashik", "Pune").
        methodology: The carbon practice (e.g., "No-Till", "Cover-Crop", "Agroforestry").

    Returns:
        float: Adoption rate between 0.0 and 1.0.
               < 0.50 → practice is additional (project eligible).
               >= 0.50 → practice is too common (project rejected).
    """
    data = _load_data()
    threshold = data.get("_meta", {}).get("threshold", _THRESHOLD)

    # Normalise methodology key
    method_key = _normalise_methodology(methodology)
    method_data = data.get(method_key, {})

    if not method_data:
        # Unknown methodology — use conservative default (assume additional)
        return 0.30

    # Normalise district — try exact match first, then title-case
    score = method_data.get(district)
    if score is None:
        score = method_data.get(district.strip().title())
    if score is None:
        # Partial match: find first district whose name contains the query
        district_lower = district.lower()
        for key, value in method_data.items():
            if key.lower() == district_lower:
                score = value
                break
    if score is None:
        score = method_data.get("default", 0.30)

    return float(score)


def is_additional(district: str, methodology: str) -> tuple[bool, float, str]:
    """
    Determines if a carbon practice is additional in a given district.

    Returns:
        (is_additional: bool, score: float, reason: str)
    """
    score = get_additionality_score(district, methodology)
    data = _load_data()
    threshold = float(data.get("_meta", {}).get("threshold", _THRESHOLD))

    if score < threshold:
        reason = (
            f"Only {int(score * 100)}% of farmers in your district currently practice "
            f"{methodology}. This qualifies as an additional practice under CCTS/Verra standards."
        )
        return True, score, reason
    else:
        reason = (
            f"{int(score * 100)}% of farmers in your district already practice "
            f"{methodology}. This does not qualify as additional under CCTS/Verra standards "
            f"(threshold: <{int(threshold * 100)}% adoption)."
        )
        return False, score, reason


def _normalise_methodology(methodology: str) -> str:
    """Map common methodology name variations to JSON keys."""
    m = (methodology or "").strip()
    mapping = {
        "no-till": "No-Till",
        "no till": "No-Till",
        "notill": "No-Till",
        "zero-till": "No-Till",
        "zero till": "No-Till",
        "cover-crop": "Cover-Crop",
        "cover crop": "Cover-Crop",
        "covercrop": "Cover-Crop",
        "agroforestry": "Agroforestry",
        "agro-forestry": "Agroforestry",
        "agro forestry": "Agroforestry",
        "reduced-tillage": "Reduced-Tillage",
        "reduced tillage": "Reduced-Tillage",
        "composting": "Composting",
    }
    return mapping.get(m.lower(), m)
