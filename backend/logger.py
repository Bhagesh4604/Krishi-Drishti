"""
Centralized Logging — Krishi-Drishti
======================================
Provides structured loggers for different subsystems.
Replace all print() calls with these loggers.
"""

import logging
import sys

LOG_FORMAT = "%(asctime)s | %(levelname)-8s | %(name)-20s | %(message)s"
DATE_FORMAT = "%Y-%m-%d %H:%M:%S"


def _setup_handler() -> logging.Handler:
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(logging.Formatter(LOG_FORMAT, datefmt=DATE_FORMAT))
    return handler


_handler = _setup_handler()


def get_logger(name: str, level: int = logging.INFO) -> logging.Logger:
    """Return a named logger with consistent formatting."""
    logger = logging.getLogger(f"krishi.{name}")
    if not logger.handlers:
        logger.addHandler(_handler)
        logger.setLevel(level)
        logger.propagate = False
    return logger


# Pre-configured loggers for common subsystems
api_logger = get_logger("api")
scheduler_logger = get_logger("scheduler")
celery_logger = get_logger("celery")
db_logger = get_logger("database")
