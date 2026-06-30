@echo off
echo ============================================================
echo   Krishi-Drishti — Full Stack (Redis + Celery + API + Frontend)
echo ============================================================

REM ── 1. Start Redis Server ──────────────────────────────────────────
echo.
echo [1/5] Starting Redis server on port 6379...
start "Redis Server" /MIN "C:\Program Files\Redis\redis-server.exe"
timeout /t 2 /nobreak >nul
echo       Redis started (or skipped if not installed).

REM ── 2. Install backend dependencies if needed ──────────────────────
echo.
echo [2/5] Checking backend dependencies...
cd /d %~dp0
call .\backend\venv\Scripts\activate.bat 2>nul || echo [WARN] venv not found, using system Python.

REM ── 3. Start Celery Worker ─────────────────────────────────────────
echo.
echo [3/5] Starting Celery worker (GEE task queue)...
start "Celery Worker" /MIN cmd /k ".\backend\venv\Scripts\python.exe -m celery -A backend.celery_app worker --loglevel=info --pool=solo --concurrency=2"
timeout /t 3 /nobreak >nul
echo       Celery worker started.

REM ── 4. Start FastAPI Backend ───────────────────────────────────────
echo.
echo [4/5] Starting FastAPI backend on port 8000...
start "FastAPI Backend" cmd /k ".\backend\venv\Scripts\uvicorn.exe backend.main:app --reload --port 8000"
timeout /t 2 /nobreak >nul
echo       FastAPI started.

REM ── 5. Start Admin Dashboard (port 3001) ───────────────────────────
echo.
echo [5/5] Starting Admin Dashboard frontend on port 3001...
cd /d %~dp0admin-dashboard
start "Admin Dashboard" cmd /k "npm run dev"
cd /d %~dp0

echo.
echo ============================================================
echo   All services starting!
echo   Main App:   http://localhost:3000  (run 'npm run dev' separately)
echo   API:        http://localhost:8000
echo   Docs:       http://localhost:8000/docs
echo   Admin:      http://localhost:3001
echo ============================================================
echo.
echo NOTE: Run 'npm run dev' in the project root to start the main frontend.
pause
