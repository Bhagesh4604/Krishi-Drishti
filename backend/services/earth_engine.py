import ee
import datetime
import os

# Get Project ID
PROJECT_ID = os.getenv("GOOGLE_CLOUD_PROJECT")

class EarthEngineService:
    def __init__(self):
        self.initialized = False

    def initialize(self):
        if not self.initialized:
            try:
                if PROJECT_ID:
                    ee.Initialize(project=PROJECT_ID)
                else:
                    ee.Initialize()
                self.initialized = True
                print("[GEE] Initialized successfully.")
            except Exception as e:
                print(f"[GEE] Initialization failed: {e}")
                print("Tip: Add GOOGLE_CLOUD_PROJECT to .env and run 'python authenticate_gee.py'")

    def get_analysis(self, geometry_coords, crop_type="Mixed"):
        """
        Fetches NDVI and Soil Moisture for the given geometry.
        geometry_coords: List of [lng, lat] (GeoJSON format)
        """
        self.initialize()
        if not self.initialized:
            return {"error": "GEE not initialized"}

        try:
            # Create Geometry
            roi = ee.Geometry.Polygon(geometry_coords)

            # --- 1. NDVI from Sentinel-2 ---
            # Sentinel-2 Surface Reflectance
            s2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED') \
                .filterBounds(roi) \
                .filterDate(datetime.datetime.now() - datetime.timedelta(days=30), datetime.datetime.now()) \
                .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20)) \
                .sort('system:time_start', False) # Latest first

            image = s2.first()
            
            if image:
                ndvi = image.normalizedDifference(['B8', 'B4']).rename('NDVI')
                
                # Calculate mean NDVI for the region
                ndvi_val = ndvi.reduceRegion(
                    reducer=ee.Reducer.mean(),
                    geometry=roi,
                    scale=10,
                    maxPixels=1e9
                ).get('NDVI').getInfo()
                
                # Get a visual thumbnail
                vis_params = {
                    'min': 0,
                    'max': 0.8,
                    'palette': ['red', 'yellow', 'green']
                }
                # Create a URL for the image clipped to the ROI
                thumb_url = ndvi.visualize(**vis_params).getThumbURL({
                    'dimensions': 500,
                    'region': roi,
                    'format': 'png'
                })
            else:
                ndvi_val = 0.5 # Default fallback
                thumb_url = None

            # --- 2. Soil Moisture from SMAP ---
            # NASA-USDA SMAP Global Soil Moisture Data
            smap = ee.ImageCollection('NASA_USDA/SMAP_SM/20150802_DECADAL') \
                .filterBounds(roi) \
                .filterDate(datetime.datetime.now() - datetime.timedelta(days=10), datetime.datetime.now()) \
                .sort('system:time_start', False)
                
            smap_img = smap.first()
            if smap_img:
                # ssm: Surface Soil Moisture (mm)
                # susm: Subsurface Soil Moisture (mm)
                moisture_val = smap_img.select('ssm').reduceRegion(
                    reducer=ee.Reducer.mean(),
                    geometry=roi,
                    scale=10000 # SMAP is coarse resolution
                ).get('ssm').getInfo()
            else:
                moisture_val = 20.0 # Default

            return {
                "health_score": ndvi_val if ndvi_val else 0.5,
                "moisture": moisture_val if moisture_val else 30.0,
                "image_url": thumb_url,
                "source": "Google Earth Engine (Sentinel-2 & SMAP)"
            }

        except Exception as e:
            print(f"[GEE] Analysis Error: {e}")
            return None

earth_engine_service = EarthEngineService()
