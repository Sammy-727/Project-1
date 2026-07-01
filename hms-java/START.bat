@echo off
setlocal EnableExtensions
title GrandStay HMS - Spring Boot
cd /d "%~dp0"

echo ============================================
echo   GrandStay HMS - Java Spring Boot Edition
echo ============================================
echo.

REM Find Java
where java >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Java not found!
    echo Install JDK 17+ from https://adoptium.net/
    echo Make sure JAVA_HOME is set and java is in PATH.
    pause
    exit /b 1
)

echo Java version:
java -version
echo.

REM Find Maven
set "MVN=mvn"
where mvn >nul 2>nul
if %errorlevel% neq 0 (
    if exist "mvnw.cmd" (
        set "MVN=mvnw.cmd"
    ) else (
        echo ERROR: Maven not found!
        echo Install Maven from https://maven.apache.org/download.cgi
        echo OR use the included mvnw.cmd wrapper.
        pause
        exit /b 1
    )
)

echo Building and starting (first run downloads dependencies, may take 3-5 min)...
echo.
echo Open: http://localhost:8080
echo Login: admin / admin123
echo.
echo DO NOT CLOSE THIS WINDOW while using the app.
echo.

call %MVN% spring-boot:run

pause
