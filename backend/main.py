import os
import warnings
warnings.filterwarnings("ignore", category=FutureWarning, module="google.generativeai")
from dotenv import load_dotenv

load_dotenv(override=True)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base, SessionLocal
from .routers import auth, users, market, ai, finance, weather, news, schemes, community, plots, carbon, contracts, insurance, admin, jobs
from .celery_app import is_redis_available, configure_eager_fallback
from apscheduler.schedulers.background import BackgroundScheduler
from .models import Plot, PlotHistory, DiseaseRiskAlert
from .ml_models.anomaly_detector import detect_anomalies
from .ml_models.disease_forecaster import evaluate_disease_risk
from .services.weather_fetcher import get_recent_weather
import json

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
app.include_router(admin.router)
app.include_router(jobs.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to Krishi-Drishti Backend API"}


@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.get("/admin", include_in_schema=False)
def serve_admin_dashboard():
    from fastapi.responses import HTMLResponse
    html = """<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Krishi-Drishti Admin</title>
  <style>
    body { background: #0d0d0d; color: #fff; display: flex; align-items: center;
           justify-content: center; height: 100vh; margin: 0;
           font-family: 'Segoe UI', sans-serif; flex-direction: column; gap: 12px; }
    .spinner { width: 40px; height: 40px; border: 3px solid #333;
               border-top-color: #22c55e; border-radius: 50%; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    p { color: #888; font-size: 14px; margin: 0; }
    code { color: #22c55e; }
  </style>
</head>
<body>
  <div class="spinner"></div>
  <p>Redirecting to Admin Console...</p>
  <p><code>localhost:3001</code></p>
  <script>
    setTimeout(() => window.location.replace("http://localhost:3001"), 500);
  </script>
</body>
</html>"""
    return HTMLResponse(html)

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
    # --- Celery / Redis ---
    if is_redis_available():
        print("[Startup] Redis reachable — Celery async mode active. Start a worker with:")
        print("  celery -A backend.celery_app worker --loglevel=info --pool=solo")
    else:
        configure_eager_fallback()

    # --- Background ML Scheduler ---
    scheduler = BackgroundScheduler()
    scheduler.add_job(run_weekly_anomaly_detection, 'interval', days=7)
    scheduler.add_job(run_daily_disease_forecasting, 'interval', days=1)
    scheduler.start()

