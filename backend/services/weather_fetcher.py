"""
Weather Fetcher Service for Krishi-Drishti
Fetches real historical weather data from Open-Meteo for a given lat/lng.
Used by the disease forecaster in main.py instead of random.uniform().
"""

import httpx
from datetime import datetime, timedelta


def get_recent_weather(lat: float, lng: float, days: int = 5) -> list[dict]:
    """
    Fetches the last N days of weather data from Open-Meteo historical API.
    Returns a list of dicts: [{temp, humidity, precip}, ...]

    Args:
        lat: Latitude of the farm plot
        lng: Longitude of the farm plot
        days: Number of past days to fetch (default: 5, to match disease model needs)

    Returns:
        List of weather dicts matching the format expected by evaluate_disease_risk()
        Falls back to reasonable defaults for central India if API call fails.
    """
    try:
        end_date = datetime.utcnow().date()
        start_date = end_date - timedelta(days=days)

        url = (
            f"https://archive-api.open-meteo.com/v1/archive"
            f"?latitude={lat}&longitude={lng}"
            f"&start_date={start_date}&end_date={end_date}"
            f"&daily=temperature_2m_mean,relative_humidity_2m_mean,precipitation_sum"
            f"&timezone=auto"
        )

        with httpx.Client(timeout=10.0) as client:
            response = client.get(url)
            data = response.json()

        daily = data.get("daily", {})
        temps = daily.get("temperature_2m_mean", [])
        humids = daily.get("relative_humidity_2m_mean", [])
        precips = daily.get("precipitation_sum", [])

        # Zip into list of dicts, handling None values with sensible defaults
        weather_list = []
        for i in range(min(len(temps), days)):
            weather_list.append({
                "temp": temps[i] if temps[i] is not None else 25.0,
                "humidity": humids[i] if humids[i] is not None else 70.0,
                "precip": precips[i] if precips[i] is not None else 2.0,
            })

        if weather_list:
            print(f"[WeatherFetcher] Fetched {len(weather_list)} days of real weather for ({lat:.2f}, {lng:.2f})")
            return weather_list

    except Exception as e:
        print(f"[WeatherFetcher] Open-Meteo fetch failed: {e}. Using regional defaults.")

    # Fallback: regional defaults for central India (better than random())
    return [
        {"temp": 27.0, "humidity": 75.0, "precip": 3.0},
        {"temp": 28.5, "humidity": 72.0, "precip": 1.5},
        {"temp": 26.0, "humidity": 80.0, "precip": 5.0},
        {"temp": 29.0, "humidity": 68.0, "precip": 0.5},
        {"temp": 27.5, "humidity": 74.0, "precip": 2.0},
    ]


def get_bioclimatic_data(lat: float, lng: float) -> dict:
    """
    Fetches soil moisture and evapotranspiration from Open-Meteo.
    Used by the SOC model training endpoint in ai.py.
    Returns: {soil_moisture: float (%), evapotranspiration: float (mm/day)}
    """
    try:
        end_date = datetime.utcnow().date()
        start_date = end_date - timedelta(days=30)

        url = (
            f"https://archive-api.open-meteo.com/v1/archive"
            f"?latitude={lat}&longitude={lng}"
            f"&start_date={start_date}&end_date={end_date}"
            f"&daily=et0_fao_evapotranspiration,soil_moisture_0_to_7cm_mean"
            f"&timezone=auto"
        )

        with httpx.Client(timeout=10.0) as client:
            response = client.get(url)
            data = response.json()

        daily = data.get("daily", {})
        et_vals = [v for v in daily.get("et0_fao_evapotranspiration", []) if v is not None]
        sm_vals = [v for v in daily.get("soil_moisture_0_to_7cm_mean", []) if v is not None]

        avg_et = sum(et_vals) / len(et_vals) if et_vals else 4.0
        avg_sm = (sum(sm_vals) / len(sm_vals)) * 100 if sm_vals else 25.0  # Convert to %

        return {"soil_moisture": round(avg_sm, 2), "evapotranspiration": round(avg_et, 2)}

    except Exception as e:
        print(f"[WeatherFetcher] Bioclimatic fetch failed: {e}. Using defaults.")
        return {"soil_moisture": 25.0, "evapotranspiration": 4.0}
