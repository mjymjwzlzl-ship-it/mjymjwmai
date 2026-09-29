const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function restoreUsers() {
  try {
    console.log('🔄 사용자 계정 복구 시작...');
    
    // 기본 사용자들 생성
    const users = [
      {
        email: 'test123@arata.com',
        username: 'test123',
        password: '12345',
        nickname: '테스트유저',
        coinBalance: 1000,
        isAdult: true,
        country: 'KR'
      },
      {
        email: 'user1@arata.com',
        username: 'user1',
        password: 'password1',
        nickname: '유저1',
        coinBalance: 500,
        isAdult: true,
        country: 'KR'
      },
      {
        email: 'user2@arata.com',
        username: 'user2',
        password: 'password2',
        nickname: '유저2',
        coinBalance: 300,
        isAdult: false,
        country: 'KR'
      },
      {
        email: 'admin@arata.com',
        username: 'admin',
        password: 'admin123',
        nickname: '관리자',
        coinBalance: 10000,
        isAdult: true,
        country: 'KR'
      },
      {
        email: 'vip@arata.com',
        username: 'vipuser',
        password: 'vip123',
        nickname: 'VIP회원',
        coinBalance: 5000,
        isAdult: true,
        country: 'KR'
      },
      {
        email: 'premium@arata.com',
        username: 'premium',
        password: 'premium123',
        nickname: '프리미엄회원',
        coinBalance: 3000,
        isAdult: true,
        country: 'KR'
      },
      {
        email: 'creator1@arata.com',
        username: 'creator1',
        password: 'creator123',
        nickname: '작가1',
        coinBalance: 2000,
        isAdult: true,
        country: 'KR'
      },
      {
        email: 'reader1@arata.com',
        username: 'reader1',
        password: 'reader123',
        nickname: '독자1',
        coinBalance: 100,
        isAdult: true,
        country: 'KR'
      },
      {
        email: 'newbie@arata.com',
        username: 'newbie',
        password: 'newbie123',
        nickname: '신규회원',
        coinBalance: 50,
        isAdult: false,
        country: 'KR'
      },
      {
        email: 'tester@arata.com',
        username: 'tester',
        password: 'test123',
        nickname: '테스터',
        coinBalance: 1500,
        isAdult: true,
        country: 'KR'
      }
    ];
    
    for (const userData of users) {
      try {
        // 이미 존재하는지 확인
        const existing = await prisma.user.findUnique({
          where: { email: userData.email }
        });
        
        if (existing) {
          console.log(`✅ ${userData.email} 계정은 이미 존재합니다.`);
          continue;
        }
        
        // 비밀번호 해시
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        
        // 사용자 생성
        const user = await prisma.user.create({
          data: {
            email: userData.email,
            username: userData.username,
            password: hashedPassword,
            nickname: userData.nickname,
            coinBalance: userData.coinBalance,
            adultVerified: userData.isAdult,
            country: userData.country
          }
        });
        
        console.log(`✅ ${user.email} (${user.nickname}) 계정 생성 완료 - 코인: ${user.coinBalance}`);
      } catch (error) {
        console.log(`⚠️ ${userData.email} 생성 중 오류:`, error.message);
      }
    }
    
    // 최종 확인
    const totalUsers = await prisma.user.count();
    console.log(`\n✅ 복구 완료! 총 ${totalUsers}명의 사용자가 데이터베이스에 있습니다.`);
    
    // 사용자 목록 출력
    const allUsers = await prisma.user.findMany({
      select: {
        email: true,
        nickname: true,
        coinBalance: true
      }
    });
    
    console.log('\n📋 사용자 목록:');
    allUsers.forEach(user => {
      console.log(`  - ${user.email} (${user.nickname}) - ${user.coinBalance} 코인`);
    });
    
  } catch (error) {
    console.error('❌ 복구 중 오류:', error);
  } finally {
    await prisma.$disconnect();
  }
}

restoreUsers();