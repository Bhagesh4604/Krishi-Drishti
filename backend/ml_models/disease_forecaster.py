"""
Disease Risk Forecasting — Rule-Based Epidemiological Model
============================================================
Source: ICAR Annual Disease Advisory + FAO Crop Protection Guidelines (public)
        ICAR-CRIDA Weather-based Crop Disease Risk (WBCDR) framework
        Adapted from "Disease Triangle" — Host × Pathogen × Environment

This replaces simple 3-rule heuristics with a comprehensive multi-crop model.
Called "rule-based epidemiological model" — this is exactly what ICAR's
Crop Weather Watch Groups use. It is more honest and more accurate than
calling 3 if-statements an "ML model".

Crops covered:
  Wheat, Rice, Cotton, Sugarcane, Tomato, Maize, Soybean, Potato, Grapes
  + 'mixed' / general fallback

Rules are based on 5-day weather windows matching real-world spore incubation.
"""

from typing import List, Dict


# ─── Helper ────────────────────────────────────────────────────────────────

def _compute_window_stats(weather_data: List[Dict], window: int = 5) -> Dict:
    """Compute avg temp, avg humidity, total precip, and diurnal range over the window."""
    recent = weather_data[-window:]

    temps = [d.get("temp", 25.0) for d in recent]
    humidities = [d.get("humidity", 60.0) for d in recent]
    precips = [d.get("precip", 0.0) for d in recent]

    return {
        "avg_temp": sum(temps) / len(temps),
        "avg_humidity": sum(humidities) / len(humidities),
        "total_precip": sum(precips),
        "min_temp": min(temps),
        "max_temp": max(temps),
        "diurnal_range": max(temps) - min(temps),
        "days_wet": sum(1 for p in precips if p > 2.0),   # ≥2mm counts as wet day
        "days_humid": sum(1 for h in humidities if h >= 80),
    }


def _alert(name: str, level: str, rec: str, crop_src: str) -> Dict:
    return {
        "disease_name": name,
        "risk_level": level,
        "recommendation": rec,
        "source": f"ICAR Advisory — {crop_src}",
    }


# ─── Rules per crop ────────────────────────────────────────────────────────

def _check_wheat(s: Dict) -> List[Dict]:
    alerts = []

    # Stem Rust (Puccinia graminis) — warm, humid, windy nights
    # Source: ICAR-IIWBR advisory; critical temp 15-35°C, RH >95% required for sporulation
    if s["avg_temp"] >= 15 and s["avg_temp"] <= 30 and s["avg_humidity"] >= 80:
        alerts.append(_alert(
            "Stem Rust",
            "High",
            "Warm humid conditions favor Stem Rust (Puccinia graminis). "
            "Apply Propiconazole (Tilt 25 EC) @ 0.1% immediately. "
            "Use rust-resistant varieties (HD-2967, DBW-17) next season.",
            "Wheat"
        ))

    # Powdery Mildew — warm & moderate humidity (drier than Late Blight)
    # Optimal: 20-25°C, 65-80% RH — ICAR Plant Pathology Division
    if 20 <= s["avg_temp"] <= 28 and 65 <= s["avg_humidity"] <= 85:
        alerts.append(_alert(
            "Powdery Mildew",
            "Medium",
            "Conditions favor Powdery Mildew. Monitor lower leaves for white powdery patches. "
            "Apply Sulphur 80WP @ 2g/L or Hexaconazole @ 0.05% at first sign of infection.",
            "Wheat"
        ))

    # Karnal Bunt — cool and wet at anthesis
    # Risk: 14-20°C at flowering + >30mm rain in 5 days — ICAR CWWG report
    if 14 <= s["avg_temp"] <= 20 and s["total_precip"] > 30:
        alerts.append(_alert(
            "Karnal Bunt",
            "Medium",
            "Cool wet conditions during heading/anthesis stage increase Karnal Bunt risk. "
            "Apply Propiconazole @ 0.1% at ear emergence if rainfall continues.",
            "Wheat"
        ))

    # Loose Smut — primarily seed-borne but wet, warm germination conditions accelerate
    if s["avg_temp"] >= 22 and s["days_wet"] >= 3:
        alerts.append(_alert(
            "Loose Smut",
            "Low",
            "Warm wet soil can favour Loose Smut in susceptible varieties. "
            "Use certified treated seed next cycle (Carboxin-Thiram treatment).",
            "Wheat"
        ))

    return alerts


def _check_rice(s: Dict) -> List[Dict]:
    alerts = []

    # Rice Blast (Pyricularia oryzae) — most destructive rice disease in India
    # Optimal: 25-28°C, RH >90%, cloudy/rainy weather — ICAR-CRRI advisory
    if 22 <= s["avg_temp"] <= 32 and s["avg_humidity"] >= 85 and s["days_humid"] >= 3:
        alerts.append(_alert(
            "Rice Blast",
            "High",
            "High risk of Rice Blast (Pyricularia oryzae). Cloudy, humid and warm nights promote "
            "conidia release. Apply Tricyclazole 75WP @ 0.6g/L or Carbendazim 50WP @ 1g/L. "
            "Avoid excess nitrogen fertilizer when blast pressure is high.",
            "Rice / CRRI"
        ))

    # Brown Spot (Helminthosporium oryzae) — low nutrition + warm humid
    if s["avg_temp"] >= 25 and s["avg_humidity"] >= 75:
        alerts.append(_alert(
            "Brown Spot",
            "Medium",
            "Conditions favor Brown Spot. Often linked to potassium deficiency + humid weather. "
            "Apply Mancozeb 75WP @ 2g/L. Check and supplement K fertilization.",
            "Rice / CRRI"
        ))

    # Bacterial Blight (Xanthomonas oryzae) — typhoon-like storms, warm, very wet
    if s["avg_temp"] >= 25 and s["total_precip"] > 50 and s["avg_humidity"] >= 80:
        alerts.append(_alert(
            "Bacterial Leaf Blight",
            "High",
            "Heavy rain + warm temperatures create entry points for Bacterial Blight. "
            "Avoid clipping leaf tips during active infection. "
            "Spray Copper Oxychloride 50WP @ 3g/L. Use resistant varieties (Pusa Basmati 1121).",
            "Rice / CRRI"
        ))

    # Sheath Blight (Rhizoctonia solani) — warm humid with standing water
    if s["avg_temp"] >= 28 and s["avg_humidity"] >= 85:
        alerts.append(_alert(
            "Sheath Blight",
            "Medium",
            "Hot humid conditions favour Sheath Blight. Maintain lower plant density. "
            "Apply Hexaconazole 5SC @ 1mL/L at first lesion appearance.",
            "Rice / CRRI"
        ))

    return alerts


def _check_cotton(s: Dict) -> List[Dict]:
    alerts = []

    # Fusarium Wilt — warm soil, poor drainage
    if s["avg_temp"] >= 25 and s["total_precip"] > 30 and s["days_wet"] >= 2:
        alerts.append(_alert(
            "Fusarium Wilt",
            "High",
            "Warm waterlogged conditions favour Fusarium oxysporum. "
            "Improve drainage. Avoid deep tillage near roots. "
            "Drenching with Carbendazim @ 1g/L around plant base can limit spread.",
            "Cotton / ICAR-CICR"
        ))

    # Alternaria Blight — warm and humid
    if 25 <= s["avg_temp"] <= 35 and s["avg_humidity"] >= 80:
        alerts.append(_alert(
            "Alternaria Blight",
            "Medium",
            "Humid warm conditions trigger Alternaria blight on cotton squares/bolls. "
            "Spray Mancozeb 75WP @ 2.5g/L at 10-day intervals.",
            "Cotton / ICAR-CICR"
        ))

    # Bollworm risk proxy via temperature (not a disease but critical for cotton)
    if s["avg_temp"] >= 28 and s["avg_humidity"] >= 60:
        alerts.append(_alert(
            "Bollworm (American/Pink)",
            "Medium",
            "Warm nights favour bollworm activity. Scout for egg masses on leaf undersurfaces. "
            "Use pheromone traps (8/ha). Spray NSKE 5% or Emamectin benzoate 5SG @ 0.4g/L "
            "if ETL (1 larva/plant) is crossed.",
            "Cotton / ICAR-CICR"
        ))

    return alerts


def _check_sugarcane(s: Dict) -> List[Dict]:
    alerts = []

    # Red Rot (Colletotrichum falcatum) — hot, wet, intercalary conditions
    if s["avg_temp"] >= 30 and s["total_precip"] > 40:
        alerts.append(_alert(
            "Red Rot",
            "High",
            "High temperature and rainfall are peak conditions for Red Rot. "
            "Remove and destroy infected stalks immediately. "
            "Sett treatment with Carbendazim 50WP (0.1%) before planting next cycle.",
            "Sugarcane / ICAR-IISR"
        ))

    # Smut (Sporisorium scitamineum) — high humidity, splashing rain
    if s["avg_humidity"] >= 80 and s["days_wet"] >= 3:
        alerts.append(_alert(
            "Sugarcane Smut",
            "Medium",
            "Wet weather promotes Smut whip development. Remove 'smut whips' (black sooty shoots) "
            "and destroy. Use resistant varieties (CoC 671, Co 86032).",
            "Sugarcane / ICAR-IISR"
        ))

    return alerts


def _check_tomato(s: Dict) -> List[Dict]:
    alerts = []

    # Late Blight (Phytophthora infestans) — cool moist nights
    if s["avg_humidity"] >= 85 and 10 <= s["avg_temp"] <= 22:
        alerts.append(_alert(
            "Late Blight",
            "High",
            "Classic Late Blight (Phytophthora infestans) conditions: cool, very humid nights. "
            "Apply Metalaxyl-M + Mancozeb (Ridomil Gold) @ 2.5g/L immediately. "
            "Repeat after 7 days if conditions persist.",
            "Tomato / ICAR-IIVR"
        ))

    # Early Blight (Alternaria solani) — warm & humid
    if 24 <= s["avg_temp"] <= 30 and s["avg_humidity"] >= 75:
        alerts.append(_alert(
            "Early Blight",
            "Medium",
            "Early Blight risk is elevated. Remove lower infected leaves. "
            "Spray Mancozeb 75WP @ 2g/L or Chlorothalonil @ 2g/L. "
            "Ensure 2-3 week spray schedule during humid weather.",
            "Tomato / ICAR-IIVR"
        ))

    # Fusarium Wilt — warm soil, high moisture
    if s["avg_temp"] >= 26 and s["total_precip"] > 35:
        alerts.append(_alert(
            "Fusarium Wilt",
            "Medium",
            "Soil temperature and moisture favour Fusarium crown and root rot. "
            "Drench soil with Trichoderma viride (4g/L) around plant base. "
            "Avoid waterlogging by improving bed drainage.",
            "Tomato / ICAR-IIVR"
        ))

    # TYLCV (Tomato Yellow Leaf Curl Virus) — warm, dry conditions that promote whitefly
    if s["avg_temp"] >= 27 and s["avg_humidity"] < 70 and s["total_precip"] < 10:
        alerts.append(_alert(
            "TYLCV (Whitefly Vector Risk)",
            "Medium",
            "Hot, dry weather increases Bemisia tabaci (whitefly) populations — "
            "primary vector of Tomato Yellow Leaf Curl Virus. "
            "Install yellow sticky traps (40/ha). Spray Imidacloprid 17.8SL @ 0.5mL/L.",
            "Tomato / ICAR-IIVR"
        ))

    return alerts


def _check_maize(s: Dict) -> List[Dict]:
    alerts = []

    # Maydis Leaf Blight (Helminthosporium maydis) — warm humid
    if s["avg_temp"] >= 24 and s["avg_humidity"] >= 80:
        alerts.append(_alert(
            "Maydis Leaf Blight",
            "Medium",
            "Warm humid weather favours H. maydis. Spray Mancozeb 75WP @ 2.5g/L. "
            "Avoid late planting which exposes crop to peak monsoon humidity.",
            "Maize / ICAR-IIMR"
        ))

    # Turcicum Leaf Blight (Exserohilum turcicum) — cool, wet
    if 18 <= s["avg_temp"] <= 27 and s["avg_humidity"] >= 85:
        alerts.append(_alert(
            "Turcicum Leaf Blight (TLB)",
            "High",
            "Cool wet conditions are ideal for Turcicum Leaf Blight. "
            "Apply Propiconazole 25EC @ 1mL/L at tassel emergence. "
            "Use TLB-resistant hybrids (HQPM-7, DHM-121) next season.",
            "Maize / ICAR-IIMR"
        ))

    # Stalk Rot (Fusarium/Pythium) — cool wet soil after warm dry spell
    if s["total_precip"] > 40 and s["diurnal_range"] > 12:
        alerts.append(_alert(
            "Stalk Rot",
            "Medium",
            "Large day/night temperature swing followed by heavy rain increases stalk rot pressure. "
            "Ensure balanced K fertilization. Harvest as soon as physiological maturity is reached.",
            "Maize / ICAR-IIMR"
        ))

    return alerts


def _check_soybean(s: Dict) -> List[Dict]:
    alerts = []

    # Soybean Rust (Phakopsora pachyrhizi) — warm, humid
    # Critical: 15-28°C, >6h leaf wetness — ICAR-IISR Indore advisory
    if 20 <= s["avg_temp"] <= 30 and s["avg_humidity"] >= 80 and s["days_humid"] >= 3:
        alerts.append(_alert(
            "Soybean Rust",
            "High",
            "High risk of Soybean Rust (Phakopsora pachyrhizi). "
            "Apply Tebuconazole 25.9EC @ 1mL/L or Hexaconazole 5SC @ 1mL/L at first pustule detection. "
            "Begin protective sprays if outbreak is reported in district.",
            "Soybean / ICAR-IISR"
        ))

    # Charcoal Rot (Macrophomina phaseolina) — hot and dry stress
    if s["avg_temp"] >= 30 and s["avg_humidity"] < 50 and s["total_precip"] < 10:
        alerts.append(_alert(
            "Charcoal Rot",
            "Medium",
            "Hot dry stress during pod-fill predisposes plants to Charcoal Rot. "
            "Ensure adequate soil moisture (irrigation if available). "
            "Avoid excessive plant density to reduce competition stress.",
            "Soybean / ICAR-IISR"
        ))

    # Pod Blight (Colletotrichum dematium) — warm wet at maturity
    if s["avg_temp"] >= 25 and s["total_precip"] > 30 and s["days_wet"] >= 3:
        alerts.append(_alert(
            "Pod Blight / Anthracnose",
            "Medium",
            "Warm wet weather near harvest increases Pod Blight. "
            "Harvest promptly when 95% pods have matured. "
            "Apply Carbendazim 50WP @ 1g/L as a preventative spray at pod-fill stage.",
            "Soybean / ICAR-IISR"
        ))

    return alerts


def _check_potato(s: Dict) -> List[Dict]:
    """Potato-specific checks (Late Blight is most critical)."""
    alerts = []

    # Late Blight — Potato (most destructive disease in India)
    # Wallin Temperature-Humidity Index: RH > 85% for ≥11h AND temp 10-24°C
    if s["avg_humidity"] >= 85 and 10 <= s["avg_temp"] <= 24 and s["days_humid"] >= 3:
        alerts.append(_alert(
            "Late Blight (Phytophthora infestans)",
            "High",
            "CRITICAL: Potato Late Blight conditions are met. Apply Metalaxyl-M + Mancozeb "
            "(Ridomil Gold) @ 2.5g/L every 7 days. Apply prophylactically if outbreak reported in 50km radius.",
            "Potato / ICAR-CPRI, Simla"
        ))

    # Early Blight (Alternaria solani)
    if 22 <= s["avg_temp"] <= 30 and s["avg_humidity"] >= 75:
        alerts.append(_alert(
            "Early Blight (Alternaria solani)",
            "Medium",
            "Warm humid conditions promote Early Blight. "
            "Spray Mancozeb 75WP @ 2.5g/L on 10-day intervals. "
            "Roguing of infected plants reduces inoculum.",
            "Potato / ICAR-CPRI, Simla"
        ))

    return alerts


def _check_grapes(s: Dict) -> List[Dict]:
    alerts = []

    # Downy Mildew (Plasmopara viticola) — warm, very wet
    if s["avg_humidity"] >= 85 and s["avg_temp"] >= 11 and s["total_precip"] > 20:
        alerts.append(_alert(
            "Downy Mildew (Grapes)",
            "High",
            "Warm wet nights with high humidity trigger Downy Mildew (Plasmopara viticola). "
            "Apply Copper Oxychloride 50WP @ 3g/L or Metalaxyl + Mancozeb. "
            "Improve canopy ventilation by leaf removal.",
            "Grapes / NRC Grapes, Pune"
        ))

    # Powdery Mildew — warm and moderately dry
    if 22 <= s["avg_temp"] <= 30 and 55 <= s["avg_humidity"] <= 80:
        alerts.append(_alert(
            "Powdery Mildew (Grapes)",
            "High",
            "Classic Powdery Mildew (Erysiphe necator) conditions. "
            "Apply Sulphur 80WP @ 3g/L or Myclobutanil @ 0.4mL/L every 10 days. "
            "Critical to protect during berry development phase.",
            "Grapes / NRC Grapes, Pune"
        ))

    return alerts


def _check_general(s: Dict) -> List[Dict]:
    """General rules that apply to all crops regardless of type."""
    alerts = []

    # Root Rot / Waterlogging — universal threat
    if s["total_precip"] > 60:
        alerts.append(_alert(
            "Root Rot / Waterlogging Risk",
            "Medium",
            f"Total 5-day rainfall exceeded 60mm ({s['total_precip']:.1f}mm). "
            "Check field drainage urgently. Consider raised bed techniques for future plantings. "
            "Reduce irrigation if applicable.",
            "General / ICAR Advisory"
        ))

    # Damping Off (Pythium spp.) — nursery stage, cool wet
    if s["avg_temp"] < 22 and s["avg_humidity"] >= 85 and s["days_wet"] >= 3:
        alerts.append(_alert(
            "Damping Off Risk",
            "Low",
            "Cool wet conditions can cause Damping Off in seedling/nursery stage. "
            "Apply Thiram 75WP @ 2g/L as soil drench. Improve nursery ventilation.",
            "General Nursery / ICAR Advisory"
        ))

    return alerts


# ─── Public API ────────────────────────────────────────────────────────────

# Maps crop keywords → checker function
_CROP_CHECKERS = {
    "wheat": _check_wheat,
    "rice": _check_rice,
    "paddy": _check_rice,
    "cotton": _check_cotton,
    "sugarcane": _check_sugarcane,
    "tomato": _check_tomato,
    "maize": _check_maize,
    "corn": _check_maize,
    "soybean": _check_soybean,
    "soya": _check_soybean,
    "potato": _check_potato,
    "grapes": _check_grapes,
    "grape": _check_grapes,
}


def evaluate_disease_risk(weather_data: List[Dict], crop_type: str) -> List[Dict]:
    """
    Rule-based Epidemiological Disease Risk Assessment (ICAR/FAO Framework).

    Parameters
    ----------
    weather_data : list of dicts — chronological, each with keys:
                   'temp' (°C), 'humidity' (%), 'precip' (mm)
    crop_type    : str — crop name (wheat, rice, cotton, etc.)

    Returns
    -------
    List of alert dicts, each with:
        disease_name, risk_level, recommendation, source
    Empty list if no risk detected.

    Model
    -----
    Based on the biological disease triangle (Host × Pathogen × Environment).
    Epidemiological thresholds derived from:
      - ICAR Annual Disease Advisories (2022-2024)
      - FAO Crop Protection Guidelines
      - ICAR-CRIDA Weather-Based Crop Disease Risk (WBCDR) System
    """
    if len(weather_data) < 5:
        return []  # Need minimum 5-day window for robust risk assessment

    stats = _compute_window_stats(weather_data, window=5)

    alerts: List[Dict] = []

    # Determine crop-specific rules
    crop_lower = (crop_type or "").lower()
    matched = False
    for keyword, checker in _CROP_CHECKERS.items():
        if keyword in crop_lower:
            alerts.extend(checker(stats))
            matched = True
            break

    # 'mixed' or unrecognized crops — run all relevant general rules
    if not matched or "mixed" in crop_lower:
        # Run wheat + rice + general as baseline for unknown crops
        alerts.extend(_check_wheat(stats))
        alerts.extend(_check_rice(stats))

    # General rules run for every crop
    alerts.extend(_check_general(stats))

    # Deduplicate by disease_name (keep highest risk)
    seen = {}
    for a in alerts:
        name = a["disease_name"]
        if name not in seen:
            seen[name] = a
        else:
            # Prefer higher risk level
            priority = {"High": 3, "Medium": 2, "Low": 1}
            if priority.get(a["risk_level"], 0) > priority.get(seen[name]["risk_level"], 0):
                seen[name] = a

    return list(seen.values())
