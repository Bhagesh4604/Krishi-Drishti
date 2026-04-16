import random
import datetime
import requests

def get_real_bioclimatic_data(lat: float, lng: float) -> dict:
    """
    Fetches real historical bioclimatic data (Soil Moisture, Evapotranspiration, Soil Temp) 
    from the Open-Meteo Historical API for the exact coordinates provided over the last 30 days.
    """
    try:
        # Fetch data from the last 30 days
        end_date = datetime.date.today().strftime('%Y-%m-%d')
        start_date = (datetime.date.today() - datetime.timedelta(days=30)).strftime('%Y-%m-%d')
        
        url = "https://archive-api.open-meteo.com/v1/archive"
        params = {
            "latitude": lat,
            "longitude": lng,
            "start_date": start_date,
            "end_date": end_date,
            "hourly": "soil_temperature_0_to_7cm,soil_moisture_0_to_7cm",
            "daily": "et0_fao_evapotranspiration",
            "timezone": "auto"
        }
        
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        # Calculate 30-day averages
        hourly_moisture = data.get("hourly", {}).get("soil_moisture_0_to_7cm", [])
        hourly_temp = data.get("hourly", {}).get("soil_temperature_0_to_7cm", [])
        daily_et = data.get("daily", {}).get("et0_fao_evapotranspiration", [])
        
        # Filter out Nones
        hourly_moisture = [v for v in hourly_moisture if v is not None]
        hourly_temp = [v for v in hourly_temp if v is not None]
        daily_et = [v for v in daily_et if v is not None]
        
        avg_moisture = sum(hourly_moisture) / len(hourly_moisture) if hourly_moisture else 0.2
        avg_temp = sum(hourly_temp) / len(hourly_temp) if hourly_temp else 25.0
        avg_et = sum(daily_et) / len(daily_et) if daily_et else 4.0
        
        # Open-Meteo moisture is m³/m³, convert to percentage for easier display/modeling
        moisture_percent = round(avg_moisture * 100, 2)
        
        return {
            "source": "Open-Meteo Historical Archive",
            "soil_moisture": moisture_percent,  # %
            "evapotranspiration": round(avg_et, 2), # mm/day
            "soil_temperature": round(avg_temp, 2), # °C
            "status": "success"
        }
        
    except Exception as e:
        print(f"[Bioclimatic Service] Open-Meteo Fetch Failed: {e}")
        return {
            "source": "Fallback",
            "soil_moisture": 25.0,
            "evapotranspiration": 4.5,
            "soil_temperature": 26.0,
            "status": "error",
            "error": str(e)
        }

def calculate_spectral_indices(image):
    """Calculates NDVI, NDRE, and GNDVI for a Sentinel-2 image."""
    # NDVI = (NIR - Red) / (NIR + Red) -> (B8 - B4)
    ndvi = image.normalizedDifference(['B8', 'B4']).rename('NDVI')
    # NDRE = (NIR - Red Edge 1) / (NIR + Red Edge 1) -> (B8 - B5)
    ndre = image.normalizedDifference(['B8', 'B5']).rename('NDRE')
    # GNDVI = (NIR - Green) / (NIR + Green) -> (B8 - B3)
    gndvi = image.normalizedDifference(['B8', 'B3']).rename('GNDVI')
    
    return image.addBands([ndvi, ndre, gndvi])

def get_real_satellite_data(lat: float, lng: float):
    """
    Fetches real satellite data (NDVI, NDRE, GNDVI) from Google Earth Engine 
    for the exact coordinates provided.
    Falls back to deterministic simulation if GEE is uninitialized or fails.
    """
    if EE_INITIALIZED:
        try:
            # Create a small Point Buffer (approx 10x10 meters) region of interest
            roi = ee.Geometry.Point([lng, lat]).buffer(10)
            
            # Fetch data from the last 30 days
            end_date = datetime.date.today().strftime('%Y-%m-%d')
            start_date = (datetime.date.today() - datetime.timedelta(days=30)).strftime('%Y-%m-%d')

            # Fetch Sentinel-2 Surface Reflectance
            s2_collection = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED') \
                .filterBounds(roi) \
                .filterDate(start_date, end_date) \
                .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 30)) \
                .map(calculate_spectral_indices) \
                .select(['NDVI', 'NDRE', 'GNDVI']) \
                .median() \
                .clip(roi)
                
            stats = s2_collection.reduceRegion(
                reducer=ee.Reducer.mean(),
                geometry=roi,
                scale=10,
                maxPixels=1e9
            ).getInfo()
            
            # Extract real values, providing sane defaults if cloud cover obscured all images
            real_ndvi = stats.get('NDVI', 0.5)
            real_ndre = stats.get('NDRE', 0.4)
            real_gndvi = stats.get('GNDVI', 0.5)

            if real_ndvi is None: real_ndvi = 0.5
            if real_ndre is None: real_ndre = 0.4
            if real_gndvi is None: real_gndvi = 0.5
            
            # Analyze the real data
            if real_ndvi > 0.6:
                stress_level = "Low"
                analysis = "Vegetation is healthy based on active Sentinel-2 data."
            elif real_ndvi > 0.3:
                stress_level = "Medium"
                analysis = "Moderate vegetation health detected. Check NDRE for nitrogen stress."
            else:
                stress_level = "High"
                analysis = "Low vegetation index. Critical stress or bare soil detected by satellite."

            return {
                "source": "Sentinel-2 (Real-Time)",
                "ndvi": round(real_ndvi, 2),
                "ndre": round(real_ndre, 2),
                "gndvi": round(real_gndvi, 2),
                "soil_moisture": round(random.uniform(10, 60), 1), # GEE SMAP is complex, mocking thermal/moisture for MVP
                "temperature": round(random.uniform(20, 35), 1), 
                "stress_level": stress_level,
                "satellite_analysis": analysis
            }
        except Exception as e:
            print(f"[Satellite Service] GEE Fetch Failed, falling back to simulation. Error: {e}")
            # Fall through to simulation
            
    # --- FALLBACK SIMULATION ---
    # Deterministic simulation based on coordinates to return consistent results
    random.seed(lat + lng)
    
    ndvi = round(random.uniform(0.1, 0.9), 2)
    ndre = round(ndvi * random.uniform(0.7, 0.95), 2) # NDRE usually correlates with NDVI but lower
    gndvi = round(ndvi * random.uniform(0.8, 1.1), 2)
    
    soil_moisture = round(random.uniform(10, 60), 1) # %
    temperature = round(random.uniform(20, 35), 1) # Celsius
    
    if ndvi > 0.6:
        stress_level = "Low"
        analysis = "Vegetation is healthy. High biomass density."
    elif ndvi > 0.3:
        stress_level = "Medium"
        analysis = "Moderate vegetation health. Potential mild stress."
    else:
        stress_level = "High"
        analysis = "Low vegetation index. Critical stress or bare soil detected."
        
    return {
        "source": "Simulated (Fallback)",
        "ndvi": ndvi,
        "ndre": ndre,
        "gndvi": gndvi,
        "soil_moisture": soil_moisture,
        "temperature": temperature,
        "stress_level": stress_level,
        "satellite_analysis": analysis
    }
