const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDatabase() {
  try {
    // Purchase 테이블 확인
    console.log('=== Purchase 테이블 확인 ===');
    const purchaseCount = await prisma.purchase.count();
    console.log(`Purchase 레코드 수: ${purchaseCount}`);
    
    // 최근 구매 확인
    const recentPurchases = await prisma.purchase.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { email: true } },
        episode: { select: { title: true } }
      }
    });
    console.log('\n최근 구매 내역:');
    recentPurchases.forEach(p => {
      console.log(`- ${p.user.email}: ${p.episode.title} (${p.coinPrice}코인)`);
    });
    
    // User 테이블 coinBalance 필드 확인
    console.log('\n=== User 테이블 확인 ===');
    const users = await prisma.user.findMany({
      select: { email: true, coinBalance: true },
      take: 5
    });
    console.log('사용자 코인 잔액:');
    users.forEach(u => {
      console.log(`- ${u.email}: ${u.coinBalance}코인`);
    });
    
  } catch (error) {
    console.error('에러 발생:', error.message);
    if (error.message.includes('Unknown field')) {
      console.log('\n⚠️ 데이터베이스 스키마가 최신이 아닙니다.');
      console.log('다음 명령어를 실행하세요:');
      console.log('npx prisma db push');
    }
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();