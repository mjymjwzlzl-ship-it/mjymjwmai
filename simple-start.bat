@echo off
chcp 65001 >nul
echo ================================================================
echo ARATA 간단 실행 스크립트
echo ================================================================
echo.

echo [1/4] 기존 프로세스 정리중...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :4000') do (
    taskkill /PID %%a /F 2>nul
)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :4001') do (
    taskkill /PID %%a /F 2>nul
)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5000') do (
    taskkill /PID %%a /F 2>nul
)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8000') do (
    taskkill /PID %%a /F 2>nul
)

timeout /t 2 /nobreak >nul

echo.
echo [2/4] 백엔드 서버 시작...
start "ARATA Backend" cmd /k "cd /d D:\ARATA\backend && npm start"

timeout /t 3 /nobreak >nul

echo.
echo [3/4] 프론트엔드 서버 시작 (개발 모드)...
start "ARATA Frontend" cmd /k "cd /d D:\ARATA && npm run dev"

echo.
echo [4/4] 관리자 센터 시작...
start "Creator Center" cmd /k "cd /d D:\ARATA\creator-center && npm run dev"
start "Admin Center" cmd /k "cd /d D:\ARATA\admin-center && npm run dev"

echo.
echo ================================================================
echo ✅ 모든 서버가 시작되었습니다!
echo ================================================================
echo.
echo 접속 주소:
echo - 메인 사이트: http://localhost:4000
echo - 작가 센터: http://localhost:4001
echo - 관리자 센터: http://localhost:5000
echo - API 서버: http://localhost:8000
echo.
echo ================================================================
echo.
pause