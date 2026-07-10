# 로컬 개발 환경 접속 가이드

## 🚨 문제 상황
로컬 컴퓨터에서 자신의 도메인(creator.arata.co.kr, admin.arata.co.kr)으로 접속 시 연결 실패

## 🔍 원인
**Cloudflare 터널 루프백 문제**
- 로컬 → Cloudflare → 터널 → 로컬로 돌아오는 과정에서 연결 실패
- 외부에서는 정상 작동 (다른 컴퓨터/모바일에서는 접속 가능)

## ✅ 해결 방법

### 방법 1: hosts 파일 수정 (권장)
1. `fix-local-access.bat`를 **관리자 권한**으로 실행
2. 수정 후 접속:
   - http://creator.arata.co.kr:4001
   - http://admin.arata.co.kr:5000
   - **포트 번호 필수!**

### 방법 2: localhost 직접 사용
현재 컴퓨터에서 개발 시:
- 작가센터: http://localhost:4001
- 관리자센터: http://localhost:5000
- 메인: http://localhost:4000
- API: http://localhost:8000

### 방법 3: 프록시 설정 (개발자용)
```javascript
// next.config.mjs에 프록시 추가
async rewrites() {
  return [
    {
      source: '/api/:path*',
      destination: 'http://localhost:8000/api/:path*',
    },
  ]
}
```

## 📌 중요 사항

### 로컬 개발 시
- **localhost** 사용 권장
- hosts 파일 수정 시 **포트 번호** 필수

### 외부 접속 시 (다른 컴퓨터/모바일)
- https://creator.arata.co.kr (포트 불필요)
- https://admin.arata.co.kr (포트 불필요)
- Cloudflare가 자동으로 포트 라우팅

## 🛠️ hosts 파일 원복 방법
```batch
# 관리자 권한 CMD에서 실행
notepad C:\Windows\System32\drivers\etc\hosts
# ARATA 관련 라인 삭제 후 저장
```

## 📊 접속 경로 비교

| 접속 위치 | URL | 결과 |
|----------|-----|------|
| 외부 컴퓨터 | https://creator.arata.co.kr | ✅ 정상 |
| 로컬 (hosts 수정 전) | https://creator.arata.co.kr | ❌ 실패 |
| 로컬 (hosts 수정 후) | http://creator.arata.co.kr:4001 | ✅ 정상 |
| 로컬 (직접) | http://localhost:4001 | ✅ 정상 |