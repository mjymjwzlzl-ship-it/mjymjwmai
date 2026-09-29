const { prisma } = require('./lib/prisma');

async function checkKakaoUsers() {
  try {
    const kakaoUsers = await prisma.user.findMany({
      where: {
        provider: 'kakao'
      },
      select: {
        id: true,
        email: true,
        nickname: true,
        providerId: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    console.log('=== 카카오 사용자 목록 ===');
    if (kakaoUsers.length === 0) {
      console.log('카카오 사용자가 없습니다.');
    } else {
      kakaoUsers.forEach((user, index) => {
        console.log(`${index + 1}. ID: ${user.id}`);
        console.log(`   이메일: ${user.email}`);
        console.log(`   닉네임: ${user.nickname}`);
        console.log(`   카카오ID: ${user.providerId}`);
        console.log(`   생성일: ${user.createdAt}`);
        console.log('');
      });
      console.log(`총 ${kakaoUsers.length}개의 카카오 계정이 있습니다.`);
    }
  } catch (error) {
    console.error('사용자 조회 오류:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkKakaoUsers();