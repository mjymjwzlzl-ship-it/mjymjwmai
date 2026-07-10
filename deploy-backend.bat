@echo off
echo ================================================================
echo 백엔드 서버 배포 스크립트
echo ================================================================
echo.
echo 이 스크립트를 실제 서버에서 실행하세요!
echo.
echo [1/3] 백엔드 코드 복사...
echo - backend 폴더를 서버로 복사
echo - npm install 실행
echo.
echo [2/3] PM2로 백엔드 실행...
echo pm2 start backend/server.js --name arata-backend
echo.
echo [3/3] Nginx 설정...
echo.
echo /etc/nginx/sites-available/arata.co.kr 파일에 추가:
echo.
echo location /frontend {
echo     proxy_pass http://localhost:8000/frontend;
echo     proxy_http_version 1.1;
echo     proxy_set_header Host $host;
echo     proxy_set_header X-Real-IP $remote_addr;
echo }
echo.
echo location /api {
echo     proxy_pass http://localhost:8000/api;
echo     proxy_http_version 1.1;
echo     proxy_set_header Host $host;
echo     proxy_set_header X-Real-IP $remote_addr;
echo }
echo.
echo nginx -s reload
echo.
echo ================================================================
pause