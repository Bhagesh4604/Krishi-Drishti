import datetime
import hashlib
import math
import os
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Sequence

import ee
from dotenv import load_dotenv

from ..ml_models.soc_estimator import estimate_soc

ROOT_ENV_PATH = Path(__file__).resolve().parents[2] / ".env"
load_dotenv(ROOT_ENV_PATH)

ACRES_TO_HECTARES = 0.404686
SQM_PER_HECTARE = 10000.0
DEFAULT_BUFFER_POOL_PERCENTAGE = 15.0
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

    for coord in geometry_coords:
        if isinstance(coord, dict):
            lat = coord.get("lat")
            lng = coord.get("lng")
        else:
            if not isinstance(coord, (list, tuple)) or len(coord) < 2:
                continue
            lng, lat = coord[0], coord[1]

        if lat is None or lng is None:
            continue

        ring.append([float(lng), float(lat)])

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
        return image.addBands([ndvi, ndmi, evi])

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
        normalized = (methodology or "Cover-Crop").strip()
        profiles = {
            "Cover-Crop": {
                "multiplier": 1.15,
                "verification_cost_usd": 1800.0,
                "requires_soil_sample": True,
                "requirements": [
                    "Geotagged sowing photo",
                    "Seed purchase receipt or seed source proof",
                    "Field photo showing live cover within 30-45 days",
                ],
            },
            "No-Till": {
                "multiplier": 1.3,
                "verification_cost_usd": 2200.0,
                "requires_soil_sample": True,
                "requirements": [
                    "Residue cover photo before sowing",
                    "Zero-till or minimum-till equipment proof",
                    "Geotagged field photo after seeding into residue",
                ],
            },
            "Agroforestry": {
                "multiplier": 1.75,
                "verification_cost_usd": 2600.0,
                "requires_soil_sample": False,
                "requirements": [
                    "Geotagged tree-row or sapling photos",
                    "Sapling purchase or nursery receipt",
                    "Survival-count evidence after establishment",
                ],
            },
        }
        return profiles.get(normalized, profiles["Cover-Crop"]) | {"name": normalized}

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
        moisture: float,
        timeline: List[Dict[str, Any]],
        image_url: Optional[str],
        analysis_window: Dict[str, str],
        fallback_reason: Optional[str] = None,
    ) -> Dict[str, Any]:
        profile = self._methodology_profile(methodology)
        effective_area_hectares = round(area_hectares or (declared_area or 0.0), 2)

        current_soc = estimate_soc(current_ndvi, current_evi, moisture, 365.0)
        baseline_soc = estimate_soc(baseline_ndvi, baseline_evi, max(moisture * 0.95, 5.0), 365.0)

        ndvi_change = current_ndvi - baseline_ndvi
        incremental_carbon_tons_per_ha = max(current_soc - baseline_soc, 0.0)
        incremental_tco2e_per_ha = incremental_carbon_tons_per_ha * 3.67

        gross_credits = incremental_tco2e_per_ha * effective_area_hectares * profile["multiplier"]
        buffer_pool_credits = gross_credits * (DEFAULT_BUFFER_POOL_PERCENTAGE / 100.0)
        issuable_credits = max(gross_credits - buffer_pool_credits, 0.0)

        vegetation_strength = _clamp(current_ndvi / 0.8, 0.0, 1.0)
        gain_score = _clamp((ndvi_change + 0.02) / 0.16, 0.0, 1.0)
        moisture_score = 1.0 - _clamp(abs(moisture - 35.0) / 30.0, 0.0, 1.0)
        area_score = _clamp(effective_area_hectares / 2.5, 0.25, 1.0)
        eligibility_score = round(
            (gain_score * 0.45) + (vegetation_strength * 0.25) + (moisture_score * 0.15) + (area_score * 0.15),
            2,
        )

        eligible = bool(ndvi_change >= 0.03 and current_ndvi >= 0.35 and gross_credits >= 0.25)

        eligibility_reasons: List[str] = []
        risk_flags: List[str] = []

        if ndvi_change >= 0.03:
            eligibility_reasons.append("Vegetation is improving versus the same season last year.")
        else:
            eligibility_reasons.append("Vegetation gain is still weak and may need another monitoring cycle.")

        if moisture < 22:
            risk_flags.append("Low soil moisture may limit sequestration gains.")
        elif moisture > 55:
            risk_flags.append("High soil moisture can complicate field verification and residue survival.")
        else:
            eligibility_reasons.append("Soil moisture is within a workable range for carbon-practice monitoring.")

        if current_ndvi < 0.35:
            risk_flags.append("Current vegetation cover is too low for a strong credit claim.")

        if effective_area_hectares < 0.2:
            risk_flags.append("Very small field size reduces project economics.")

        confidence = 0.86 if status == "earth_engine" else 0.58

        if timeline and len(timeline) >= 2:
            first_ndvi = timeline[0].get("ndvi")
            last_ndvi = timeline[-1].get("ndvi")
            if first_ndvi is not None and last_ndvi is not None and last_ndvi < first_ndvi - 0.08:
                risk_flags.append("Recent time-series shows a short-term vegetation decline.")

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
                "soil_moisture": _round_or_none(moisture, 2),
            },
            "timeline": timeline,
            "carbon": {
                "eligible": eligible,
                "eligibility_score": eligibility_score,
                "eligibility_reasons": eligibility_reasons,
                "estimated_soc_tons_per_ha": round(current_soc, 3),
                "baseline_soc_tons_per_ha": round(baseline_soc, 3),
                "incremental_carbon_tons_per_ha": round(incremental_carbon_tons_per_ha, 3),
                "incremental_tco2e_per_ha": round(incremental_tco2e_per_ha, 3),
                "gross_credits": round(gross_credits, 3),
                "buffer_pool_percentage": DEFAULT_BUFFER_POOL_PERCENTAGE,
                "buffer_pool_credits": round(buffer_pool_credits, 3),
                "issuable_credits": round(issuable_credits, 3),
                "estimated_value_inr": round(issuable_credits * 1200, 2),
                "confidence": confidence,
                "verification_cost_usd": profile["verification_cost_usd"],
                "requires_soil_sample": profile["requires_soil_sample"],
                "verification_requirements": profile["requirements"],
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
        moisture = 18.0 + (_hash_unit(seed + "|moisture") * 32.0)
        now = datetime.datetime.utcnow()

        timeline: List[Dict[str, Any]] = []
        for index, (start_date, end_date) in enumerate(self._timeline_windows(now)):
            progress = index / 5 if 5 else 0
            seasonal_noise = (_hash_unit(f"{seed}|timeline|{index}") - 0.5) * 0.03
            ndvi = _clamp(baseline_ndvi + (ndvi_change * progress) + seasonal_noise, 0.16, 0.84)
            evi = _clamp(ndvi * 0.88, 0.12, 0.76)
            timeline.append(
                {
                    "label": _date_label(end_date),
                    "date": end_date.strftime("%Y-%m-%d"),
                    "ndvi": round(ndvi, 3),
                    "evi": round(evi, 3),
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
