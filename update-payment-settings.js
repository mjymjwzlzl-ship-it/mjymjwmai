const { PrismaClient } = require('@prisma/client');

// .env 파일 로드
require('dotenv').config();

const prisma = new PrismaClient();

async function updatePaymentSettings() {
  try {
    // 첫 번째 웹툰 찾기
    const comic = await prisma.comic.findFirst();
    
    if (!comic) {
      console.log('웹툰이 없습니다.');
      return;
    }
    
    console.log('현재 웹툰 설정:');
    console.log('- 제목:', comic.title);
    console.log('- 유료 시작:', comic.paidStartEpisode || 0, '화부터');
    console.log('- 에피소드 가격:', comic.episodeCoinPrice || 3, '코인');
    
    // 3화부터 유료로 설정
    const updated = await prisma.comic.update({
      where: { id: comic.id },
      data: {
        paidStartEpisode: 3,
        episodeCoinPrice: 3
      }
    });
    
    console.log('\n✅ 업데이트 완료!');
    console.log('- 제목:', updated.title);
    console.log('- 유료 시작:', updated.paidStartEpisode, '화부터');
    console.log('- 에피소드 가격:', updated.episodeCoinPrice, '코인');
    
  } catch (error) {
    console.error('오류:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updatePaymentSettings();