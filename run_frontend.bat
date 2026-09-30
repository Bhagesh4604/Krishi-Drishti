@echo off
title Krishi-Drishti — React Frontend
cd /d "%~dp0"

echo ============================================================
echo   Krishi-Drishti — React Frontend  (port 3000)
echo ============================================================

if not exist "node_modules" (
    echo [INFO] node_modules not found. Running npm install first...
    npm install
)

echo.
echo [INFO] Starting Vite dev server...
echo [INFO] App: http://localhost:3000
echo.

npm run dev

pause
