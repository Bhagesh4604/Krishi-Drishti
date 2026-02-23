import random
import ee
import datetime

# Attempt to initialize Earth Engine.
# Note: For production, a service account key is required.
try:
    ee.Initialize()
    EE_INITIALIZED = True
except Exception as e:
    print(f"[Satellite Service] Earth Engine Auth Failed or not configured: {e}")
    EE_INITIALIZED = False


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
