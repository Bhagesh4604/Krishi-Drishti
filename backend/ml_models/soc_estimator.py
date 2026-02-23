import numpy as np
from sklearn.ensemble import GradientBoostingRegressor

# Mock training data generator for SOC (Tons of Carbon / Hectare) 
def _generate_synthetic_soc_data(samples=500):
   np.random.seed(42)
   # Features
   ndvi = np.random.uniform(0.1, 0.9, samples)
   evi = ndvi * 0.9 + np.random.uniform(-0.05, 0.05, samples)
   moisture = np.random.uniform(10, 60, samples) # %
   days_enrolled = np.random.uniform(0, 1000, samples)

   # Target Variable: SOC
   # Assume base carbon is ~20 tons/ha. Good practices (high health index + time) increase it.
   base_soc = 20.0
   growth_factor = (ndvi * 0.4 + evi * 0.4 + (moisture/100) * 0.2)
   time_factor = days_enrolled / 365.0
   
   soc = base_soc + (growth_factor * time_factor * 5.0) + np.random.normal(0, 1.5, samples)
   
   X = np.column_stack((ndvi, evi, moisture, days_enrolled))
   y = soc
   return X, y

# Global mock model
_model = None

def _get_model():
    global _model
    if _model is None:
        print("Training SOC Estimator Model (Gradient Boosting)...")
        X, y = _generate_synthetic_soc_data()
        _model = GradientBoostingRegressor(n_estimators=100, random_state=42)
        _model.fit(X, y)
    return _model

def estimate_soc(ndvi_avg: float, evi_avg: float, moisture_avg: float, days_enrolled: float) -> float:
    """
    Estimates the Soil Organic Carbon (tons/hectare) sequentially based on inputs.
    Returns: Estimated carbon sequestration in tons per hectare.
    """
    model = _get_model()
    # Scikit-learn expects 2D array for prediction
    X_input = np.array([[ndvi_avg, evi_avg, moisture_avg, days_enrolled]])
    prediction = model.predict(X_input)[0]
    return max(0.0, float(prediction))
