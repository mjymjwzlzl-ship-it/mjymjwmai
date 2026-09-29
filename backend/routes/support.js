const express = require('express');
const router = express.Router();
// 고객센터 메일 열람·답장·발송·삭제는 관리자만 (2026-09-29: 인증 없이 누구나 269건 열람 가능하던 문제 수정). 공개 문의(/contact)만 예외.
const { authenticate, requireAdmin } = require('../middleware/auth');
const adminOnly = [authenticate, requireAdmin];
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { Resend } = require('resend');
const nodemailer = require('nodemailer');
const multer = require('multer');

// 파일 업로드 설정 (메모리 스토리지 사용)
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB 제한
  }
});

// Resend API 설정
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Nodemailer 설정 (Gmail 또는 다른 SMTP 서비스 사용)
const createTransporter = () => {
  // Gmail을 사용하는 경우
  if (process.env.EMAIL_SERVICE === 'gmail') {
    return nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER || 'your-email@gmail.com',
        pass: process.env.EMAIL_PASS || 'your-app-specific-password'
      }
    });
  }
  
  // 일반 SMTP 설정
  return nodemailer.createTransporter({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: process.env.EMAIL_PORT || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER || 'your-email@gmail.com',
      pass: process.env.EMAIL_PASS || 'your-password'
    }
  });
};

// 메일 데이터 파일 경로
const MAILS_FILE = path.join(__dirname, '..', 'data', 'support-mails.json');

// 메일 파일 초기화
async function initMailsFile() {
  try {
    await fs.access(MAILS_FILE);
  } catch {
    await fs.mkdir(path.dirname(MAILS_FILE), { recursive: true });
    await fs.writeFile(MAILS_FILE, JSON.stringify([]));
  }
}

// 메일 목록 조회 (관리자용)
router.get('/mails', ...adminOnly, async (req, res) => {
  try {
    await initMailsFile();
    const data = await fs.readFile(MAILS_FILE, 'utf-8');
    const mails = JSON.parse(data);
    
    // 최신순 정렬
    const sortedMails = mails.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    
    res.json({ mails: sortedMails });
  } catch (error) {
    console.error('메일 목록 조회 실패:', error);
    res.status(500).json({ error: '메일 목록을 가져올 수 없습니다' });
  }
});

// 메일 상세 조회
router.get('/mails/:id', ...adminOnly, async (req, res) => {
  try {
    await initMailsFile();
    const { id } = req.params;
    
    const data = await fs.readFile(MAILS_FILE, 'utf-8');
    const mails = JSON.parse(data);
    
    const mail = mails.find(m => m.id === id);
    
    if (!mail) {
      return res.status(404).json({ error: '메일을 찾을 수 없습니다' });
    }
    
    // 읽음 처리
    if (!mail.isRead) {
      mail.isRead = true;
      mail.readAt = new Date().toISOString();
      await fs.writeFile(MAILS_FILE, JSON.stringify(mails, null, 2));
    }
    
    res.json({ mail });
  } catch (error) {
    console.error('메일 조회 실패:', error);
    res.status(500).json({ error: '메일을 가져올 수 없습니다' });
  }
});

// 고객 문의 메일 전송 (프론트엔드용)
router.post('/contact', async (req, res) => {
  try {
    await initMailsFile();
    const { name, email, subject, message, category = 'general' } = req.body;
    
    // 유효성 검사
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ error: '모든 필드를 입력해주세요' });
    }
    
    // 이메일 형식 검사
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: '올바른 이메일 형식이 아닙니다' });
    }
    
    const data = await fs.readFile(MAILS_FILE, 'utf-8');
    const mails = JSON.parse(data);
    
    // 새 메일 생성
    const newMail = {
      id: uuidv4(),
      from: {
        name,
        email
      },
      to: 'support@arata.co.kr',
      subject,
      message,
      category,
      status: 'new', // new, replied, resolved
      isRead: false,
      isStarred: false,
      createdAt: new Date().toISOString(),
      replies: []
    };
    
    mails.push(newMail);
    await fs.writeFile(MAILS_FILE, JSON.stringify(mails, null, 2));
    
    // 실제 이메일 발송 (Nodemailer 사용)
    try {
      const transporter = createTransporter();
      
      // HTML 이메일 템플릿
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #7c3aed; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h2 style="margin: 0;">새로운 고객 문의</h2>
          </div>
          <div style="padding: 20px; background-color: #f9fafb; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <div style="margin-bottom: 15px;">
              <strong>고객 정보:</strong><br>
              이름: ${name}<br>
              이메일: ${email}
            </div>
            <div style="margin-bottom: 15px;">
              <strong>제목:</strong><br>
              ${subject}
            </div>
            <div style="margin-bottom: 15px;">
              <strong>문의 내용:</strong><br>
              <div style="background-color: white; padding: 15px; border-radius: 4px; white-space: pre-wrap;">${message}</div>
            </div>
            <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280;">
              문의 ID: ${newMail.id}<br>
              접수 시간: ${new Date(newMail.createdAt).toLocaleString('ko-KR')}
            </div>
          </div>
        </div>
      `;
      
      const mailOptions = {
        from: `"ARATA 고객지원" <${process.env.EMAIL_USER || 'noreply@arata.co.kr'}>`,
        to: 'support@arata.co.kr',
        replyTo: email, // 답장 시 고객 이메일로 직접 전송
        subject: `[고객문의] ${subject}`,
        text: `고객 문의\n\n이름: ${name}\n이메일: ${email}\n\n제목: ${subject}\n\n내용:\n${message}`,
        html: htmlContent
      };
      
      await transporter.sendMail(mailOptions);
      console.log('✅ 고객 문의 이메일 발송 성공:', email);
    } catch (emailError) {
      console.error('⚠️ 이메일 발송 실패 (데이터는 저장됨):', emailError);
      // 이메일 발송 실패해도 문의는 저장되었으므로 성공 응답
    }
    
    res.json({ 
      success: true, 
      message: '문의가 성공적으로 전송되었습니다. 빠른 시일 내에 답변드리겠습니다.',
      mailId: newMail.id 
    });
  } catch (error) {
    console.error('메일 전송 실패:', error);
    res.status(500).json({ error: '메일 전송에 실패했습니다' });
  }
});

// 답장 전송 (관리자용) - 파일 첨부 지원
router.post('/mails/:id/reply', ...adminOnly, upload.array('attachments', 5), async (req, res) => {
  try {
    await initMailsFile();
    const { id } = req.params;
    const { message, cc, bcc } = req.body;

    // CC/BCC 처리 (문자열에서 배열로 변환)
    const ccArray = cc ? (typeof cc === 'string' ? JSON.parse(cc) : cc) : [];
    const bccArray = bcc ? (typeof bcc === 'string' ? JSON.parse(bcc) : bcc) : [];

    if (!message) {
      return res.status(400).json({ error: '답장 내용을 입력해주세요' });
    }

    const data = await fs.readFile(MAILS_FILE, 'utf-8');
    const mails = JSON.parse(data);

    const mailIndex = mails.findIndex(m => m.id === id);

    if (mailIndex === -1) {
      return res.status(404).json({ error: '메일을 찾을 수 없습니다' });
    }

    // 첨부 파일 정보 저장 (UTF-8 인코딩 수정)
    const attachmentInfo = (req.files || []).map(file => {
      // Buffer.from을 사용하여 latin1로 인코딩된 파일명을 UTF-8로 변환
      let filename = file.originalname;
      try {
        filename = Buffer.from(file.originalname, 'latin1').toString('utf8');
      } catch (e) {
        // 변환 실패 시 원본 사용
        console.warn('파일명 인코딩 변환 실패:', e.message);
      }
      return {
        filename: filename,
        size: file.size,
        mimetype: file.mimetype
      };
    });

    // 답장 추가
    const reply = {
      id: uuidv4(),
      message,
      attachments: attachmentInfo,
      from: 'support@arata.co.kr',
      to: mails[mailIndex].from.email,
      cc: ccArray.length > 0 ? ccArray : undefined,
      bcc: bccArray.length > 0 ? bccArray : undefined,
      createdAt: new Date().toISOString()
    };

    mails[mailIndex].replies.push(reply);
    mails[mailIndex].status = 'replied';
    mails[mailIndex].lastReplyAt = reply.createdAt;

    await fs.writeFile(MAILS_FILE, JSON.stringify(mails, null, 2));

    // Resend로 실제 이메일 발송
    if (resend) {
      try {
        const originalMail = mails[mailIndex];
        const originalDate = new Date(originalMail.createdAt).toLocaleString('ko-KR');

        // 원본 메시지 포함한 텍스트 버전
        const textWithOriginal = `${message}

-------- Original Message --------
From: ${originalMail.from.name} <${originalMail.from.email}>
Date: ${originalDate}
Subject: ${originalMail.subject}

${originalMail.message}`;

        const emailOptions = {
          from: 'support@arata.co.kr',
          to: mails[mailIndex].from.email,
          subject: `Re: ${mails[mailIndex].subject}`,
          text: textWithOriginal,
          html: `<div style="font-family: Arial, sans-serif;">
            <p>${message.replace(/\n/g, '<br>')}</p>
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
            <p style="color: #666; font-size: 12px;">
              이 메일은 ARATA 고객지원팀에서 발송되었습니다.<br>
              문의사항이 있으시면 언제든 연락주세요.
            </p>
            <div style="margin-top: 20px; padding: 15px; background: #f5f5f5; border-left: 4px solid #999;">
              <p style="margin: 0 0 10px 0; font-weight: bold; color: #666;">-------- Original Message --------</p>
              <p style="margin: 5px 0; color: #666;"><strong>From:</strong> ${originalMail.from.name} &lt;${originalMail.from.email}&gt;</p>
              <p style="margin: 5px 0; color: #666;"><strong>Date:</strong> ${originalDate}</p>
              <p style="margin: 5px 0; color: #666;"><strong>Subject:</strong> ${originalMail.subject}</p>
              <hr style="margin: 10px 0; border: none; border-top: 1px solid #ddd;">
              <p style="color: #333;">${originalMail.message.replace(/\n/g, '<br>')}</p>
            </div>
          </div>`
        };

        // CC/BCC 추가
        if (ccArray.length > 0) emailOptions.cc = ccArray;
        if (bccArray.length > 0) emailOptions.bcc = bccArray;

        // 첨부파일 추가 (Resend API 형식으로 변환, UTF-8 인코딩 수정)
        if (req.files && req.files.length > 0) {
          emailOptions.attachments = req.files.map(file => {
            let filename = file.originalname;
            try {
              filename = Buffer.from(file.originalname, 'latin1').toString('utf8');
            } catch (e) {
              console.warn('첨부파일명 인코딩 변환 실패:', e.message);
            }
            return {
              filename: filename,
              content: file.buffer // Buffer 형태로 전송
            };
          });
        }

        await resend.emails.send(emailOptions);
        console.log('Resend 이메일 발송 성공 (첨부파일:', req.files?.length || 0, '개, CC:', ccArray.length, 'BCC:', bccArray.length, ')');
      } catch (error) {
        console.error('Resend 이메일 발송 실패:', error);
        // 에러가 나도 답장은 저장되도록 계속 진행
      }
    }

    res.json({
      success: true,
      message: '답장이 전송되었습니다',
      reply
    });
  } catch (error) {
    console.error('답장 전송 실패:', error);
    res.status(500).json({ error: '답장 전송에 실패했습니다' });
  }
});

// 메일 상태 변경 (관리자용)
router.patch('/mails/:id/status', ...adminOnly, async (req, res) => {
  try {
    await initMailsFile();
    const { id } = req.params;
    const { status } = req.body;
    
    if (!['new', 'replied', 'resolved'].includes(status)) {
      return res.status(400).json({ error: '잘못된 상태값입니다' });
    }
    
    const data = await fs.readFile(MAILS_FILE, 'utf-8');
    const mails = JSON.parse(data);
    
    const mailIndex = mails.findIndex(m => m.id === id);
    
    if (mailIndex === -1) {
      return res.status(404).json({ error: '메일을 찾을 수 없습니다' });
    }
    
    mails[mailIndex].status = status;
    
    await fs.writeFile(MAILS_FILE, JSON.stringify(mails, null, 2));
    
    res.json({ success: true, message: '상태가 변경되었습니다' });
  } catch (error) {
    console.error('상태 변경 실패:', error);
    res.status(500).json({ error: '상태 변경에 실패했습니다' });
  }
});

// 메일 즐겨찾기 토글 (관리자용)
router.patch('/mails/:id/star', ...adminOnly, async (req, res) => {
  try {
    await initMailsFile();
    const { id } = req.params;
    
    const data = await fs.readFile(MAILS_FILE, 'utf-8');
    const mails = JSON.parse(data);
    
    const mailIndex = mails.findIndex(m => m.id === id);
    
    if (mailIndex === -1) {
      return res.status(404).json({ error: '메일을 찾을 수 없습니다' });
    }
    
    mails[mailIndex].isStarred = !mails[mailIndex].isStarred;
    
    await fs.writeFile(MAILS_FILE, JSON.stringify(mails, null, 2));
    
    res.json({ 
      success: true, 
      isStarred: mails[mailIndex].isStarred 
    });
  } catch (error) {
    console.error('즐겨찾기 토글 실패:', error);
    res.status(500).json({ error: '즐겨찾기 변경에 실패했습니다' });
  }
});

// 메일 휴지통으로 이동 (관리자용)
router.patch('/mails/:id/trash', ...adminOnly, async (req, res) => {
  try {
    await initMailsFile();
    const { id } = req.params;
    
    const data = await fs.readFile(MAILS_FILE, 'utf-8');
    const mails = JSON.parse(data);
    
    const mailIndex = mails.findIndex(m => m.id === id);
    
    if (mailIndex === -1) {
      return res.status(404).json({ error: '메일을 찾을 수 없습니다' });
    }
    
    // 휴지통으로 이동 또는 복원
    if (mails[mailIndex].category === 'trash') {
      // 휴지통에서 복원
      mails[mailIndex].category = mails[mailIndex].previousCategory || 'general';
      delete mails[mailIndex].previousCategory;
    } else {
      // 휴지통으로 이동
      mails[mailIndex].previousCategory = mails[mailIndex].category;
      mails[mailIndex].category = 'trash';
    }
    
    await fs.writeFile(MAILS_FILE, JSON.stringify(mails, null, 2));
    
    res.json({ 
      success: true, 
      message: mails[mailIndex].category === 'trash' ? '휴지통으로 이동했습니다' : '복원되었습니다' 
    });
  } catch (error) {
    console.error('휴지통 이동 실패:', error);
    res.status(500).json({ error: '휴지통 이동에 실패했습니다' });
  }
});

// 메일 영구 삭제 (관리자용)
router.delete('/mails/:id', ...adminOnly, async (req, res) => {
  try {
    await initMailsFile();
    const { id } = req.params;
    const { permanent } = req.query;
    
    const data = await fs.readFile(MAILS_FILE, 'utf-8');
    let mails = JSON.parse(data);
    
    if (permanent === 'true') {
      // 영구 삭제
      const originalLength = mails.length;
      mails = mails.filter(m => m.id !== id);
      
      if (mails.length === originalLength) {
        return res.status(404).json({ error: '메일을 찾을 수 없습니다' });
      }
      
      await fs.writeFile(MAILS_FILE, JSON.stringify(mails, null, 2));
      res.json({ success: true, message: '메일이 영구 삭제되었습니다' });
    } else {
      // 휴지통으로 이동 (기본 동작)
      const mailIndex = mails.findIndex(m => m.id === id);
      
      if (mailIndex === -1) {
        return res.status(404).json({ error: '메일을 찾을 수 없습니다' });
      }
      
      mails[mailIndex].previousCategory = mails[mailIndex].category;
      mails[mailIndex].category = 'trash';
      
      await fs.writeFile(MAILS_FILE, JSON.stringify(mails, null, 2));
      res.json({ success: true, message: '휴지통으로 이동했습니다' });
    }
  } catch (error) {
    console.error('메일 삭제 실패:', error);
    res.status(500).json({ error: '메일 삭제에 실패했습니다' });
  }
});

// 관리자가 새 메일 발송 (Resend API 사용)
router.post('/send-email', ...adminOnly, async (req, res) => {
  try {
    const { to, subject, message, cc = [], bcc = [] } = req.body;

    if (!to || !subject || !message) {
      return res.status(400).json({ error: '모든 필드를 입력해주세요' });
    }

    // Resend로 실제 이메일 발송
    if (resend) {
      try {
        const emailOptions = {
          from: 'support@arata.co.kr',
          to: to,
          subject: subject,
          text: message,
          html: `<div style="font-family: Arial, sans-serif;">
            <p>${message.replace(/\n/g, '<br>')}</p>
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
            <p style="color: #666; font-size: 12px;">
              이 메일은 ARATA 고객지원팀에서 발송되었습니다.<br>
              문의사항이 있으시면 support@arata.co.kr로 연락주세요.
            </p>
          </div>`
        };

        // CC/BCC 추가
        if (cc.length > 0) emailOptions.cc = cc;
        if (bcc.length > 0) emailOptions.bcc = bcc;

        await resend.emails.send(emailOptions);
        console.log(`Resend 이메일 발송 성공: ${to} (CC: ${cc.length}, BCC: ${bcc.length})`);

        // 발송 기록 저장 (선택사항)
        await initMailsFile();
        const data = await fs.readFile(MAILS_FILE, 'utf-8');
        const mails = JSON.parse(data);

        const sentMail = {
          id: uuidv4(),
          from: {
            name: 'ARATA Support',
            email: 'support@arata.co.kr'
          },
          to: to,
          cc: cc.length > 0 ? cc : undefined,
          bcc: bcc.length > 0 ? bcc : undefined,
          subject: subject,
          message: message,
          category: 'sent',
          status: 'sent',
          isRead: true,
          isStarred: false,
          createdAt: new Date().toISOString(),
          replies: []
        };

        mails.push(sentMail);
        await fs.writeFile(MAILS_FILE, JSON.stringify(mails, null, 2));

        res.json({
          success: true,
          message: '메일이 성공적으로 발송되었습니다',
          mailId: sentMail.id
        });
      } catch (error) {
        console.error('Resend 이메일 발송 실패:', error);
        res.status(500).json({
          error: '메일 발송에 실패했습니다',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
      }
    } else {
      res.status(500).json({
        error: 'Resend API 키가 설정되지 않았습니다'
      });
    }
  } catch (error) {
    console.error('메일 발송 실패:', error);
    res.status(500).json({ error: '메일 발송에 실패했습니다' });
  }
});

// 메일 전달 (Forward)
router.post('/mails/:id/forward', ...adminOnly, async (req, res) => {
  try {
    await initMailsFile();
    const { id } = req.params;
    const { to, message: forwardMessage = '', cc = [], bcc = [] } = req.body;

    if (!to) {
      return res.status(400).json({ error: '전달할 이메일 주소를 입력해주세요' });
    }

    const data = await fs.readFile(MAILS_FILE, 'utf-8');
    const mails = JSON.parse(data);

    const mail = mails.find(m => m.id === id);

    if (!mail) {
      return res.status(404).json({ error: '메일을 찾을 수 없습니다' });
    }

    // Resend로 메일 전달
    if (resend) {
      try {
        const forwardedContent = `
---------- Forwarded Message ----------
From: ${mail.from.name} <${mail.from.email}>
To: ${mail.to}
Subject: ${mail.subject}
Date: ${new Date(mail.createdAt).toLocaleString('ko-KR')}

${mail.message}
${forwardMessage ? '\n\n---------- 전달 메시지 ----------\n' + forwardMessage : ''}
        `;

        const emailOptions = {
          from: 'support@arata.co.kr',
          to: to,
          subject: `Fwd: ${mail.subject}`,
          text: forwardedContent,
          html: `<div style="font-family: Arial, sans-serif;">
            ${forwardMessage ? `<p>${forwardMessage.replace(/\n/g, '<br>')}</p><hr style="margin: 20px 0;">` : ''}
            <div style="background: #f5f5f5; padding: 15px; border-left: 4px solid #999;">
              <p style="margin: 0 0 10px 0; font-weight: bold;">---------- 전달된 메시지 ----------</p>
              <p style="margin: 5px 0;"><strong>From:</strong> ${mail.from.name} &lt;${mail.from.email}&gt;</p>
              <p style="margin: 5px 0;"><strong>To:</strong> ${mail.to}</p>
              <p style="margin: 5px 0;"><strong>Subject:</strong> ${mail.subject}</p>
              <p style="margin: 5px 0;"><strong>Date:</strong> ${new Date(mail.createdAt).toLocaleString('ko-KR')}</p>
              <hr style="margin: 10px 0; border: none; border-top: 1px solid #ccc;">
              <p>${mail.message.replace(/\n/g, '<br>')}</p>
            </div>
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
            <p style="color: #666; font-size: 12px;">
              이 메일은 ARATA 고객지원팀에서 전달되었습니다.
            </p>
          </div>`
        };

        // CC/BCC 추가
        if (cc.length > 0) emailOptions.cc = cc;
        if (bcc.length > 0) emailOptions.bcc = bcc;

        await resend.emails.send(emailOptions);
        console.log(`메일 전달 성공: ${mail.id} → ${to} (CC: ${cc.length}, BCC: ${bcc.length})`);

        // 전달 기록 저장
        const forwardedMail = {
          id: uuidv4(),
          from: {
            name: 'ARATA Support',
            email: 'support@arata.co.kr'
          },
          to: to,
          cc: cc.length > 0 ? cc : undefined,
          bcc: bcc.length > 0 ? bcc : undefined,
          subject: `Fwd: ${mail.subject}`,
          message: forwardedContent,
          category: 'sent',
          status: 'sent',
          isRead: true,
          isStarred: false,
          createdAt: new Date().toISOString(),
          replies: [],
          forwardedFrom: mail.id
        };

        mails.push(forwardedMail);
        await fs.writeFile(MAILS_FILE, JSON.stringify(mails, null, 2));

        res.json({
          success: true,
          message: '메일이 성공적으로 전달되었습니다'
        });
      } catch (error) {
        console.error('메일 전달 실패:', error);
        res.status(500).json({
          error: '메일 전달에 실패했습니다',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
      }
    } else {
      res.status(500).json({
        error: 'Resend API 키가 설정되지 않았습니다'
      });
    }
  } catch (error) {
    console.error('메일 전달 실패:', error);
    res.status(500).json({ error: '메일 전달에 실패했습니다' });
  }
});

module.exports = router;