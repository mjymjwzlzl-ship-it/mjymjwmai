#!/bin/bash
# ARATA 프로덕션 배포 스크립트
# 프로덕션 서버에서 실행하세요

echo "========================================="
echo "ARATA 프로덕션 배포 시작"
echo "========================================="

# 1. 프로젝트 디렉토리로 이동
cd /home/arata/arata-platform || cd /var/www/arata || cd ~/arata || { echo "프로젝트 디렉토리를 찾을 수 없습니다"; exit 1; }

echo "[1/6] 현재 디렉토리: $(pwd)"

# 2. Git 최신 코드 가져오기
echo "[2/6] 최신 코드 가져오는 중..."
git fetch origin
git reset --hard origin/master
echo "✅ 코드 업데이트 완료"

# 3. 의존성 설치
echo "[3/6] 의존성 설치 중..."
npm install
cd backend && npm install && cd ..
echo "✅ 의존성 설치 완료"

# 4. Prisma 스키마 업데이트
echo "[4/6] 데이터베이스 스키마 업데이트 중..."
npx prisma generate
npx prisma db push --accept-data-loss
echo "✅ 스키마 업데이트 완료"

# 5. 프론트엔드 빌드
echo "[5/6] 프론트엔드 빌드 중..."
npm run build
echo "✅ 프론트엔드 빌드 완료"

# 6. 서비스 재시작
echo "[6/6] 서비스 재시작 중..."

# PM2 사용하는 경우
if command -v pm2 &> /dev/null; then
    pm2 restart all
    pm2 save
    echo "✅ PM2 서비스 재시작 완료"
# systemd 사용하는 경우
elif command -v systemctl &> /dev/null; then
    sudo systemctl restart arata-backend
    sudo systemctl restart arata-frontend
    echo "✅ systemd 서비스 재시작 완료"
# Docker 사용하는 경우
elif command -v docker &> /dev/null; then
    docker-compose restart
    echo "✅ Docker 서비스 재시작 완료"
else
    echo "⚠️  서비스 관리자를 찾을 수 없습니다. 수동으로 재시작하세요."
fi

# 7. 헬스체크
echo ""
echo "========================================="
echo "배포 완료! 헬스체크 중..."
echo "========================================="

sleep 5

# 백엔드 헬스체크
if curl -f http://localhost:8000/api/health > /dev/null 2>&1; then
    echo "✅ 백엔드 서버 정상 작동"
else
    echo "❌ 백엔드 서버 응답 없음"
fi

# 프론트엔드 헬스체크
if curl -f http://localhost:4000 > /dev/null 2>&1; then
    echo "✅ 프론트엔드 서버 정상 작동"
else
    echo "❌ 프론트엔드 서버 응답 없음"
fi

echo ""
echo "========================================="
echo "배포 프로세스 완료!"
echo "https://arata.co.kr 에서 확인하세요"
echo "========================================="