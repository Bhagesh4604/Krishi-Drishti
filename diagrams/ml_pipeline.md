# ML Pipeline and Disease Forecasting Workflow
# Krishi-Drishti - Machine Learning Subsystem
# Used in: Section 5.1.8 and Section 4.1.5 of PROJECT_REPORT_FINAL.txt
# Render at: https://mermaid.live

```mermaid
flowchart LR
    subgraph INPUT["Input Collection"]
        I1["Plot GPS Coordinates\nfrom LandMarkingScreen"]
        I2["Crop Type\nfrom Plot Profile"]
        I3["APScheduler Trigger\nDaily at 02:00"]
    end

    subgraph WEATHER["Weather Data Fetch"]
        W1["Open-Meteo API\nweather_fetcher.py"]
        W2["5-Day History\nTemperature, Humidity\nPrecipitation, Wind"]
    end

    subgraph SATELLITE["Satellite Analysis"]
        S1["Google Earth Engine\nsatellite_engine.py"]
        S2["Sentinel-2 / Landsat 8 Images\nCloud Cover < 20%"]
        S3["NDVI Computation\n(NIR - RED) / (NIR + RED)"]
        S4["EVI, MSAVI Computation"]
        S5["PlotHistory Record\nINSERTED to DB"]
    end

    subgraph ANOMALY["Anomaly Detection"]
        A1["IsolationForest\nanomaly_detector.py"]
        A2["NDVI Time Series\nfrom plot_history table"]
        A3["Anomaly Flag\nis_anomaly = True/False"]
        A4["Weekly APScheduler\nJob Trigger"]
    end

    subgraph DISEASE["Disease Risk Model"]
        D1["disease_forecaster.py\nEpidemiological Model"]
        D2["Crop-Disease\nRisk Matrix\nICAR Calibrated"]
        D3["Risk Thresholds\nper Disease per Crop"]
        D4["DiseaseRiskAlert\nINSERTED if risk HIGH/MEDIUM"]
    end

    subgraph OUTPUT["Output to Farmer"]
        O1["Dashboard Alert Cards\nDisease Warning"]
        O2["Plot Health Score\nUpdated in UI"]
        O3["Anomaly Badge\nshown on Farm Map"]
    end

    INPUT --> WEATHER
    INPUT --> SATELLITE
    I3 --> ANOMALY
    I3 --> DISEASE

    W1 --> W2
    W2 --> DISEASE

    S1 --> S2 --> S3 --> S4 --> S5
    S5 --> ANOMALY

    A4 --> A1
    A2 --> A1
    A1 --> A3

    D1 --> D2 --> D3 --> D4

    A3 --> O3
    A3 --> O2
    D4 --> O1
    S5 --> O2
```
