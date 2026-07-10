# 📧 실제 이메일 수신 설정 가이드

## 🚨 중요: 현재 상황
현재 `support@arata.co.kr`로 실제 이메일을 보내도 관리자 센터에 표시되지 않는 이유:
- 현재는 **로컬 시스템**으로만 구축되어 있음
- 실제 이메일을 받으려면 **이메일 서버 설정**이 필요

## 📥 실제 이메일 수신 방법

### 방법 1: Cloudflare Email Routing (무료 & 간단)
1. Cloudflare 대시보드 → Email → Email Routing
2. "Create a rule" 클릭
3. 설정:
   ```
   From: support@arata.co.kr
   To: 개인 이메일 (예: your@gmail.com)
   ```
4. MX 레코드 추가 (Cloudflare가 자동 안내)

**장점**: 무료, 설정 간단
**단점**: 포워딩만 가능, 직접 관리자 센터로 못 받음

### 방법 2: SendGrid Inbound Parse (추천)
1. SendGrid 가입 및 도메인 인증
2. MX 레코드 설정:
   ```
   Type: MX
   Name: @
   Priority: 10
   Value: mx.sendgrid.net
   ```
3. Webhook 엔드포인트 생성:
   ```javascript
   // backend/routes/support.js에 추가
   router.post('/webhook/inbound', async (req, res) => {
     const { from, to, subject, text, html } = req.body;
     
     // 받은 이메일을 데이터베이스에 저장
     const newMail = {
       id: uuidv4(),
       from: { 
         email: from, 
         name: from.split('@')[0] 
       },
       to: to,
       subject: subject,
       message: text || html,
       status: 'new',
       createdAt: new Date().toISOString()
     };
     
     // support-mails.json에 저장
     // ...
     
     res.status(200).send('OK');
   });
   ```
4. SendGrid에서 Webhook URL 설정:
   ```
   https://arata.co.kr/api/support/webhook/inbound
   ```

### 방법 3: Google Workspace (유료)
1. Google Workspace 가입 ($6/월)
2. MX 레코드 설정 (Google 제공)
3. Gmail API 연동:
   ```javascript
   const { google } = require('googleapis');
   const gmail = google.gmail('v1');
   
   // 주기적으로 Gmail 체크
   async function checkEmails() {
     const messages = await gmail.users.messages.list({
       userId: 'support@arata.co.kr',
       q: 'is:unread'
     });
     
     // 관리자 센터 DB에 저장
   }
   ```

## 🔧 즉시 테스트 가능한 방법

### 현재 시스템에서 테스트:
1. **문의하기 페이지 사용**:
   - https://arata.co.kr/contact 에서 문의 작성
   - 관리자 센터에서 확인 가능

2. **관리자 센터에서 직접 작성**:
   - 메일함 → "메일 작성" 버튼
   - 받는 사람, 제목, 내용 입력
   - 전송 (현재는 로컬 저장)

## 📝 실제 이메일 발송 설정

SendGrid API로 실제 이메일 발송:

1. **패키지 설치**:
   ```bash
   npm install @sendgrid/mail
   ```

2. **환경변수 설정** (.env):
   ```
   SENDGRID_API_KEY=your_api_key_here
   ```

3. **backend/routes/support.js 수정**:
   ```javascript
   const sgMail = require('@sendgrid/mail');
   sgMail.setApiKey(process.env.SENDGRID_API_KEY);
   
   // 답장 전송 부분
   router.post('/mails/:id/reply', async (req, res) => {
     // ... 기존 코드 ...
     
     // 실제 이메일 발송 추가
     const msg = {
       to: mail.from.email,
       from: 'support@arata.co.kr',
       subject: `Re: ${mail.subject}`,
       text: message,
       html: `<div>${message}</div>`
     };
     
     await sgMail.send(msg);
   });
   ```

## 📌 요약

**현재 가능한 것**:
- ✅ 웹사이트 내에서 문의 접수
- ✅ 관리자 센터에서 확인 및 답장
- ✅ 메일 작성 기능
- ✅ 상태 관리 (새 문의/답변완료/해결)

**추가 설정 필요**:
- ⚠️ 실제 이메일 수신 (MX 레코드 + Webhook)
- ⚠️ 실제 이메일 발송 (SendGrid API)

**추천 순서**:
1. 먼저 현재 시스템으로 테스트
2. SendGrid 가입 및 API 설정
3. 도메인 인증 및 MX 레코드 설정
4. Webhook 구현으로 실제 이메일 연동