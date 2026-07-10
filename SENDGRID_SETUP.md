# 📧 SendGrid 설정 가이드

## 현재 상황
- **받기**: SendGrid Inbound Parse로 support@arata.co.kr로 오는 메일을 관리자 센터에서 확인 가능
- **보내기**: SendGrid API Key 필요 (아직 미설정)

## 메일 발송 설정 방법

### 1. SendGrid API Key 생성
1. https://app.sendgrid.com 로그인
2. Settings → API Keys
3. "Create API Key" 클릭
4. API Key Name: "ARATA Mail Support"
5. API Key Permissions: "Full Access" 선택
6. Create & View 클릭
7. **API Key 복사 (한 번만 보여짐!)**

### 2. 백엔드 설정
```bash
# Windows PowerShell에서 환경변수 설정
set SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxx

# 또는 .env 파일에 추가 (권장)
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxx
```

### 3. Sender Identity 설정 (중요!)
SendGrid에서 메일을 보내려면 발신자 인증이 필요합니다.

1. Settings → Sender Authentication
2. "Single Sender Verification" 선택 (간단한 방법)
3. 정보 입력:
   - From Name: ARATA Support
   - From Email: support@arata.co.kr
   - Reply To: support@arata.co.kr
   - Company: ARATA
   - 나머지 필수 정보 입력
4. "Create" 클릭
5. support@arata.co.kr로 인증 메일이 옴 → 클릭해서 인증

### 4. 테스트
관리자 센터에서 메일 답장 기능 사용하면 실제로 이메일이 발송됩니다!

## 문제 해결

### "550 Mailbox not found" 에러
- SendGrid는 실제 메일박스를 생성하지 않음
- support@arata.co.kr는 받기 전용 주소
- 답장은 SendGrid API를 통해 발송됨

### 메일이 스팸으로 가는 경우
1. Domain Authentication 완료 확인
2. SPF, DKIM 레코드 설정 확인
3. 발신자 인증 완료 확인

## 현재 작동 방식

```
[일반 사용자] → support@arata.co.kr 메일 발송
    ↓
[SendGrid Inbound Parse] → Webhook 호출
    ↓
[백엔드] → support-mails.json 저장
    ↓
[관리자 센터] → 메일 확인 및 답장
    ↓
[SendGrid API] → 실제 이메일 발송
    ↓
[사용자] → 답장 수신
```

## 포트 설정 (절대 변경 금지!)
- 메인 프론트엔드: http://localhost:4000
- 작가센터: http://localhost:4001  
- 관리자센터: http://localhost:5000
- 백엔드 API: http://localhost:8000
3. 이메일 인증 완료

### 2. API Key 생성
1. Settings → API Keys
2. "Create API Key" 클릭
3. Full Access 선택
4. API Key 복사 (한 번만 표시됨!)

### 3. 도메인 인증 (중요!)
1. Settings → Sender Authentication
2. "Authenticate Your Domain" 클릭
3. DNS 제공자 선택 (Cloudflare)
4. arata.co.kr 입력
5. 제공된 DNS 레코드를 Cloudflare에 추가:
   - CNAME 레코드 3개
   - TXT 레코드 1개

### 4. 환경변수 설정
`.env` 파일에 추가:
```
SENDGRID_API_KEY=your_api_key_here
SENDGRID_FROM_EMAIL=support@arata.co.kr
SENDGRID_FROM_NAME=ARATA Support
```

### 5. 백엔드 코드 업데이트

`backend/routes/support.js`에 실제 이메일 발송 코드 추가:

```javascript
// 패키지 설치
// npm install @sendgrid/mail

const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// 답장 전송 부분에 추가
async function sendEmail(to, subject, message) {
  const msg = {
    to: to,
    from: {
      email: process.env.SENDGRID_FROM_EMAIL,
      name: process.env.SENDGRID_FROM_NAME
    },
    subject: `Re: ${subject}`,
    text: message,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #8B5CF6;">ARATA 고객지원</h2>
        <div style="background: #F3F4F6; padding: 20px; border-radius: 8px;">
          ${message.replace(/\n/g, '<br>')}
        </div>
        <p style="color: #6B7280; font-size: 14px; margin-top: 20px;">
          이 메일은 ARATA 고객지원팀에서 발송되었습니다.<br>
          추가 문의사항은 support@arata.co.kr로 연락주세요.
        </p>
      </div>
    `
  };
  
  await sgMail.send(msg);
}
```

### 6. Inbound Email 설정 (선택사항)
실제로 support@arata.co.kr로 오는 메일을 받으려면:

1. SendGrid Inbound Parse 설정
2. MX 레코드 추가 (Cloudflare):
   ```
   Type: MX
   Name: @
   Mail server: mx.sendgrid.net
   Priority: 10
   ```
3. Webhook URL 설정:
   ```
   https://arata.co.kr/api/support/webhook
   ```

## 테스트 방법

1. 프론트엔드에서 문의하기:
   - https://arata.co.kr/contact 접속
   - 문의 작성 및 전송

2. 관리자 센터에서 확인:
   - https://admin.arata.co.kr/support 접속
   - 받은 메일 확인
   - 답장 작성

3. 이메일 수신 확인:
   - 입력한 이메일로 답장 도착 확인

## 주의사항

- SendGrid 무료 플랜: 일일 100통 제한
- 도메인 인증 완료 후 스팸 방지
- API Key는 절대 노출 금지
- 프로덕션에서는 환경변수 사용 필수

## 문제 해결

### 메일이 스팸으로 가는 경우
- 도메인 인증 확인
- SPF, DKIM 레코드 확인
- 발신자 이메일 주소 확인

### API Key 오류
- 환경변수 확인
- API Key 권한 확인
- 새 API Key 생성

### 메일이 전송되지 않는 경우
- SendGrid 대시보드에서 Activity 확인
- 일일 한도 확인
- 수신자 이메일 주소 유효성 확인