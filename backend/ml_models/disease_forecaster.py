from typing import List, Dict

def evaluate_disease_risk(weather_data: List[Dict], crop_type: str) -> List[Dict]:
    """
    Evaluates weather history (e.g., last 5 days) to predict disease risk based on the disease triangle.
    weather_data: List of dicts with 'temp', 'humidity', 'precip'. Should be chronologically ordered.
    Returns: List of risk alerts (empty if no risk).
    """
    if len(weather_data) < 5:
        return [] # Need at least 5 days for robust epidemiological rules

    # Evaluate the most recent 5 days
    recent = weather_data[-5:]
    avg_temp = sum(d['temp'] for d in recent) / 5
    avg_humidity = sum(d['humidity'] for d in recent) / 5
    
    alerts = []
    
    # Rule 1: Late Blight (Common in Potatoes, Tomatoes)
    if crop_type and crop_type.lower() in ['potato', 'tomato', 'mixed']:
        # High humidity and moderate temperatures are perfect for blight spores
        if avg_humidity >= 85 and 10 <= avg_temp <= 22:
            alerts.append({
                "disease_name": "Late Blight",
                "risk_level": "High",
                "recommendation": "High risk of Late Blight due to 5-day streak of high humidity and moderate temperatures. Apply preventative fungicide within 48 hours."
            })
            
    # Rule 2: Powdery Mildew (Common in Wheat, Cotton, Grapes)
    if crop_type and crop_type.lower() in ['wheat', 'grapes', 'cotton', 'mixed']:
        # Warm and moderately humid
        if avg_humidity >= 70 and 22 <= avg_temp <= 28:
            alerts.append({
                "disease_name": "Powdery Mildew",
                "risk_level": "Medium",
                "recommendation": "Conditions are favorable for Powdery Mildew. Monitor lower leaves closely and consider preventative sulphur spray."
            })

    # Rule 3: Root Rot (General)
    total_precip = sum(d.get('precip', 0) for d in recent)
    if total_precip > 50: # Assuming mm
        alerts.append({
            "disease_name": "Root Rot / Waterlogging",
            "risk_level": "Medium",
            "recommendation": "Heavy rainfall accumulated. Ensure proper plot drainage to prevent root diseases."
        })

    return alerts
