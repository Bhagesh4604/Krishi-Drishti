"""
Krishi-Drishti Root Application Entrypoint
===========================================
Allows starting the FastAPI backend directly from repository root via:
  - uvicorn main:app --host 0.0.0.0 --port $PORT
  - python main.py
"""
import os
import sys

# Ensure repository root and backend directory are always on sys.path
_ROOT = os.path.dirname(os.path.abspath(__file__))
_BACKEND = os.path.join(_ROOT, "backend")

if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)
if _BACKEND not in sys.path:
    sys.path.insert(0, _BACKEND)

from backend.main import app

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 10000))
    host = os.environ.get("HOST", "0.0.0.0")
    print(f"Starting Krishi-Drishti FastAPI Server on {host}:{port}...")
    uvicorn.run("main:app", host=host, port=port, log_level="info")
