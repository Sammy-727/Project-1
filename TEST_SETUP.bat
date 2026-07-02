@echo off
setlocal EnableExtensions
title GrandStay HMS - Setup Test
cd /d "%~dp0"

echo.
echo  ============================================
echo    GrandStay HMS - Setup Diagnostic Test
echo  ============================================
echo  Folder: %CD%
echo.

set "PYTHON_CMD="
where py >nul 2>nul && set "PYTHON_CMD=py -3"
if not defined PYTHON_CMD where python >nul 2>nul && set "PYTHON_CMD=python"
if not defined PYTHON_CMD where python3 >nul 2>nul && set "PYTHON_CMD=python3"

if not defined PYTHON_CMD (
    echo  [FAIL] Python not found in PATH.
    goto :end
)

echo  [OK] Python command: %PYTHON_CMD%
%PYTHON_CMD% --version
if errorlevel 1 goto :end

if exist "venv\Scripts\activate.bat" (
    call "venv\Scripts\activate.bat"
    echo  [OK] Virtual environment activated
) else (
    echo  [INFO] No venv yet - will be created on first START.bat run
)

echo.
echo  --- File check ---
if exist "app.py" (echo  [OK] app.py) else (echo  [FAIL] app.py missing)
if exist "run.py" (echo  [OK] run.py) else (echo  [FAIL] run.py missing)
if exist "requirements.txt" (echo  [OK] requirements.txt) else (echo  [FAIL] requirements.txt missing)
if exist "templates" (echo  [OK] templates folder) else (echo  [FAIL] templates folder missing)
if exist "static" (echo  [OK] static folder) else (echo  [FAIL] static folder missing)

echo.
echo  --- Python import test ---
python -c "import sys; print('[OK] Python version:', sys.version.split()[0])" 2>nul || echo  [FAIL] Python import test

python -c "import flask; print('[OK] Flask installed')" 2>nul || (
    echo  [INFO] Flask not installed - installing now...
    python -m pip install -r requirements.txt
)

echo.
echo  --- Database test ---
python -c "from app import ensure_db; ensure_db(); print('[OK] Database ready')" 2>nul || echo  [FAIL] Database setup failed

echo.
echo  --- App route test ---
python -c "from app import app; c=app.test_client(); c.post('/', data={'username':'admin','password':'admin123'}); r=c.get('/dashboard'); print('[OK] Dashboard status:', r.status_code)" 2>nul || echo  [FAIL] App test failed

echo.
echo  If all tests show OK, run run_hms_v2.bat or START.bat

:end
echo.
pause
