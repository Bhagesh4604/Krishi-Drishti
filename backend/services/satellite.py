import random

def get_simulated_satellite_data(lat: float, lng: float):
    """
    Simulates fetching satellite data (NDVI, EVI) for a given location.
    In a real app, this would call ESA Sentinel-2 or USGS Landsat APIs.
    """
    
    # Deterministic simulation based on coordinates to return consistent results for same location
    random.seed(lat + lng)
    
    ndvi = round(random.uniform(0.1, 0.9), 2)
    soil_moisture = round(random.uniform(10, 60), 1) # %
    temperature = round(random.uniform(20, 35), 1) # Celsius
    
    # Analyze the simulated data
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
        "ndvi": ndvi,
        "soil_moisture": soil_moisture,
        "temperature": temperature,
        "stress_level": stress_level,
        "satellite_analysis": analysis
    }
