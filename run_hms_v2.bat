@echo off
setlocal EnableExtensions EnableDelayedExpansion
title GrandStay HMS
cd /d "%~dp0"

echo.
echo  ============================================
echo    GrandStay HMS - Hotel Management System
echo  ============================================
echo.
echo  Folder: %CD%
echo.

REM --- Find Python (py launcher preferred on Windows) ---
set "PYTHON_CMD="
where py >nul 2>nul && set "PYTHON_CMD=py -3"
if not defined PYTHON_CMD where python >nul 2>nul && set "PYTHON_CMD=python"
if not defined PYTHON_CMD where python3 >nul 2>nul && set "PYTHON_CMD=python3"

if not defined PYTHON_CMD (
    echo  [ERROR] Python is not installed or not in PATH.
    echo.
    echo  Fix:
    echo    1. Install Python 3.10+ from https://www.python.org/downloads/
    echo    2. During install, CHECK "Add python.exe to PATH"
    echo    3. Restart your PC, then double-click this file again.
    echo.
    goto :fail
)

echo  Using: %PYTHON_CMD%
%PYTHON_CMD% --version
if errorlevel 1 (
    echo  [ERROR] Python was found but does not run correctly.
    goto :fail
)

if not exist "app.py" (
    echo  [ERROR] app.py not found in this folder.
    echo  Make sure you extracted the FULL zip, not only some files.
    goto :fail
)

if not exist "run.py" (
    echo  [ERROR] run.py not found in this folder.
    goto :fail
)

if not exist "requirements.txt" (
    echo  [ERROR] requirements.txt not found in this folder.
    goto :fail
)

REM --- Create virtual environment ---
if not exist "venv\Scripts\python.exe" (
    echo.
    echo  Creating virtual environment (first run only)...
    %PYTHON_CMD% -m venv venv
    if errorlevel 1 (
        echo  [ERROR] Could not create virtual environment.
        echo  Try: Right-click this file ^> Run as administrator
        goto :fail
    )
)

echo.
echo  Activating virtual environment...
call "venv\Scripts\activate.bat"
if errorlevel 1 (
    echo  [ERROR] Could not activate virtual environment.
    goto :fail
)

echo.
echo  Installing dependencies...
python -m pip install --upgrade pip >nul 2>nul
python -m pip install -r requirements.txt
if errorlevel 1 (
    echo  [ERROR] Failed to install packages.
    echo  Try manually: python -m pip install Flask Werkzeug
    goto :fail
)

if not exist "instance" mkdir instance

echo.
echo  Starting GrandStay HMS...
echo  Browser will open at http://127.0.0.1:5000
echo  Login: admin / admin123
echo.
echo  DO NOT CLOSE THIS WINDOW while using the app.
echo  Press Ctrl+C to stop the server.
echo.

python run.py
set "EXIT_CODE=%ERRORLEVEL%"

echo.
if not "%EXIT_CODE%"=="0" (
    echo  [ERROR] Server stopped with error code %EXIT_CODE%.
    echo  Run TEST_SETUP.bat to see detailed diagnostics.
    goto :fail
)

echo  Server stopped normally.
pause
exit /b 0

:fail
echo.
echo  ------------------------------------------------
echo  TROUBLESHOOTING
echo  ------------------------------------------------
echo  1. Run TEST_SETUP.bat and read the error text
echo  2. Run RESET_DATABASE.bat if database is corrupt
echo  3. If Windows blocked this file:
echo       Right-click run_hms_v2.bat ^> Properties ^> Unblock
echo  4. Make sure Python 3.10+ is installed with PATH enabled
echo  ------------------------------------------------
echo.
pause
exit /b 1
