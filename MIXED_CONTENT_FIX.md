# Mixed Content 오류 해결 방법

## 문제 상황
Cloudflare Tunnel (HTTPS)에서 백엔드 서버 (HTTP)로 API 요청 시 Mixed Content 오류 발생

## 해결 방법

### 1. 백엔드도 Cloudflare Tunnel 사용 (권장)
```bash
# 백엔드용 터널 실행
./cloudflared.exe tunnel --url http://localhost:8000
```

### 2. 브라우저에서 Mixed Content 허용 (임시)
Chrome 주소창에 입력:
```
chrome://settings/content/insecureContent
```
`https://search-spam-night-collection.trycloudflare.com` 추가

### 3. 프록시 서버 사용
프론트엔드에서 백엔드로의 요청을 프록시 처리

## 현재 상태
- 프론트엔드: HTTPS (Cloudflare Tunnel)
- 백엔드: HTTP (포트포워딩)
- 문제: Mixed Content 정책으로 차단

## 권장 해결책
백엔드도 Cloudflare Tunnel을 사용하여 HTTPS로 노출하는 것이 가장 좋습니다.