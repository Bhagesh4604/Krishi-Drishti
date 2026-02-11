from fastapi import APIRouter, HTTPException
import httpx

router = APIRouter(prefix="/api/weather", tags=["weather"])

@router.get("/")
async def get_weather(lat: float = 21.1458, lng: float = 79.0882):
    """
    Fetches real weather data from Open-Meteo API.
    Defaults to Nagpur (21.1458, 79.0882) if no coordinates provided.
    """
    try:
        url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lng}&current=temperature_2m,relative_humidity_2m,rain,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto"
        async with httpx.AsyncClient() as client:
            response = await client.get(url)
            data = response.json()
            
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch weather: {str(e)}")
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
    Reverse geocode coordinates to get city name using BigDataCloud or OpenStreetMap.
    Using BigDataCloud free client-side compatible API for simplicity, or OpenMeteo if available.
    Actually, Open-Meteo doesn't support reverse. Using BigDataCloud free API.
    """
    try:
        # bigdatacloud is free and simple
        url = f"https://api.bigdatacloud.net/data/reverse-geocode-client?latitude={lat}&longitude={lng}&localityLanguage=en"
        async with httpx.AsyncClient() as client:
            response = await client.get(url)
            data = response.json()
            
        return {
            "city": data.get("city") or data.get("locality") or "Unknown Location",
            "district": data.get("principalSubdivision")
        }
    except Exception as e:
        # Fallback to simple coordinates string if fail
        return {"city": f"{lat:.2f}, {lng:.2f}", "district": ""}
