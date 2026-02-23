@echo off
echo Starting Bioacoustic Server on port 8002...
cd backend\bioacoustic_service
call venv\Scripts\activate.bat
python server.py
pause
pause
