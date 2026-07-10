@echo off
chcp 65001 >nul
echo ================================================================
echo Nginx 설치 및 설정 스크립트
echo ================================================================
echo.

REM 관리자 권한 확인
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ❌ 관리자 권한이 필요합니다!
    echo 스크립트를 우클릭하고 "관리자 권한으로 실행"을 선택하세요.
    pause
    exit /b 1
)

echo [1/5] Nginx 다운로드 중...
cd /d C:\
if not exist "C:\nginx" (
    powershell -Command "Invoke-WebRequest -Uri 'https://nginx.org/download/nginx-1.24.0.zip' -OutFile 'nginx.zip'"
    powershell -Command "Expand-Archive -Path 'nginx.zip' -DestinationPath 'C:\' -Force"
    move "C:\nginx-1.24.0" "C:\nginx"
    del nginx.zip
)

echo.
echo [2/5] 디렉토리 구조 생성...
mkdir C:\nginx\cache 2>nul
mkdir C:\nginx\logs 2>nul
mkdir C:\nginx\conf\sites-enabled 2>nul

echo.
echo [3/5] Nginx 설정 파일 복사...
copy /Y "D:\ARATA\nginx.conf" "C:\nginx\conf\nginx.conf"

echo.
echo [4/5] Windows 서비스 등록...
C:\nginx\nginx.exe -s stop 2>nul
sc delete nginx 2>nul

REM NSSM 다운로드 (서비스 관리 도구)
if not exist "C:\nginx\nssm.exe" (
    echo NSSM 다운로드 중...
    powershell -Command "Invoke-WebRequest -Uri 'https://nssm.cc/release/nssm-2.24.zip' -OutFile 'nssm.zip'"
    powershell -Command "Expand-Archive -Path 'nssm.zip' -DestinationPath 'C:\temp_nssm' -Force"
    copy "C:\temp_nssm\nssm-2.24\win64\nssm.exe" "C:\nginx\nssm.exe"
    rmdir /s /q C:\temp_nssm
    del nssm.zip
)

REM 서비스 설치
C:\nginx\nssm.exe install nginx C:\nginx\nginx.exe
C:\nginx\nssm.exe set nginx Start SERVICE_AUTO_START

echo.
echo [5/5] Nginx 시작...
net start nginx 2>nul
if %errorLevel% neq 0 (
    echo Nginx 서비스 시작 실패. 직접 실행 시도...
    start /B C:\nginx\nginx.exe
)

echo.
echo ================================================================
echo ✅ Nginx 설치 완료!
echo ================================================================
echo.
echo 설정된 프록시:
echo - http://localhost → Next.js (포트 4000)
echo - http://localhost/api → 백엔드 (포트 8000)
echo - http://localhost/images → 이미지 서버 (포트 8000)
echo.
echo 성능 최적화 적용됨:
echo ✅ Gzip 압축 활성화
echo ✅ 정적 파일 캐싱 (30일)
echo ✅ API 응답 캐싱 (5분)
echo ✅ 연결 재사용 (Keep-Alive)
echo ✅ 버퍼 최적화
echo.
echo Nginx 명령어:
echo - nginx -s reload : 설정 다시 로드
echo - nginx -s stop   : 중지
echo - nginx -t        : 설정 테스트
echo.
pause