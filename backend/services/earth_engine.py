import datetime
import hashlib
import math
import os
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Sequence

import ee
from dotenv import load_dotenv


ROOT_ENV_PATH = Path(__file__).resolve().parents[2] / ".env"
load_dotenv(ROOT_ENV_PATH)

ACRES_TO_HECTARES = 0.404686
SQM_PER_HECTARE = 10000.0
SIMULATED_IMAGE_URL = (
    "https://images.unsplash.com/photo-1500382017468-9049fed747ef"
    "?w=1200&q=80&auto=format&fit=crop"
)
DEAD_PROXY_VALUES = {"http://127.0.0.1:9", "https://127.0.0.1:9"}


def _clamp(value: float, lower: float, upper: float) -> float:
    return max(lower, min(upper, value))


def _hash_unit(seed_str: str) -> float:
    hash_val = int(hashlib.md5(seed_str.encode("utf-8")).hexdigest()[:8], 16)
    return hash_val / 0xFFFFFFFF


def _round_or_none(value: Optional[float], digits: int = 3) -> Optional[float]:
    if value is None:
        return None
    return round(float(value), digits)


def _normalize_ring(geometry_coords: Sequence[Any]) -> List[List[float]]:
    ring: List[List[float]] = []

    if not geometry_coords:
        return ring

    for coord in geometry_coords:
        if isinstance(coord, dict):
            lat = coord.get("lat") or coord.get("latitude")
            lng = coord.get("lng") or coord.get("longitude") or coord.get("lon")
        else:
            if not isinstance(coord, (list, tuple)) or len(coord) < 2:
                continue
            lng, lat = coord[0], coord[1]

        if lat is None or lng is None:
            continue

        try:
            ring.append([float(lng), float(lat)])
        except (ValueError, TypeError):
            continue

    if ring and ring[0] != ring[-1]:
        ring.append(ring[0])

    return ring


def _approx_area_hectares(ring: Sequence[Sequence[float]]) -> float:
    if len(ring) < 4:
        return 0.0

    earth_radius = 6378137.0
    closed_ring = list(ring[:-1]) if ring[0] == ring[-1] else list(ring)
    avg_lat = math.radians(sum(coord[1] for coord in closed_ring) / len(closed_ring))

    projected: List[List[float]] = []
    for lng, lat in closed_ring:
        x = math.radians(lng) * earth_radius * math.cos(avg_lat)
        y = math.radians(lat) * earth_radius
        projected.append([x, y])

    area_sqm = 0.0
    for index, point in enumerate(projected):
        next_point = projected[(index + 1) % len(projected)]
        area_sqm += point[0] * next_point[1] - next_point[0] * point[1]

    return abs(area_sqm) / 2.0 / SQM_PER_HECTARE


def _date_label(value: datetime.datetime) -> str:
    return value.strftime("%b %Y")


def _clear_dead_proxy_env() -> bool:
    cleared = False
    for key in ("HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY", "GIT_HTTP_PROXY", "GIT_HTTPS_PROXY"):
        value = (os.getenv(key) or "").strip().lower()
        if value in DEAD_PROXY_VALUES:
            os.environ.pop(key, None)
            cleared = True
    return cleared


class EarthEngineService:
    def __init__(self):
        self.initialized = False

    def initialize(self) -> bool:
        if self.initialized:
            return True

        project_id = os.getenv("GOOGLE_CLOUD_PROJECT")
        if _clear_dead_proxy_env():
            print("[GEE] Cleared dead proxy environment variables before initialization.")

        try:
            if project_id:
                ee.Initialize(project=project_id)
            else:
                ee.Initialize()
            self.initialized = True
            print("[GEE] Initialized successfully.")
        except Exception as exc:
            print(f"[GEE] Initialization failed: {exc}")
            print("Tip: Add GOOGLE_CLOUD_PROJECT to .env and run 'python authenticate_gee.py'")

        return self.initialized

    def _mask_sentinel2_clouds(self, image: ee.Image) -> ee.Image:
        qa = image.select("QA60")
        cloud_bit_mask = 1 << 10
        cirrus_bit_mask = 1 << 11
        mask = qa.bitwiseAnd(cloud_bit_mask).eq(0).And(qa.bitwiseAnd(cirrus_bit_mask).eq(0))
        return image.updateMask(mask).divide(10000).copyProperties(image, ["system:time_start"])

    def _add_indices(self, image: ee.Image) -> ee.Image:
        # ── Core Indices ──────────────────────────────────────────────────────
        ndvi = image.normalizedDifference(["B8", "B4"]).rename("NDVI")
        ndmi = image.normalizedDifference(["B8", "B11"]).rename("NDMI")
        evi = image.expression(
            "2.5 * ((nir - red) / (nir + 6 * red - 7.5 * blue + 1))",
            {
                "nir": image.select("B8"),
                "red": image.select("B4"),
                "blue": image.select("B2"),
            },
        ).rename("EVI")

        # ── NDRE — Red Edge / Nitrogen Status ─────────────────────────────────
        # Uses Sentinel-2 Band 8A (narrow NIR) and Band 5 (Red Edge 1)
        # Range: -1 to +1. High NDRE = high chlorophyll/nitrogen content
        ndre = image.normalizedDifference(["B8A", "B5"]).rename("NDRE")

        # ── MSAVI — Modified Soil Adjusted Vegetation Index ───────────────────
        # Best for early-stage crops (< 30 days) when soil is visible
        # Eliminates soil brightness effect unlike NDVI
        nir = image.select("B8")
        red = image.select("B4")
        msavi = nir.multiply(2).add(1).subtract(
            nir.multiply(2).add(1).pow(2)
            .subtract(nir.subtract(red).multiply(8))
            .sqrt()
        ).divide(2).rename("MSAVI")

        # ── GNDVI — Green NDVI / Chlorophyll Density ─────────────────────────
        # More sensitive to chlorophyll than NDVI. Good for nitrogen planning.
        gndvi = image.normalizedDifference(["B8", "B3"]).rename("GNDVI")

        # ── NBR — Normalized Burn Ratio (also nitrogen correlation) ───────────
        # Uses SWIR band 12. Also useful for stress and post-fire analysis
        nbr = image.normalizedDifference(["B8", "B12"]).rename("NBR")

        return image.addBands([ndvi, ndmi, evi, ndre, msavi, gndvi, nbr])


    def _prepare_sentinel_collection(
        self,
        roi: ee.Geometry,
        start_date: datetime.datetime,
        end_date: datetime.datetime,
    ) -> ee.ImageCollection:
        return (
            ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
            .filterBounds(roi)
            .filterDate(start_date.strftime("%Y-%m-%d"), end_date.strftime("%Y-%m-%d"))
            .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 35))
            .map(self._mask_sentinel2_clouds)
            .map(self._add_indices)
        )

    def _collection_has_images(self, collection: ee.ImageCollection) -> bool:
        try:
            return int(collection.size().getInfo()) > 0
        except Exception:
            return False

    def _safe_reduce(
        self,
        image: Optional[ee.Image],
        band: str,
        roi: ee.Geometry,
        scale: int,
    ) -> Optional[float]:
        if image is None:
            return None

        try:
            result = image.reduceRegion(
                reducer=ee.Reducer.mean(),
                geometry=roi,
                scale=scale,
                maxPixels=1e9,
            ).getInfo()
        except Exception:
            return None

        value = result.get(band) if isinstance(result, dict) else None
        if value is None:
            return None
        return float(value)

    def _get_soil_moisture(self, roi: ee.Geometry, now: datetime.datetime) -> Optional[float]:
        try:
            probe_geometry = roi.centroid(maxError=1).buffer(10000, maxError=1)
            smap = (
                ee.ImageCollection("NASA/SMAP/SPL4SMGP/008")
                .filterBounds(probe_geometry)
                .filterDate((now - datetime.timedelta(days=14)).strftime("%Y-%m-%d"), now.strftime("%Y-%m-%d"))
                .sort("system:time_start", False)
            )
            if not self._collection_has_images(smap):
                return None

            image = smap.first()
            result = image.reduceRegion(
                reducer=ee.Reducer.mean(),
                geometry=probe_geometry,
                scale=9000,
                maxPixels=1e9,
                bestEffort=True,
            ).getInfo()

            raw_value = None
            if isinstance(result, dict):
                raw_value = result.get("sm_surface") or result.get("sm_rootzone")

            if raw_value is None:
                return None

            return _clamp(float(raw_value) * 100.0, 5.0, 60.0)
        except Exception:
            return None

    def _build_thumbnail_url(self, image: Optional[ee.Image], roi: ee.Geometry) -> Optional[str]:
        if image is None:
            return None

        try:
            vis_params = {
                "min": 0.1,
                "max": 0.8,
                "palette": ["#8b0000", "#f1c232", "#1e8e3e"],
            }
            return image.select("NDVI").visualize(**vis_params).getThumbURL(
                {"dimensions": 720, "region": roi, "format": "png"}
            )
        except Exception:
            return None

    def _timeline_windows(self, now: datetime.datetime, months: int = 6) -> Iterable[tuple[datetime.datetime, datetime.datetime]]:
        for offset in range(months - 1, -1, -1):
            end_date = now - datetime.timedelta(days=offset * 30)
            start_date = end_date - datetime.timedelta(days=30)
            yield start_date, end_date

    def _build_real_timeline(self, roi: ee.Geometry, now: datetime.datetime) -> List[Dict[str, Any]]:
        timeline: List[Dict[str, Any]] = []

        for start_date, end_date in self._timeline_windows(now):
            collection = self._prepare_sentinel_collection(roi, start_date, end_date)
            if not self._collection_has_images(collection):
                continue

            composite = collection.median().clip(roi)
            ndvi = self._safe_reduce(composite, "NDVI", roi, 10)
            evi = self._safe_reduce(composite, "EVI", roi, 10)
            if ndvi is None:
                continue

            timeline.append(
                {
                    "label": _date_label(end_date),
                    "date": end_date.strftime("%Y-%m-%d"),
                    "ndvi": _round_or_none(ndvi),
                    "evi": _round_or_none(evi),
                }
            )

        return timeline

    def _methodology_profile(self, methodology: str) -> Dict[str, Any]:
        # Methodology rules and quantification belong to the programme, not this satellite screen.
        return {"name": (methodology or "Unselected practice").strip()}

    def _build_response(
        self,
        *,
        status: str,
        source: str,
        plot_name: str,
        crop_type: str,
        methodology: str,
        ring: Sequence[Sequence[float]],
        declared_area: Optional[float],
        area_hectares: float,
        current_ndvi: float,
        baseline_ndvi: float,
        current_evi: float,
        baseline_evi: float,
        current_ndmi: float,
        current_ndre: float = 0.0,
        current_msavi: float = 0.0,
        current_gndvi: float = 0.0,
        current_nbr: float = 0.0,
        cloud_coverage_pct: float = 0.0,
        moisture: float,
        timeline: List[Dict[str, Any]],
        image_url: Optional[str],
        analysis_window: Dict[str, str],
        fallback_reason: Optional[str] = None,
    ) -> Dict[str, Any]:
        profile = self._methodology_profile(methodology)
        effective_area_hectares = round(area_hectares or (declared_area or 0.0), 2)
        ndvi_change = current_ndvi - baseline_ndvi
        risk_flags: List[str] = []
        if moisture < 22:
            risk_flags.append("Low moisture signal; confirm conditions with a field measurement.")
        elif moisture > 55:
            risk_flags.append("High moisture signal; confirm conditions with a field observation.")
        if current_ndvi < 0.35:
            risk_flags.append("Vegetation index is low; check current field conditions.")
        if timeline and len(timeline) >= 2:
            first_ndvi = timeline[0].get("ndvi")
            last_ndvi = timeline[-1].get("ndvi")
            if first_ndvi is not None and last_ndvi is not None and last_ndvi < first_ndvi - 0.08:
                risk_flags.append("Recent time series shows a vegetation decline; confirm with field observations.")

        return {
            "status": status,
            "source": source,
            "plot_name": plot_name,
            "crop_type": crop_type or "Mixed",
            "methodology": profile["name"],
            "health_score": round(current_ndvi, 3),
            "moisture": round(moisture, 2),
            "image_url": image_url,
            "area_hectares": effective_area_hectares,
            "declared_area": declared_area,
            "analysis_window": analysis_window,
            "monitoring": {
                "baseline_ndvi": _round_or_none(baseline_ndvi),
                "current_ndvi": _round_or_none(current_ndvi),
                "ndvi_change": _round_or_none(ndvi_change),
                "baseline_evi": _round_or_none(baseline_evi),
                "current_evi": _round_or_none(current_evi),
                "current_ndmi": _round_or_none(current_ndmi),
                "current_ndre": _round_or_none(current_ndre),
                "current_msavi": _round_or_none(current_msavi),
                "current_gndvi": _round_or_none(current_gndvi),
                "current_nbr": _round_or_none(current_nbr),
                "soil_moisture": _round_or_none(moisture, 2),
                # ── Cloud interference flag ─────────────────────────────────
                "cloud_coverage_pct": round(cloud_coverage_pct, 1),
                "cloud_interference": cloud_coverage_pct > 30.0,
                # ── Pest Risk Score (0-100) based on weather correlations ────
                # High temp (>35°C) + low moisture → pest risk in cotton/wheat
                # High humidity + temp drop → fungal/disease risk in rice
                "pest_risk_score": round(max(0, min(100,
                    (1 - current_ndvi) * 40 +
                    (max(0, moisture - 45) * 0.8) +
                    (max(0, 35 - moisture) * 0.5)
                )), 1),
                "nitrogen_status": (
                    "Adequate" if current_ndre > 0.35
                    else "Low — consider foliar application" if current_ndre > 0.2
                    else "Deficient — urgent intervention needed"
                ),
                "growth_stage_recommendation": (
                    "Use MSAVI — crop in early establishment stage (< 30 days)"
                    if current_ndvi < 0.3
                    else "Switch to NDVI — vegetation established"
                ),
            },
            "timeline": timeline,
            "carbon": {
                "screening_only": True,
                "eligible": None,
                "eligibility_score": None,
                "eligibility_reasons": [
                    "Satellite indicators are not an approved carbon quantification or eligibility determination."
                ],
                "issuance_status": "not_assessed",
            },
            "risk_flags": risk_flags,
            "geometry": {"type": "Polygon", "coordinates": [list(ring)]},
            "fallback_reason": fallback_reason,
        }

    def _build_simulation(
        self,
        *,
        plot_name: str,
        crop_type: str,
        methodology: str,
        ring: Sequence[Sequence[float]],
        declared_area: Optional[float],
        computed_area_hectares: float,
        reason: Optional[str],
    ) -> Dict[str, Any]:
        seed = f"{plot_name}|{crop_type}|{methodology}|{declared_area}|{ring}"

        baseline_ndvi = 0.32 + (_hash_unit(seed + "|baseline") * 0.24)
        ndvi_change = -0.01 + (_hash_unit(seed + "|gain") * 0.12)
        current_ndvi = _clamp(baseline_ndvi + ndvi_change, 0.18, 0.82)
        baseline_evi = _clamp(baseline_ndvi * 0.84, 0.1, 0.7)
        current_evi = _clamp(current_ndvi * 0.88, 0.12, 0.76)
        current_ndmi = _clamp((current_ndvi * 0.45) - 0.05, -0.2, 0.55)
        # ── Simulated extended indices ─────────────────────────────────────────
        current_ndre = _clamp(current_ndvi * 0.78 + 0.05, 0.1, 0.65)
        current_msavi = _clamp(current_ndvi * 0.85, 0.05, 0.70)
        current_gndvi = _clamp(current_ndvi * 0.72 + 0.03, 0.1, 0.68)
        current_nbr = _clamp(current_ndvi * 0.60 - 0.02, -0.1, 0.55)
        cloud_coverage_pct = _hash_unit(seed + "|cloud") * 25.0  # 0-25% simulated
        moisture = 18.0 + (_hash_unit(seed + "|moisture") * 32.0)
        now = datetime.datetime.utcnow()

        timeline: List[Dict[str, Any]] = []
        for index, (start_date, end_date) in enumerate(self._timeline_windows(now)):
            progress = index / 5 if 5 else 0
            seasonal_noise = (_hash_unit(f"{seed}|timeline|{index}") - 0.5) * 0.03
            ndvi = _clamp(baseline_ndvi + (ndvi_change * progress) + seasonal_noise, 0.16, 0.84)
            evi = _clamp(ndvi * 0.88, 0.12, 0.76)
            ndre = _clamp(ndvi * 0.78 + 0.05, 0.1, 0.65)
            msavi = _clamp(ndvi * 0.85, 0.05, 0.70)
            timeline.append(
                {
                    "label": _date_label(end_date),
                    "date": end_date.strftime("%Y-%m-%d"),
                    "ndvi": round(ndvi, 3),
                    "evi": round(evi, 3),
                    "ndre": round(ndre, 3),
                    "msavi": round(msavi, 3),
                }
            )

        return self._build_response(
            status="simulated",
            source="Google Earth Engine fallback simulation",
            plot_name=plot_name,
            crop_type=crop_type,
            methodology=methodology,
            ring=ring,
            declared_area=declared_area,
            area_hectares=round(computed_area_hectares or (declared_area or 0.0), 2),
            current_ndvi=current_ndvi,
            baseline_ndvi=baseline_ndvi,
            current_evi=current_evi,
            baseline_evi=baseline_evi,
            current_ndmi=current_ndmi,
            current_ndre=current_ndre,
            current_msavi=current_msavi,
            current_gndvi=current_gndvi,
            current_nbr=current_nbr,
            cloud_coverage_pct=cloud_coverage_pct,
            moisture=moisture,
            timeline=timeline,
            image_url=SIMULATED_IMAGE_URL,
            analysis_window={
                "baseline_start": (now - datetime.timedelta(days=455)).strftime("%Y-%m-%d"),
                "baseline_end": (now - datetime.timedelta(days=365)).strftime("%Y-%m-%d"),
                "current_start": (now - datetime.timedelta(days=90)).strftime("%Y-%m-%d"),
                "current_end": now.strftime("%Y-%m-%d"),
            },
            fallback_reason=reason,
        )

    def monitor_plot(
        self,
        geometry_coords: Sequence[Any],
        crop_type: str = "Mixed",
        plot_name: str = "Farm",
        declared_area: Optional[float] = None,
        methodology: str = "Cover-Crop",
    ) -> Dict[str, Any]:
        ring = _normalize_ring(geometry_coords)
        computed_area_hectares = _approx_area_hectares(ring)

        if len(ring) < 4:
            return self._build_simulation(
                plot_name=plot_name,
                crop_type=crop_type,
                methodology=methodology,
                ring=ring,
                declared_area=declared_area,
                computed_area_hectares=computed_area_hectares,
                reason="Boundary is incomplete, so a simulated analysis was used.",
            )

        if not self.initialize():
            return self._build_simulation(
                plot_name=plot_name,
                crop_type=crop_type,
                methodology=methodology,
                ring=ring,
                declared_area=declared_area,
                computed_area_hectares=computed_area_hectares,
                reason="Earth Engine credentials are not available on this machine.",
            )

        try:
            roi = ee.Geometry.Polygon([ring])
            now = datetime.datetime.utcnow()
            current_start = now - datetime.timedelta(days=90)
            baseline_end = now - datetime.timedelta(days=365)
            baseline_start = current_start - datetime.timedelta(days=365)

            current_collection = self._prepare_sentinel_collection(roi, current_start, now)
            baseline_collection = self._prepare_sentinel_collection(roi, baseline_start, baseline_end)

            if not self._collection_has_images(current_collection) or not self._collection_has_images(baseline_collection):
                return self._build_simulation(
                    plot_name=plot_name,
                    crop_type=crop_type,
                    methodology=methodology,
                    ring=ring,
                    declared_area=declared_area,
                    computed_area_hectares=computed_area_hectares,
                    reason="Satellite imagery was not available for one of the monitoring windows.",
                )

            current_image = current_collection.median().clip(roi)
            baseline_image = baseline_collection.median().clip(roi)

            area_sqm = float(roi.area(maxError=1).getInfo())
            area_hectares = round(area_sqm / SQM_PER_HECTARE, 2) if area_sqm else computed_area_hectares

            current_ndvi = self._safe_reduce(current_image, "NDVI", roi, 10)
            baseline_ndvi = self._safe_reduce(baseline_image, "NDVI", roi, 10)
            current_evi = self._safe_reduce(current_image, "EVI", roi, 10)
            baseline_evi = self._safe_reduce(baseline_image, "EVI", roi, 10)
            current_ndmi = self._safe_reduce(current_image, "NDMI", roi, 20)
            moisture = self._get_soil_moisture(roi, now)
            timeline = self._build_real_timeline(roi, now)
            image_url = self._build_thumbnail_url(current_image, roi)

            if None in (current_ndvi, baseline_ndvi, current_evi, baseline_evi, current_ndmi) or moisture is None:
                return self._build_simulation(
                    plot_name=plot_name,
                    crop_type=crop_type,
                    methodology=methodology,
                    ring=ring,
                    declared_area=declared_area,
                    computed_area_hectares=area_hectares or computed_area_hectares,
                    reason="One or more Earth Engine metrics could not be reduced for this boundary.",
                )

            return self._build_response(
                status="earth_engine",
                source="Google Earth Engine (Sentinel-2 + SMAP)",
                plot_name=plot_name,
                crop_type=crop_type,
                methodology=methodology,
                ring=ring,
                declared_area=declared_area,
                area_hectares=area_hectares,
                current_ndvi=current_ndvi,
                baseline_ndvi=baseline_ndvi,
                current_evi=current_evi,
                baseline_evi=baseline_evi,
                current_ndmi=current_ndmi,
                moisture=moisture,
                timeline=timeline,
                image_url=image_url,
                analysis_window={
                    "baseline_start": baseline_start.strftime("%Y-%m-%d"),
                    "baseline_end": baseline_end.strftime("%Y-%m-%d"),
                    "current_start": current_start.strftime("%Y-%m-%d"),
                    "current_end": now.strftime("%Y-%m-%d"),
                },
            )
        except Exception as exc:
            print(f"[GEE] Analysis Error: {exc}")
            return self._build_simulation(
                plot_name=plot_name,
                crop_type=crop_type,
                methodology=methodology,
                ring=ring,
                declared_area=declared_area,
                computed_area_hectares=computed_area_hectares,
                reason=str(exc),
            )

    def get_analysis(
        self,
        geometry_coords: Sequence[Any],
        crop_type: str = "Mixed",
        plot_name: str = "Farm",
        declared_area: Optional[float] = None,
    ) -> Dict[str, Any]:
        analysis = self.monitor_plot(
            geometry_coords=geometry_coords,
            crop_type=crop_type,
            plot_name=plot_name,
            declared_area=declared_area,
            methodology="Cover-Crop",
        )

        return {
            "health_score": analysis["health_score"],
            "moisture": analysis["moisture"],
            "image_url": analysis["image_url"],
            "source": analysis["source"],
            "monitoring": analysis["monitoring"],
            "timeline": analysis["timeline"],
            "carbon": analysis["carbon"],
            "area_hectares": analysis["area_hectares"],
            "risk_flags": analysis["risk_flags"],
            "status": analysis["status"],
        }


earth_engine_service = EarthEngineService()
