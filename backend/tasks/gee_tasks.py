"""
GEE Celery Tasks — Krishi-Drishti
===================================
Wraps the blocking Google Earth Engine monitor_plot() call in a Celery
task so FastAPI endpoints can return immediately with a job_id.

Task: run_gee_analysis
  - Accepts all monitor_plot() kwargs
  - Optionally persists NDVI history to DB when plot_id is given
  - Retries up to 2 times on transient GEE errors (5-sec backoff)
  - Returns the full analysis dict which Celery stores in Redis
"""

import json
from datetime import datetime
from typing import Any, Dict, List, Optional, Sequence

from celery import Task
from celery.exceptions import SoftTimeLimitExceeded

from ..celery_app import celery_app
from ..services.earth_engine import earth_engine_service


# ---------------------------------------------------------------------------
# Helper — optionally persist NDVI timeline to the DB
# ---------------------------------------------------------------------------

def _persist_history(
    plot_id: int,
    user_id: int,
    analysis: Dict[str, Any],
    health_score: float,
    moisture: float,
) -> None:
    """
    Save the GEE timeline as PlotHistory records and update the Plot row.
    Imported lazily to avoid circular imports at module load time.
    """
    from ..database import SessionLocal
    from ..models import Plot, PlotHistory, FarmerOperationLog

    db = SessionLocal()
    try:
        plot = db.query(Plot).filter(Plot.id == plot_id).first()
        if not plot:
            return

        plot.health_score = health_score
        plot.moisture = moisture
        plot.image_url = analysis.get("image_url")
        plot.last_scan_date = datetime.utcnow()

        # Only seed history if the plot has none yet
        existing_count = (
            db.query(PlotHistory).filter(PlotHistory.plot_id == plot_id).count()
        )
        if existing_count == 0:
            for point in analysis.get("timeline", []):
                ndvi = point.get("ndvi")
                if ndvi is None:
                    continue
                evi = point.get("evi") or ndvi * 0.9
                record = PlotHistory(
                    plot_id=plot_id,
                    date=datetime.fromisoformat(point["date"]),
                    ndvi=ndvi,
                    evi=evi,
                    msavi=ndvi * 0.8,
                )
                db.add(record)

        # Always add the freshest reading
        latest = PlotHistory(
            plot_id=plot_id,
            date=datetime.utcnow(),
            ndvi=health_score,
            evi=health_score * 0.9,
            msavi=health_score * 0.8,
        )
        db.add(latest)

        # Audit log
        log = FarmerOperationLog(
            user_id=user_id,
            plot_id=plot_id,
            operation="plot_scan",
            detail=json.dumps({
                "ndvi": round(health_score, 3),
                "moisture": round(moisture, 1),
                "source": analysis.get("source", "unknown"),
                "carbon_credits_estimated": round(
                    analysis.get("carbon", {}).get("gross_credits", 0), 2
                ),
                "async": True,
            }),
        )
        db.add(log)
        db.commit()
    except Exception as exc:
        db.rollback()
        print(f"[GEE Task] DB persist error: {exc}")
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Main Celery Task
# ---------------------------------------------------------------------------

@celery_app.task(
    bind=True,
    name="gee.monitor_plot",
    max_retries=2,
    default_retry_delay=5,        # 5-second back-off between retries
    acks_late=True,
)
def run_gee_analysis(
    self: Task,
    *,
    geometry_coords: Sequence[Any],
    crop_type: str = "Mixed",
    plot_name: str = "Farm",
    declared_area: Optional[float] = None,
    methodology: str = "Cover-Crop",
    plot_id: Optional[int] = None,
    user_id: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Runs earth_engine_service.monitor_plot() asynchronously.

    If plot_id and user_id are provided the results are persisted to the DB
    (PlotHistory + FarmerOperationLog + Plot row update).

    Returns the full analysis dict — Celery serialises this to Redis so
    the /api/jobs/{job_id} polling endpoint can return it.
    """
    try:
        self.update_state(state="STARTED", meta={"plot_name": plot_name, "methodology": methodology})

        analysis = earth_engine_service.monitor_plot(
            geometry_coords=geometry_coords,
            crop_type=crop_type,
            plot_name=plot_name,
            declared_area=declared_area,
            methodology=methodology,
        )

        if plot_id and user_id:
            _persist_history(
                plot_id=plot_id,
                user_id=user_id,
                analysis=analysis,
                health_score=analysis["health_score"],
                moisture=analysis["moisture"],
            )

        return analysis

    except SoftTimeLimitExceeded:
        # GEE took > 60 seconds — return simulation so UI gets something
        return earth_engine_service._build_simulation(
            plot_name=plot_name,
            crop_type=crop_type,
            methodology=methodology,
            ring=[],
            declared_area=declared_area,
            computed_area_hectares=declared_area or 0.0,
            reason="Analysis timed out after 60 seconds. Returning simulated data.",
        )

    except Exception as exc:
        try:
            # Retry on transient GEE errors
            raise self.retry(exc=exc)
        except self.MaxRetriesExceededError:
            # All retries exhausted — return simulation as graceful degradation
            return earth_engine_service._build_simulation(
                plot_name=plot_name,
                crop_type=crop_type,
                methodology=methodology,
                ring=[],
                declared_area=declared_area,
                computed_area_hectares=declared_area or 0.0,
                reason=f"GEE analysis failed after retries: {str(exc)}",
            )
