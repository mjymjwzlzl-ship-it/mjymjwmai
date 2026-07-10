const { prisma } = require('./lib/prisma');

async function checkUsers() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        nickname: true,
        provider: true,
        createdAt: true
      }
    });
    
    console.log('=== 현재 데이터베이스 사용자 목록 ===');
    users.forEach(user => {
      console.log(`ID: ${user.id}, Email: ${user.email}, Nickname: ${user.nickname}, Provider: ${user.provider}`);
    });
    console.log(`총 ${users.length}명의 사용자가 있습니다.`);
  } catch (error) {
    console.error('사용자 조회 오류:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();