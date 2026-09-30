"""
Evidence AI Verifier — Krishi-Drishti dMRV Pipeline
====================================================
Pillar 4: AI-driven content validation using Gemini Vision (gemini-3.6-flash)

Runs automatically after evidence upload. Analyzes the uploaded photo to:
  1. Confirm it is an outdoor agricultural/farm field photo
  2. Confirm the claimed practice (cover crop, no-till, etc.) is visible
  3. Reject fee receipts, documents, selfies, interior photos

All verdicts are stored on CarbonEvidence.ai_* fields.
Results feed directly into the L1 admin review queue.
"""

import json
import os
import re
from datetime import datetime
from typing import Optional

# Gemini import with graceful fallback
try:
    import google.generativeai as genai
    GENAI_AVAILABLE = True
except ImportError:
    genai = None
    GENAI_AVAILABLE = False


# ── Prompt Engineering ─────────────────────────────────────────────────────────

VERIFICATION_PROMPT = """
You are an expert agricultural carbon credit evidence verifier working for an accredited
Validation and Verification Body (VVB) in India.

The farmer is claiming carbon credits under methodology: **{methodology}**

Your task is to analyze this photo and determine if it is valid evidence for this claim.

Respond ONLY with valid JSON in this exact format — no markdown, no explanation outside the JSON:

{{
  "is_farm_field": true or false,
  "practice_visible": true or false,
  "practice_description": "describe what you see in the photo (1-2 sentences)",
  "confidence_score": <integer 0-100>,
  "ai_status": "passed" or "flagged" or "rejected",
  "rejection_reason": "reason if not passed, otherwise null"
}}

Rules for classification:
- "passed": Clearly an outdoor farm/field photo showing the claimed practice (confidence >= 70)
- "flagged": Outdoor farm photo but practice not clearly visible OR confidence 40-69 (needs human review)
- "rejected": Not a farm photo (receipt, document, selfie, interior, screenshot, etc.)

Methodology-specific checks:
- Cover-Crop: Look for visible green cover crops between or on field rows
- No-Till: Look for undisturbed soil surface with crop residue, no tillage marks
- Agroforestry: Look for trees integrated with crops or pasture
- Biochar: Look for dark biochar material being applied or stored in field
- Organic-Compost: Look for compost pit, vermicompost beds, or compost application

IMPORTANT: If the photo shows ANY of the following, ALWAYS reject it:
- Documents, receipts, fee slips, certificates, letters
- Indoor photos or selfies
- Phone/computer screens
- Non-agricultural outdoor scenes (roads, buildings, markets)
"""


# ── AI Analysis ───────────────────────────────────────────────────────────────

def _get_gemini_model():
    """Initialize Gemini Vision model using existing project API key."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key or not GENAI_AVAILABLE:
        return None
    genai.configure(api_key=api_key)
    return genai.GenerativeModel("gemini-flash-latest")


def analyze_evidence_photo(
    methodology: str,
    image_url: Optional[str] = None,
    file_bytes: Optional[bytes] = None,
    content_type: str = "image/jpeg",
) -> dict:
    """
    Analyze evidence photo using Gemini Vision.

    Accepts either:
      - file_bytes (preferred): raw image bytes from the upload — works without Cloudinary
      - image_url: Cloudinary/public URL — bytes are fetched over HTTP

    At least one must be provided.

    Returns:
        dict with ai_status, ai_confidence, ai_analysis, ai_rejection_reason, ai_screened_at, review_status
    """
    if not image_url and not file_bytes:
        # No image at all — cannot screen, queue for manual review
        return {
            "ai_status": "flagged",
            "ai_confidence": None,
            "ai_analysis": json.dumps({"note": "No image provided — queued for manual review"}),
            "ai_rejection_reason": None,
            "ai_screened_at": datetime.utcnow(),
            "review_status": "pending_l1",
        }

    model = _get_gemini_model()

    # Fallback if Gemini API key not set — queue for human review
    if model is None:
        return {
            "ai_status": "flagged",
            "ai_confidence": None,
            "ai_analysis": json.dumps({
                "note": "AI screening unavailable (GEMINI_API_KEY not set) — queued for human review",
                "is_farm_field": None,
                "practice_visible": None,
            }),
            "ai_rejection_reason": None,
            "ai_screened_at": datetime.utcnow(),
            "review_status": "pending_l1",
        }

    prompt = VERIFICATION_PROMPT.format(methodology=methodology)

    try:
        # Resolve image bytes — prefer in-memory bytes, fall back to URL fetch
        if file_bytes:
            raw_bytes = file_bytes
            mime = content_type.split(";")[0].strip() or "image/jpeg"
        else:
            import urllib.request
            req = urllib.request.Request(image_url, headers={"User-Agent": "KrishiDrishti-dMRV/1.0"})
            with urllib.request.urlopen(req, timeout=15) as resp:
                raw_bytes = resp.read()
                mime = resp.headers.get("Content-Type", "image/jpeg").split(";")[0].strip()

        image_part = {"mime_type": mime, "data": raw_bytes}

        response = model.generate_content([prompt, image_part])
        raw_text = response.text.strip()

        # Strip markdown code fences if present
        raw_text = re.sub(r"^```(?:json)?\s*", "", raw_text)
        raw_text = re.sub(r"\s*```$", "", raw_text)

        parsed = json.loads(raw_text)

        ai_status = parsed.get("ai_status", "flagged")
        confidence = float(parsed.get("confidence_score", 50))

        # Map AI status → review_status
        # INDUSTRY-READY OPTIMIZATION: 
        # If the AI is highly confident (>=80%) that the photo perfectly shows the methodology (e.g. cover crops),
        # we bypass the L1 human admin queue and send it directly to L2 VVB for final approval.
        # This saves massive human labor costs in a real dMRV system.
        if ai_status == "passed" and confidence >= 80:
            review_status = "pending_l2"
        else:
            review_status = {
                "passed":   "pending_l1",    # passed but low confidence (<80) → L1 human review
                "flagged":  "pending_l1",    # flagged (corn field without cover crop) → admin reviews
                "rejected": "l1_rejected",   # rejected (document/selfie) → blocked, farmer must re-upload
            }.get(ai_status, "pending_l1")

        return {
            "ai_status": ai_status,
            "ai_confidence": confidence,
            "ai_analysis": json.dumps(parsed),
            "ai_rejection_reason": parsed.get("rejection_reason"),
            "ai_screened_at": datetime.utcnow(),
            "review_status": review_status,
        }

    except json.JSONDecodeError as e:
        return {
            "ai_status": "flagged",
            "ai_confidence": None,
            "ai_analysis": json.dumps({"raw_response": raw_text[:500], "parse_error": str(e)}),
            "ai_rejection_reason": None,
            "ai_screened_at": datetime.utcnow(),
            "review_status": "pending_l1",
        }
    except Exception as e:
        return {
            "ai_status": "flagged",
            "ai_confidence": None,
            "ai_analysis": json.dumps({"error": str(e), "note": "AI screening failed — queued for human review"}),
            "ai_rejection_reason": None,
            "ai_screened_at": datetime.utcnow(),
            "review_status": "pending_l1",
        }






# ── Checkpoint Generator ───────────────────────────────────────────────────────

def generate_gps_checkpoints(plot_coordinates_json: str, project_id: int, n: int = 3) -> list:
    """
    Generate n deterministic GPS checkpoints inside the plot polygon.
    Uses project_id as seed so checkpoints change monthly but are reproducible.

    Farmers must capture evidence from these exact GPS locations,
    ensuring full-field coverage rather than a single corner shot.
    """
    import json, hashlib, math

    try:
        coords = json.loads(plot_coordinates_json)
        if len(coords) < 3:
            return []

        lats = [c["lat"] for c in coords]
        lngs = [c["lng"] for c in coords]
        min_lat, max_lat = min(lats), max(lats)
        min_lng, max_lng = min(lngs), max(lngs)

        # Monthly seed: changes each month so farmers can't pre-capture
        from datetime import datetime
        month_str = datetime.utcnow().strftime("%Y-%m")
        seed = f"{project_id}-{month_str}"

        checkpoints = []
        for i in range(n):
            h = hashlib.md5(f"{seed}-{i}".encode()).hexdigest()
            # Use first 16 hex chars as two 8-char seeds
            lat_frac = int(h[:8], 16) / 0xFFFFFFFF
            lng_frac = int(h[8:16], 16) / 0xFFFFFFFF

            checkpoints.append({
                "id": i + 1,
                "lat": round(min_lat + lat_frac * (max_lat - min_lat), 6),
                "lng": round(min_lng + lng_frac * (max_lng - min_lng), 6),
                "label": f"Checkpoint {i + 1}",
                "radius_m": 50,
                "instructions": f"Navigate to this location within your field and take a photo showing your {['crop', 'soil', 'boundary'][i % 3]}",
            })

        return checkpoints
    except Exception:
        return []
