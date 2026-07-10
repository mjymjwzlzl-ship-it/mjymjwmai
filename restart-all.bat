@echo off
echo 모든 Node 프로세스 종료 중...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul

echo 환경변수 설정 중...
set NODE_ENV=production
set NEXT_PUBLIC_BACKEND_URL=http://localhost:8000

echo 백엔드 서버 시작...
start "Backend" cmd /k "cd /d D:\ARATA\backend && npm start"

echo 프론트엔드 시작 (환경변수 포함)...
start "Frontend" cmd /k "cd /d D:\ARATA && set NODE_ENV=production&& set NEXT_PUBLIC_BACKEND_URL=http://localhost:8000&& npm start"

echo 완료!
pause