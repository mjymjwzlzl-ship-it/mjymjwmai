# AWS Lightsail 서버 마이그레이션 가이드

## 현재 상태
- 프로덕션: 로컬 컴퓨터 (느림) → AWS Lightsail로 마이그레이션 중
- 서버 IP: **54.180.251.98** (Seoul, ap-northeast-2)
- 이미지: Cloudflare R2 (이미 마이그레이션 완료 ✅)
- 데이터베이스: SQLite 29MB
- 예상 서버 용량: 6-7GB (AWS Lightsail $12 plan: 60GB SSD)

---

## 마이그레이션 진행 상황

- ✅ **1단계: AWS 계정 및 Lightsail 서버 생성** - 완료 (IP: 54.180.251.98)
- ✅ **2단계: SSH 접속 설정** - 완료 (키 위치: C:/Users/user/.ssh/LightsailDefaultKey-ap-northeast-2.pem)
- ✅ **3단계: 서버 초기 설정** - 완료
  - ✅ Node.js v20.19.6 + npm 10.8.2
  - ✅ PostgreSQL 14
  - ✅ Caddy 2.10.2
  - ✅ PM2 6.0.14
- ⏳ **4단계: 코드 배포** - 대기 중
- ⏳ **5단계: 데이터베이스 마이그레이션** - 대기 중
- ⏳ **6단계: 환경 변수 설정** - 대기 중
- ⏳ **7-12단계: 빌드 및 배포** - 대기 중

---

## 마이그레이션 범위 정리

### ✅ 서버로 옮겨야 할 것들:
1. **코드** (Git 저장소를 통해)
   - 메인 프로젝트 (Next.js)
   - backend/ (Express API 서버)
   - admin-center/ (Admin 대시보드)
   - rozy-chat/ (채팅 앱)
2. **데이터베이스**
   - backend/prisma/dev.db (29MB SQLite → PostgreSQL로 변환)
3. **환경 변수**
   - .env 파일들 (R2 credentials, JWT secrets 등)

### ❌ 서버로 옮길 필요 없는 것들:
- **character/ 폴더** - 이미지는 Cloudflare R2에 있음 ✅
- **backend/uploads/ 폴더** - 파일은 Cloudflare R2에 있음 ✅
- **node_modules/** - 서버에서 npm install로 재설치
- **.next/** 빌드 파일 - 서버에서 npm run build로 재생성
- **dev.db** 원본 - 마이그레이션 후 로컬에 백업으로 보관

---

## 1단계: AWS 계정 생성 및 Lightsail 서버 설정 ✅ 완료

### 1-1. AWS 계정 가입

1. https://aws.amazon.com/ko/ 접속
2. "AWS 계정 생성" 클릭
3. 이메일, 비밀번호 입력
4. 연락처 정보 입력 (한글 가능)
5. 결제 정보 입력 (신용카드/체크카드)
   - 💡 1달러 인증 결제가 진행됩니다 (나중에 환불됨)
6. 본인 인증 (전화 또는 SMS)
7. 지원 플랜: "기본 지원 - 무료" 선택

### 1-2. Lightsail 서버 생성

1. AWS Management Console 로그인
2. 검색창에 "Lightsail" 입력하고 선택
3. "인스턴스 생성" 클릭
4. 설정:

   **인스턴스 위치:**
   - ✅ **아시아 태평양 (서울) ap-northeast-2**

   **플랫폼 선택:**
   - ✅ Linux/Unix

   **블루프린트:**
   - ✅ OS 전용 → **Ubuntu 22.04 LTS**

   **인스턴스 플랜:**
   - ⭐ **$12/월 추천**: 2GB RAM, 1 vCPU, 60GB SSD, 3TB 전송
   - 또는 $5/월: 512MB RAM, 1 vCPU, 20GB SSD, 1TB 전송 (테스트용)

   **인스턴스 이름:**
   - `arata-production`

5. "인스턴스 생성" 클릭
6. 서버 생성 완료될 때까지 대기 (약 2-3분)

### 1-3. SSH 키 다운로드

1. Lightsail 콘솔에서 "계정" 메뉴 클릭
2. "SSH 키" 탭으로 이동
3. "ap-northeast-2" (서울 리전) 키 다운로드
4. 파일 이름: `LightsailDefaultKey-ap-northeast-2.pem`
5. 안전한 위치에 저장 (예: `C:\Users\user\.ssh\`)

---

## 2단계: SSH 접속 설정 ✅ 완료

### 2-1. Windows에서 SSH 키 권한 설정

**PowerShell에서:**

```powershell
# SSH 키를 저장한 디렉토리로 이동
cd C:\Users\user\.ssh\

# 키 파일 권한 확인 (이미 다운로드했다면)
# Windows에서는 별도 권한 설정 불필요
```

### 2-2. SSH로 서버 접속

**Git Bash 또는 PowerShell에서:**

```bash
# Lightsail 콘솔에서 "퍼블릭 IP" 복사 (예: 13.124.123.45)
ssh -i "C:\Users\user\.ssh\LightsailDefaultKey-ap-northeast-2.pem" ubuntu@YOUR_SERVER_IP

# 예시:
# ssh -i "C:\Users\user\.ssh\LightsailDefaultKey-ap-northeast-2.pem" ubuntu@13.124.123.45

# 처음 접속 시 fingerprint 확인 → yes 입력
```

**또는 Lightsail 콘솔에서 브라우저 SSH:**
1. Lightsail 인스턴스 클릭
2. "SSH를 사용하여 연결" 버튼 클릭
3. 브라우저에서 바로 터미널 사용 가능

---

## 3단계: 서버 초기 설정 ✅ 완료

**설치 완료 내역:**
- ✅ Node.js v20.19.6 + npm 10.8.2
- ✅ PostgreSQL 14
- ✅ Caddy 2.10.2
- ✅ PM2 6.0.14

### 3-1. 시스템 업데이트

```bash
# 패키지 목록 업데이트
sudo apt update && sudo apt upgrade -y

# 필수 패키지 설치
sudo apt install -y curl git build-essential
```

### 3-2. Node.js 설치 (v20 LTS)

```bash
# Node.js v20 설치
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt install -y nodejs

# 확인
node -v  # v20.x.x
npm -v   # 10.x.x
```

### 3-3. PostgreSQL 설치

```bash
# PostgreSQL 설치
sudo apt install -y postgresql postgresql-contrib

# PostgreSQL 시작
sudo systemctl start postgresql
sudo systemctl enable postgresql

# PostgreSQL 사용자 생성
sudo -u postgres psql -c "CREATE USER arata WITH PASSWORD 'your-secure-password-here';"
sudo -u postgres psql -c "CREATE DATABASE arata OWNER arata;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE arata TO arata;"

# PostgreSQL 15 추가 설정 (권한)
sudo -u postgres psql -d arata -c "GRANT ALL ON SCHEMA public TO arata;"
```

💡 **중요:** `your-secure-password-here`를 강력한 비밀번호로 변경하세요!

### 3-4. Caddy 설치 (Reverse Proxy)

```bash
# Caddy 설치
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install -y caddy

# Caddy 시작
sudo systemctl enable caddy
```

### 3-5. PM2 설치 (프로세스 관리)

```bash
sudo npm install -g pm2
```

---

## 4단계: 코드 배포 (30분)

### 4-1. Git 저장소 준비 (로컬에서)

**로컬 컴퓨터에서:**

```bash
cd /d/ARATA

# .gitignore 확인 (이미 있으면 스킵)
cat > .gitignore << 'EOF'
node_modules/
.next/
.env
.env.local
*.log
character/
backend/prisma/dev.db
backend/prisma/dev.db-journal
backend/data/
dist/
build/
EOF

# Git 초기화 (아직 안 했으면)
git init
git add .
git commit -m "Initial commit for AWS Lightsail deployment"

# GitHub에 Push
# GitHub에서 새 Repository 만들기: ARATA (Private 추천)
git remote add origin https://github.com/YOUR_USERNAME/ARATA.git
git branch -M main
git push -u origin main
```

### 4-2. 서버에 코드 다운로드

**AWS Lightsail 서버에서:**

```bash
# 프로젝트 디렉토리로 이동
cd /opt
sudo mkdir -p /opt/ARATA
sudo chown ubuntu:ubuntu /opt/ARATA

# Git clone
git clone https://github.com/YOUR_USERNAME/ARATA.git
cd ARATA

# 의존성 설치 (메인 프로젝트)
npm install

# Backend 의존성 설치
cd backend
npm install
cd ..

# Admin Center 의존성 설치
cd admin-center
npm install
cd ..

# Rozy Chat 의존성 설치 (있으면)
cd rozy-chat
npm install
cd ..
```

---

## 5단계: 데이터베이스 마이그레이션 (20분)

### 5-1. 로컬에서 데이터 백업

**로컬 컴퓨터에서:**

```bash
cd /d/ARATA/backend

# SQLite 데이터베이스 백업 (이미 있음)
# dev.db.backup (29MB)

# Prisma schema 확인
cat prisma/schema.prisma
```

### 5-2. Prisma schema 수정 (PostgreSQL용)

**로컬에서 `backend/prisma/schema.prisma` 파일 수정:**

```prisma
datasource db {
  provider = "postgresql"  // "sqlite"에서 변경
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

// 모델은 그대로 유지
```

### 5-3. PostgreSQL용 마이그레이션 생성

**로컬에서:**

```bash
cd /d/ARATA/backend

# .env 파일 수정 (임시)
echo 'DATABASE_URL="postgresql://arata:your-secure-password@localhost:5432/arata"' > .env.temp

# Migration 생성
npx prisma migrate dev --name init_postgresql

# 생성된 migration 파일들을 Git에 커밋
git add prisma/migrations/
git commit -m "Add PostgreSQL migration"
git push origin main
```

### 5-4. 서버에서 마이그레이션 적용

**AWS Lightsail 서버에서:**

```bash
cd /opt/ARATA
git pull origin main

cd backend

# .env 파일 생성
cat > .env << 'EOF'
DATABASE_URL="postgresql://arata:your-secure-password@localhost:5432/arata"
PORT=8000
JWT_SECRET=your-jwt-secret-change-this
NODE_ENV=production

# Cloudflare R2 설정
CLOUDFLARE_R2_ACCESS_KEY_ID=your_r2_access_key
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your_r2_secret_key
CLOUDFLARE_R2_BUCKET_NAME=your_bucket_name
CLOUDFLARE_R2_ENDPOINT=https://your_account_id.r2.cloudflarestorage.com
CLOUDFLARE_R2_PUBLIC_URL=https://your_public_url.r2.dev
EOF

# Prisma 마이그레이션 적용
npx prisma migrate deploy

# Prisma Client 생성
npx prisma generate
```

### 5-5. 데이터 임포트 (선택사항)

로컬 SQLite 데이터를 PostgreSQL로 옮기려면:

**방법 1: Prisma Studio 사용 (간단하지만 수동)**

**방법 2: pgloader 사용 (자동, 추천)**

```bash
# 로컬에서 SQLite DB를 서버로 복사
scp -i "C:\Users\user\.ssh\LightsailDefaultKey-ap-northeast-2.pem" /d/ARATA/backend/prisma/dev.db ubuntu@YOUR_SERVER_IP:/tmp/

# 서버에서 pgloader 설치
sudo apt install -y pgloader

# SQLite → PostgreSQL 마이그레이션
pgloader /tmp/dev.db postgresql://arata:your-secure-password@localhost/arata
```

---

## 6단계: 환경 변수 설정 (10분)

### 6-1. 메인 프로젝트 .env

**서버에서:**

```bash
cd /opt/ARATA

cat > .env << 'EOF'
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://yourdomain.com/api

# Cloudflare R2
CLOUDFLARE_R2_ACCESS_KEY_ID=your_r2_access_key
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your_r2_secret_key
CLOUDFLARE_R2_BUCKET_NAME=your_bucket_name
CLOUDFLARE_R2_ENDPOINT=https://your_account_id.r2.cloudflarestorage.com
CLOUDFLARE_R2_PUBLIC_URL=https://your_public_url.r2.dev
EOF
```

### 6-2. Admin Center .env

```bash
cd /opt/ARATA/admin-center

cat > .env << 'EOF'
NEXT_PUBLIC_API_URL=https://yourdomain.com/api
NODE_ENV=production
EOF
```

💡 **중요:** `yourdomain.com`을 실제 도메인으로 변경하세요!

---

## 7단계: 빌드 및 실행 (20분)

### 7-1. Next.js 빌드

```bash
cd /opt/ARATA

# 메인 프로젝트 빌드
npm run build

# Admin Center 빌드
cd admin-center
npm run build
cd ..
```

### 7-2. PM2로 서비스 실행

```bash
cd /opt/ARATA

# Backend 실행
pm2 start backend/server.js --name "arata-backend"

# Next.js 실행 (메인)
pm2 start npm --name "arata-frontend" -- start

# Admin Center 실행
cd admin-center
pm2 start npm --name "arata-admin" -- start -- -p 5000
cd ..

# PM2 상태 확인
pm2 status

# PM2 자동 시작 설정
pm2 startup
# 👆 출력되는 명령어를 복사해서 실행하세요

pm2 save
```

---

## 8단계: Lightsail 방화벽 설정 (5분)

### 8-1. Lightsail 네트워킹 탭에서 포트 열기

1. Lightsail 콘솔 → 인스턴스 선택
2. "네트워킹" 탭 클릭
3. "방화벽" 섹션에서 "규칙 추가" 클릭
4. 다음 포트 추가:

   | 애플리케이션 | 프로토콜 | 포트 범위 |
   |------------|---------|---------|
   | HTTP | TCP | 80 |
   | HTTPS | TCP | 443 |
   | SSH | TCP | 22 (이미 있음) |

5. "생성" 클릭

---

## 9단계: Caddy 설정 (10분)

### 9-1. Caddy 설정 파일 생성

**서버에서:**

```bash
sudo nano /etc/caddy/Caddyfile
```

**내용:**

```caddy
yourdomain.com {
    # 메인 사이트 (Next.js)
    reverse_proxy localhost:3000

    # API 요청 → Backend
    handle /api/* {
        reverse_proxy localhost:8000
    }

    # Admin Center
    handle /admin/* {
        reverse_proxy localhost:5000
    }

    # 로그
    log {
        output file /var/log/caddy/access.log
        format json
    }

    # 자동 HTTPS (Let's Encrypt)
    tls {
        protocols tls1.2 tls1.3
    }
}
```

💡 **중요:** `yourdomain.com`을 실제 도메인으로 변경하세요!

### 9-2. Caddy 재시작

```bash
# 설정 파일 문법 확인
sudo caddy validate --config /etc/caddy/Caddyfile

# Caddy 재시작
sudo systemctl reload caddy

# 상태 확인
sudo systemctl status caddy
```

---

## 10단계: Cloudflare DNS 설정 (5분)

### 10-1. DNS A 레코드 추가

1. Cloudflare Dashboard 접속
2. 도메인 선택
3. DNS 탭으로 이동
4. A 레코드 추가/수정:

   | Type | Name | Content (IP) | Proxy | TTL |
   |------|------|--------------|-------|-----|
   | A | @ | YOUR_LIGHTSAIL_IP | ❌ DNS only | Auto |
   | A | www | YOUR_LIGHTSAIL_IP | ❌ DNS only | Auto |

   ⚠️ **중요:** Proxy를 **DNS only (회색 구름)**로 설정하세요!
   - Caddy가 Let's Encrypt로 자동 HTTPS를 설정하려면 Cloudflare Proxy를 꺼야 합니다.
   - HTTPS 설정 후 다시 Proxy를 켜도 됩니다.

5. 저장

---

## 11단계: HTTPS 확인 및 테스트 (10분)

### 11-1. DNS 전파 대기

```bash
# DNS 전파 확인 (로컬에서)
nslookup yourdomain.com

# 또는
ping yourdomain.com
```

DNS 전파는 5분~1시간 정도 걸릴 수 있습니다.

### 11-2. HTTPS 자동 설정 확인

**서버에서:**

```bash
# Caddy 로그 확인
sudo journalctl -u caddy -f

# Let's Encrypt 인증서 발급 로그 확인
# "certificate obtained successfully" 메시지가 나오면 성공
```

### 11-3. 웹사이트 접속 테스트

```bash
# 로컬에서 테스트
curl https://yourdomain.com
curl https://yourdomain.com/api/health

# 브라우저에서 접속
# https://yourdomain.com
```

---

## 12단계: 모니터링 및 유지보수

### 12-1. PM2 모니터링

```bash
# 실시간 모니터링
pm2 monit

# 로그 확인
pm2 logs

# 특정 앱 로그
pm2 logs arata-backend

# 프로세스 재시작
pm2 restart all
```

### 12-2. 서버 리소스 확인

```bash
# 디스크 용량
df -h

# 메모리 사용량
free -h

# CPU 사용량
top

# 프로젝트 크기
du -sh /opt/ARATA
```

### 12-3. 로그 확인

```bash
# Caddy 로그
sudo tail -f /var/log/caddy/access.log

# PostgreSQL 로그
sudo tail -f /var/log/postgresql/postgresql-14-main.log

# PM2 로그
pm2 logs --lines 100
```

---

## 예상 비용

- **AWS Lightsail $12/월 플랜**: $12/월 (₩16,000/월)
  - 2GB RAM, 1 vCPU, 60GB SSD, 3TB 전송
- **Cloudflare R2**: 무료 (10GB 이하)
- **Cloudflare CDN**: 무료
- **도메인**: 기존 사용 중

**총 비용**: $12/월 (₩16,000/월)

---

## 문제 해결

### Character 폴더 용량 문제
현재 로컬에 character 폴더가 있으면 **서버에 올리지 마세요**.
R2만 사용하도록 코드가 이미 설정되어 있습니다.

### 메모리 부족 시 (512MB 플랜 사용 시)

```bash
# Swap 파일 생성 (1GB)
sudo fallocate -l 1G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### Let's Encrypt 인증서 발급 실패

1. Cloudflare Proxy가 꺼져 있는지 확인 (DNS only)
2. 방화벽에서 80, 443 포트가 열려 있는지 확인
3. DNS A 레코드가 올바른 IP를 가리키는지 확인

```bash
# Caddy 에러 로그 확인
sudo journalctl -u caddy -n 50
```

### PM2 프로세스 재시작

```bash
# 모든 프로세스 재시작
pm2 restart all

# 특정 프로세스만 재시작
pm2 restart arata-backend
pm2 restart arata-frontend
pm2 restart arata-admin
```

---

## 배포 후 업데이트 방법

### 코드 업데이트

```bash
# 서버에서
cd /opt/ARATA
git pull origin main

# 의존성 재설치 (필요시)
npm install

# 빌드
npm run build

# PM2 재시작
pm2 restart all
```

---

## 완료!

이제 AWS Lightsail 서버에서 프로덕션이 돌아갑니다!

### 장점:
1. ✅ 서울 리전으로 **초고속** (5-10ms 지연)
2. ✅ 24/7 안정적인 서비스
3. ✅ 컴퓨터 꺼도 서비스 계속 운영됨
4. ✅ AWS 생태계 연동 쉬움
5. ✅ 무료 체험 (750시간)

### 다음 단계:
- 🔒 SSL 인증서 자동 갱신 확인 (Caddy가 자동으로 처리)
- 📊 모니터링 도구 추가 (옵션)
- 🔄 자동 배포 파이프라인 구축 (옵션)
- 💾 자동 백업 설정 (옵션)
