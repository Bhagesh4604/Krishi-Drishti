"""
satellite.py
============
Satellite and bioclimatic data fetching service.

Data availability contract
--------------------------
* When real data is successfully retrieved from an external source (Open-Meteo,
  Google Earth Engine) the response carries ``"data_available": True``.
* When the external call fails **or** GEE is not initialised, the response
  carries ``"data_available": False`` and clearly marks every numeric field as
  ``None`` rather than substituting a plausible-looking made-up number.
  Callers must inspect this flag before treating values as measurements.
"""

import datetime
import logging
import requests

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Google Earth Engine initialisation guard
# ---------------------------------------------------------------------------
try:
    import ee  # type: ignore

    try:
        ee.Initialize()
        _EE_INITIALIZED = True
        logger.info("[satellite] Google Earth Engine initialised successfully.")
    except Exception as _ee_init_err:
        _EE_INITIALIZED = False
        logger.warning(
            "[satellite] GEE initialisation failed (%s). "
            "Satellite spectral indices will be marked unavailable.",
            _ee_init_err,
        )
except ImportError:
    ee = None  # type: ignore
    _EE_INITIALIZED = False
    logger.warning("[satellite] earthengine-api not installed. GEE features disabled.")


# ---------------------------------------------------------------------------
# Bioclimatic data (Open-Meteo – real API)
# ---------------------------------------------------------------------------

def get_real_bioclimatic_data(lat: float, lng: float) -> dict:
    """
    Fetch real historical bioclimatic data (Soil Moisture, Evapotranspiration,
    Soil Temperature) from the Open-Meteo Historical API for the last 30 days.

    Returns
    -------
    dict with keys:
        source              str
        data_available      bool   – False when fetch failed
        soil_moisture       float | None   (% vol)
        evapotranspiration  float | None   (mm/day)
        soil_temperature    float | None   (°C)
        status              "success" | "unavailable"
        error               str (only present on failure)
    """
    try:
        end_date = datetime.date.today().strftime("%Y-%m-%d")
        start_date = (datetime.date.today() - datetime.timedelta(days=30)).strftime("%Y-%m-%d")

        url = "https://archive-api.open-meteo.com/v1/archive"
        params = {
            "latitude": lat,
            "longitude": lng,
            "start_date": start_date,
            "end_date": end_date,
            "hourly": "soil_temperature_0_to_7cm,soil_moisture_0_to_7cm",
            "daily": "et0_fao_evapotranspiration",
            "timezone": "auto",
        }

        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()

        hourly_moisture = [v for v in data.get("hourly", {}).get("soil_moisture_0_to_7cm", []) if v is not None]
        hourly_temp = [v for v in data.get("hourly", {}).get("soil_temperature_0_to_7cm", []) if v is not None]
        daily_et = [v for v in data.get("daily", {}).get("et0_fao_evapotranspiration", []) if v is not None]

        # If all three arrays are empty the API returned no data for this location
        if not hourly_moisture and not hourly_temp and not daily_et:
            return {
                "source": "Open-Meteo Historical Archive",
                "data_available": False,
                "soil_moisture": None,
                "evapotranspiration": None,
                "soil_temperature": None,
                "status": "unavailable",
                "error": "API returned no data for these coordinates.",
            }

        avg_moisture = (sum(hourly_moisture) / len(hourly_moisture)) if hourly_moisture else None
        avg_temp = (sum(hourly_temp) / len(hourly_temp)) if hourly_temp else None
        avg_et = (sum(daily_et) / len(daily_et)) if daily_et else None

        # Open-Meteo soil moisture is m³/m³ → convert to %
        moisture_percent = round(avg_moisture * 100, 2) if avg_moisture is not None else None

        return {
            "source": "Open-Meteo Historical Archive",
            "data_available": True,
            "soil_moisture": moisture_percent,
            "evapotranspiration": round(avg_et, 2) if avg_et is not None else None,
            "soil_temperature": round(avg_temp, 2) if avg_temp is not None else None,
            "status": "success",
        }

    except Exception as exc:
        logger.error("[satellite] Open-Meteo fetch failed: %s", exc)
        return {
            "source": "Open-Meteo Historical Archive",
            "data_available": False,
            "soil_moisture": None,
            "evapotranspiration": None,
            "soil_temperature": None,
            "status": "unavailable",
            "error": str(exc),
        }


# ---------------------------------------------------------------------------
# Spectral indices helper (GEE)
# ---------------------------------------------------------------------------

def _calculate_spectral_indices(image):
    """Add NDVI, NDRE, GNDVI bands to a Sentinel-2 image."""
    ndvi = image.normalizedDifference(["B8", "B4"]).rename("NDVI")
    ndre = image.normalizedDifference(["B8", "B5"]).rename("NDRE")
    gndvi = image.normalizedDifference(["B8", "B3"]).rename("GNDVI")
    return image.addBands([ndvi, ndre, gndvi])


# ---------------------------------------------------------------------------
# Satellite spectral data (GEE or explicit unavailable marker)
# ---------------------------------------------------------------------------

def get_real_satellite_data(lat: float, lng: float) -> dict:
    """
    Attempt to fetch real spectral indices from Google Earth Engine.

    When GEE is not initialised or the request fails, returns a response with
    ``"data_available": False`` and ``None`` for every measurement field.
    No simulated / random data is ever returned as real measurements.

    Returns
    -------
    dict with keys:
        source              str
        data_available      bool
        ndvi                float | None
        ndre                float | None
        gndvi               float | None
        soil_moisture       float | None  (GEE SMAP – None when unavailable)
        temperature         float | None  (canopy/land surface – None when unavailable)
        stress_level        str | None
        satellite_analysis  str
    """
    if _EE_INITIALIZED and ee is not None:
        try:
            roi = ee.Geometry.Point([lng, lat]).buffer(10)

            end_date = datetime.date.today().strftime("%Y-%m-%d")
            start_date = (datetime.date.today() - datetime.timedelta(days=30)).strftime("%Y-%m-%d")

            s2_collection = (
                ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
                .filterBounds(roi)
                .filterDate(start_date, end_date)
                .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 30))
                .map(_calculate_spectral_indices)
                .select(["NDVI", "NDRE", "GNDVI"])
                .median()
                .clip(roi)
            )

            stats = s2_collection.reduceRegion(
                reducer=ee.Reducer.mean(),
                geometry=roi,
                scale=10,
                maxPixels=1e9,
            ).getInfo()

            ndvi = stats.get("NDVI")
            ndre = stats.get("NDRE")
            gndvi = stats.get("GNDVI")

            # If all indices are None, cloud cover obscured every available image
            if ndvi is None and ndre is None and gndvi is None:
                return {
                    "source": "Sentinel-2 via GEE (no clear imagery)",
                    "data_available": False,
                    "ndvi": None,
                    "ndre": None,
                    "gndvi": None,
                    "soil_moisture": None,
                    "temperature": None,
                    "stress_level": None,
                    "satellite_analysis": (
                        "No cloud-free Sentinel-2 imagery available for the last 30 days. "
                        "Satellite spectral data is unavailable."
                    ),
                }

            if ndvi > 0.6:
                stress_level = "Low"
                analysis = "Vegetation is healthy based on active Sentinel-2 data."
            elif ndvi > 0.3:
                stress_level = "Medium"
                analysis = "Moderate vegetation health detected. Check NDRE for nitrogen stress."
            else:
                stress_level = "High"
                analysis = "Low vegetation index. Critical stress or bare soil detected by satellite."

            # NOTE: Soil moisture and canopy temperature from GEE (SMAP/MODIS) require
            # separate collection queries. They are intentionally not approximated here.
            return {
                "source": "Sentinel-2 (GEE – Real-Time)",
                "data_available": True,
                "ndvi": round(ndvi, 3),
                "ndre": round(ndre, 3) if ndre is not None else None,
                "gndvi": round(gndvi, 3) if gndvi is not None else None,
                "soil_moisture": None,   # Requires SMAP collection – not yet integrated
                "temperature": None,     # Requires MODIS LST  – not yet integrated
                "stress_level": stress_level,
                "satellite_analysis": analysis,
            }

        except Exception as exc:
            logger.error("[satellite] GEE fetch failed: %s", exc)
            # Fall through to unavailable response

    # GEE not available or failed – return explicit unavailability, NOT fake data
    return {
        "source": "Satellite data unavailable",
        "data_available": False,
        "ndvi": None,
        "ndre": None,
        "gndvi": None,
        "soil_moisture": None,
        "temperature": None,
        "stress_level": None,
        "satellite_analysis": (
            "Google Earth Engine is not initialised or the request failed. "
            "Configure GEE credentials (EE_SERVICE_ACCOUNT + EE_PRIVATE_KEY) to enable real satellite data."
        ),
    }
