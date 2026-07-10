const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function createTestAccount() {
  try {
    // 기존 테스트 계정 확인
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: 'test123@arata.com' },
          { username: 'test123' }
        ]
      }
    });

    let currentUser;
    
    if (existingUser) {
      console.log('기존 테스트 계정 업데이트 중...');
      
      // 비밀번호 해싱
      const hashedPassword = await bcrypt.hash('12345', 10);
      
      // 기존 계정 업데이트
      currentUser = await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          password: hashedPassword,
          nickname: '테스트유저',
          coinBalance: 1000,  // 테스트용 코인
          role: 'USER',
          adultVerified: true,  // 성인 인증 완료
          birthYear: 1990,  // 성인 나이
          updatedAt: new Date()
        }
      });
      
      console.log('✅ 테스트 계정이 업데이트되었습니다:');
      console.log(`- 이메일: ${currentUser.email}`);
      console.log(`- 아이디: ${currentUser.username}`);
      console.log(`- 비밀번호: 12345`);
      console.log(`- 코인: ${currentUser.coinBalance}`);
      console.log(`- 성인 인증: ${currentUser.adultVerified ? '완료' : '미완료'}`);
    } else {
      console.log('새 테스트 계정 생성 중...');
      
      // 비밀번호 해싱
      const hashedPassword = await bcrypt.hash('12345', 10);
      
      // 새 계정 생성
      currentUser = await prisma.user.create({
        data: {
          email: 'test123@arata.com',
          username: 'test123',
          password: hashedPassword,
          nickname: '테스트유저',
          coinBalance: 1000,  // 테스트용 코인
          role: 'USER',
          adultVerified: true,  // 성인 인증 완료
          birthYear: 1990,  // 성인 나이
        }
      });
      
      console.log('✅ 테스트 계정이 생성되었습니다:');
      console.log(`- 이메일: ${currentUser.email}`);
      console.log(`- 아이디: ${currentUser.username}`);
      console.log(`- 비밀번호: 12345`);
      console.log(`- 코인: ${currentUser.coinBalance}`);
      console.log(`- 성인 인증: ${currentUser.adultVerified ? '완료' : '미완료'}`);
    }

    // 테스트용 구매 기록 생성 (몇 개 에피소드)
    const episodes = await prisma.episode.findMany({
      take: 3,
      where: {
        comic: {
          genre: 'adult'  // 성인 웹툰 에피소드
        }
      }
    });

    if (episodes.length > 0) {
      console.log('\n테스트용 구매 기록 생성 중...');
      
      for (const episode of episodes) {
        const existingPurchase = await prisma.purchase.findFirst({
          where: {
            userId: currentUser.id,
            episodeId: episode.id
          }
        });

        if (!existingPurchase) {
          await prisma.purchase.create({
            data: {
              userId: currentUser.id,
              episodeId: episode.id,
              amount: 0,  // 테스트용이므로 무료
              type: 'EPISODE'
            }
          });
          console.log(`- 에피소드 ${episode.episodeNumber}화 구매 기록 추가`);
        }
      }
    }

    console.log('\n✨ 테스트 계정 설정 완료!');
    console.log('로그인 정보:');
    console.log('- 아이디 또는 이메일: test123 또는 test123@arata.com');
    console.log('- 비밀번호: 12345');
    console.log('- 성인 콘텐츠 접근 가능');

  } catch (error) {
    console.error('오류 발생:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestAccount();