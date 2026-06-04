@echo off
echo ============================================================
echo   Krishi-Drishti — Starting Full Stack (Redis + Celery + API)
echo ============================================================

REM ── 1. Start Redis Server ──────────────────────────────────────────
echo.
echo [1/3] Starting Redis server on port 6379...
start "Redis Server" /MIN "C:\Program Files\Redis\redis-server.exe"
timeout /t 2 /nobreak >nul
echo       Redis started.

REM ── 2. Start Celery Worker ─────────────────────────────────────────
echo.
echo [2/3] Starting Celery worker (GEE task queue)...
cd /d %~dp0
start "Celery Worker" /MIN cmd /k ".\backend\venv\Scripts\python.exe -m celery -A backend.celery_app worker --loglevel=info --pool=solo --concurrency=2"
timeout /t 3 /nobreak >nul
echo       Celery worker started.

REM ── 3. Start FastAPI Backend ───────────────────────────────────────
echo.
echo [3/3] Starting FastAPI backend on port 8000...
start "FastAPI Backend" cmd /k ".\backend\venv\Scripts\uvicorn.exe backend.main:app --reload --port 8000"
echo       FastAPI started.

echo.
echo ============================================================
echo   All services running!
echo   API:    http://localhost:8000
echo   Docs:   http://localhost:8000/docs
echo   Admin:  http://localhost:3001
echo ============================================================
echo.
pause
