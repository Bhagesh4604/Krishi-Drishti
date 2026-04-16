import numpy as np
from sklearn.linear_model import LinearRegression

def train_soc_model(bioclimatic_data: list[list[float]], soc_values: list[float]) -> dict:
    """
    Trains a Multiple Linear Regression model to find the relationship
    between Open-Meteo bioclimatic variables (Soil Moisture, ET) and 
    ground-truthed physical Soil Organic Carbon (SOC).
    
    Args:
        bioclimatic_data (list[list[float]]): 2D Array of X values. Format: [[Moisture1, ET1], [Moisture2, ET2], ...]
        soc_values (list[float]): Array of y values (Physical lab results in g/kg).
        
    Returns:
        dict: A dictionary containing the standard 'coefficients' and 'intercept', 
              as well as the r_squared value to indicate model fitness.
    """
    
    # We need at least 3 points to draw a plane connecting 2 variables, but 2 prevents immediate crashes
    if len(bioclimatic_data) < 2 or len(soc_values) < 2 or len(bioclimatic_data) != len(soc_values):
        raise ValueError("Must provide at least 2 matching pairs of bioclimatic and SOC data points to train.")
        
    # Format for scikit-learn
    X = np.array(bioclimatic_data)
    y = np.array(soc_values)
    
    # Train the multiple linear regression model
    model = LinearRegression()
    model.fit(X, y)
    
    # Extract the formula weights: SOC = (m1 * Moisture) + (m2 * ET) + Intercept
    coef_moisture = float(model.coef_[0])
    coef_et = float(model.coef_[1]) if len(model.coef_) > 1 else 0.0
    intercept = float(model.intercept_)
    
    # Calculate R-squared
    r_squared = float(model.score(X, y))
    
    return {
        "status": "success",
        "equation": f"SOC = ({coef_moisture:.4f} * Moisture) + ({coef_et:.4f} * ET) + {intercept:.4f}",
        "coef_moisture": coef_moisture,
        "coef_et": coef_et,
        "intercept": intercept,
        "r_squared": r_squared
    }

def predict_soc(grid_bioclimatic_values: list[list[float]], coef_moisture: float, coef_et: float, intercept: float) -> list[float]:
    """
    Project the trained SOC formula across a new set of bioclimatic data points.
    """
    predictions = []
    for point_data in grid_bioclimatic_values:
        moisture = point_data[0]
        et = point_data[1]
        
        # SOC = (m1 * Moisture) + (m2 * ET) + Intercept
        estimated_soc = (coef_moisture * moisture) + (coef_et * et) + intercept
        # SOC cannot physically be negative, floor it at 0
        predictions.append(max(0.0, round(estimated_soc, 2)))
        
    return predictions
