@echo off
title DocuMind Launcher
echo ========================================================
echo               Starting DocuMind Platform
echo ========================================================
echo.

REM 1. Start FastAPI Backend in a new window
start "DocuMind Backend (Port 8000)" cmd /k "cd /d "%~dp0backend" && .\venv\Scripts\python.exe -m uvicorn main:app --port 8000 --reload"

REM 2. Start React + Vite Frontend in a new window
start "DocuMind Frontend (Port 5173)" cmd /k "cd /d "%~dp0" && npm run dev"

REM 3. Wait 4 seconds for servers to start, then open browser
timeout /t 4 /nobreak >nul
start http://localhost:5173

echo [OK] Backend and Frontend started!
echo [OK] Opening http://localhost:5173 in your browser...
echo.
echo (Keep the terminal windows open while using DocuMind.)
timeout /t 4 >nul
exit
