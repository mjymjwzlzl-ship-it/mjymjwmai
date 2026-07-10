const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkPurchases() {
  try {
    // test123 계정 찾기
    const user = await prisma.user.findUnique({
      where: { username: 'test123' }
    });

    if (!user) {
      console.log('test123 계정을 찾을 수 없습니다.');
      return;
    }

    console.log(`test123 계정 ID: ${user.id}`);

    // 해당 계정의 모든 Purchase 레코드 조회
    const purchases = await prisma.purchase.findMany({
      where: {
        userId: user.id
      },
      include: {
        episode: {
          include: {
            comic: {
              select: {
                title: true
              }
            }
          }
        }
      }
    });

    console.log(`\n총 ${purchases.length}개의 구매(읽음) 기록이 있습니다:\n`);
    
    purchases.forEach(purchase => {
      console.log(`- ${purchase.episode.comic.title} ${purchase.episode.episodeNumber}화`);
      console.log(`  에피소드 ID: ${purchase.episodeId}`);
      console.log(`  구매일: ${purchase.createdAt}`);
      console.log('');
    });

    // 모든 Purchase 레코드 삭제 옵션
    if (purchases.length > 0) {
      console.log('\n테스트 계정의 모든 읽음 기록을 삭제하시겠습니까?');
      console.log('삭제하려면 delete-purchases.js를 실행하세요.');
    }

  } catch (error) {
    console.error('오류 발생:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPurchases();