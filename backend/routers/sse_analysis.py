"""
SSE Analysis Router (Upgrade D)
=================================
Replaces the client polling pattern with Server-Sent Events (SSE).

Flow:
  1. Client POSTs to /api/v1/analyze-plot → gets task_id + 202 Accepted
  2. Client opens GET /api/v1/analyze-stream/{task_id} (SSE connection)
  3. FastAPI BackgroundTask runs GEE analysis in background
  4. When done, server pushes a single "TASK_COMPLETE" SSE event
  5. Client closes the SSE connection → no more polling
"""

import asyncio
import uuid
import json
from datetime import datetime
from typing import Optional, Dict, Any

from fastapi import APIRouter, Depends, BackgroundTasks, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database import get_db
from ..dependencies import get_current_user
from ..models import User, Plot

router = APIRouter(prefix="/api/sse_analysis", tags=["sse_analysis"])

from ..rate_limiter import limiter

# In-memory task store (use Redis in production)
_task_results: Dict[str, Any] = {}


class AnalyzeRequest(BaseModel):
    plot_id: int


def _run_gee_analysis_sync(task_id: str, plot_id: int, plot_coords: str, crop_type: Optional[str]):
    """
    Synchronous GEE analysis worker.
    In production, this would call the real Earth Engine Python SDK.
    Currently uses the deterministic simulation from satellite_engine.py.
    """
    try:
        from ..services.earth_engine import earth_engine_service
        import json
        
        try:
            ring = json.loads(plot_coords) if isinstance(plot_coords, str) else plot_coords
        except Exception:
            ring = []
            
        result = earth_engine_service.monitor_plot(
            geometry_coords=ring,
            crop_type=crop_type or "Mixed",
            plot_name=f"Plot-{plot_id}",
        )
        
        result["task_id"] = task_id
        result["status"] = "COMPLETE"
        result["completed_at"] = datetime.utcnow().isoformat()

        _task_results[task_id] = result
    except Exception as e:
        _task_results[task_id] = {"task_id": task_id, "status": "ERROR", "detail": str(e)}


@limiter.limit("5/minute")
@router.post("/analyze-plot")
async def start_analysis(
    request: Request,
    body: AnalyzeRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Accepts a plot ID and kicks off async GEE analysis.
    Returns a task_id immediately (202 Accepted) so the client is not blocked.
    """
    plot = db.query(Plot).filter(Plot.id == body.plot_id, Plot.user_id == current_user.id).first()
    if not plot:
        raise HTTPException(status_code=404, detail="Plot not found")

    task_id = str(uuid.uuid4())
    _task_results[task_id] = {"status": "PROCESSING"}

    # Kick off the heavy analysis as a background task
    background_tasks.add_task(
        _run_gee_analysis_sync,
        task_id,
        plot.id,
        plot.coordinates or "",
        plot.crop_type
    )

    return {
        "task_id": task_id,
        "status": "processing",
        "message": "Analysis started. Connect to /api/v1/analyze-stream/{task_id} for results."
    }

@router.get("/task-status/{task_id}")
async def get_task_status(task_id: str):
    """
    Fallback polling endpoint for clients that don't support SSE.
    """
    result = _task_results.get(task_id)
    if not result:
        return {"status": "failed", "detail": "Task not found or expired"}
    
    if result.get("status") == "COMPLETE":
        # Rename status to "success" for frontend compatibility
        formatted_result = dict(result)
        formatted_result["status"] = "success"
        formatted_result["result"] = result
        return formatted_result
    
    if result.get("status") == "ERROR":
        return {"status": "failed", "detail": result.get("detail", "Unknown error")}
        
    return {"status": "queued"}


@router.get("/analyze-stream/{task_id}")
async def stream_analysis_result(
    task_id: str,
    current_user: User = Depends(get_current_user),
):
    """
    SSE endpoint. Client opens this connection ONCE.
    Server pushes a 'TASK_COMPLETE' event when analysis finishes.
    Client receives the data and closes the connection — no polling needed.
    """

    async def event_generator():
        # Yield a heartbeat immediately so the client knows the connection is live
        yield f"data: {json.dumps({'status': 'CONNECTED', 'task_id': task_id})}\n\n"

        # Wait for the background task to complete (max 30 seconds)
        for _ in range(60):  # 60 x 0.5s = 30s timeout
            await asyncio.sleep(0.5)
            result = _task_results.get(task_id)
            if result and result.get("status") in ("COMPLETE", "ERROR"):
                yield f"data: {json.dumps(result)}\n\n"
                # Clean up memory
                _task_results.pop(task_id, None)
                return

        # Timeout
        yield f"data: {json.dumps({'status': 'TIMEOUT', 'task_id': task_id})}\n\n"
        _task_results.pop(task_id, None)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",  # Required for nginx SSE
            "Connection": "keep-alive",
        }
    )
