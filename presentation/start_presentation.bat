@echo off
title Krishi-Drishti Interactive Presentation Web App
cls
echo =====================================================================
echo           KRISHI-DRISHTI - FINAL ACADEMIC PRESENTATION DECK
echo           Impact College of Engineering & Applied Sciences (VTU)
echo           Department of Computer Science & Engineering (Data Science)
echo =====================================================================
echo.
echo Launching your animated presentation in your default web browser...
echo.
echo Presentation Controls:
echo   - Right Arrow / Space / PageDown : Next Slide
echo   - Left Arrow / Backspace / PageUp : Previous Slide
echo   - Press 'N'                      : Toggle Speaker Notes & Viva Defense Q&A
echo   - Press 'O'                      : Slide Index / 18-Tile Overview
echo   - Press 'F'                      : Toggle Fullscreen Mode
echo   - Press 'L'                      : Toggle Virtual Laser Pointer
echo   - Press 'P'                      : Print / Export 16:9 PDF
echo.
start "" "%~dp0index.html"
echo Presentation launched! You can minimize or close this window.
timeout /t 5 >nul
exit
