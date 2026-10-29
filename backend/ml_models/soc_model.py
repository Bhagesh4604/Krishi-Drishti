"""
soc_model.py
============
Multiple Linear Regression for Soil Organic Carbon (SOC) estimation.

Training vs. evaluation metric note
-------------------------------------
``train_soc_model`` returns ``r_squared_train`` – the R² score computed on
the **training** data.  This is an optimistic in-sample measure of fit, not
an independent validation score.  With a small sample (< ~30 points) this
number will be inflated and should not be reported as a validation metric.
Callers should communicate this clearly to end users.
"""

import logging

import numpy as np
from sklearn.linear_model import LinearRegression

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
# Minimum number of paired samples needed to train a 2-feature model.
# With only 2 points the plane is perfectly fit (R²=1) by construction and
# carries no predictive value. We require at least 5 for a minimally useful fit.
MIN_TRAINING_SAMPLES = 5

# Physically plausible SOC range (g/kg).  Values outside this range likely
# indicate a unit error or data entry mistake.
SOC_MIN_GPERKG = 0.0
SOC_MAX_GPERKG = 200.0   # Highly organic peat soils rarely exceed 150 g/kg


def _validate_inputs(bioclimatic_data: list, soc_values: list) -> None:
    """Raise ValueError with a descriptive message if inputs are invalid."""
    if not isinstance(bioclimatic_data, (list, np.ndarray)) or not isinstance(soc_values, (list, np.ndarray)):
        raise TypeError("bioclimatic_data and soc_values must be lists or arrays.")

    n_bio = len(bioclimatic_data)
    n_soc = len(soc_values)

    if n_bio != n_soc:
        raise ValueError(
            f"Length mismatch: bioclimatic_data has {n_bio} rows but soc_values has {n_soc} entries. "
            "Each SOC measurement must be paired with a bioclimatic observation."
        )

    if n_bio < MIN_TRAINING_SAMPLES:
        raise ValueError(
            f"At least {MIN_TRAINING_SAMPLES} paired samples are required for a meaningful fit. "
            f"Only {n_bio} provided. With very few samples the model will overfit and R² will be inflated."
        )

    for i, row in enumerate(bioclimatic_data):
        if not hasattr(row, "__len__") or len(row) < 2:
            raise ValueError(
                f"bioclimatic_data[{i}] must have at least 2 elements [moisture, ET]. Got: {row!r}"
            )
        for j, val in enumerate(row):
            if not isinstance(val, (int, float)) or not np.isfinite(val):
                raise ValueError(
                    f"bioclimatic_data[{i}][{j}] is not a finite number: {val!r}"
                )

    for i, soc in enumerate(soc_values):
        if not isinstance(soc, (int, float)) or not np.isfinite(soc):
            raise ValueError(f"soc_values[{i}] is not a finite number: {soc!r}")
        if soc < SOC_MIN_GPERKG or soc > SOC_MAX_GPERKG:
            raise ValueError(
                f"soc_values[{i}] = {soc} g/kg is outside the physically plausible range "
                f"[{SOC_MIN_GPERKG}, {SOC_MAX_GPERKG}] g/kg. "
                "Check for unit errors (values may be in % rather than g/kg)."
            )


def train_soc_model(bioclimatic_data: list, soc_values: list) -> dict:
    """
    Train a Multiple Linear Regression model relating bioclimatic variables
    (Soil Moisture %, Evapotranspiration mm/day) to ground-truthed SOC (g/kg).

    Parameters
    ----------
    bioclimatic_data : list[list[float]]
        2-D array of shape (n_samples, 2). Each inner list is [moisture, ET].
    soc_values : list[float]
        1-D array of length n_samples. Laboratory SOC values in g/kg.

    Returns
    -------
    dict with keys:
        status              "success"
        equation            Human-readable formula string
        coef_moisture       float
        coef_et             float
        intercept           float
        r_squared_train     float  – R² on *training* data (in-sample; optimistic)
        n_samples           int    – number of training points
        warning             str    – present when n_samples < 10 (overfitting risk)

    Raises
    ------
    TypeError, ValueError  – on invalid or out-of-range inputs (see _validate_inputs).
    """
    _validate_inputs(bioclimatic_data, soc_values)

    X = np.array(bioclimatic_data, dtype=float)
    y = np.array(soc_values, dtype=float)

    model = LinearRegression()
    model.fit(X, y)

    coef_moisture = float(model.coef_[0])
    coef_et = float(model.coef_[1]) if len(model.coef_) > 1 else 0.0
    intercept = float(model.intercept_)

    # R² computed on training data – intentionally named to communicate this
    r_squared_train = float(model.score(X, y))

    n = len(soc_values)
    result = {
        "status": "success",
        "equation": (
            f"SOC = ({coef_moisture:.4f} × Moisture) + ({coef_et:.4f} × ET) + {intercept:.4f}"
        ),
        "coef_moisture": coef_moisture,
        "coef_et": coef_et,
        "intercept": intercept,
        "r_squared_train": r_squared_train,
        "n_samples": n,
    }

    if n < 10:
        result["warning"] = (
            f"Only {n} training samples used. R² (train) = {r_squared_train:.3f} is likely "
            "optimistic due to overfitting. Collect more ground-truth samples for reliable estimates."
        )
        logger.warning(
            "[soc_model] Small training set (%d samples). r_squared_train=%.3f may be inflated.",
            n, r_squared_train,
        )
    else:
        logger.info(
            "[soc_model] Trained on %d samples. r_squared_train=%.3f.",
            n, r_squared_train,
        )

    return result


def predict_soc(
    grid_bioclimatic_values: list,
    coef_moisture: float,
    coef_et: float,
    intercept: float,
) -> list:
    """
    Apply the trained linear SOC formula to a grid of new bioclimatic points.

    Parameters
    ----------
    grid_bioclimatic_values : list[list[float]]
        Each inner list is [moisture, ET].
    coef_moisture, coef_et, intercept : float
        Coefficients from ``train_soc_model``.

    Returns
    -------
    list[float]  – predicted SOC values clamped to [0, SOC_MAX_GPERKG].
    """
    predictions = []
    for i, point_data in enumerate(grid_bioclimatic_values):
        if len(point_data) < 2:
            raise ValueError(f"grid_bioclimatic_values[{i}] must have at least 2 elements.")
        moisture, et = float(point_data[0]), float(point_data[1])
        estimated = coef_moisture * moisture + coef_et * et + intercept
        # SOC cannot be negative; clamp upper end to avoid nonsensical extrapolation
        predictions.append(max(0.0, min(round(estimated, 2), SOC_MAX_GPERKG)))
    return predictions
