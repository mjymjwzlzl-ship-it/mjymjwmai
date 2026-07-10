# Cloudflare Tunnel 설정 가이드

## 1. Cloudflare 계정 설정
1. https://dash.cloudflare.com 에서 계정 생성
2. 이메일 인증 완료

## 2. cloudflared 설치

### Windows (권장 방법들):

#### 방법 1: winget 사용
```powershell
winget install --id Cloudflare.cloudflared
```

#### 방법 2: 직접 다운로드
1. https://github.com/cloudflare/cloudflared/releases 접속
2. `cloudflared-windows-amd64.exe` 다운로드
3. 파일명을 `cloudflared.exe`로 변경
4. PATH에 추가하거나 원하는 위치에 저장

## 3. 빠른 터널 실행 (도메인 없이)

### 프론트엔드 (포트 19000)
```powershell
# PowerShell에서 실행
cloudflared tunnel --url http://localhost:19000
```

### 백엔드 (포트 18000)
```powershell
# 새 PowerShell 창에서 실행
cloudflared tunnel --url http://localhost:18000
```

### 작가센터 (포트 19001)
```powershell
# 새 PowerShell 창에서 실행
cloudflared tunnel --url http://localhost:19001
```

### 관리자센터 (포트 19002)
```powershell
# 새 PowerShell 창에서 실행
cloudflared tunnel --url http://localhost:19002
```

각 명령을 실행하면 다음과 같은 URL이 생성됩니다:
- `https://[random-subdomain].trycloudflare.com`

## 4. 환경변수 업데이트

생성된 URL로 각 `.env.local` 파일을 업데이트해야 합니다:

### D:\ARATA\.env.local
```env
NEXTAUTH_URL="https://[frontend-subdomain].trycloudflare.com"
NEXT_PUBLIC_BACKEND_URL="https://[backend-subdomain].trycloudflare.com"
NEXT_PUBLIC_API_URL="https://[backend-subdomain].trycloudflare.com/api"
```

### D:\ARATA\creator-center\.env.local
```env
NEXTAUTH_URL="https://[creator-subdomain].trycloudflare.com"
NEXT_PUBLIC_BACKEND_URL="https://[backend-subdomain].trycloudflare.com"
NEXT_PUBLIC_API_URL="https://[backend-subdomain].trycloudflare.com/api"
```

### D:\ARATA\admin-center\.env.local
```env
NEXT_PUBLIC_BACKEND_URL="https://[backend-subdomain].trycloudflare.com"
NEXT_PUBLIC_API_URL="https://[backend-subdomain].trycloudflare.com/api"
```

## 5. 구글 OAuth 설정

구글 개발자 콘솔에서 다음 리다이렉트 URI 추가:
- `https://[frontend-subdomain].trycloudflare.com/api/auth/callback/google`
- `https://[creator-subdomain].trycloudflare.com/api/auth/callback/google`

## 6. CORS 업데이트

백엔드 `server.js`의 CORS 설정에 Cloudflare URL 추가:
```javascript
origin: [
  'http://localhost:4000',
  'http://localhost:4001',
  'http://localhost:5000',
  'https://[frontend-subdomain].trycloudflare.com',
  'https://[creator-subdomain].trycloudflare.com',
  'https://[admin-subdomain].trycloudflare.com'
]
```

## 7. 배치 파일로 자동화 (선택사항)

`start-tunnels.bat` 파일 생성:
```batch
@echo off
echo Starting Cloudflare Tunnels...

start "Backend Tunnel" cmd /k "cloudflared tunnel --url http://localhost:18000"
timeout /t 2

start "Frontend Tunnel" cmd /k "cloudflared tunnel --url http://localhost:19000"
timeout /t 2

start "Creator Tunnel" cmd /k "cloudflared tunnel --url http://localhost:19001"
timeout /t 2

start "Admin Tunnel" cmd /k "cloudflared tunnel --url http://localhost:19002"

echo All tunnels started!
pause
```

## 주의사항
- 무료 터널은 URL이 매번 변경됩니다
- 영구 도메인이 필요하면 Cloudflare에 도메인 등록 필요
- 터널 URL은 8시간 후 만료될 수 있음