@echo off
chcp 65001 >nul
echo ================================================================
echo ARATA 고속 빌드 및 실행 스크립트 (Windows 최적화 + PM2 백엔드)
echo ================================================================
echo 사용법: fast-build-and-run.bat [--skip-build]
echo   기본: 항상 빌드 실행
echo   --skip-build: 빌드 건너뛰기
echo ================================================================
echo.

echo Windows 시스템 최적화 중...
echo.

REM Node.js 프로세스 우선순위 높음으로 설정
wmic process where "name='node.exe'" CALL setpriority "high priority" 2>nul

REM Windows TCP/네트워크 최적화
netsh int tcp set global autotuninglevel=normal 2>nul
netsh int tcp set global chimney=enabled 2>nul
netsh int tcp set global rss=enabled 2>nul

REM Windows 디스크 캐시 최적화
fsutil behavior set memoryusage 2 2>nul

echo 기존 포트 사용 프로세스 정리 중...
echo.

REM PM2 백엔드 정리 (사용 안함)
REM call pm2 delete backend 2>nul

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
echo 빌드 상태 확인 중...
echo.

REM 빌드 옵션 확인 (기본값: 항상 빌드)
set FORCE_BUILD=true
if "%1"=="--skip-build" set FORCE_BUILD=false
if "%1"=="--no-build" set FORCE_BUILD=false

if "%FORCE_BUILD%"=="true" (
    echo [강제 빌드 모드] 기존 빌드 파일들을 삭제합니다...
    if exist "D:\ARATA\.next" (
        echo 메인 프론트엔드 빌드 삭제...
        rmdir /s /q "D:\ARATA\.next"
    )
    if exist "D:\ARATA\creator-center\.next" (
        echo 작가센터 빌드 삭제...
        rmdir /s /q "D:\ARATA\creator-center\.next"
    )
    if exist "D:\ARATA\admin-center\.next" (
        echo 관리자센터 빌드 삭제...
        rmdir /s /q "D:\ARATA\admin-center\.next"
    )
    echo 기존 빌드 파일 정리 완료!
    echo.
)

echo.

REM 메인 프론트엔드 빌드 확인
if "%FORCE_BUILD%"=="true" (
    echo [빌드] 메인 프론트엔드 빌드 시작...
    cd /d D:\ARATA
    set NODE_ENV=production
    call npm run build
    if exist "D:\ARATA\.next\BUILD_ID" (
        echo     ✓ 메인 프론트엔드 빌드 완료!
    ) else (
        echo     X 메인 프론트엔드 빌드 실패!
        pause
        exit /b 1
    )
) else (
    if not exist "D:\ARATA\.next\BUILD_ID" (
        echo [!] 메인 프론트엔드 빌드 없음 - 빌드 시작...
        cd /d D:\ARATA
        set NODE_ENV=production
        call npm run build
        if exist "D:\ARATA\.next\BUILD_ID" (
            echo     ✓ 메인 프론트엔드 빌드 완료!
        ) else (
            echo     X 메인 프론트엔드 빌드 실패!
            pause
            exit /b 1
        )
    ) else (
        echo [✓] 메인 프론트엔드 빌드 존재
    )
)

REM 작가센터 빌드 확인
if "%FORCE_BUILD%"=="true" (
    echo [빌드] 작가센터 빌드 시작...
    cd /d D:\ARATA\creator-center
    call npm run build
    if exist "D:\ARATA\creator-center\.next\BUILD_ID" (
        echo     ✓ 작가센터 빌드 완료!
    ) else (
        echo     X 작가센터 빌드 실패!
        pause
        exit /b 1
    )
) else (
    if not exist "D:\ARATA\creator-center\.next\BUILD_ID" (
        echo [!] 작가센터 빌드 없음 - 빌드 시작...
        cd /d D:\ARATA\creator-center
        call npm run build
        if exist "D:\ARATA\creator-center\.next\BUILD_ID" (
            echo     ✓ 작가센터 빌드 완료!
        ) else (
            echo     X 작가센터 빌드 실패!
            pause
            exit /b 1
        )
    ) else (
        echo [✓] 작가센터 빌드 존재
    )
)

REM 관리자센터 빌드 확인
if "%FORCE_BUILD%"=="true" (
    echo [빌드] 관리자센터 빌드 시작...
    cd /d D:\ARATA\admin-center
    call npm run build
    if exist "D:\ARATA\admin-center\.next\BUILD_ID" (
        echo     ✓ 관리자센터 빌드 완료!
    ) else (
        echo     X 관리자센터 빌드 실패!
        pause
        exit /b 1
    )
) else (
    if not exist "D:\ARATA\admin-center\.next\BUILD_ID" (
        echo [!] 관리자센터 빌드 없음 - 빌드 시작...
        cd /d D:\ARATA\admin-center
        call npm run build
        if exist "D:\ARATA\admin-center\.next\BUILD_ID" (
            echo     ✓ 관리자센터 빌드 완료!
        ) else (
            echo     X 관리자센터 빌드 실패!
            pause
            exit /b 1
        )
    ) else (
        echo [✓] 관리자센터 빌드 존재
    )
)

echo.
echo 모든 서버 시작 중...
echo.

REM 백엔드를 일반 모드로 시작
echo 백엔드 서버 시작...
start "ARATA Backend" cmd /k "cd /d D:\ARATA\backend && npm start"

REM 프론트엔드들 프로덕션 모드로 시작 (1-build-and-start-servers.bat과 동일한 방식)
start "ARATA Frontend" cmd /k "cd /d D:\ARATA && set NEXT_PUBLIC_BACKEND_URL=http://localhost:8000 && npm start"
start "Creator Center" cmd /k "cd /d D:\ARATA\creator-center && npx next start -p 4001"
start "Admin Center" cmd /k "cd /d D:\ARATA\admin-center && npx next start -p 5000"

timeout /t 5 /nobreak >nul

echo.
echo 서버 워밍업 중...
curl -s http://localhost:4000 > nul
curl -s http://localhost:4001 > nul
curl -s http://localhost:5000 > nul
curl -s http://localhost:8000/api/health > nul

echo.
echo ================================================================
echo ✅ 서버 시작 완료!
echo ================================================================
echo.
echo 메인 프론트엔드: http://localhost:4000
echo 작가센터: http://localhost:4001  
echo 관리자센터: http://localhost:5000
echo 백엔드 API: http://localhost:8000
echo.
echo ※ Cloudflare 터널이 실행 중이면:
echo   - https://arata.co.kr (메인)
echo   - https://creator.arata.co.kr (작가센터)
echo   - https://admin.arata.co.kr (관리자센터)
echo ================================================================
echo.
pause