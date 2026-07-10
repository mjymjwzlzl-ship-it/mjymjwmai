# 구글 OAuth IP 주소 제한 우회 방법

구글 OAuth는 보안상의 이유로 IP 주소를 리다이렉트 URI로 사용할 수 없습니다. 다음은 ngrok 외의 대안들입니다:

## 1. 무료 DDNS (Dynamic DNS) 서비스 사용

### No-IP (무료)
1. https://www.noip.com 에서 무료 계정 생성
2. 무료 도메인 생성 (예: `yourapp.ddns.net`)
3. No-IP DUC (Dynamic Update Client) 설치
4. 포트포워딩된 공인 IP와 도메인 연결

### DuckDNS (완전 무료)
1. https://www.duckdns.org 에서 계정 생성
2. 서브도메인 생성 (예: `yourapp.duckdns.org`)
3. 토큰을 이용해 IP 업데이트

```bash
# Windows에서 DuckDNS 업데이트 (PowerShell)
$url = "https://www.duckdns.org/update?domains=yourapp&token=YOUR_TOKEN&ip="
Invoke-RestMethod -Uri $url
```

## 2. 로컬 터널링 서비스 (ngrok 대안)

### LocalTunnel (무료)
```bash
npm install -g localtunnel
lt --port 19000 --subdomain arata-frontend
# https://arata-frontend.loca.lt 로 접속 가능
```

### Cloudflare Tunnel (무료)
1. Cloudflare 계정 생성
2. cloudflared 설치
```bash
# Windows
winget install --id Cloudflare.cloudflared
# 또는 https://github.com/cloudflare/cloudflared/releases 에서 다운로드

# 터널 실행
cloudflared tunnel --url http://localhost:19000
```

### Serveo (무료, 설치 불필요)
```bash
# SSH를 이용한 터널링
ssh -R 80:localhost:19000 serveo.net
# 커스텀 서브도메인
ssh -R arata:80:localhost:19000 serveo.net
```

## 3. 개발용 임시 해결책

### hosts 파일 수정 (개발/테스트용)
```
# C:\Windows\System32\drivers\etc\hosts 파일에 추가
59.6.135.217 arata.local.com
```
- 구글 OAuth에 `http://arata.local.com:19000/api/auth/callback/google` 등록
- 단점: 접속하는 모든 클라이언트의 hosts 파일을 수정해야 함

## 4. 리버스 프록시 서비스

### PageKite (유료, 무료 체험)
```bash
# Python 설치 필요
pip install pagekite
pagekite.py 19000 yourname.pagekite.me
```

## 5. 구글 OAuth 없이 인증 구현

### 이메일/비밀번호 인증만 사용
- 이미 백엔드에 구현되어 있는 `/api/auth/login` 엔드포인트 활용
- 소셜 로그인이 꼭 필요한 경우가 아니라면 가장 간단한 해결책

### 다른 OAuth 제공자 사용
- GitHub OAuth: IP 주소 허용
- Discord OAuth: IP 주소 허용

## 추천 방법

1. **DuckDNS** (가장 간단하고 무료)
   - 5분 내 설정 완료
   - 영구 무료
   - 안정적

2. **Cloudflare Tunnel** (가장 안정적)
   - 무료
   - 높은 성능
   - 추가 보안 기능

3. **이메일 인증만 사용** (가장 빠른 해결)
   - 이미 구현되어 있음
   - 추가 설정 불필요

어떤 방법을 선택하시겠습니까?