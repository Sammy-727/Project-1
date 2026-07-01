@echo off
title GrandStay HMS
cd /d "%~dp0"

echo ============================================
echo   GrandStay HMS - Hotel Management System
echo ============================================
echo.

where py >nul 2>nul
if %errorlevel%==0 (
    set PY=py -3
) else (
    set PY=python
)

echo Checking Python...
%PY% --version
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Python not found!
    echo Install Python 3.10+ from https://www.python.org/downloads/
    echo Make sure to check "Add Python to PATH" during install.
    pause
    exit /b 1
)

echo.
echo Installing dependencies...
%PY% -m pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo ERROR: Failed to install dependencies.
    pause
    exit /b 1
)

if not exist instance mkdir instance

echo.
echo Starting server...
%PY% run.py

pause
