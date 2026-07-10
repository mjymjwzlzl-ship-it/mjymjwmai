const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function createTestUser() {
  try {
    // 기존 사용자 확인
    const existing = await prisma.user.findUnique({
      where: { email: 'test123@arata.com' }
    });
    
    if (existing) {
      console.log('이미 존재하는 사용자입니다.');
      console.log(`ID: ${existing.id}`);
      console.log(`코인: ${existing.coinBalance}`);
      return;
    }
    
    // 비밀번호 해싱
    const hashedPassword = await bcrypt.hash('test123', 10);
    
    // 새 사용자 생성 (토큰에 있는 ID로)
    const user = await prisma.user.create({
      data: {
        id: 'cmetmm5dh0000qnz4ezntc7ly', // 토큰에 있는 ID
        email: 'test123@arata.com',
        password: hashedPassword,
        username: 'test123',
        coinBalance: 1000,
        role: 'USER'
      }
    });
    
    console.log('✅ 테스트 사용자 생성 완료!');
    console.log(`- Email: ${user.email}`);
    console.log(`- ID: ${user.id}`);
    console.log(`- 코인: ${user.coinBalance}`);
    
  } catch (error) {
    console.error('에러:', error.message);
    
    // ID가 중복되는 경우, 새로운 사용자 생성
    if (error.code === 'P2002') {
      console.log('ID 충돌 - 새로운 ID로 생성 시도...');
      
      const hashedPassword = await bcrypt.hash('test123', 10);
      const user = await prisma.user.create({
        data: {
          email: 'test123@arata.com',
          password: hashedPassword,
          username: 'test123',
          coinBalance: 1000,
          role: 'USER'
        }
      });
      
      console.log('✅ 테스트 사용자 생성 완료!');
      console.log(`- Email: ${user.email}`);
      console.log(`- ID: ${user.id}`);
      console.log(`- 코인: ${user.coinBalance}`);
      console.log('\n⚠️  로그아웃 후 다시 로그인하세요!');
    }
  } finally {
    await prisma.$disconnect();
  }
}

createTestUser();