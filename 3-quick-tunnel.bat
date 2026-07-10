@echo off
chcp 65001 >nul
echo ================================================================
echo ARATA Platform - Cloudflare Quick Tunnel (임시 터널)
echo ================================================================
echo.
echo Quick Tunnel은 임시 URL을 생성하여 즉시 외부 접속을 제공합니다.
echo Named Tunnel이 작동하지 않을 때 테스트 용도로 사용하세요.
echo.
echo ※ Quick Tunnel의 특징:
echo   - 임시 URL (예: https://abc-123.trycloudflare.com)
echo   - 메인 사이트(4000포트)만 연결 가능
echo   - 재시작할 때마다 URL 변경됨
echo ================================================================
echo.

echo 로컬 서버 상태 확인 중...

netstat -ano | findstr :4000 >nul 2>&1
if %errorlevel%==0 (
    echo [✓] 메인 프론트엔드 (포트 4000) - 실행 중
) else (
    echo [X] 메인 프론트엔드 (포트 4000) - 실행되지 않음
    echo.
    echo 먼저 1-build-and-start-servers.bat을 실행하여 서버를 시작하세요.
    pause
    exit /b 1
)

echo.
choice /C YN /M "Quick Tunnel을 시작하시겠습니까? (Y/N)"
if errorlevel 2 (
    echo Quick Tunnel 시작이 취소되었습니다.
    pause
    exit /b 0
)

echo.
echo ================================================================
echo Cloudflare Quick Tunnel 시작 중...
echo ================================================================
echo.

REM 기존 cloudflared 프로세스 종료
taskkill /IM cloudflared.exe /F 2>nul
timeout /t 2 /nobreak >nul

REM Quick Tunnel 시작 (새 창에서)
start "Cloudflare Quick Tunnel" cmd /k "cd /d D:\ARATA && D:\ARATA\cloudflared.exe tunnel --url http://localhost:4000"

timeout /t 5 /nobreak >nul

echo.
echo ================================================================
echo Quick Tunnel 시작 완료!
echo ================================================================
echo.
echo Quick Tunnel 창에서 생성된 임시 URL을 확인하세요.
echo 예시: https://abc-123.trycloudflare.com
echo.
echo ※ 이 URL은 메인 사이트(localhost:4000)에만 연결됩니다.
echo ※ 터널 창을 닫으면 외부 접속이 중단됩니다.
echo ================================================================
echo.
pause