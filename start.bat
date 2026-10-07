@echo off
title Krishi-Drishti - Server Launcher
echo ============================================================
echo   Krishi-Drishti - Full Stack Launcher
echo ============================================================
echo.

REM 1. Start Redis Server
echo [1/6] Starting Redis server on port 6379...
start "Redis Server" /MIN "C:\Program Files\Redis\redis-server.exe"
timeout /t 2 /nobreak >nul

REM 2. Start Celery Worker
echo [2/6] Starting Celery worker...
start "Celery Worker" cmd /k "cd /d %~dp0 && backend\venv\Scripts\python.exe -m celery -A backend.celery_app worker --loglevel=info --pool=solo --concurrency=2"
timeout /t 2 /nobreak >nul

REM 3. Start Bioacoustic Server
echo [3/6] Starting Bioacoustic server (port 8002)...
start "Bioacoustic Server" cmd /k "cd /d %~dp0backend\bioacoustic_service && venv\Scripts\python.exe server.py"
timeout /t 2 /nobreak >nul

REM 4. Start FastAPI Backend
echo [4/6] Starting FastAPI backend on port 8000...
start "FastAPI Backend" cmd /k "cd /d %~dp0 && backend\venv\Scripts\uvicorn.exe backend.main:app --reload --port 8000"
timeout /t 2 /nobreak >nul

REM 5. Start Admin Dashboard
echo [5/6] Starting Admin Dashboard on port 3001...
start "Admin Dashboard" cmd /k "cd /d %~dp0admin-dashboard && npm run dev"
timeout /t 2 /nobreak >nul

REM 6. Start Main React Frontend
echo [6/6] Starting Main React Frontend on port 3000...
start "Main Frontend" cmd /k "cd /d %~dp0 && npm run dev"
timeout /t 2 /nobreak >nul

echo.
echo ============================================================
echo   All services have been started in separate windows!
echo   Main App:          http://localhost:3000
echo   Admin Dashboard:   http://localhost:3001 (or 3002)
echo   FastAPI Backend:   http://localhost:8000
echo   Bioacoustic API:   http://localhost:8002
echo ============================================================
echo.
pause
