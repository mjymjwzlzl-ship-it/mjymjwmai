@echo off
echo ================================================================
echo ARATA Platform - Production Build & Run
echo ================================================================
echo.

REM 기존 프로세스 종료
echo [0/7] 기존 프로세스 종료 중...
taskkill /F /IM node.exe 2>nul
taskkill /F /IM cloudflared.exe 2>nul
timeout /t 2 /nobreak >nul

echo.
echo [1/7] 백엔드 서버 시작 (포트 8000)...
start "ARATA Backend" cmd /k "cd /d D:\ARATA\backend && npm install --no-audit --no-fund && npm start"
timeout /t 5 /nobreak >nul

echo [2/7] 메인 프론트엔드 빌드 및 시작 (포트 4000)...
start "ARATA Frontend" cmd /k "cd /d D:\ARATA && npm install --no-audit --no-fund && npm run build && npm start"
timeout /t 10 /nobreak >nul

echo [3/7] 작가센터 빌드 및 시작 (포트 4001)...
start "Creator Center" cmd /k "cd /d D:\ARATA\creator-center && npm install --no-audit --no-fund && npm run build && npx next start -p 4001"
timeout /t 10 /nobreak >nul

echo [4/7] 관리자센터 빌드 및 시작 (포트 5000)...
start "Admin Center" cmd /k "cd /d D:\ARATA\admin-center && npm install --no-audit --no-fund && npm run build && npx next start -p 5000"
timeout /t 10 /nobreak >nul

echo [5/7] API 연결 테스트 중...
timeout /t 3 /nobreak >nul
curl -s http://localhost:8000/api/health > nul 2>&1
if %errorlevel% equ 0 (
    echo     ✓ 백엔드 API 정상 작동
) else (
    echo     X 백엔드 API 응답 없음 - 확인 필요
)

echo [6/7] Cloudflare Tunnel 설정 확인...
if exist D:\ARATA\cloudflared.exe (
    echo     ✓ Cloudflare 실행 파일 확인
) else (
    echo     X Cloudflare 실행 파일 없음
    echo     다운로드: https://github.com/cloudflare/cloudflared/releases
)

echo [7/7] Cloudflare Tunnel 시작...
if exist D:\ARATA\tunnel-config.yml (
    start "Cloudflare Tunnel" cmd /k "D:\ARATA\cloudflared.exe tunnel --config D:\ARATA\tunnel-config.yml --no-autoupdate run arata-main"
    echo     ✓ Tunnel 시작 중...
) else (
    echo     X tunnel-config.yml 파일 없음
    echo     기본 Tunnel 시작 시도...
    start "Cloudflare Tunnel" cmd /k "D:\ARATA\cloudflared.exe tunnel --url http://localhost:4000"
)

timeout /t 5 /nobreak >nul

echo.
echo ================================================================
echo 모든 서비스가 시작되었습니다!
echo ================================================================
echo.
echo 로컬 접속:
echo   - 메인:     http://localhost:4000
echo   - 작가:     http://localhost:4001  
echo   - 관리자:   http://localhost:5000
echo   - 백엔드:   http://localhost:8000
echo.
echo 외부 접속 (HTTPS):
echo   - 메인:     https://arata.co.kr
echo   - 작가:     https://creator.arata.co.kr
echo   - 관리자:   https://admin.arata.co.kr
echo   - API:      https://api.arata.co.kr
echo.
echo ================================================================
echo 종료하려면 모든 cmd 창을 닫거나 Ctrl+C를 누르세요
echo ================================================================
echo.
pause