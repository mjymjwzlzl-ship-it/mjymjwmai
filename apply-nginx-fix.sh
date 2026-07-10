#!/bin/bash
# 프로덕션 서버에서 실행할 스크립트

echo "==================================="
echo "ARATA Nginx 설정 긴급 수정"
echo "==================================="
echo ""

# 백업 생성
echo "[1/4] 기존 설정 백업..."
sudo cp /etc/nginx/sites-available/arata.co.kr /etc/nginx/sites-available/arata.co.kr.backup.$(date +%Y%m%d_%H%M%S)

echo "[2/4] 새 설정 적용..."
# nginx-production-fix.conf 내용을 서버에 복사 후
sudo cp nginx-production-fix.conf /etc/nginx/sites-available/arata.co.kr

echo "[3/4] Nginx 설정 테스트..."
sudo nginx -t

if [ $? -eq 0 ]; then
    echo "[4/4] Nginx 재시작..."
    sudo systemctl reload nginx
    echo ""
    echo "✅ Nginx 설정이 성공적으로 적용되었습니다!"
    echo ""
    echo "테스트 URL:"
    echo "- https://arata.co.kr/api/frontend/comics"
    echo "- https://arata.co.kr/api/frontend/categories/list"
    echo ""
else
    echo "❌ Nginx 설정에 오류가 있습니다!"
    echo "백업 복원: sudo cp /etc/nginx/sites-available/arata.co.kr.backup.* /etc/nginx/sites-available/arata.co.kr"
    exit 1
fi

echo "==================================="
echo "백엔드 서버 상태 확인"
echo "==================================="
echo ""
echo "백엔드 서버가 실행 중인지 확인..."
curl -s http://localhost:8000/api/health || echo "⚠️ 백엔드가 응답하지 않습니다. 백엔드 서버를 시작하세요!"

echo ""
echo "==================================="
echo "완료!"
echo "===================================" 