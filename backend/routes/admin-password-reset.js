const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

// 관리자 전용 비밀번호 재설정 (프로덕션 서버용)
router.post('/reset-passwords', async (req, res) => {
  try {
    // 관리자 토큰 검증 (간단한 시크릿 키 사용)
    const adminSecret = req.headers['x-admin-secret'];
    if (adminSecret !== 'arata-admin-2025-secret-key') {
      return res.status(401).json({ message: '권한이 없습니다.' });
    }

    const updates = [
      { email: 'test123@arata.com', password: 'test123' },
      { email: 'carryer12345@gmail.com', password: '12345678' },
      { email: 'carryer123@naver.com', password: '12345678' }
    ];
    
    const results = [];
    
    for (const update of updates) {
      try {
        const hashedPassword = await bcrypt.hash(update.password, 10);
        
        const user = await prisma.user.update({
          where: { email: update.email },
          data: { password: hashedPassword },
          select: { 
            username: true, 
            email: true 
          }
        });
        
        results.push({
          success: true,
          email: user.email,
          username: user.username,
          message: `비밀번호 재설정 완료`
        });
        
      } catch (error) {
        results.push({
          success: false,
          email: update.email,
          message: error.message
        });
      }
    }
    
    res.json({
      message: '비밀번호 재설정 완료',
      results,
      accounts: [
        { email: 'admin@arata.com', password: 'admin123' },
        { email: 'test123@arata.com', password: 'test123' },
        { email: 'carryer12345@gmail.com', password: '12345678' },
        { email: 'carryer123@naver.com', password: '12345678' }
      ]
    });
    
  } catch (error) {
    console.error('비밀번호 재설정 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

module.exports = router;