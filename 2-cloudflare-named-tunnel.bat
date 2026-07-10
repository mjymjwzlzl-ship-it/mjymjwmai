@echo off
chcp 65001 >nul
echo ================================================================
echo ARATA Platform - Cloudflare Named Tunnel (클라우드플레어 네임드 터널)
echo ================================================================
echo.

echo Cloudflare Named Tunnel 상태 확인 중...

REM 기존 cloudflared 프로세스 확인
tasklist | findstr cloudflared >nul 2>&1
if %errorlevel%==0 (
    echo [!] 기존 Cloudflare Tunnel이 실행 중입니다.
    echo.
    choice /C YN /M "기존 터널을 종료하고 새로 시작하시겠습니까? (Y/N)"
    if errorlevel 2 (
        echo 터널 시작이 취소되었습니다.
        pause
        exit /b 0
    )
    echo.
    echo 기존 cloudflared 프로세스 종료 중...
    taskkill /IM cloudflared.exe /F 2>nul
    timeout /t 2 /nobreak >nul
)

echo.
echo 터널 설정 파일 확인 중...

if not exist "D:\ARATA\tunnel-config.yml" (
    echo [X] 터널 설정 파일이 없습니다: D:\ARATA\tunnel-config.yml
    echo     Named Tunnel 설정이 필요합니다.
    pause
    exit /b 1
)

if not exist "D:\ARATA\cloudflared.exe" (
    echo [X] cloudflared.exe 파일이 없습니다: D:\ARATA\cloudflared.exe
    echo     Cloudflare Tunnel 바이너리를 다운로드해주세요.
    pause
    exit /b 1
)

echo [✓] 터널 설정 파일 존재: tunnel-config.yml
echo [✓] Cloudflare 바이너리 존재: cloudflared.exe
echo.

echo 로컬 서버 연결 상태 확인 중...
echo.

REM 각 포트 확인
netstat -ano | findstr :4000 >nul 2>&1
if %errorlevel%==0 (
    echo [✓] 메인 프론트엔드 ^(포트 4000^) 실행 중
) else (
    echo [!] 메인 프론트엔드 ^(포트 4000^) 실행되지 않음
)

netstat -ano | findstr :4001 >nul 2>&1
if %errorlevel%==0 (
    echo [✓] 작가센터 ^(포트 4001^) 실행 중  
) else (
    echo [!] 작가센터 ^(포트 4001^) 실행되지 않음
)

netstat -ano | findstr :5000 >nul 2>&1
if %errorlevel%==0 (
    echo [✓] 관리자센터 ^(포트 5000^) 실행 중
) else (
    echo [!] 관리자센터 ^(포트 5000^) 실행되지 않음  
)

netstat -ano | findstr :8000 >nul 2>&1
if %errorlevel%==0 (
    echo [✓] 백엔드 API ^(포트 8000^) 실행 중
) else (
    echo [!] 백엔드 API ^(포트 8000^) 실행되지 않음
)

echo.
echo ※ 서버가 실행되지 않은 경우 먼저 1-build-and-start-servers.bat을 실행하세요.
echo.

choice /C YN /M "Named Tunnel을 시작하시겠습니까? (Y/N)"
if errorlevel 2 (
    echo 터널 시작이 취소되었습니다.
    pause
    exit /b 0
)

echo.
echo ================================================================
echo Cloudflare Named Tunnel 시작 중...
echo ================================================================
echo.

REM Named Tunnel 시작 (새 창에서)
start "Cloudflare Named Tunnel" cmd /k "cd /d D:\ARATA && D:\ARATA\cloudflared.exe tunnel --config D:\ARATA\tunnel-config.yml run arata-main"

timeout /t 3 /nobreak >nul

echo.
echo ================================================================
echo Named Tunnel 시작 완료!
echo ================================================================
echo.
echo 외부 접속 URL:
echo   메인 사이트: https://arata.co.kr
echo   작가센터: https://creator.arata.co.kr
echo   관리자센터: https://admin.arata.co.kr  
echo   백엔드 API: https://api.arata.co.kr
echo.
echo ※ 터널 연결이 완료될 때까지 1-2분 정도 소요될 수 있습니다.
echo ※ 터널 창을 닫으면 외부 접속이 중단됩니다.
echo ================================================================
echo.
pause