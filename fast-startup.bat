@echo off
chcp 65001 >nul
echo ================================================================
echo ARATA 고속 실행 스크립트 (백엔드 PM2 + 프론트엔드 일반)
echo ================================================================
echo.

echo 기존 프로세스 정리 중...
echo.

REM PM2 프로세스 정리
pm2 delete backend 2>nul

REM 각 포트를 사용 중인 프로세스 종료
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :4000') do (
    echo 포트 4000 프로세스 종료: PID %%a
    taskkill /PID %%a /F 2>nul
)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :4001') do (
    echo 포트 4001 프로세스 종료: PID %%a
    taskkill /PID %%a /F 2>nul
)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5000') do (
    echo 포트 5000 프로세스 종료: PID %%a
    taskkill /PID %%a /F 2>nul
)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8000') do (
    echo 포트 8000 프로세스 종료: PID %%a
    taskkill /PID %%a /F 2>nul
)

timeout /t 2 /nobreak >nul

echo.
echo 빌드 옵션 선택...
echo.

REM 빌드 스킵 옵션 확인
set SKIP_BUILD=false
if "%1"=="--skip-build" set SKIP_BUILD=true
if "%1"=="--no-build" set SKIP_BUILD=true

if "%SKIP_BUILD%"=="false" (
    echo [빌드 모드] 모든 서비스 빌드 중...
    
    REM 메인 프론트엔드 빌드
    echo - 메인 프론트엔드 빌드 중...
    cd /d D:\ARATA
    call npm run build
    
    REM 작가센터 빌드
    echo - 작가센터 빌드 중...
    cd /d D:\ARATA\creator-center
    call npm run build
    
    REM 관리자센터 빌드
    echo - 관리자센터 빌드 중...
    cd /d D:\ARATA\admin-center
    call npm run build
    
    echo 빌드 완료!
) else (
    echo [빠른 시작] 빌드 스킵, 기존 빌드 사용
)

echo.
echo ================================================================
echo 서버 시작 중...
echo ================================================================
echo.

REM 백엔드를 PM2 클러스터 모드로 시작 (2개 인스턴스)
echo [1/4] 백엔드 서버 PM2 클러스터 모드 시작 (2개 인스턴스)...
cd /d D:\ARATA
pm2 start backend/server.js -i 2 --name backend --max-memory-restart 1G

REM 프론트엔드들 일반 모드로 시작
echo.
echo [2/4] 메인 프론트엔드 시작...
start "ARATA Frontend" cmd /k "cd /d D:\ARATA && npm start"

echo [3/4] 작가센터 시작...
start "Creator Center" cmd /k "cd /d D:\ARATA\creator-center && npx next start -p 4001"

echo [4/4] 관리자센터 시작...
start "Admin Center" cmd /k "cd /d D:\ARATA\admin-center && npx next start -p 5000"

timeout /t 5 /nobreak >nul

echo.
echo ================================================================
echo 서버 워밍업 중...
echo ================================================================

REM 워밍업 요청
curl -s http://localhost:4000 > nul
curl -s http://localhost:4001 > nul
curl -s http://localhost:5000 > nul
curl -s http://localhost:8000/api/health > nul

echo.
echo ================================================================
echo ✅ 모든 서버 시작 완료!
echo ================================================================
echo.
echo 🚀 백엔드 (PM2 클러스터): http://localhost:8000 (2개 인스턴스)
echo 📱 메인 프론트엔드: http://localhost:4000
echo 🎨 작가센터: http://localhost:4001
echo ⚙️ 관리자센터: http://localhost:5000
echo.
echo PM2 백엔드 상태:
pm2 status backend
echo.
echo ================================================================
echo 명령어:
echo   PM2 백엔드 로그: pm2 logs backend
echo   PM2 백엔드 재시작: pm2 restart backend
echo   PM2 백엔드 중지: pm2 stop backend
echo   빌드 스킵 실행: fast-startup.bat --skip-build
echo ================================================================
echo.
pause