@echo off
echo Starting ARATA Platform...

echo 1. Starting Backend Server...
start cmd /k "cd /d D:\ARATA\backend && npm start"
timeout /t 5 /nobreak

echo 2. Starting Main Frontend (Development Mode)...
start cmd /k "cd /d D:\ARATA && npm run dev"
timeout /t 5 /nobreak

echo 3. Starting Creator Center (Development Mode)...
start cmd /k "cd /d D:\ARATA\creator-center && npm run dev"
timeout /t 5 /nobreak

echo 4. Starting Admin Center (Development Mode)...
start cmd /k "cd /d D:\ARATA\admin-center && npm run dev"
timeout /t 5 /nobreak

echo 5. Starting Cloudflare Tunnel...
start cmd /k "D:\ARATA\cloudflared.exe tunnel --config D:\ARATA\tunnel-config.yml run arata-main"

echo.
echo ================================
echo ARATA Platform Started!
echo ================================
echo Main Site: http://arata.co.kr
echo Creator:   http://creator.arata.co.kr
echo Admin:     http://admin.arata.co.kr
echo API:       http://api.arata.co.kr
echo ================================
echo.

pause