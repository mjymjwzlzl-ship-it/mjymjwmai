# 외부 접속 설정 가이드

포트포워딩을 통해 외부에서 ARATA 웹툰 플랫폼에 접속하려면 다음과 같이 설정하세요.

## 1. 환경 변수 수정

### 작가센터 (creator-center)
`D:\ARATA\creator-center\.env.local` 파일을 수정:

```env
# 로컬 접속용 (기본값)
NEXT_PUBLIC_API_URL=http://localhost:8000/api
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
NEXTAUTH_URL=http://localhost:4001

# 외부 접속용 (YOUR_EXTERNAL_IP를 실제 외부 IP로 변경)
NEXT_PUBLIC_API_URL=http://YOUR_EXTERNAL_IP:8000/api
NEXT_PUBLIC_BACKEND_URL=http://YOUR_EXTERNAL_IP:8000
NEXTAUTH_URL=http://YOUR_EXTERNAL_IP:4001
```

### 프론트엔드 앱
`D:\ARATA\.env.local` 파일을 수정:

```env
# 로컬 접속용 (기본값)
NEXT_PUBLIC_API_URL=http://localhost:8000/api
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
NEXTAUTH_URL=http://localhost:4000

# 외부 접속용 (YOUR_EXTERNAL_IP를 실제 외부 IP로 변경)
NEXT_PUBLIC_API_URL=http://YOUR_EXTERNAL_IP:8000/api
NEXT_PUBLIC_BACKEND_URL=http://YOUR_EXTERNAL_IP:8000
NEXTAUTH_URL=http://YOUR_EXTERNAL_IP:4000
```

## 2. 백엔드 CORS 설정 확인

`D:\arata-backend\server.js` 파일에서 CORS 설정이 올바른지 확인:

```javascript
app.use(cors({
  origin: [
    'http://localhost:4000',      // 프론트엔드 앱
    'http://localhost:4001',      // 작가센터
    'http://YOUR_EXTERNAL_IP:4000',  // 외부 프론트엔드
    'http://YOUR_EXTERNAL_IP:4001'   // 외부 작가센터
  ],
  credentials: true
}));
```

## 3. 포트포워딩 설정

라우터에서 다음 포트들을 포트포워딩 설정:

- **18000**: 백엔드 API 서버
- **19000**: 프론트엔드 앱 (독자용)
- **19001**: 작가센터 (작가용)

## 4. 실제 IP 주소 확인

### 공인 IP 확인
```bash
curl ifconfig.me
```

### 또는 웹사이트에서 확인
- https://whatismyipaddress.com/
- https://www.myip.com/

## 5. 설정 예시

현재 외부 IP `59.6.135.217`로 설정:

### 작가센터 .env.local
```env
NEXT_PUBLIC_API_URL=http://59.6.135.217:18000/api
NEXT_PUBLIC_BACKEND_URL=http://59.6.135.217:18000
NEXTAUTH_URL=http://59.6.135.217:19001
```

### 프론트엔드 .env.local
```env
NEXT_PUBLIC_API_URL=http://59.6.135.217:18000/api
NEXT_PUBLIC_BACKEND_URL=http://59.6.135.217:18000
NEXTAUTH_URL=http://59.6.135.217:19000
```

### 백엔드 CORS 설정
```javascript
origin: [
  'http://localhost:4000',
  'http://localhost:4001',
  'http://59.6.135.217:19000',   // 프론트엔드
  'http://59.6.135.217:19001'    // 작가센터
]
```

## 6. 재시작

설정 변경 후 모든 서비스를 재시작:

```bash
# 백엔드 재시작
cd D:\arata-backend
npm start

# 프론트엔드 재시작
cd D:\ARATA
npm run dev

# 작가센터 재시작
cd D:\ARATA\creator-center
npm run dev
```

## 7. 접속 URL

설정 완료 후 외부에서 접속:

- **독자용**: `http://59.6.135.217:19000`
- **작가센터**: `http://59.6.135.217:19001`

## 8. 구글 OAuth 설정

구글 로그인을 사용하려면 Google Cloud Console에서 OAuth 리디렉트 URI를 추가해야 합니다:

### Google Cloud Console 설정
1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. OAuth 2.0 클라이언트 ID 설정에서 다음 URI들을 추가:

**프론트엔드용:**
- `http://59.6.135.217:19000/api/auth/callback/google`

**작가센터용:**  
- `http://59.6.135.217:19001/api/auth/callback/google`

### 로컬 개발용 URI (개발 시 함께 유지)
- `http://localhost:4000/api/auth/callback/google`
- `http://localhost:4001/api/auth/callback/google`

## 주의사항

1. **보안**: 실제 운영 환경에서는 HTTPS를 사용하고 적절한 보안 설정을 적용하세요.
2. **방화벽**: 해당 포트들이 방화벽에서 허용되어 있는지 확인하세요.
3. **동적 IP**: 가정용 인터넷은 IP가 변경될 수 있으므로, 고정 IP 서비스를 사용하거나 DDNS를 설정하는 것을 권장합니다.

## 문제 해결

### 접속이 안 될 때
1. 포트포워딩 설정 확인
2. 방화벽 설정 확인
3. 환경 변수 설정 확인
4. CORS 설정 확인
5. 서비스 재시작

### 이미지가 안 보일 때
- `NEXT_PUBLIC_BACKEND_URL` 설정이 올바른지 확인
- 백엔드 서버가 정상 동작하는지 확인