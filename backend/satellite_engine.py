from flask import Flask, request, jsonify
import ee
import datetime

app = Flask(__name__)

# Initialize Earth Engine
# Note: You need valid credentials.
# In production, use a service account key.
try:
    ee.Initialize()
except Exception as e:
    print(f"Earth Engine Authentication Failed: {e}")
    # In a real scenario, you'd handle authentication flow or error out.
    # For now, we proceed assuming authentication or local mock will happen.

def calculate_ndvi(image):
    """Calculates NDVI for a given image."""
    ndvi = image.normalizedDifference(['B8', 'B4']).rename('NDVI')
    return image.addBands(ndvi)

@app.route('/api/analyze/carbon', methods=['POST'])
def analyze_farm():
    try:
        data = request.json
        geojson_polygon = data.get('geometry') # Expecting GeoJSON Polygon

        if not geojson_polygon:
            return jsonify({'error': 'Missing geometry'}), 400

        # Create Earth Engine Geometry
        roi = ee.Geometry.Polygon(geojson_polygon['coordinates'])

        # Define Time Windows
        start_date_2024 = '2024-01-01'
        end_date_2024 = '2024-01-30'
        
        start_date_2025 = '2025-01-01'
        end_date_2025 = '2025-01-30'

        # Fetch Sentinel-2 Collections
        # Filter by bounds, date, and cloud coverage < 20%
        s2_2024 = ee.ImageCollection('COPERNICUS/S2_SR') \
            .filterBounds(roi) \
            .filterDate(start_date_2024, end_date_2024) \
            .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20)) \
            .map(calculate_ndvi) \
            .select('NDVI') \
            .median() \
            .clip(roi)

        s2_2025 = ee.ImageCollection('COPERNICUS/S2_SR') \
            .filterBounds(roi) \
            .filterDate(start_date_2025, end_date_2025) \
            .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20)) \
            .map(calculate_ndvi) \
            .select('NDVI') \
            .median() \
            .clip(roi)

        # Reduce region to get mean NDVI values
        # scale=10 for Sentinel-2 (10m resolution)
        stats_2024 = s2_2024.reduceRegion(
            reducer=ee.Reducer.mean(),
            geometry=roi,
            scale=10,
            maxPixels=1e9
        ).getInfo()

        stats_2025 = s2_2025.reduceRegion(
            reducer=ee.Reducer.mean(),
            geometry=roi,
            scale=10,
            maxPixels=1e9
        ).getInfo()

        mean_ndvi_2024 = stats_2024.get('NDVI', 0)
        mean_ndvi_2025 = stats_2025.get('NDVI', 0)

        # Log for debugging
        print(f"NDVI 2024: {mean_ndvi_2024}, NDVI 2025: {mean_ndvi_2025}")
        
        # Credit Logic
        # If mean_ndvi_2024 or 2025 are None (no images found), handle gracefully
        if mean_ndvi_2024 is None: mean_ndvi_2024 = 0
        if mean_ndvi_2025 is None: mean_ndvi_2025 = 0

        growth = mean_ndvi_2025 - mean_ndvi_2024
        
        # Threshold Logic: If growth > 0.1, eligible.
        if growth > 0.1:
            credits_earned = 0.5 # Example fixed amount
            return jsonify({
                'eligible': True,
                'credits': credits_earned,
                'details': {
                    'ndvi_2024': mean_ndvi_2024,
                    'ndvi_2025': mean_ndvi_2025,
                    'growth': growth
                }
            })
        else:
            return jsonify({
                'eligible': False,
                'credits': 0,
                'reason': 'Insufficient vegetation growth detected.',
                'details': {
                    'ndvi_2024': mean_ndvi_2024,
                    'ndvi_2025': mean_ndvi_2025,
                    'growth': growth
                }
            })

    except Exception as e:
        print(f"Analysis Error: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5001)
