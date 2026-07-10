@echo off
chcp 65001 >nul
echo =========================================
echo ARATA Windows 배포 스크립트
echo =========================================

echo [1/5] 최신 코드 가져오기...
git pull origin master
if errorlevel 1 (
    echo ❌ Git pull 실패
    pause
    exit /b 1
)
echo ✅ 코드 업데이트 완료

echo [2/5] 의존성 설치...
call npm install
cd backend
call npm install
cd ..
echo ✅ 의존성 설치 완료

echo [3/5] 데이터베이스 스키마 업데이트...
call npx prisma generate
call npx prisma db push
echo ✅ 스키마 업데이트 완료

echo [4/5] 프론트엔드 빌드...
call npm run build
cd creator-center
call npm run build
cd ..
cd admin-center
call npm run build
cd ..
echo ✅ 빌드 완료

echo [5/5] 서버 재시작...
call fast-build-and-run.bat --skip-build

echo =========================================
echo ✅ 배포 완료!
echo =========================================
pause