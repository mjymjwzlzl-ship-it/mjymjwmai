@echo off
echo PM2 테스트 시작...
echo.

echo 단계 1: PM2 버전 확인
pm2 --version

echo.
echo 단계 2: PM2 상태 확인
pm2 status

echo.
echo 단계 3: 기존 프로세스 삭제
call pm2 delete all

echo.
echo 단계 4: 간단한 앱 시작
cd /d D:\ARATA
call pm2 start ecosystem.config.js

echo.
echo 완료!
pm2 status
pause