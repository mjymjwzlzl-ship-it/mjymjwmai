const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAndFixWebtoonSettings() {
  try {
    // 특정 웹툰 확인
    const comic = await prisma.comic.findUnique({
      where: {
        id: 'cme9jyjav001fg3fcrqcj28vt'
      },
      include: {
        episodes: {
          select: {
            episodeNumber: true,
            title: true
          },
          orderBy: {
            episodeNumber: 'asc'
          }
        }
      }
    });

    if (comic) {
      console.log('웹툰 정보:');
      console.log(`- ID: ${comic.id}`);
      console.log(`- 제목: ${comic.title}`);
      console.log(`- paidStartEpisode: ${comic.paidStartEpisode}`);
      console.log(`- episodeCoinPrice: ${comic.episodeCoinPrice}`);
      console.log(`- 총 에피소드 수: ${comic.episodes.length}`);
      
      // paidStartEpisode가 설정되지 않았으면 수정
      if (comic.paidStartEpisode === null || comic.paidStartEpisode === undefined) {
        console.log('\n❌ paidStartEpisode가 설정되지 않음. 기본값으로 설정합니다.');
        await prisma.comic.update({
          where: { id: comic.id },
          data: {
            paidStartEpisode: 4,  // 3화까지 무료, 4화부터 유료
            episodeCoinPrice: 3   // 3코인
          }
        });
        console.log('✅ 설정 업데이트 완료: 3화까지 무료, 4화부터 3코인');
      } else {
        console.log(`✅ 현재 설정: ${comic.paidStartEpisode-1}화까지 무료, ${comic.paidStartEpisode}화부터 ${comic.episodeCoinPrice}코인`);
      }
    } else {
      console.log('❌ 웹툰을 찾을 수 없습니다.');
    }

    // 모든 웹툰의 paidStartEpisode 확인 및 수정
    console.log('\n=== 모든 웹툰 설정 확인 ===');
    const allComics = await prisma.comic.findMany({
      select: {
        id: true,
        title: true,
        paidStartEpisode: true,
        episodeCoinPrice: true,
        _count: {
          select: { episodes: true }
        }
      }
    });

    for (const c of allComics) {
      if (c.paidStartEpisode === null || c.paidStartEpisode === undefined) {
        console.log(`\n❌ "${c.title}" - paidStartEpisode 미설정`);
        
        // 기본값 설정: 3화까지 무료
        await prisma.comic.update({
          where: { id: c.id },
          data: {
            paidStartEpisode: 4,  // 4화부터 유료
            episodeCoinPrice: 3   // 3코인
          }
        });
        console.log(`✅ 업데이트 완료: 3화까지 무료, 4화부터 3코인`);
      } else {
        console.log(`✅ "${c.title}" - ${c.paidStartEpisode === 0 ? '전편 무료' : `${c.paidStartEpisode-1}화까지 무료, ${c.paidStartEpisode}화부터 ${c.episodeCoinPrice}코인`}`);
      }
    }

  } catch (error) {
    console.error('오류 발생:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAndFixWebtoonSettings();