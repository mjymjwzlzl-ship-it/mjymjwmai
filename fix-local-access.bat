@echo off
echo.
echo ========================================
echo   로컬 도메인 접속 문제 해결
echo ========================================
echo.
echo hosts 파일에 로컬 도메인을 추가합니다.
echo 관리자 권한이 필요합니다!
echo.

REM 관리자 권한 확인
net session >nul 2>&1
if %errorLevel% NEQ 0 (
    echo [오류] 관리자 권한으로 실행해주세요!
    echo 이 파일을 마우스 오른쪽 클릭 후 "관리자 권한으로 실행"을 선택하세요.
    pause
    exit /b 1
)

echo hosts 파일 수정 중...
echo.

REM hosts 파일 경로
set HOSTS_FILE=C:\Windows\System32\drivers\etc\hosts

REM 백업 생성
echo 1. hosts 파일 백업 생성...
copy %HOSTS_FILE% %HOSTS_FILE%.backup.%date:~0,4%%date:~5,2%%date:~8,2% >nul

REM 기존 ARATA 관련 항목 제거 (있다면)
echo 2. 기존 ARATA 항목 정리...
findstr /v "arata.co.kr" %HOSTS_FILE% > %HOSTS_FILE%.tmp
move /y %HOSTS_FILE%.tmp %HOSTS_FILE% >nul

REM 새 항목 추가
echo 3. 로컬 도메인 매핑 추가...
echo. >> %HOSTS_FILE%
echo # ARATA 로컬 개발 환경 >> %HOSTS_FILE%
echo 127.0.0.1    arata.co.kr >> %HOSTS_FILE%
echo 127.0.0.1    creator.arata.co.kr >> %HOSTS_FILE%
echo 127.0.0.1    admin.arata.co.kr >> %HOSTS_FILE%
echo 127.0.0.1    api.arata.co.kr >> %HOSTS_FILE%
echo # ARATA 로컬 개발 환경 끝 >> %HOSTS_FILE%

echo.
echo ✅ 완료! hosts 파일이 수정되었습니다.
echo.
echo 이제 다음 URL로 접속 가능합니다:
echo   - http://arata.co.kr:4000 (메인)
echo   - http://creator.arata.co.kr:4001 (작가센터)
echo   - http://admin.arata.co.kr:5000 (관리자센터)
echo   - http://api.arata.co.kr:8000 (API)
echo.
echo ⚠️  주의: 포트 번호를 반드시 포함해야 합니다!
echo.
echo DNS 캐시를 플러시합니다...
ipconfig /flushdns

echo.
echo ========================================
echo   설정 완료!
echo ========================================
echo.
pause