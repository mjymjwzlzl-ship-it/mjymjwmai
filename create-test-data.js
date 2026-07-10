const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createTestData() {
  try {
    // 1. 테스트 웹툰 생성 또는 업데이트
    let testComic = await prisma.comic.findFirst({
      where: { title: '테스트 웹툰' }
    });
    
    if (!testComic) {
      console.log('테스트 웹툰 생성 중...');
      testComic = await prisma.comic.create({
        data: {
          id: 'test-comic-001',
          title: '테스트 웹툰',
          description: '구매 테스트용 웹툰입니다',
          thumbnail: '/images/test-thumbnail.jpg',
          genre: '액션',
          isOfficial: false,
          status: 'ONGOING',
          rating: 'ALL',
          authorName: 'Test Author',
          viewCount: 0,
          likeCount: 0
        }
      });
      console.log('✅ 테스트 웹툰 생성 완료');
    }
    
    // 2. 에피소드 생성 (1-5화)
    for (let i = 1; i <= 5; i++) {
      const episodeId = 'test-ep-' + String(i).padStart(3, '0');
      
      const existingEp = await prisma.episode.findUnique({
        where: { id: episodeId }
      });
      
      if (!existingEp) {
        await prisma.episode.create({
          data: {
            id: episodeId,
            title: '제' + i + '화',
            episodeNumber: i,
            thumbnail: '/images/ep-' + i + '-thumbnail.jpg',
            images: JSON.stringify([
              '/images/ep-' + i + '-page1.jpg',
              '/images/ep-' + i + '-page2.jpg',
              '/images/ep-' + i + '-page3.jpg'
            ]),
            viewCount: 0,
            comicId: testComic.id
          }
        });
        console.log('✅ ' + i + '화 생성 완료');
      }
    }
    
    // 3. 웹툰의 유료 설정 업데이트 (3화부터 유료, 3코인)
    await prisma.$executeRaw`
      UPDATE comics 
      SET paidStartEpisode = 3, 
          episodeCoinPrice = 3 
      WHERE id = ${testComic.id}
    `;
    console.log('✅ 유료 설정 완료 (3화부터 3코인)');
    
    // 4. 생성된 데이터 확인
    const episodes = await prisma.episode.findMany({
      where: { comicId: testComic.id },
      orderBy: { episodeNumber: 'asc' }
    });
    
    console.log('\n생성된 에피소드:');
    episodes.forEach(ep => {
      const isFree = ep.episodeNumber < 3;
      console.log('- ' + ep.title + ' (ID: ' + ep.id + ') - ' + (isFree ? '무료' : '유료(3코인)'));
    });
    
    await prisma.$disconnect();
    
  } catch (error) {
    console.error('오류:', error);
    await prisma.$disconnect();
  }
}

createTestData();