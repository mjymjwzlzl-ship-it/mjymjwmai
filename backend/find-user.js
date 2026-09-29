const { prisma } = require('./lib/prisma');

async function findUser() {
  try {
    console.log('carryer123@naver.com 사용자 정보 검색 중...');
    
    // Search for the specific email
    const user = await prisma.user.findUnique({
      where: { email: 'carryer123@naver.com' },
      include: { comics: true }
    });
    
    if (user) {
      console.log('\n✅ 사용자 정보 찾음:');
      console.log(`ID: ${user.id}`);
      console.log(`이메일: ${user.email}`);
      console.log(`사용자명: ${user.username}`);
      console.log(`역할: ${user.role}`);
      console.log(`상태: ${user.status}`);
      console.log(`생성일: ${user.createdAt}`);
      console.log(`웹툰 작품 수: ${user.comics.length}개`);
      
      if (user.comics.length > 0) {
        console.log('\n작성한 웹툰들:');
        user.comics.forEach(comic => {
          console.log(`- ${comic.title} (${comic.createdAt})`);
        });
      }
    } else {
      console.log('❌ carryer123@naver.com 사용자를 찾을 수 없습니다.');
      
      // Search for similar emails
      const similarUsers = await prisma.user.findMany({
        where: {
          OR: [
            { email: { contains: 'carryer' } },
            { email: { contains: 'naver' } },
            { username: { contains: 'carryer' } }
          ]
        }
      });
      
      if (similarUsers.length > 0) {
        console.log('\n유사한 사용자들:');
        similarUsers.forEach(user => {
          console.log(`- ${user.email} (${user.username})`);
        });
      }
      
      // Show all users for reference
      const allUsers = await prisma.user.findMany({
        select: { email: true, username: true, createdAt: true, role: true }
      });
      
      console.log(`\n전체 사용자 수: ${allUsers.length}명`);
      console.log('모든 사용자들:');
      allUsers.forEach(user => {
        console.log(`- ${user.email} (${user.username}) - ${user.role}`);
      });
    }
    
  } catch (error) {
    console.error('오류:', error);
  } finally {
    await prisma.$disconnect();
  }
}

findUser();