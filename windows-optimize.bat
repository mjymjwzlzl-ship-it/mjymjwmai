@echo off
chcp 65001 >nul
echo ================================================================
echo ARATA Windows 성능 최적화 스크립트
echo ================================================================
echo.

echo [1/5] Windows 프로세스 우선순위 설정...
echo.

REM Node.js 프로세스 우선순위를 높음으로 설정
wmic process where "name='node.exe'" CALL setpriority "high priority" 2>nul

echo [2/5] Windows 네트워크 최적화...
REM TCP 최적화
netsh int tcp set global autotuninglevel=normal 2>nul
netsh int tcp set global chimney=enabled 2>nul
netsh int tcp set global rss=enabled 2>nul

echo [3/5] Node.js 메모리 최적화...
REM Node.js 메모리 제한 설정
set NODE_OPTIONS=--max-old-space-size=4096

echo [4/5] Windows 디스크 캐시 최적화...
REM 시스템 파일 캐시 크기 증가
fsutil behavior set memoryusage 2 2>nul

echo [5/5] 프로세스 병렬 실행 설정...
REM CPU 코어 수 확인
for /f "tokens=2 delims==" %%a in ('wmic cpu get NumberOfCores /value ^| findstr "="') do set CORES=%%a
echo CPU 코어 수: %CORES%개

echo.
echo ================================================================
echo 최적화 완료! 이제 서버를 시작합니다...
echo ================================================================
echo.

REM fast-startup.bat 실행
call D:\ARATA\fast-startup.bat %1

pause