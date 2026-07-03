@echo off
setlocal EnableExtensions
title Safe Stays PMS
cd /d "%~dp0"

echo.
echo  ============================================
echo    Safe Stays — Hotel Management Platform
echo  ============================================
echo.

REM --- Find Python (py launcher preferred on Windows) ---
set "PYTHON_CMD="
where py >nul 2>nul && set "PYTHON_CMD=py -3"
if not defined PYTHON_CMD where python >nul 2>nul && set "PYTHON_CMD=python"
if not defined PYTHON_CMD where python3 >nul 2>nul && set "PYTHON_CMD=python3"

if not defined PYTHON_CMD (
    echo  ERROR: Python not found!
    echo.
    echo  1. Download Python 3.10+ from https://www.python.org/downloads/
    echo  2. During install, CHECK "Add python.exe to PATH"
    echo  3. Restart computer, then run this file again
    echo.
    pause
    exit /b 1
)

echo  Using: %PYTHON_CMD%
%PYTHON_CMD% --version
if errorlevel 1 (
    echo  ERROR: Python found but not working.
    pause
    exit /b 1
)

REM --- Create virtual environment (most reliable on Windows) ---
if not exist "venv\Scripts\python.exe" (
    echo.
    echo  Creating virtual environment...
    %PYTHON_CMD% -m venv venv
    if errorlevel 1 (
        echo  ERROR: Could not create venv.
        echo  Try running this file as Administrator.
        pause
        exit /b 1
    )
)

echo.
echo  Activating virtual environment...
call "venv\Scripts\activate.bat"
if errorlevel 1 (
    echo  ERROR: Could not activate venv.
    pause
    exit /b 1
)

echo.
echo  Installing dependencies...
python -m pip install --upgrade pip >nul 2>nul
python -m pip install -r requirements.txt
if errorlevel 1 (
    echo  ERROR: pip install failed.
    echo  Try: python -m pip install Flask Werkzeug
    pause
    exit /b 1
)

if not exist "instance" mkdir instance

echo.
echo  Starting Safe Stays PMS...
echo  Browser will open automatically.
echo  DO NOT CLOSE THIS WINDOW while using the app.
echo.

python run.py

echo.
echo  Server stopped.
pause
