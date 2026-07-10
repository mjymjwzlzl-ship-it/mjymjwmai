# 📧 SendGrid로 실제 이메일을 관리자 센터로 받기

## ✅ 현재 구현 완료
- Webhook 엔드포인트: `/api/email/inbound`
- 테스트 엔드포인트: `/api/email/test-inbound`
- 관리자 센터에서 확인 가능

## 🚀 SendGrid 설정 방법

### 1단계: SendGrid 계정 설정
1. https://sendgrid.com 가입
2. 이메일 인증 완료

### 2단계: 도메인 인증
1. SendGrid Dashboard → Settings → Sender Authentication
2. "Authenticate Your Domain" 클릭
3. DNS Provider: Cloudflare 선택
4. Domain: arata.co.kr 입력
5. 제공된 DNS 레코드를 Cloudflare에 추가:
   ```
   CNAME em1234.arata.co.kr → u1234567.wl123.sendgrid.net
   CNAME s1._domainkey.arata.co.kr → s1.domainkey.u1234567.wl123.sendgrid.net
   CNAME s2._domainkey.arata.co.kr → s2.domainkey.u1234567.wl123.sendgrid.net
   ```

### 3단계: MX 레코드 설정 (Cloudflare)
1. Cloudflare Dashboard → DNS
2. 기존 MX 레코드 삭제
3. 새 MX 레코드 추가:
   ```
   Type: MX
   Name: @ (또는 arata.co.kr)
   Mail server: mx.sendgrid.net
   Priority: 10
   TTL: Auto
   Proxy status: DNS only (회색 구름)
   ```

### 4단계: SendGrid Inbound Parse 설정
1. SendGrid Dashboard → Settings → Inbound Parse
2. "Add Host & URL" 클릭
3. 설정:
   ```
   Subdomain: (비워두기 - 전체 도메인 사용)
   Domain: arata.co.kr
   Destination URL: https://arata.co.kr/api/email/inbound
   ```
4. Additional Options:
   - ✅ Check incoming emails for spam
   - ✅ POST the raw, full MIME message

### 5단계: Cloudflare 터널 설정 (이미 완료)
`tunnel-config.yml`에 추가:
```yaml
ingress:
  # 이메일 웹훅
  - hostname: arata.co.kr
    path: /api/email/*
    service: http://127.0.0.1:8000
```

## 🧪 테스트 방법

### 1. 로컬 테스트 (지금 바로 가능)
```bash
curl -X POST http://localhost:8000/api/email/test-inbound
```
→ 관리자 센터에서 확인: http://localhost:5002/support

### 2. 실제 이메일 테스트 (SendGrid 설정 후)
1. 아무 이메일에서 `support@arata.co.kr`로 메일 발송
2. 1-2분 후 관리자 센터에서 확인
3. 메일이 자동으로 관리자 센터에 표시됨!

## 📌 작동 원리

```
사용자가 support@arata.co.kr로 메일 발송
↓
Cloudflare MX 레코드 → SendGrid 서버
↓
SendGrid가 이메일 파싱
↓
SendGrid가 Webhook 호출: POST https://arata.co.kr/api/email/inbound
↓
백엔드가 이메일 저장 (support-mails.json)
↓
관리자 센터에서 실시간 확인 가능!
```

## 🎯 장점
- ✅ 실제 이메일을 관리자 센터에서 바로 확인
- ✅ 답장 기능으로 관리
- ✅ 상태 관리 (새 문의/답변완료/해결)
- ✅ 검색 및 필터링
- ✅ 중요 메일 표시
- ✅ 무료 (SendGrid 무료 플랜)

## ⚠️ 주의사항
1. SendGrid 무료 플랜: 일 100통 제한
2. Webhook URL은 HTTPS 필수 (Cloudflare 터널로 해결)
3. DNS 변경 후 최대 48시간 소요 (보통 5분 내 적용)

## 🔧 문제 해결

### 이메일이 도착하지 않는 경우:
1. MX 레코드 확인: `nslookup -type=mx arata.co.kr`
2. SendGrid Activity Feed 확인
3. 백엔드 로그 확인: `console.log`로 디버깅

### Webhook이 작동하지 않는 경우:
1. Cloudflare 터널 상태 확인
2. 백엔드 서버 실행 확인
3. SendGrid에서 Webhook 재전송 테스트

## 📝 현재 상태
- ✅ Webhook 엔드포인트 구현 완료
- ✅ 테스트 엔드포인트 작동 확인
- ⏳ SendGrid 계정 설정 필요
- ⏳ MX 레코드 변경 필요