@echo off
cd /d D:\ARATA\nginx
echo Starting Nginx on port 8080...
start nginx.exe
echo Nginx started successfully!
echo Access URLs:
echo Main Site: http://arata.co.kr:8080
echo Creator:   http://creator.arata.co.kr:8080
echo Admin:     http://admin.arata.co.kr:8080
echo API:       http://api.arata.co.kr:8080
pause