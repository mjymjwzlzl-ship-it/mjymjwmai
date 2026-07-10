# 구글 OAuth 설정 가이드 (IP 주소 문제 해결)

구글 OAuth는 IP 주소를 허용하지 않고 퍼블릭 도메인만 지원합니다. 
작가센터는 구글 로그인이 필요 없으므로, 프론트엔드만 도메인으로 설정합니다.

## 방법 1: Ngrok 사용 (추천 - 가장 간단)

### 1. Ngrok 설치
1. [Ngrok 공식 사이트](https://ngrok.com/) 가입
2. Ngrok 다운로드 및 설치
3. 토큰 설정: `ngrok authtoken YOUR_TOKEN`

### 2. 프론트엔드 터널 생성
```bash
# 프론트엔드(19000 포트)를 외부 도메인으로 노출
ngrok http 19000
```

실행하면 다음과 같은 결과가 나옵니다:
```
Forwarding  https://abc123.ngrok.io -> http://localhost:19000
```

### 3. 환경 변수 수정

**프론트엔드 (.env.local):**
```env
# Ngrok 도메인 사용
NEXT_PUBLIC_API_URL=http://59.6.135.217:18000/api
NEXT_PUBLIC_BACKEND_URL=http://59.6.135.217:18000
NEXTAUTH_URL=https://abc123.ngrok.io  # Ngrok 도메인으로 변경
```

**작가센터는 그대로 유지:**
```env
# 작가센터는 IP 주소 그대로 (구글 로그인 없음)
NEXT_PUBLIC_API_URL=http://59.6.135.217:18000/api
NEXT_PUBLIC_BACKEND_URL=http://59.6.135.217:18000
NEXTAUTH_URL=http://59.6.135.217:19001
```

### 4. Google OAuth 설정
Google Cloud Console에서 리디렉트 URI 추가:
- `https://abc123.ngrok.io/api/auth/callback/google`

### 5. 접속 URL
- **독자용**: `https://abc123.ngrok.io` (구글 로그인 가능)
- **작가센터**: `http://59.6.135.217:19001` (일반 로그인만)

---

## 방법 2: 무료 DDNS 서비스 사용

### DuckDNS 사용
1. [DuckDNS](https://www.duckdns.org/) 가입
2. 도메인 생성 (예: `mywebtoon.duckdns.org`)
3. 현재 IP 주소로 업데이트

### No-IP 사용
1. [No-IP](https://www.noip.com/) 가입 (무료 플랜)
2. 호스트네임 생성 (예: `mywebtoon.ddns.net`)
3. Dynamic Update Client 설치

### 환경 변수 수정
```env
# 예: DuckDNS 사용
NEXTAUTH_URL=http://mywebtoon.duckdns.org:19000
```

### Google OAuth 설정
```
http://mywebtoon.duckdns.org:19000/api/auth/callback/google
```

---

## 방법 3: 일시적 해결책 (개발/테스트용)

### 로컬호스트 터널링 (개발자 도구)
```bash
# 다른 터널링 도구들
npx localtunnel --port 19000
# 또는
npx serveo 19000
```

---

## 추천 방법: Ngrok

**장점:**
- 설정이 가장 간단
- HTTPS 자동 제공
- 안정적인 서비스
- 무료로 사용 가능

**단점:**
- 무료 버전은 세션이 끊어지면 URL이 바뀜
- 유료 버전($5/월)으로 고정 도메인 사용 가능

## 설정 순서

1. **Ngrok 설치 및 실행**
   ```bash
   ngrok http 19000
   ```

2. **프론트엔드 환경 변수 수정**
   ```env
   NEXTAUTH_URL=https://YOUR_NGROK_DOMAIN.ngrok.io
   ```

3. **Google Cloud Console에서 리디렉트 URI 추가**
   ```
   https://YOUR_NGROK_DOMAIN.ngrok.io/api/auth/callback/google
   ```

4. **서비스 재시작**
   ```bash
   cd D:\ARATA
   npm run dev
   ```

5. **접속 테스트**
   - Ngrok 도메인으로 접속하여 구글 로그인 테스트

## 주의사항

- 작가센터는 IP 주소 그대로 사용 (구글 로그인 불필요)
- 프론트엔드만 도메인 사용 (구글 로그인 필요)
- Ngrok 무료 버전은 재시작 시 URL이 변경됨
- 실제 운영 시에는 도메인 구매 권장