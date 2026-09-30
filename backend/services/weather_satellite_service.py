import requests
import os
import random
import math
from datetime import datetime, timedelta

API_KEY = os.getenv("AGROMONITORING_API_KEY", "")
BASE_URL = "http://api.agromonitoring.com/agro/1.0"

class SatelliteService:
    def __init__(self):
        self.api_key = API_KEY

    def register_polygon(self, name, coordinates):
        """
        Registers a polygon with Agromonitoring API.
        coordinates: List of {lat, lng} dicts
        Returns: polygon_id (str) or None if failed/simulated
        """
        # If no key, we don't register anything real, just return a mock ID
        if not self.api_key:
            return f"sim_{abs(hash(name))}"

        # Real API Call
        geo_coords = []
        for coord in coordinates:
            geo_coords.append([coord['lng'], coord['lat']])
        
        # Close the loop
        if geo_coords and geo_coords[0] != geo_coords[-1]:
            geo_coords.append(geo_coords[0])

        payload = {
            "name": name,
            "geo_json": {
                "type": "Feature",
                "properties": {},
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [geo_coords]
                }
            }
        }

        try:
            response = requests.post(
                f"{BASE_URL}/polygons?appid={self.api_key}",
                json=payload
            )
            if response.status_code == 201:
                return response.json().get('id')
            else:
                print(f"Agro API Error: {response.text}")
                return None
        except Exception as e:
            print(f"Agro Connection Error: {e}")
            return None

    def get_analysis(self, polygon_id, coordinates, crop_type="Mixed"):
        """
        Fetches analysis (NDVI, Moisture, Image) for a polygon.
        Falls back to deterministic simulation if no API key or API fails.
        """
        if self.api_key and not polygon_id.startswith("sim_"):
            # Try Real API
            real_data = self._fetch_real_data(polygon_id)
            if real_data:
                return real_data
        
        # Fallback / Simulation
        return self._simulate_data(coordinates, crop_type)

    def _fetch_real_data(self, polygon_id):
        try:
            # 1. Get NDVI
            end = int(datetime.utcnow().timestamp())
            start = int((datetime.utcnow() - timedelta(days=30)).timestamp())
            ndvi_url = f"{BASE_URL}/ndvi/history?start={start}&end={end}&polyid={polygon_id}&appid={self.api_key}"
            
            stats = None
            ndvi_resp = requests.get(ndvi_url)
            if ndvi_resp.status_code == 200:
                data = ndvi_resp.json()
                if data:
                    stats = data[-1] # Latest

            # 2. Get Image
            img_url = f"{BASE_URL}/image/search?start={start}&end={end}&polyid={polygon_id}&appid={self.api_key}"
            image_link = None
            img_resp = requests.get(img_url)
            if img_resp.status_code == 200:
                images = img_resp.json()
                if images:
                    # Filter for low clouds (<20%)
                    valid = [i for i in images if i.get('cl', 100) < 20]
                    if valid:
                        image_link = valid[-1]['image']['truecolor']
                    else:
                        image_link = images[-1]['image']['truecolor']

            if stats:
                return {
                    "health_score": stats['data']['mean'],
                    "moisture": 35.0, # Agro doesn't give free moisture, simulated
                    "image_url": image_link,
                    "source": "AgroMonitoring API"
                }
        except Exception as e:
            print(f"Real Data Fetch Failed: {e}")
        
        return None

    def _simulate_data(self, coordinates, crop_type):
        """
        Deterministic simulation based on location hash
        """
        if not coordinates:
            return {
                "health_score": 0.5, 
                "moisture": 20.0, 
                "image_url": None, 
                "source": "Simulation (NoCoords)"
            }

        # Use centroid to seed
        lat = sum(c['lat'] for c in coordinates) / len(coordinates)
        lng = sum(c['lng'] for c in coordinates) / len(coordinates)
        
        # Create a day-varying component so it changes over time slightly
        day_of_year = datetime.now().timetuple().tm_yday
        
        # Seed: Stable for location, but varies slightly by day
        seed_val = int((lat + lng) * 10000) + day_of_year
        random.seed(seed_val)

        # Base health by crop
        base_health = 0.75
        if crop_type and "cotton" in crop_type.lower(): base_health = 0.65
        if crop_type and "wheat" in crop_type.lower(): base_health = 0.85
        
        variation = random.uniform(-0.15, 0.15)
        health_score = max(0.1, min(0.99, base_health + variation))
        
        moisture = random.uniform(20, 60)
        
        # Generate a consistent placeholder image
        # Using specific seed for picsum to keep it consistent for this plot
        plot_seed = int((lat+lng)*1000)
        image_url = f"https://picsum.photos/seed/{plot_seed}/500/500"

        return {
            "health_score": health_score,
            "moisture": moisture,
            "image_url": image_url,
            "source": "Digital Twin Simulation"
        }

satellite_service = SatelliteService()
