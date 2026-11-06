@echo off
title LifeLink - Smart Blood Bank Network
echo ========================================================
echo   Starting LifeLink Full Stack Application...
echo ========================================================
echo.

cd /d "%~dp0\backend"

:: Start browser after brief delay
start "" cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:3000"

:: Start backend node server
node server.js
pause
