import numpy as np
from sklearn.ensemble import RandomForestRegressor

# Mock model
_yield_model = None
_crop_mapping = {'wheat': 0, 'rice': 1, 'cotton': 2, 'potato': 3, 'tomato': 4, 'mixed': 5, 'other': 6}

def _get_yield_model():
    global _yield_model
    if _yield_model is None:
        print("Training Yield Predictor Model (Random Forest)...")
        np.random.seed(42)
        samples = 1000
        
        # Features: health_score, moisture, crop_id
        health = np.random.uniform(0.2, 0.95, samples)
        moisture = np.random.uniform(10, 80, samples)
        crop_id = np.random.randint(0, 7, samples)
        
        # Yield (tons/ha). Baseline depends on crop.
        base_yields = [3.5, 4.0, 1.2, 25.0, 35.0, 5.0, 5.0] 
        base = np.array([base_yields[c] for c in crop_id])
        
        # Modifier: optimal health and moisture (around 40-60%) increases yield
        health_mod = health * 0.5
        moisture_mod = 1.0 - np.abs(moisture - 50) / 100
        
        final_yield = base * (0.5 + health_mod + moisture_mod * 0.5) + np.random.normal(0, 0.5, samples)
        final_yield = np.maximum(0, final_yield) # Cannot be negative
        
        X = np.column_stack((health, moisture, crop_id))
        y = final_yield
        
        _yield_model = RandomForestRegressor(n_estimators=50, max_depth=5, random_state=42)
        _yield_model.fit(X, y)
        
    return _yield_model

def predict_yield(health_score: float, moisture: float, crop_type: str) -> float:
    """
    Predicts yield in tons per hectare.
    """
    if not crop_type:
        crop_type = 'other'
        
    model = _get_yield_model()
    crop_str = crop_type.lower()
    # Basic matching
    crop_id = 6
    for key, val in _crop_mapping.items():
        if key in crop_str:
            crop_id = val
            break
            
    X_input = np.array([[health_score, moisture, crop_id]])
    prediction = model.predict(X_input)[0]
    return round(float(prediction), 2)
