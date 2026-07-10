@echo off
echo Starting Cloudflare Tunnels...
echo.

echo Starting Backend Tunnel (port 8000)...
start "Backend Tunnel" cmd /k "cloudflared.exe tunnel --url http://localhost:8000"
timeout /t 3

echo Starting Frontend Tunnel (port 4000)...
start "Frontend Tunnel" cmd /k "cloudflared.exe tunnel --url http://localhost:4000"
timeout /t 3

echo Starting Creator Center Tunnel (port 4001)...
start "Creator Tunnel" cmd /k "cloudflared.exe tunnel --url http://localhost:4001"
timeout /t 3

echo Starting Admin Center Tunnel (port 5000)...
start "Admin Tunnel" cmd /k "cloudflared.exe tunnel --url http://localhost:5000"

echo.
echo All tunnels started!
echo Check each window for the generated URLs.
echo.
echo IMPORTANT: Update your .env.local files with the generated URLs!
echo.
pause