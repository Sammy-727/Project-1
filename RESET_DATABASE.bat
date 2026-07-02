@echo off
cd /d "%~dp0"
if exist "venv\Scripts\activate.bat" call "venv\Scripts\activate.bat"
python -c "import os; p='instance\\hotel_v2.db'; os.remove(p) if os.path.exists(p) else None; print('Database reset. Now run START.bat')"
pause
