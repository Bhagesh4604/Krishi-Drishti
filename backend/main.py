import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from .database import engine, Base, SessionLocal
from .routers import auth, users, market, ai, finance, weather, news, schemes, community, plots, carbon, contracts, insurance
from apscheduler.schedulers.background import BackgroundScheduler
from .models import Plot, PlotHistory, DiseaseRiskAlert
from .ml_models.anomaly_detector import detect_anomalies
from .ml_models.disease_forecaster import evaluate_disease_risk
from .services.weather_fetcher import get_recent_weather
import json

load_dotenv()

# Create DB Tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Krishi-Drishti API", version="1.0.0")

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For development, allow all
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(market.router)
app.include_router(ai.router)
app.include_router(finance.router)
app.include_router(weather.router)
app.include_router(news.router)
app.include_router(schemes.router)
app.include_router(community.router)
app.include_router(plots.router)
app.include_router(carbon.router)
app.include_router(contracts.router)
app.include_router(insurance.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to Krishi-Drishti Backend API"}


@app.get("/health")
def health_check():
    return {"status": "ok"}

# --- Periodic Tasks ---
def run_weekly_anomaly_detection():
    print("Running Weekly Anomaly Detection...")
    db = SessionLocal()
    try:
        all_plots = db.query(Plot).all()
        for plot in all_plots:
            history_records = db.query(PlotHistory).filter(PlotHistory.plot_id == plot.id).order_by(PlotHistory.date.asc()).all()
            if len(history_records) >= 4:
                ndvi_values = [r.ndvi for r in history_records if r.ndvi is not None]
                if len(ndvi_values) == len(history_records):
                    anomalies = detect_anomalies(ndvi_values)
                    for i, record in enumerate(history_records):
                        record.is_anomaly = anomalies[i]
        
        db.commit()
        print("Weekly Anomaly Detection Completed.")
    except Exception as e:
        print(f"Periodic Anomaly Detection Error: {e}")
    finally:
        db.close()

def run_daily_disease_forecasting():
    print("Running Daily Disease Spread Forecasting...")
    db = SessionLocal()
    try:
        plots = db.query(Plot).all()
        for plot in plots:
             if not plot.crop_type: continue
             
             try:
                 coords = json.loads(plot.coordinates)
                 lat, lng = coords[0]['lat'], coords[0]['lng']
             except:
                 continue
             
             # Fetch REAL weather history from Open-Meteo for this plot's location
             recent_weather = get_recent_weather(lat, lng, days=5)
             print(f"[Disease Forecast] Plot '{plot.name}': got {len(recent_weather)} days of real weather for ({lat:.2f}, {lng:.2f})")
             
             # Run Epidemiology ML model
             alerts = evaluate_disease_risk(recent_weather, plot.crop_type)
             
             # Deactivate old alerts for this plot
             db.query(DiseaseRiskAlert).filter(DiseaseRiskAlert.plot_id == plot.id).update({"is_active": False})
             
             # Save new alerts
             for alert_data in alerts:
                 new_alert = DiseaseRiskAlert(
                     plot_id=plot.id,
                     user_id=plot.user_id,
                     disease_name=alert_data["disease_name"],
                     risk_level=alert_data["risk_level"],
                     recommendation=alert_data["recommendation"]
                 )
                 db.add(new_alert)
                 
        db.commit()
        print("Daily Disease Forecasting Completed.")
    except Exception as e:
        print(f"Periodic Disease Forecasting Error: {e}")
    finally:
        db.close()

# Start scheduler on startup
@app.on_event("startup")
def startup_event():
    scheduler = BackgroundScheduler()
    scheduler.add_job(run_weekly_anomaly_detection, 'interval', days=7)
    scheduler.add_job(run_daily_disease_forecasting, 'interval', days=1)
    scheduler.start()

