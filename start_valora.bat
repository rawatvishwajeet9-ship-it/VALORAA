@echo off
title VALORA Healthcare Platform (Offline Mode)
echo =================================================================
echo   VALORA Healthcare Platform - Offline / Localhost Launcher
echo =================================================================
echo.
echo Checking active port 5000...

netstat -ano | findstr :5000 >nul
if %errorlevel% equ 0 (
    echo [INFO] VALORA is already running on http://127.0.0.1:5000 !
    echo Opening browser to http://127.0.0.1:5000/login.html ...
    start http://127.0.0.1:5000/login.html
    goto done
)

echo Starting VALORA server...
python app.py
if %errorlevel% neq 0 (
    echo.
    echo [INFO] Retrying with Windows py launcher...
    py app.py
)

:done
echo.
echo Press any key to close this launcher window.
pause >nul
