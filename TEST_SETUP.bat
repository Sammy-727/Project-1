@echo off
cd /d "%~dp0"
if exist "venv\Scripts\activate.bat" call "venv\Scripts\activate.bat"
echo Testing Safe Stays PMS setup...
echo.
python -c "import sys; print('Python:', sys.version)"
python -c "import flask; print('Flask: OK')"
python -c "from app import ensure_db; ensure_db(); print('Database: OK')"
python -c "from app import app; c=app.test_client(); c.post('/', data={'username':'admin','password':'admin123'}); r=c.get('/dashboard'); print('Dashboard:', r.status_code)"
echo.
echo If all above show OK / 200, run START.bat
pause
