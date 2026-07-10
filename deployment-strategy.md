# ARATA 플랫폼 배포 전략

## 📋 목차
1. [환경 구성](#환경-구성)
2. [브랜치 전략](#브랜치-전략)
3. [배포 프로세스](#배포-프로세스)
4. [CI/CD 파이프라인](#cicd-파이프라인)
5. [무중단 배포](#무중단-배포)
6. [롤백 전략](#롤백-전략)
7. [모니터링](#모니터링)

---

## 🌍 환경 구성

### 환경별 서버 분리
```
Development (개발)    → localhost:3000, localhost:5000, localhost:4000
Staging (스테이징)    → staging.arata.co.kr
Production (운영)    → arata.co.kr
```

### 환경변수 관리
```bash
# 개발 환경
.env.development
DATABASE_URL=file:./dev.db
API_URL=http://localhost:8000
NEXT_PUBLIC_API_URL=http://localhost:8000/api

# 스테이징 환경
.env.staging
DATABASE_URL=postgresql://staging_db_url
API_URL=https://staging-api.arata.co.kr
NEXT_PUBLIC_API_URL=https://staging-api.arata.co.kr/api

# 운영 환경
.env.production
DATABASE_URL=postgresql://production_db_url
API_URL=https://api.arata.co.kr
NEXT_PUBLIC_API_URL=https://api.arata.co.kr/api
```

---

## 🌿 브랜치 전략 (Git Flow)

```
main (운영)
├── staging (스테이징)
    ├── develop (개발)
        ├── feature/adult-verification
        ├── feature/payment-system
        └── hotfix/critical-bug
```

### 브랜치 역할
- **main**: 운영 환경 배포용 (안정된 코드만)
- **staging**: 스테이징 환경 배포용 (운영 전 테스트)
- **develop**: 개발 환경 (현재 작업 중인 코드)
- **feature/***: 새 기능 개발
- **hotfix/***: 긴급 버그 수정

---

## 🚀 배포 프로세스

### 1. 개발 → 스테이징 배포
```bash
# 1. develop 브랜치에서 작업 완료
git checkout develop
git add .
git commit -m "feat: 새 기능 개발 완료"

# 2. staging 브랜치로 병합
git checkout staging
git merge develop

# 3. 스테이징 환경에 배포 (자동)
git push origin staging
```

### 2. 스테이징 → 운영 배포
```bash
# 1. 스테이징 환경 테스트 완료 후
git checkout main
git merge staging

# 2. 운영 환경에 배포 (자동)
git push origin main
```

### 3. 배포 주기
- **정기 배포**: 매주 화요일/목요일 오후 2시
- **핫픽스**: 심각한 버그 발견시 즉시
- **메이저 업데이트**: 월 1회 계획된 배포

---

## ⚙️ CI/CD 파이프라인

### GitHub Actions 워크플로우
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
      - name: Setup Node.js
      - name: Install dependencies
      - name: Run tests
      - name: Build applications
      - name: Deploy to server
      - name: Health check
```

### 배포 파이프라인 단계
1. **코드 체크아웃**
2. **의존성 설치** (`npm install`)
3. **테스트 실행** (`npm test`)
4. **타입 체크** (`npm run typecheck`)
5. **린트 체크** (`npm run lint`)
6. **빌드** (`npm run build`)
7. **서버 배포**
8. **헬스 체크**

---

## 🔄 무중단 배포 (Blue-Green Deployment)

### 배포 방식
```
Blue (현재 운영중)  ←→  Green (새 버전 대기)
```

### 배포 과정
1. **Green 환경**에 새 버전 배포
2. **헬스 체크** 및 **기능 테스트**
3. **로드밸런서**를 Green으로 전환
4. Blue 환경은 롤백용으로 대기

### 장점
- ✅ 서비스 중단 없음
- ✅ 즉시 롤백 가능
- ✅ 안전한 배포

---

## 🔙 롤백 전략

### 즉시 롤백이 필요한 경우
- 🚨 서비스 장애 발생
- 🚨 심각한 버그 발견
- 🚨 성능 저하

### 롤백 방법
```bash
# 1. 이전 버전으로 즉시 전환
kubectl rollout undo deployment/arata-main

# 2. 또는 Git을 통한 롤백
git revert HEAD
git push origin main
```

### 롤백 후 조치
1. **장애 원인 분석**
2. **핫픽스 개발**
3. **재배포 준비**

---

## 📊 모니터링

### 배포 후 확인사항
- ✅ 서비스 응답 시간
- ✅ 에러율
- ✅ 트래픽 패턴
- ✅ 데이터베이스 연결
- ✅ 핵심 기능 동작

### 모니터링 도구
- **Uptime 체크**: Cloudflare
- **에러 추적**: Sentry
- **성능 모니터링**: New Relic
- **로그 관리**: ELK Stack

---

## 🛠️ 현재 ARATA에 필요한 작업

### 1. Docker 컨테이너화
```dockerfile
# Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### 2. 환경별 설정 파일 생성
- `.env.development`
- `.env.staging` 
- `.env.production`

### 3. GitHub Actions 설정
- 자동 테스트 실행
- 자동 빌드 및 배포
- Slack 알림 연동

### 4. 헬스 체크 엔드포인트 추가
```typescript
// app/api/health/route.ts
export async function GET() {
  return Response.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString() 
  });
}
```

---

## 📅 배포 체크리스트

### 배포 전
- [ ] 코드 리뷰 완료
- [ ] 모든 테스트 통과
- [ ] 스테이징 환경 테스트 완료
- [ ] 데이터베이스 마이그레이션 준비
- [ ] 롤백 계획 수립

### 배포 중
- [ ] 서비스 상태 모니터링
- [ ] 에러율 체크
- [ ] 응답 시간 확인
- [ ] 핵심 기능 테스트

### 배포 후
- [ ] 서비스 정상 동작 확인
- [ ] 사용자 피드백 모니터링
- [ ] 성능 지표 확인
- [ ] 24시간 안정성 관찰

---

## 🎯 다음 단계

1. **환경 분리 설정** (우선순위: 높음)
2. **Docker 컨테이너화** (우선순위: 높음)
3. **CI/CD 파이프라인 구축** (우선순위: 중간)
4. **모니터링 시스템 도입** (우선순위: 중간)

---

> **현재는 개발 단계이므로 실시간 수정이 가능하지만, 실제 운영 시에는 위의 전략에 따라 안정적이고 체계적인 배포를 진행해야 합니다.**