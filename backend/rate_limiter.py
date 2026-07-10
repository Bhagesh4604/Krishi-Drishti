"""
Rate Limiter — Krishi-Drishti
==============================
Shared SlowAPI limiter instance for throttling expensive endpoints
(Gemini AI, Earth Engine, etc.).
"""

from slowapi import Limiter
from slowapi.util import get_remote_address

# Uses client IP for rate-key resolution
limiter = Limiter(key_func=get_remote_address)
