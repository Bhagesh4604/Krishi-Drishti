from fastapi import APIRouter, HTTPException
import httpx

router = APIRouter(prefix="/api/weather", tags=["weather"])

@router.get("/current")
async def get_weather(lat: float = 21.1458, lng: float = 79.0882):
    try:
        print(f"[Weather] Fetching weather for lat={lat}, lng={lng}")
        url = (
            f"https://api.open-meteo.com/v1/forecast"
            f"?latitude={lat}&longitude={lng}"
            f"&current=temperature_2m,relative_humidity_2m,apparent_temperature,rain,precipitation,weather_code,is_day,wind_speed_10m,wind_direction_10m,surface_pressure,cloud_cover,visibility,uv_index,dew_point_2m,soil_temperature_0cm"
            f"&hourly=temperature_2m,weather_code,precipitation_probability,apparent_temperature,wind_speed_10m,visibility,is_day,relative_humidity_2m"
            f"&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max,wind_direction_10m_dominant"
            f"&timezone=auto&forecast_days=10"
        )
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(url)
            print(f"[Weather] Open-Meteo status: {response.status_code}")
            if response.status_code != 200:
                raise HTTPException(status_code=502, detail=f"Open-Meteo returned {response.status_code}: {response.text[:200]}")
            data = response.json()
        return data
    except HTTPException:
        raise
    except Exception as e:
        print(f"[Weather] ERROR: {type(e).__name__}: {e}")
        raise HTTPException(status_code=500, detail=f"Weather fetch failed: {type(e).__name__}: {str(e)}")

@router.get("/airquality")
async def get_air_quality(lat: float = 21.1458, lng: float = 79.0882):
    """Fetch real-time air quality data (PM2.5, PM10, US AQI) from Open-Meteo."""
    try:
        url = (
            f"https://air-quality-api.open-meteo.com/v1/air-quality"
            f"?latitude={lat}&longitude={lng}"
            f"&current=pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,us_aqi,european_aqi,dust,uv_index"
            f"&hourly=pm2_5,us_aqi"
            f"&timezone=auto"
        )
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url)
            if response.status_code != 200:
                raise HTTPException(status_code=502, detail=f"AQ API: {response.status_code}")
            data = response.json()

        aqi = data.get("current", {}).get("us_aqi", 0) or 0
        pm25 = data.get("current", {}).get("pm2_5", 0) or 0

        if aqi <= 50:   label, color = "Good", "#4ade80"
        elif aqi <= 100: label, color = "Moderate", "#facc15"
        elif aqi <= 150: label, color = "Unhealthy for Sensitive", "#fb923c"
        elif aqi <= 200: label, color = "Unhealthy", "#f87171"
        elif aqi <= 300: label, color = "Very Unhealthy", "#c084fc"
        else:            label, color = "Hazardous", "#be185d"

        return {
            "aqi": round(aqi),
            "pm2_5": round(pm25, 1),
            "pm10": round(data.get("current", {}).get("pm10", 0) or 0, 1),
            "label": label,
            "color": color,
            "raw": data.get("current", {}),
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"[AirQuality] ERROR: {e}")
        return {"aqi": 0, "label": "Unknown", "color": "#94a3b8", "pm2_5": 0, "pm10": 0}

@router.get("/search")
async def search_location(query: str):
    """
    Search for a location by name using Open-Meteo Geocoding API.
    """
    print(f"Searching for: {query}")
    try:
        url = f"https://geocoding-api.open-meteo.com/v1/search?name={query}&count=5&language=en&format=json"
        print(f"URL: {url}")
        async with httpx.AsyncClient() as client:
            response = await client.get(url)
            print(f"Response Status: {response.status_code}")
            data = response.json()
            print(f"Data: {data}")
        
        if "results" not in data:
            return []
            
        return data["results"]
    except Exception as e:
        print(f"Search ERROR: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to search location: {str(e)}")

@router.get("/reverse")
async def reverse_geocode(lat: float, lng: float):
    """
    Reverse geocodes coordinates with support for rural Indian agricultural tags
    (hamlet, suburb, locality, taluk, tehsil) and automatic failover to BigDataCloud.
    """
    async with httpx.AsyncClient(timeout=8.0) as client:
        # Attempt 1: OpenStreetMap Nominatim with expanded rural address support
        try:
            url = f"https://nominatim.openstreetmap.org/reverse?lat={lat}&lon={lng}&format=json&zoom=14"
            headers = {"User-Agent": "Krishi-Drishti-AgritechApp/1.0 (contact@krishidrishti.org)"}
            response = await client.get(url, headers=headers)

            if response.status_code == 200:
                data = response.json()
                addr = data.get("address", {})

                # Expanded rural/farming location tags — ordered by specificity
                city = (
                    addr.get("village") or
                    addr.get("hamlet") or
                    addr.get("suburb") or
                    addr.get("locality") or
                    addr.get("town") or
                    addr.get("city") or
                    addr.get("taluk") or
                    addr.get("tehsil") or
                    addr.get("county") or
                    None
                )
                district = addr.get("state_district") or addr.get("county") or addr.get("state") or ""

                if city:
                    print(f"[Geocode] Nominatim success: {city}, {district}")
                    return {"city": city, "district": district}
                else:
                    print(f"[Geocode] Nominatim returned no usable city tag. Full address: {addr}")
            else:
                print(f"[Geocode] Nominatim returned HTTP {response.status_code}")

        except Exception as e:
            print(f"[Geocode] Nominatim failed: {e}")

        # Attempt 2: BigDataCloud — free, no API key, high rate limit
        try:
            bdc_url = f"https://api.bigdatacloud.net/data/reverse-geocode-client?latitude={lat}&longitude={lng}&localityLanguage=en"
            res = await client.get(bdc_url)
            if res.status_code == 200:
                data = res.json()
                locality = (
                    data.get("locality") or
                    data.get("city") or
                    data.get("principalSubdivision") or
                    None
                )
                district = data.get("principalSubdivision", "")
                if locality:
                    print(f"[Geocode] BigDataCloud success: {locality}, {district}")
                    return {"city": locality, "district": district}
        except Exception as e:
            print(f"[Geocode] BigDataCloud fallback failed: {e}")

    # Final fallback: return coordinate string
    print(f"[Geocode] All providers failed for {lat}, {lng}")
    return {"city": f"{lat:.2f}, {lng:.2f}", "district": ""}
