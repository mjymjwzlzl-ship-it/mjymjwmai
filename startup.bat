@echo off
echo Starting ARATA Platform...
echo.

REM 백엔드 서버 시작
echo [1/2] Starting Backend Server...
start /B cmd /c "cd /d D:\ARATA\backend && node server.js"
timeout /t 3 /nobreak > nul

REM 프론트엔드 개발 서버 시작 (프로덕션 빌드 문제 우회)
echo [2/2] Starting Frontend Server...
cd /d D:\ARATA
npm run dev

echo.
echo All services started!
pause