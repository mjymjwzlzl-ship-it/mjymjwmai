@echo off
chcp 65001 >nul
echo === ARATA PM2 최적화 시작 스크립트 ===
echo.

echo PM2 프로세스 정리 중...
call pm2 delete all 2>nul

echo 기존 포트 사용 프로세스 정리 중...
echo.

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
echo [1/4] Next.js 프로덕션 빌드 생성 중...

REM 메인 프론트엔드 빌드
cd /d D:\ARATA
call npm run build

REM 작가센터 빌드
cd /d D:\ARATA\creator-center
call npm run build

REM 관리자센터 빌드
cd /d D:\ARATA\admin-center
call npm run build

echo.
echo [2/4] 빌드 캐시 워밍업...
timeout /t 2 /nobreak > nul

echo.
echo [3/4] PM2로 서버 시작 (클러스터 모드)...
cd /d D:\ARATA
call pm2 start ecosystem.config.js

echo.
echo [4/4] 서버 워밍업 요청 전송...
timeout /t 5 /nobreak > nul

:: 워밍업 요청으로 콜드 스타트 방지
curl -s http://localhost:4000 > nul
curl -s http://localhost:4001 > nul
curl -s http://localhost:5000 > nul
curl -s http://localhost:8000/api/health > nul

echo.
echo === PM2 최적화 완료! ===
echo.
echo 서버 상태:
call pm2 status

echo.
echo 메인 프론트엔드: http://localhost:4000
echo 작가센터: http://localhost:4001
echo 관리자센터: http://localhost:5000
echo 백엔드 API: http://localhost:8000
echo.
echo PM2 명령어:
echo   로그 보기: pm2 logs
echo   모니터링: pm2 monit
echo   서버 중지: pm2 stop all
echo   서버 재시작: pm2 restart all
echo   프로세스 삭제: pm2 delete all
echo.
echo ※ Cloudflare 터널이 이미 실행 중입니다!
echo    - https://arata.co.kr (메인)
echo    - https://creator.arata.co.kr (작가센터)
echo    - https://admin.arata.co.kr (관리자센터)
echo.
pause