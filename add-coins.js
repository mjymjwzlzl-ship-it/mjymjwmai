const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addCoins() {
  try {
    // 사용자에게 테스트 코인 지급
    const user = await prisma.user.update({
      where: { email: 'carryer12345@gmail.com' },
      data: { coinBalance: 1000 }
    });
    
    console.log(`✅ ${user.email}에게 1000코인 지급 완료`);
    console.log(`현재 잔액: ${user.coinBalance}코인`);
    
  } catch (error) {
    console.error('에러:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

addCoins();