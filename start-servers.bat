@echo off
echo ================================================================
echo ARATA 포트포워딩 환경 서버 시작
echo ================================================================

echo 환경변수 설정...
set NEXTAUTH_URL=http://59.6.135.217:19000
set NEXTAUTH_SECRET=arata-nextauth-secret-key-2024
set NEXT_PUBLIC_BACKEND_URL=http://59.6.135.217:18000
set NEXT_PUBLIC_API_URL=http://59.6.135.217:18000/api

echo.
echo [1/5] 백엔드 서버 시작 (포트 8000 -> 18000)...
cd ..\arata-backend
start "ARATA Backend Server" cmd /c "npm start"
cd ..\ARATA

echo.
echo [2/5] 백엔드 서버 연결 대기...
timeout /t 3
curl -s http://59.6.135.217:18000/health || echo 경고: 백엔드 서버가 아직 응답하지 않습니다!

echo.
echo [3/5] 메인 서버 시작 (포트 4000 -> 19000)...
start "ARATA Main Server" cmd /c "npm run dev"

echo.
echo [4/5] 작가 센터 시작 (포트 4001 -> 20000)...
cd creator-center
start "Creator Center" cmd /c "npm run dev"
cd ..

echo.
echo [5/5] 관리자 센터 시작 (포트 5000 -> 21000)...
cd admin-center
start "Admin Center" cmd /c "npm run dev"
cd ..

echo.
echo ================================================================
echo 모든 서버가 시작되었습니다!
echo ================================================================
echo.
echo 🌐 외부 접속 주소:
echo   - 메인 서버: http://59.6.135.217:19000
echo   - 작가 센터: http://59.6.135.217:20000
echo   - 관리자 센터: http://59.6.135.217:21000
echo.
echo 🔑 테스트 계정:
echo   - 작가 센터: test@creator.com / test123
echo   - 관리자 센터: carryer123 / Dlqudtkd1
echo.
echo ⚠️  중요사항:
echo   - 백엔드 API 서버 (포트 18000)가 실행 중이어야 합니다
echo   - 구글 OAuth는 현재 비활성화 상태입니다
echo   - 웹툰이 안 보이면 TROUBLESHOOTING_CHECKLIST.md 참고
echo.
echo 🔧 문제 해결:
echo   - 백엔드 헬스체크: http://59.6.135.217:18000/health
echo   - 프론트엔드 테스트: http://59.6.135.217:19000/api/test-backend
echo   - 상세 가이드: TROUBLESHOOTING_CHECKLIST.md
echo.
echo ================================================================
pause 