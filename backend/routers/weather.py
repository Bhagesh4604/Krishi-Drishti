from fastapi import APIRouter, HTTPException
import httpx

router = APIRouter(prefix="/api/weather", tags=["weather"])

@router.get("/current")
async def get_weather(lat: float = 21.1458, lng: float = 79.0882):
    """
    Fetches real weather data from Open-Meteo API.
    Defaults to Nagpur (21.1458, 79.0882) if no coordinates provided.
    """
    try:
        print(f"[Weather] Fetching weather for lat={lat}, lng={lng}")
        url = (
            f"https://api.open-meteo.com/v1/forecast"
            f"?latitude={lat}&longitude={lng}"
            f"&current=temperature_2m,relative_humidity_2m,rain,precipitation,weather_code,is_day,wind_speed_10m,soil_temperature_0cm"
            f"&hourly=temperature_2m,weather_code,is_day"
            f"&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_sum,wind_speed_10m_max"
            f"&timezone=auto&forecast_days=14"
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
