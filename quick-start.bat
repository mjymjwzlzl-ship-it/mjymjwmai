@echo off
echo ====================================
echo ARATA Quick Start (No Build)
echo ====================================
echo.

REM 이미 빌드된 상태에서 바로 서버만 시작
echo Starting all servers...

REM 백엔드 서버
start /min cmd /k "cd /d D:\ARATA\backend && npm start"
timeout /t 2 /nobreak >nul

REM 메인 프론트엔드
start /min cmd /k "cd /d D:\ARATA && npm start"

REM 관리자 센터
start /min cmd /k "cd /d D:\ARATA\admin-center && npm start"

REM 작가 센터
start /min cmd /k "cd /d D:\ARATA\creator-center && npm start"

echo.
echo ====================================
echo ✅ All servers started in 5 seconds!
echo ====================================
echo.
echo - Main Site:   http://localhost:4000
echo - Admin:       http://localhost:5000  
echo - Creator:     http://localhost:4001
echo - Backend API: http://localhost:8000
echo ====================================
echo.
timeout /t 5 /nobreak >nul