const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUser() {
  try {
    // test123@arata.com 사용자 확인 (토큰에 있는 이메일)
    const user = await prisma.user.findFirst({
      where: { 
        OR: [
          { id: 'cmetmm5dh0000qnz4ezntc7ly' },
          { email: 'test123@arata.com' }
        ]
      }
    });
    
    if (user) {
      console.log('현재 로그인한 사용자:');
      console.log(`- ID: ${user.id}`);
      console.log(`- Email: ${user.email}`);
      console.log(`- 현재 코인: ${user.coinBalance}코인`);
      
      // 코인이 없으면 추가
      if (!user.coinBalance || user.coinBalance < 100) {
        const updated = await prisma.user.update({
          where: { id: user.id },
          data: { coinBalance: 1000 }
        });
        console.log(`\n✅ 1000코인 지급 완료!`);
        console.log(`새로운 잔액: ${updated.coinBalance}코인`);
      }
    } else {
      console.log('사용자를 찾을 수 없습니다.');
    }
    
    // 모든 사용자 목록 확인
    console.log('\n=== 전체 사용자 목록 ===');
    const allUsers = await prisma.user.findMany({
      select: { id: true, email: true, coinBalance: true }
    });
    allUsers.forEach(u => {
      console.log(`${u.email}: ${u.coinBalance}코인 (ID: ${u.id})`);
    });
    
  } catch (error) {
    console.error('에러:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkUser();