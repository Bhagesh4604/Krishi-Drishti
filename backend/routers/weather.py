from fastapi import APIRouter, HTTPException
import httpx

router = APIRouter(prefix="/api/weather", tags=["weather"])

async def _fetch_open_meteo(lat: float, lng: float, client: httpx.AsyncClient) -> dict:
    """Fetch weather from Open-Meteo (primary provider)."""
    url = (
        f"https://api.open-meteo.com/v1/forecast"
        f"?latitude={lat}&longitude={lng}"
        f"&current=temperature_2m,relative_humidity_2m,apparent_temperature,rain,precipitation,weather_code,is_day,wind_speed_10m,wind_direction_10m,surface_pressure,cloud_cover,visibility,uv_index,dew_point_2m,soil_temperature_0cm"
        f"&hourly=temperature_2m,weather_code,precipitation_probability,apparent_temperature,wind_speed_10m,visibility,is_day,relative_humidity_2m"
        f"&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max,wind_direction_10m_dominant"
        f"&timezone=auto&forecast_days=10"
    )
    response = await client.get(url)
    if response.status_code == 429:
        raise Exception(f"Open-Meteo rate limit exceeded: {response.text[:100]}")
    if response.status_code != 200:
        raise Exception(f"Open-Meteo returned {response.status_code}: {response.text[:200]}")
    return response.json()

async def _fetch_wttr_fallback(lat: float, lng: float, client: httpx.AsyncClient) -> dict:
    """
    Fallback weather from wttr.in (free, no API key, no rate limits).
    Returns data in Open-Meteo-compatible structure so the frontend works unchanged.
    """
    url = f"https://wttr.in/{lat},{lng}?format=j1"
    response = await client.get(url)
    if response.status_code != 200:
        raise Exception(f"wttr.in returned {response.status_code}")
    data = response.json()

    try:
        cur = data["current_condition"][0]
        temp_c = float(cur.get("temp_C", 25))
        humidity = int(cur.get("humidity", 60))
        wind_kmph = float(cur.get("windspeedKmph", 10))
        wind_dir = float(cur.get("winddirDegree", 0))
        feels_c = float(cur.get("FeelsLikeC", temp_c))
        weather_code_wttr = int(cur.get("weatherCode", 113))
        # Map wttr.in code (close to WMO) to Open-Meteo weather_code
        wmo_code = 1 if weather_code_wttr == 113 else (
            2 if weather_code_wttr in [116, 119] else
            61 if weather_code_wttr in [176, 263, 266] else
            63 if weather_code_wttr in [293, 296, 299, 302, 305, 308] else
            95 if weather_code_wttr in [200, 386, 389] else 3
        )

        today = data.get("weather", [{}])[0]
        sunrise_str = today.get("astronomy", [{}])[0].get("sunrise", "06:00 AM")
        sunset_str = today.get("astronomy", [{}])[0].get("sunset", "06:00 PM")

        # Build daily arrays (7 days from wttr.in)
        daily_dates, daily_max, daily_min, daily_codes = [], [], [], []
        daily_precip, daily_pop = [], []
        for day in data.get("weather", [])[:7]:
            daily_dates.append(day.get("date", ""))
            daily_max.append(float(day.get("maxtempC", temp_c + 3)))
            daily_min.append(float(day.get("mintempC", temp_c - 3)))
            daily_codes.append(wmo_code)
            hourly_rain = sum(float(h.get("precipMM", 0)) for h in day.get("hourly", []))
            daily_precip.append(round(hourly_rain, 1))
            daily_pop.append(int(day.get("hourly", [{}])[0].get("chanceofrain", 0)) if day.get("hourly") else 0)

        return {
            "current": {
                "temperature_2m": temp_c,
                "relative_humidity_2m": humidity,
                "apparent_temperature": feels_c,
                "rain": float(cur.get("precipMM", 0)),
                "precipitation": float(cur.get("precipMM", 0)),
                "weather_code": wmo_code,
                "is_day": 1,
                "wind_speed_10m": wind_kmph * 0.2778,  # km/h → m/s
                "wind_direction_10m": wind_dir,
                "surface_pressure": float(cur.get("pressure", 1013)),
                "cloud_cover": float(cur.get("cloudcover", 50)),
                "visibility": float(cur.get("visibility", 10)) * 1000,  # km → m
                "uv_index": float(cur.get("uvIndex", 5)),
                "dew_point_2m": temp_c - ((100 - humidity) / 5),
                "soil_temperature_0cm": temp_c,
            },
            "hourly": {
                "temperature_2m": [temp_c] * 240,
                "weather_code": [wmo_code] * 240,
                "precipitation_probability": [daily_pop[0] if daily_pop else 20] * 240,
                "apparent_temperature": [feels_c] * 240,
                "wind_speed_10m": [wind_kmph * 0.2778] * 240,
                "visibility": [float(cur.get("visibility", 10)) * 1000] * 240,
                "is_day": [1] * 240,
                "relative_humidity_2m": [humidity] * 240,
            },
            "daily": {
                "time": daily_dates,
                "weather_code": daily_codes,
                "temperature_2m_max": daily_max,
                "temperature_2m_min": daily_min,
                "sunrise": [sunrise_str] * len(daily_dates),
                "sunset": [sunset_str] * len(daily_dates),
                "uv_index_max": [float(cur.get("uvIndex", 5))] * len(daily_dates),
                "precipitation_sum": daily_precip,
                "precipitation_probability_max": daily_pop,
                "wind_speed_10m_max": [wind_kmph * 0.2778] * len(daily_dates),
                "wind_gusts_10m_max": [wind_kmph * 0.2778 * 1.5] * len(daily_dates),
                "wind_direction_10m_dominant": [wind_dir] * len(daily_dates),
            },
            "_source": "wttr.in (fallback)"
        }
    except Exception as e:
        raise Exception(f"wttr.in parse error: {e}")

@router.get("/current")
def _clean_floats(obj, decimals=1):
    if isinstance(obj, float):
        return round(obj, decimals)
    elif isinstance(obj, dict):
        return {k: _clean_floats(v, decimals) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [_clean_floats(v, decimals) for v in obj]
    return obj

async def get_weather(lat: float = 21.1458, lng: float = 79.0882):
    print(f"[Weather] Fetching weather for lat={lat}, lng={lng}")
    async with httpx.AsyncClient(timeout=15.0) as client:
        # Primary: Open-Meteo
        try:
            data = await _fetch_open_meteo(lat, lng, client)
            return _clean_floats(data, 1)
        except Exception as e:
            print(f"[Weather] Open-Meteo failed ({e}), trying wttr.in fallback...")

        # Fallback: wttr.in
        try:
            data = await _fetch_wttr_fallback(lat, lng, client)
            print(f"[Weather] wttr.in fallback succeeded for lat={lat}, lng={lng}")
            return _clean_floats(data, 1)
        except Exception as e2:
            print(f"[Weather] All weather providers failed: {e2}")
            raise HTTPException(status_code=502, detail=f"All weather providers failed. Last error: {str(e2)}")



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
            
        return _clean_floats(data, 1)["results"]
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
