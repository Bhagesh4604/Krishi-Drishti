"""
Jobs Router — Krishi-Drishti
==============================
Provides two endpoints for polling Celery task results:

  GET /api/jobs/{job_id}          — JSON polling (standard REST)
  GET /api/jobs/{job_id}/stream   — Server-Sent Events stream

The SSE stream is the preferred integration for the frontend because it
pushes the result the instant it's ready, eliminating polling overhead.
"""

import asyncio
import json
from typing import Any, Dict

from celery.result import AsyncResult
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from ..celery_app import celery_app

router = APIRouter(prefix="/api/jobs", tags=["jobs"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _task_payload(result: AsyncResult) -> Dict[str, Any]:
    """
    Convert a Celery AsyncResult to a consistent JSON-serialisable dict.

    Status mapping:
      PENDING  → queued   (task in broker, no worker picked it up yet)
      STARTED  → running  (worker has started)
      SUCCESS  → success  (result available)
      FAILURE  → failed   (exception stored in backend)
      RETRY    → running  (worker is retrying)
    """
    state = result.state

    if state == "PENDING":
        return {"status": "queued", "job_id": result.id}

    if state == "STARTED":
        meta = result.info or {}
        return {
            "status": "running",
            "job_id": result.id,
            "plot_name": meta.get("plot_name"),
            "methodology": meta.get("methodology"),
        }

    if state == "SUCCESS":
        return {
            "status": "success",
            "job_id": result.id,
            "result": result.result,
        }

    if state in ("FAILURE", "REVOKED"):
        exc = result.result
        return {
            "status": "failed",
            "job_id": result.id,
            "error": str(exc) if exc else "Unknown error",
        }

    # RETRY or any custom state
    return {"status": "running", "job_id": result.id, "state": state}


# ---------------------------------------------------------------------------
# REST polling endpoint
# ---------------------------------------------------------------------------

@router.get("/{job_id}")
async def get_job_status(job_id: str):
    """
    Poll the status of an async GEE analysis job.

    Returns:
      - status: "queued" | "running" | "success" | "failed"
      - result: full analysis dict (only when status == "success")
      - error:  error message (only when status == "failed")

    Frontend should poll every 2–3 seconds until status is "success" or "failed".
    """
    try:
        result = AsyncResult(job_id, app=celery_app)
        return _task_payload(result)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Could not fetch job status: {exc}")


# ---------------------------------------------------------------------------
# Server-Sent Events stream (preferred)
# ---------------------------------------------------------------------------

@router.get("/{job_id}/stream")
async def stream_job_result(job_id: str):
    """
    SSE stream that pushes events until the job completes.

    Event types emitted:
      event: progress  — sent every 2 s while running/queued
      event: result    — sent once when status == "success" (data = full analysis JSON)
      event: error     — sent once when status == "failed"

    Frontend usage:
      const es = new EventSource(`/api/jobs/${jobId}/stream`);
      es.addEventListener('result', e => { setAnalysis(JSON.parse(e.data)); es.close(); });
      es.addEventListener('error',  e => { setError(e.data); es.close(); });
    """

    async def event_generator():
        max_polls = 60     # 60 polls × 2 s = 120-second timeout
        polls = 0

        while polls < max_polls:
            try:
                result = AsyncResult(job_id, app=celery_app)
                payload = _task_payload(result)
                status = payload["status"]

                if status == "success":
                    data = json.dumps(payload["result"])
                    yield f"event: result\ndata: {data}\n\n"
                    return

                if status == "failed":
                    yield f"event: error\ndata: {payload.get('error', 'Unknown error')}\n\n"
                    return

                # Still running — send a heartbeat progress event
                progress_data = json.dumps({"status": status, "job_id": job_id, "poll": polls})
                yield f"event: progress\ndata: {progress_data}\n\n"

            except Exception as exc:
                yield f"event: error\ndata: {str(exc)}\n\n"
                return

            polls += 1
            await asyncio.sleep(2)

        # Timeout
        yield f"event: error\ndata: Analysis timed out after 120 seconds.\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",   # Disable Nginx buffering
            "Connection": "keep-alive",
        },
    )
