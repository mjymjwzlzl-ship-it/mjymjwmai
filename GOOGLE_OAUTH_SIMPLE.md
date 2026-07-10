# 구글 OAuth 간단 설정법

## 🎯 가장 간단한 방법: 포트 변경

구글 OAuth는 `localhost`는 허용하므로, 로컬 포트로 접속하면 됩니다.

### 1. 현재 설정
- **프론트엔드**: `http://localhost:4000` (구글 로그인 가능)
- **작가센터**: `http://59.6.135.217:19001` (일반 로그인만)
- **백엔드**: `http://59.6.135.217:18000`

### 2. 포트포워딩 설정
라우터에서:
- **4000** → **19000** (프론트엔드)
- **18000** → **18000** (백엔드)  
- **19001** → **19001** (작가센터)

### 3. Google Cloud Console 설정
리디렉트 URI에 추가:
```
http://localhost:4000/api/auth/callback/google
```

### 4. 접속 방법
**로컬에서 개발 시:**
- `http://localhost:4000` (구글 로그인 가능)

**외부에서 접속 시:**
- 포트포워딩으로 `http://59.6.135.217:19000` → 내부 `localhost:4000`으로 연결
- 구글 로그인은 localhost로 리디렉트되어 정상 작동

## 🚀 더 깔끔한 방법: Ngrok (추천)

### 1. Ngrok 설치 및 실행
```bash
# 1. Ngrok 다운로드: https://ngrok.com/download
# 2. 실행
ngrok http 4000
```

### 2. 나오는 도메인 확인
```
Forwarding https://abc123.ngrok.io -> http://localhost:4000
```

### 3. .env.local 수정
```env
NEXTAUTH_URL=https://abc123.ngrok.io
```

### 4. Google OAuth 설정
```
https://abc123.ngrok.io/api/auth/callback/google
```

### 5. 접속
- **프론트엔드**: `https://abc123.ngrok.io` (구글 로그인 가능)
- **작가센터**: `http://59.6.135.217:19001` (일반 로그인)

## 현재 권장 설정

프론트엔드는 localhost:4000으로 실행하고, 포트포워딩으로 외부 접속을 허용하는 방식이 가장 간단합니다.

### 현재 .env.local 설정이 올바름:
```env
NEXT_PUBLIC_API_URL=http://59.6.135.217:18000/api
NEXT_PUBLIC_BACKEND_URL=http://59.6.135.217:18000
NEXTAUTH_URL=http://localhost:4000
```

### Google Cloud Console에 추가할 URI:
```
http://localhost:4000/api/auth/callback/google
```

이렇게 하면 외부에서 `http://59.6.135.217:19000`으로 접속해도 내부적으로는 localhost:4000으로 작동하여 구글 로그인이 정상 작동합니다.