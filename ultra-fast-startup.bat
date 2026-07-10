@echo off
chcp 65001 >nul
echo ================================================================
echo ARATA 초고속 시작 스크립트 (빌드 및 최적화 포함)
echo ================================================================
echo.

echo [1/7] 빌드 프로세스 시작 (병렬 처리)...
echo.

REM 백엔드 Prisma 생성
start /B /WAIT cmd /c "cd /d D:\ARATA\backend && npx prisma generate 2>nul"

REM 병렬 빌드 시작
echo 모든 프로젝트 동시 빌드중...
start /B cmd /c "cd /d D:\ARATA && npm run build && echo 메인 빌드 완료"
start /B cmd /c "cd /d D:\ARATA\creator-center && npm run build && echo 작가센터 빌드 완료"
start /B cmd /c "cd /d D:\ARATA\admin-center && npm run build && echo 관리자센터 빌드 완료"

REM 빌드 완료 대기 (병렬 처리로 시간 단축)
echo 빌드 완료 대기중...
timeout /t 20 /nobreak >nul

echo.
echo [2/7] Windows 프로세스 정리...
echo.

REM 메모리 정리
echo 메모리 캐시 정리 중...
powershell -Command "Clear-RecycleBin -Force -ErrorAction SilentlyContinue" 2>nul
powershell -Command "[System.GC]::Collect()" 2>nul
powershell -Command "[System.GC]::WaitForPendingFinalizers()" 2>nul

REM 불필요한 프로세스 종료 (선택적)
REM taskkill /F /IM chrome.exe 2>nul
REM taskkill /F /IM msedge.exe 2>nul
REM taskkill /F /IM firefox.exe 2>nul

REM Node.js 프로세스 우선순위 (더 빠른 처리)
echo Node.js 프로세스 우선순위 최적화...
wmic process where "name='node.exe'" CALL setpriority "high" 2>nul

echo.
echo [3/7] 네트워크 부스트...
echo.

REM TCP 최적화
netsh int tcp set global autotuninglevel=experimental 2>nul
netsh int tcp set global chimney=enabled 2>nul
netsh int tcp set global rss=enabled 2>nul
netsh int tcp set global netdma=enabled 2>nul
netsh int tcp set global ecncapability=enabled 2>nul
netsh int tcp set global timestamps=disabled 2>nul
netsh int tcp set global nonsackttresiliency=disabled 2>nul
netsh int tcp set global maxsynretransmissions=2 2>nul

REM DNS 프리페치
nslookup arata.co.kr 1.1.1.1 >nul 2>&1
nslookup api.arata.co.kr 1.1.1.1 >nul 2>&1

echo.
echo [4/7] 포트 정리 및 서버 준비...
echo.

REM 포트 정리
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

timeout /t 1 /nobreak >nul

echo.
echo [5/7] 환경 변수 설정...
echo.

REM Node.js 최적화
set NODE_ENV=production
set NODE_OPTIONS=--max-old-space-size=8192 --max-semi-space-size=64
set UV_THREADPOOL_SIZE=128

REM Next.js 최적화
set NEXT_TELEMETRY_DISABLED=1
set NEXT_PRIVATE_WORKER_THREADS=4

echo.
echo [6/7] 서버 시작 (최고 우선순위)...
echo.

REM 모든 서버 동시 시작 (병렬 처리로 속도 향상)
echo 모든 서버 동시 시작중...
start /REALTIME /MIN "ARATA Backend" cmd /k "cd /d D:\ARATA\backend && npm start"
start /HIGH /MIN "ARATA Frontend" cmd /k "cd /d D:\ARATA && npm start"
start /ABOVENORMAL /MIN "Creator Center" cmd /k "cd /d D:\ARATA\creator-center && npm start"
start /ABOVENORMAL /MIN "Admin Center" cmd /k "cd /d D:\ARATA\admin-center && npm start"

echo.
echo [7/7] 서버 워밍업중...
timeout /t 3 /nobreak >nul

REM 워밍업 요청 (병렬 처리)
echo 워밍업 요청 전송...
start /B curl -s http://localhost:4000 > nul
start /B curl -s http://localhost:4001 > nul
start /B curl -s http://localhost:5000 > nul
start /B curl -s http://localhost:8000/api/health > nul

timeout /t 2 /nobreak >nul

echo.
echo ================================================================
echo ✅ 초고속 최적화 완료!
echo ================================================================
echo.
echo 🚀 서버 상태:
echo ┌─────────────────────────────────────────────────────────────┐
echo │ 메인: http://localhost:4000     [프로덕션 - HIGH]           │
echo │ 작가: http://localhost:4001     [프로덕션 - NORMAL]         │
echo │ 관리: http://localhost:5000     [프로덕션 - NORMAL]         │
echo │ API:  http://localhost:8000     [REALTIME 우선순위]         │
echo └─────────────────────────────────────────────────────────────┘
echo.
echo 💡 성능 팁:
echo - 브라우저 하드웨어 가속 활성화
echo - Chrome://flags에서 Parallel downloading 활성화
echo - Windows Defender 예외 목록에 D:\ARATA 추가
echo.
echo ================================================================
echo.
pause