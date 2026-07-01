@echo off
cd /d "%~dp0hms-backend"
echo Starting HMS Backend (dev profile with H2)...
set SPRING_PROFILES_ACTIVE=dev
mvn spring-boot:run
pause
