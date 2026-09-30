"""
SSE Analysis Router
===================
Runs GEE analysis synchronously in the stream handler itself.
No background tasks, no event-loop blocking.

Flow:
  1. Client POSTs /analyze-plot → gets task_id + 202 Accepted
  2. Client opens GET /analyze-stream/{task_id} (SSE)
  3. Handler runs analysis synchronously in thread pool,
     streams progress ticks, then sends COMPLETE event
"""

import asyncio
import uuid
import json
from datetime import datetime
from typing import Optional, Dict, Any
from concurrent.futures import ThreadPoolExecutor

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database import get_db
from ..dependencies import get_current_user
from ..models import User, Plot

router = APIRouter(prefix="/api/sse_analysis", tags=["sse_analysis"])

from ..rate_limiter import limiter

# Shared thread pool — runs blocking GEE work off the event loop
_executor = ThreadPoolExecutor(max_workers=4, thread_name_prefix="gee_worker")

# In-memory store: task_id → {"plot_id", "crop_type", "coords", "area"}
_pending: Dict[str, Dict[str, Any]] = {}


class AnalyzeRequest(BaseModel):
    plot_id: int


def _run_gee_blocking(
    task_id: str,
    plot_id: int,
    plot_coords: str,
    crop_type: Optional[str],
    area_acres: float = 0.0,
) -> Dict[str, Any]:
    """
    Blocking GEE analysis — runs in a thread pool so the event loop stays free.
    Returns the full result dict (or an error dict).
    """
    try:
        from ..services.gee_service import earth_engine_service

        ring = []
        if plot_coords:
            try:
                coords = json.loads(plot_coords)
                if isinstance(coords, list):
                    ring = coords
            except Exception:
                pass

        analysis = earth_engine_service.monitor_plot(
            geometry_coords=ring,
            crop_type=crop_type or "Mixed",
            plot_name=f"Plot_{plot_id}",
            declared_area=area_acres,
            methodology="Cover-Crop",
        )

        mon = analysis.get("monitoring", {})
        carbon = analysis.get("carbon", {})
        yp = analysis.get("yield_prediction", {})

        ndvi = mon.get("current_ndvi") or 0.0
        ndmi = mon.get("current_ndmi") or 0.0

        alerts = analysis.get("risk_flags", [])
        if not alerts:
            alerts.append("🟢 All parameters within healthy range")

        return {
            "task_id": task_id,
            "status": analysis.get("status", "simulated"),
            "completed_at": datetime.utcnow().isoformat(),
            # Vegetation indices
            "ndvi": ndvi,
            "ndvi_avg": ndvi,
            "msavi": mon.get("current_msavi") or 0.0,
            "evi": mon.get("current_evi") or 0.0,
            "ndmi": ndmi,
            # Health
            "pest_risk": "High" if mon.get("pest_risk_score", 0) > 60 else "Low",
            "crop_health": "Excellent" if ndvi > 0.65 else ("Good" if ndvi > 0.5 else "Moderate"),
            "soil_moisture": mon.get("soil_moisture") or 0.0,
            "irrigation_advisory": (
                "No irrigation needed" if ndmi > 0.3
                else "Irrigation recommended within 3 days"
            ),
            # Yield
            "predicted_yield_tons_per_ha": yp.get("predicted_yield_tons_per_ha", 0.0),
            "total_estimated_yield_tons": yp.get("total_estimated_yield_tons", 0.0),
            "estimated_revenue_inr": yp.get("estimated_revenue_inr", 0.0),
            # Carbon
            "estimated_carbon_credits": carbon.get("gross_credits", 0.0),
            "issuable_carbon_credits": carbon.get("issuable_credits", 0.0),
            "area_hectares": analysis.get("area_hectares", 0.0),
            # Alerts
            "alerts": alerts,
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"task_id": task_id, "status": "ERROR", "detail": repr(e)}


@limiter.limit("5/minute")
@router.post("/analyze-plot")
async def start_analysis(
    request: Request,
    body: AnalyzeRequest,
    db: Session = Depends(get_db),
):
    """
    Accepts a plot ID, stores its metadata, and returns a task_id immediately.
    The actual analysis runs when the client opens the SSE stream.
    """
    plot = db.query(Plot).filter(Plot.id == body.plot_id).first()
    if not plot:
        raise HTTPException(status_code=404, detail="Plot not found")

    task_id = str(uuid.uuid4())
    _pending[task_id] = {
        "plot_id": plot.id,
        "plot_coords": plot.coordinates or "",
        "crop_type": plot.crop_type,
        "area": plot.area or 0.0,
    }
    return {"task_id": task_id, "status": "processing", "message": "Analysis started."}


@router.get("/analyze-stream/{task_id}")
async def stream_analysis_result(task_id: str):
    """
    SSE endpoint. Runs GEE analysis in a thread pool so the async loop
    stays free to send heartbeats while the heavy work runs in background.
    """
    meta = _pending.pop(task_id, None)
    if not meta:
        # task_id not found — return error event immediately
        async def _err():
            yield f"data: {json.dumps({'status': 'ERROR', 'detail': 'Task not found or already consumed'})}\n\n"
        return StreamingResponse(_err(), media_type="text/event-stream")

    async def event_generator():
        # Tell the client the connection is live
        yield f"data: {json.dumps({'status': 'CONNECTED', 'task_id': task_id})}\n\n"

        # Launch blocking GEE work in thread pool (does NOT block the event loop)
        loop = asyncio.get_event_loop()
        future = loop.run_in_executor(
            _executor,
            _run_gee_blocking,
            task_id,
            meta["plot_id"],
            meta["plot_coords"],
            meta["crop_type"],
            meta["area"],
        )

        # Send heartbeat ticks while waiting (keeps connection alive / shows progress)
        tick = 0
        while not future.done():
            await asyncio.sleep(1.0)
            tick += 1
            yield f"data: {json.dumps({'status': 'PROCESSING', 'tick': tick})}\n\n"

        result = await future
        yield f"data: {json.dumps(result)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )
