"""
Celery Application — Krishi-Drishti
====================================
Broker:  Redis (localhost:6379)
Backend: Redis (localhost:6379)

If Redis is unavailable the app falls back to task_always_eager=True,
meaning tasks run synchronously in the same process (no worker needed).
This keeps dev/demo environments functional without Redis installed.
"""

import os
from celery import Celery

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

celery_app = Celery(
    "krishi_drishti",
    broker=REDIS_URL,
    backend=REDIS_URL,
    include=["backend.tasks.gee_tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Kolkata",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,           # Task only acked after completion (safe retry)
    worker_prefetch_multiplier=1,  # One task at a time per worker slot
    result_expires=3600,           # Results kept in Redis for 1 hour
    task_soft_time_limit=60,       # Warn at 60 s
    task_time_limit=90,            # Kill at 90 s
)


def is_redis_available() -> bool:
    """Ping Redis to check connectivity. Used at startup."""
    try:
        import redis
        client = redis.from_url(REDIS_URL, socket_connect_timeout=2)
        client.ping()
        return True
    except Exception:
        return False


def configure_eager_fallback() -> None:
    """
    Enable synchronous (eager) mode if Redis is not reachable.
    Tasks will run in-process without a worker — identical to the old
    blocking behaviour but the code path is now async-ready.
    """
    celery_app.conf.update(
        task_always_eager=True,
        task_eager_propagates=True,
    )
    print("[Celery] Redis unavailable — running in synchronous fallback mode.")
