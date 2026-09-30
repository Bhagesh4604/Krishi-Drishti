import numpy as np
from sklearn.ensemble import IsolationForest

def detect_anomalies(ndvi_history: list[float]) -> list[bool]:
    """
    Detects negative growth anomalies in a time series of NDVI values.
    ndvi_history: List of float NDVI values in chronological order.
    Returns: List of booleans corresponding to whether each point is an anomaly.
    """
    if len(ndvi_history) < 4:
        # Not enough data for meaningful anomaly detection
        return [False] * len(ndvi_history)

    # Reshape for sklearn
    X = np.array(ndvi_history).reshape(-1, 1)

    # Use Isolation Forest
    # Contamination set to 0.1 means we expect up to 10% anomalies
    clf = IsolationForest(contamination=0.1, random_state=42)
    clf.fit(X)
    
    # predict returns 1 for normal, -1 for anomaly
    predictions = clf.predict(X)

    anomalies = []
    for i, pred in enumerate(predictions):
        is_anomaly = False
        if pred == -1:
            # We only care about negative anomalies (unexpectedly low NDVI)
            median_ndvi = np.median(ndvi_history)
            if ndvi_history[i] < median_ndvi:
                is_anomaly = True
        anomalies.append(is_anomaly)
        
    return anomalies
