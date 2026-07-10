import os
import warnings
warnings.filterwarnings("ignore", category=FutureWarning, module="google.generativeai")
from dotenv import load_dotenv

load_dotenv(override=True)

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from .database import SessionLocal
from .routers import auth, users, market, ai, finance, weather, news, schemes, community, plots, carbon, contracts, insurance, admin, jobs, traceability, corporate, crop_cycles, sse_analysis, translate, irrigation
from .celery_app import is_redis_available, configure_eager_fallback
from .rate_limiter import limiter
from .logger import scheduler_logger, api_logger
from apscheduler.schedulers.background import BackgroundScheduler
from .models import Plot, PlotHistory, DiseaseRiskAlert
from .ml_models.anomaly_detector import detect_anomalies
from .ml_models.disease_forecaster import evaluate_disease_risk
from .services.weather_fetcher import get_recent_weather
import json

# NOTE: Database schema is managed by Alembic.
# Run `alembic upgrade head` to apply migrations.
# Do NOT use Base.metadata.create_all() in production.

app = FastAPI(title="Krishi-Drishti API", version="1.0.0")

# ── Rate Limiter ──────────────────────────────────────────────────────────────
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── CORS Middleware ───────────────────────────────────────────────────────────
# Read allowed origins from env; defaults to local dev servers only.
CORS_ORIGINS = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:3000,http://localhost:5173"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in CORS_ORIGINS],
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
app.include_router(traceability.router)
app.include_router(corporate.router)
app.include_router(crop_cycles.router)
app.include_router(sse_analysis.router)
app.include_router(translate.router)
app.include_router(irrigation.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to Krishi-Drishti Backend API"}


@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.get("/admin", include_in_schema=False)
def serve_admin_dashboard():
    """Redirect to the admin dashboard frontend."""
    admin_url = os.getenv("ADMIN_URL", "http://localhost:3001")
    return RedirectResponse(url=admin_url)

# --- Periodic Tasks ---
def run_weekly_anomaly_detection():
    scheduler_logger.info("Starting weekly anomaly detection...")
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
        scheduler_logger.info("Weekly anomaly detection completed successfully.")
    except Exception as e:
        scheduler_logger.exception("Weekly anomaly detection failed: %s", e)
    finally:
        db.close()

def run_daily_disease_forecasting():
    scheduler_logger.info("Starting daily disease spread forecasting...")
    db = SessionLocal()
    try:
        plots = db.query(Plot).all()
        for plot in plots:
             if not plot.crop_type: continue
             
             try:
                 coords = json.loads(plot.coordinates)
                 lat, lng = coords[0]['lat'], coords[0]['lng']
             except Exception:
                 scheduler_logger.warning("Skipping plot '%s' — invalid coordinates.", plot.name)
                 continue
             
             # Fetch REAL weather history from Open-Meteo for this plot's location
             recent_weather = get_recent_weather(lat, lng, days=5)
             scheduler_logger.info(
                 "Plot '%s': fetched %d days of weather for (%.2f, %.2f)",
                 plot.name, len(recent_weather), lat, lng
             )
             
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
        scheduler_logger.info("Daily disease forecasting completed successfully.")
    except Exception as e:
        scheduler_logger.exception("Daily disease forecasting failed: %s", e)
    finally:
        db.close()

# Start scheduler on startup
@app.on_event("startup")
def startup_event():
    # --- Celery / Redis ---
    if is_redis_available():
        api_logger.info("Redis reachable — Celery async mode active.")
        api_logger.info("  Start a worker with: celery -A backend.celery_app worker --loglevel=info --pool=solo")
    else:
        configure_eager_fallback()

    # --- Background ML Scheduler ---
    scheduler = BackgroundScheduler()
    scheduler.add_job(run_weekly_anomaly_detection, 'interval', days=7)
    scheduler.add_job(run_daily_disease_forecasting, 'interval', days=1)
    scheduler.start()
    api_logger.info("Background ML scheduler started (anomaly: 7d, disease: 1d).")
