@echo off
cd /d "%~dp0hms-frontend"
echo Starting HMS Frontend...
if not exist node_modules (
  echo Installing dependencies...
  call npm install
)
npm run dev
pause
