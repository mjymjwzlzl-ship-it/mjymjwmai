@echo off
chcp 65001 >nul
echo ================================================================
echo Nginx 간편 설치 (관리자 권한 불필요)
echo ================================================================
echo.

cd /d D:\ARATA

echo [1/4] Nginx 다운로드 중...
if not exist "nginx" (
    powershell -Command "Invoke-WebRequest -Uri 'https://nginx.org/download/nginx-1.24.0.zip' -OutFile 'nginx.zip'"
    powershell -Command "Expand-Archive -Path 'nginx.zip' -DestinationPath '.' -Force"
    ren nginx-1.24.0 nginx
    del nginx.zip
)

echo.
echo [2/4] 디렉토리 생성...
mkdir nginx\cache 2>nul
mkdir nginx\logs 2>nul
mkdir nginx\temp 2>nul

echo.
echo [3/4] 설정 파일 복사...
copy /Y "nginx.conf" "nginx\conf\nginx.conf"

echo.
echo [4/4] Nginx 시작...
cd nginx
start nginx.exe

timeout /t 2 /nobreak >nul

echo.
echo ================================================================
echo ✅ Nginx 설치 및 시작 완료!
echo ================================================================
echo.
echo 접속 주소: http://localhost
echo.
echo Nginx 명령어:
echo - D:\ARATA\nginx\nginx.exe -s reload : 설정 다시 로드
echo - D:\ARATA\nginx\nginx.exe -s stop   : 중지
echo - D:\ARATA\nginx\nginx.exe -t        : 설정 테스트
echo.
pause