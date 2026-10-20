"""
In-memory Job Store — Krishi-Drishti
====================================
Stores task statuses and analysis results in-memory so that:
1. Fast-path eager task results are immediately available to /api/jobs/{job_id}.
2. If Redis is unavailable (e.g. Render free tier), jobs can still be tracked
   and queried without raising ConnectionRefusedError.
3. Fallback responses are stored with status='success' so mobile and web
   frontends never encounter 500 errors.
"""

import time
from typing import Any, Dict, Optional

_JOB_CACHE: Dict[str, Dict[str, Any]] = {}


def save_job_result(
    job_id: str,
    result: Any,
    status: str = "success",
    error: Optional[str] = None,
    meta: Optional[Dict[str, Any]] = None,
) -> None:
    """Save or update a job result in the in-memory cache."""
    if not job_id:
        return

    payload: Dict[str, Any] = {
        "status": status,
        "job_id": job_id,
        "result": result,
        "error": error,
        "timestamp": time.time(),
    }
    if meta:
        payload.update(meta)

    _JOB_CACHE[job_id] = payload

    # Keep cache bounded to at most 500 recent entries
    if len(_JOB_CACHE) > 500:
        oldest_keys = sorted(
            _JOB_CACHE.keys(),
            key=lambda k: _JOB_CACHE[k].get("timestamp", 0)
        )[:100]
        for k in oldest_keys:
            _JOB_CACHE.pop(k, None)


def get_saved_job(job_id: str) -> Optional[Dict[str, Any]]:
    """Retrieve a job result from in-memory cache."""
    if not job_id:
        return None
    return _JOB_CACHE.get(job_id)
