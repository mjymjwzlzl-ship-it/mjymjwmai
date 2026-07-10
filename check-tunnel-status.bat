@echo off
chcp 65001 >nul
echo ================================================================
echo ARATA Platform - Tunnel Status Check (터널 상태 확인)
echo ================================================================
echo.

echo [1] Cloudflared 프로세스 확인...
tasklist | findstr cloudflared >nul 2>&1
if %errorlevel%==0 (
    echo [✓] Cloudflared 프로세스 실행 중
    tasklist | findstr cloudflared
) else (
    echo [X] Cloudflared 프로세스 실행되지 않음
)

echo.
echo [2] 로컬 서버 상태 확인...

netstat -ano | findstr :4000 >nul 2>&1
if %errorlevel%==0 (
    echo [✓] 메인 프론트엔드 (4000) - 실행 중
) else (
    echo [X] 메인 프론트엔드 (4000) - 실행되지 않음
)

netstat -ano | findstr :4001 >nul 2>&1
if %errorlevel%==0 (
    echo [✓] 작가센터 (4001) - 실행 중  
) else (
    echo [X] 작가센터 (4001) - 실행되지 않음
)

netstat -ano | findstr :5000 >nul 2>&1
if %errorlevel%==0 (
    echo [✓] 관리자센터 (5000) - 실행 중
) else (
    echo [X] 관리자센터 (5000) - 실행되지 않음  
)

netstat -ano | findstr :8000 >nul 2>&1
if %errorlevel%==0 (
    echo [✓] 백엔드 API (8000) - 실행 중
) else (
    echo [X] 백엔드 API (8000) - 실행되지 않음
)

echo.
echo [3] 외부 접속 테스트...

echo 메인 사이트 접속 테스트 중... (3초 타임아웃)
timeout 3 >nul 2>&1 && curl -s --connect-timeout 3 https://arata.co.kr >nul 2>&1
if %errorlevel%==0 (
    echo [✓] https://arata.co.kr - 접속 가능
) else (
    echo [X] https://arata.co.kr - 접속 불가
)

echo 작가센터 접속 테스트 중... (3초 타임아웃)
curl -s --connect-timeout 3 https://creator.arata.co.kr >nul 2>&1
if %errorlevel%==0 (
    echo [✓] https://creator.arata.co.kr - 접속 가능
) else (
    echo [X] https://creator.arata.co.kr - 접속 불가
)

echo 관리자센터 접속 테스트 중... (3초 타임아웃)
curl -s --connect-timeout 3 https://admin.arata.co.kr >nul 2>&1
if %errorlevel%==0 (
    echo [✓] https://admin.arata.co.kr - 접속 가능
) else (
    echo [X] https://admin.arata.co.kr - 접속 불가
)

echo 백엔드 API 접속 테스트 중... (3초 타임아웃)
curl -s --connect-timeout 3 https://api.arata.co.kr >nul 2>&1
if %errorlevel%==0 (
    echo [✓] https://api.arata.co.kr - 접속 가능
) else (
    echo [X] https://api.arata.co.kr - 접속 불가
)

echo.
echo ================================================================
echo 상태 확인 완료!
echo ================================================================
echo.
echo ※ 모든 서비스가 [✓] 상태여야 정상 작동합니다.
echo ※ 문제가 있다면:
echo   1) 서버 문제: 1-build-and-start-servers.bat 실행
echo   2) 터널 문제: 2-cloudflare-named-tunnel.bat 실행
echo ================================================================
echo.
pause