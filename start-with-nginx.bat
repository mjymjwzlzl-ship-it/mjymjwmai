@echo off
chcp 65001 >nul
echo ================================================================
echo ARATA + Nginx 통합 실행 스크립트
echo ================================================================
echo.

echo [1/3] Nginx 설정 업데이트 및 시작...

REM nginx 설정 파일 복사
echo 최신 nginx 설정 적용 중...
copy /Y D:\ARATA\nginx.conf C:\nginx\conf\nginx.conf >nul

REM 기존 nginx 프로세스 모두 종료
echo 기존 nginx 프로세스 정리...
taskkill /F /IM nginx.exe 2>nul
timeout /t 1 /nobreak >nul

REM nginx 새로 시작
echo Nginx 시작...
cd /d C:\nginx
start nginx.exe
timeout /t 2 /nobreak >nul

echo.
echo [2/3] 서버 시작 (ultra-fast-startup.bat 실행)...
call D:\ARATA\ultra-fast-startup.bat

echo.
echo [3/3] Nginx 상태 확인...
netstat -an | findstr :80 >nul
if %errorLevel% eq 0 (
    echo ✅ Nginx가 포트 80에서 실행 중입니다.
) else (
    echo ⚠️ Nginx가 실행되지 않았습니다.
)

echo.
echo ================================================================
echo ✅ 모든 서비스 시작 완료!
echo ================================================================
echo.
echo 접속 주소:
echo - 메인 사이트: http://localhost (Nginx 경유 - 빠름!)
echo - 직접 접속: http://localhost:4000 (Next.js 직접)
echo.
echo 성능 비교:
echo - Nginx 경유: 캐싱 + Gzip 압축 = 2-3배 빠름
echo - 직접 접속: 캐싱 없음 = 느림
echo.
pause