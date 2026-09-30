@echo off
title Krishi-Drishti — Celery Worker
cd /d "%~dp0"

echo ============================================================
echo   Krishi-Drishti — Celery Background Worker
echo ============================================================

if not exist "backend\venv\Scripts\activate.bat" (
    echo [ERROR] Virtual environment not found at backend\venv
    pause
    exit /b 1
)
call backend\venv\Scripts\activate.bat

echo.
echo [INFO] Starting Celery worker (GEE / AI task queue)...
echo [INFO] Pool: solo (Windows-compatible)
echo.

backend\venv\Scripts\python.exe -m celery ^
    -A backend.celery_app worker ^
    --loglevel=info ^
    --pool=solo ^
    --concurrency=1

pause
