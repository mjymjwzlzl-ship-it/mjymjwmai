const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkComicSettings() {
  try {
    // 세상의 종말 웹툰 설정 확인
    const comic = await prisma.comic.findUnique({
      where: { id: 'cme9jyjav001fg3fcrqcj28vt' },
      select: {
        title: true,
        paidStartEpisode: true,
        episodeCoinPrice: true,
        episodes: {
          select: {
            episodeNumber: true,
            title: true,
            isFree: true,
            coinPrice: true
          },
          orderBy: { episodeNumber: 'asc' }
        }
      }
    });

    if (comic) {
      console.log(`웹툰: ${comic.title}`);
      console.log(`paidStartEpisode: ${comic.paidStartEpisode}`);
      console.log(`episodeCoinPrice: ${comic.episodeCoinPrice}`);
      console.log('\n에피소드 목록:');
      
      comic.episodes.forEach(ep => {
        const shouldBeFree = comic.paidStartEpisode === 0 || ep.episodeNumber < comic.paidStartEpisode;
        console.log(`- ${ep.episodeNumber}화: ${ep.title}`);
        console.log(`  DB isFree: ${ep.isFree}, coinPrice: ${ep.coinPrice}`);
        console.log(`  계산된 isFree: ${shouldBeFree}, 예상 coinPrice: ${shouldBeFree ? 0 : comic.episodeCoinPrice}`);
        console.log('');
      });
    } else {
      console.log('웹툰을 찾을 수 없습니다.');
    }

  } catch (error) {
    console.error('오류 발생:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkComicSettings();
