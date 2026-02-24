import numpy as np
from sklearn.linear_model import LinearRegression

def train_soc_model(ndvi_values: list[float], soc_values: list[float]) -> dict:
    """
    Trains a simple Linear Regression model to find the relationship
    between satellite-derived NDVI and ground-truthed physical Soil Organic Carbon (SOC).
    
    Args:
        ndvi_values (list[float]): Array of X values (Satellite NDVI from GEE).
        soc_values (list[float]): Array of y values (Physical lab results in g/kg).
        
    Returns:
        dict: A dictionary containing the standard 'slope' and 'intercept', 
              as well as the r_squared value to indicate model fitness.
    """
    
    # We need at least 2 points to draw a basic line connecting them
    if len(ndvi_values) < 2 or len(soc_values) < 2 or len(ndvi_values) != len(soc_values):
        raise ValueError("Must provide at least 2 matching pairs of NDVI and SOC data points to train.")
        
    # Reshape for scikit-learn (needs 2D array for X)
    X = np.array(ndvi_values).reshape(-1, 1)
    y = np.array(soc_values)
    
    # Train the model
    model = LinearRegression()
    model.fit(X, y)
    
    # Extract the formula weights
    slope = float(model.coef_[0])
    intercept = float(model.intercept_)
    
    # Calculate R-squared (how well does NDVI actually predict SOC for this specific farm?)
    r_squared = float(model.score(X, y))
    
    return {
        "status": "success",
        "equation": f"SOC = ({slope:.4f} * NDVI) + {intercept:.4f}",
        "slope": slope,
        "intercept": intercept,
        "r_squared": r_squared
    }

def predict_soc(ndvi_map_values: list[float], slope: float, intercept: float) -> list[float]:
    """
    Takes the trained slope and intercept and applies it to a whole new set of NDVI values.
    This is used to project the SOC across the entire field.
    """
    predictions = []
    for ndvi in ndvi_map_values:
        # SOC = (Slope * NDVI) + Intercept
        estimated_soc = (slope * ndvi) + intercept
        # SOC cannot physically be negative, floor it at 0
        predictions.append(max(0.0, round(estimated_soc, 2)))
        
    return predictions
