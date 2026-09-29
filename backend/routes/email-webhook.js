const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const upload = multer();
const { simpleParser } = require('mailparser');

// 메일 데이터 파일 경로
const MAILS_FILE = path.join(__dirname, '..', 'data', 'support-mails.json');

// SendGrid Inbound Parse Webhook
router.post('/inbound', upload.none(), async (req, res) => {
  try {
    console.log('📧 새 이메일 수신');
    console.log('📦 받은 데이터 필드:', Object.keys(req.body));
    console.log('📄 전체 body:', JSON.stringify(req.body, null, 2));

    const {
      from,
      to,
      subject,
      text,
      html,
      SPF,
      email // Cloudflare Email Workers가 사용하는 raw MIME 필드
    } = req.body;

    // HTML과 텍스트 버전 저장
    let htmlBody = html || '';
    let textBody = text || '';

    // raw MIME 데이터가 있으면 mailparser로 파싱
    if ((!htmlBody && !textBody) && email) {
      try {
        const parsed = await simpleParser(email);
        htmlBody = parsed.html || '';
        textBody = parsed.text || '';

        console.log('  - mailparser 파싱 성공');
      } catch (parseError) {
        console.error('  - mailparser 파싱 실패:', parseError.message);
      }
    }

    // HTML이 있으면 HTML을 message로, 없으면 text를
    const messageBody = htmlBody || textBody;

    console.log('  - from:', from);
    console.log('  - subject:', subject);
    console.log('  - HTML 있음:', !!htmlBody);
    console.log('  - 본문:', messageBody ? `${messageBody.substring(0, 100)}...` : '(없음)');
    
    // 이메일 주소와 이름 파싱
    const fromMatch = from.match(/^(.*?)\s*<(.+?)>$/);
    let fromName = '';
    let fromEmail = '';
    
    if (fromMatch) {
      fromName = fromMatch[1].trim().replace(/"/g, '');
      fromEmail = fromMatch[2];
    } else {
      fromEmail = from;
      fromName = from.split('@')[0];
    }
    
    // 메일 파일 초기화
    let mails = [];
    try {
      const data = await fs.readFile(MAILS_FILE, 'utf-8');
      mails = JSON.parse(data);
    } catch {
      await fs.mkdir(path.dirname(MAILS_FILE), { recursive: true });
      await fs.writeFile(MAILS_FILE, JSON.stringify([]));
    }
    
    // 새 메일 객체 생성 (HTML 그대로 저장)
    const newMail = {
      id: uuidv4(),
      from: {
        name: fromName || fromEmail.split('@')[0],
        email: fromEmail
      },
      to: to || 'support@arata.co.kr',
      subject: subject || '(제목 없음)',
      message: messageBody, // HTML 또는 텍스트 (HTML이 우선)
      category: 'email',
      status: 'new',
      isRead: false,
      isStarred: false,
      createdAt: new Date().toISOString(),
      replies: [],
      source: 'email',
      spf: SPF || null
    };
    
    // 메일 저장
    mails.push(newMail);
    await fs.writeFile(MAILS_FILE, JSON.stringify(mails, null, 2));
    
    console.log('✅ 이메일 저장 완료:', newMail.id);
    
    // SendGrid에 200 응답 (필수)
    res.status(200).send('OK');
    
  } catch (error) {
    console.error('❌ 이메일 처리 실패:', error);
    // SendGrid는 200이 아니면 재시도하므로 200 응답
    res.status(200).send('Error but acknowledged');
  }
});

// 테스트용 엔드포인트
// 테스트 메일 주입은 관리자만 (누구나 고객센터함에 가짜 메일을 넣을 수 있던 문제)
router.post('/test-inbound', ...[require('../middleware/auth').authenticate, require('../middleware/auth').requireAdmin], async (req, res) => {
  try {
    // 테스트 이메일 데이터
    const testMail = {
      from: 'Test User <test@example.com>',
      to: 'support@arata.co.kr',
      subject: '테스트 이메일입니다',
      text: '이것은 테스트 이메일 본문입니다.\n\n감사합니다.',
      html: '<p>이것은 테스트 이메일 본문입니다.</p><p>감사합니다.</p>'
    };
    
    // Webhook 시뮬레이션
    req.body = testMail;
    
    // 메일 파일 초기화
    let mails = [];
    try {
      const data = await fs.readFile(MAILS_FILE, 'utf-8');
      mails = JSON.parse(data);
    } catch {
      await fs.mkdir(path.dirname(MAILS_FILE), { recursive: true });
      await fs.writeFile(MAILS_FILE, JSON.stringify([]));
    }
    
    // 새 메일 저장
    const newMail = {
      id: uuidv4(),
      from: {
        name: 'Test User',
        email: 'test@example.com'
      },
      to: 'support@arata.co.kr',
      subject: '테스트 이메일입니다',
      message: testMail.html || testMail.text, // HTML 우선
      category: 'email',
      status: 'new',
      isRead: false,
      isStarred: false,
      createdAt: new Date().toISOString(),
      replies: [],
      source: 'test'
    };
    
    mails.push(newMail);
    await fs.writeFile(MAILS_FILE, JSON.stringify(mails, null, 2));
    
    res.json({
      success: true,
      message: '테스트 이메일이 성공적으로 추가되었습니다',
      mailId: newMail.id
    });
    
  } catch (error) {
    console.error('테스트 이메일 처리 실패:', error);
    res.status(500).json({ error: '테스트 이메일 처리 실패' });
  }
});

module.exports = router;
