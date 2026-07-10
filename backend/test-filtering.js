const { prisma } = require('./lib/prisma');

async function testFiltering() {
  try {
    // 일반 웹툰 조회 테스트
    console.log('=== 일반 웹툰 API 테스트 ===');
    const generalComics = await prisma.comic.findMany({
      where: {
        AND: [
          { rating: { not: '19' } },
          { rating: { not: 'adult' } },
          { genre: { not: { contains: 'adult' } } }
        ]
      },
      select: {
        id: true,
        title: true,
        rating: true,
        genre: true
      }
    });
    
    console.log(`일반 웹툰: ${generalComics.length}개`);
    generalComics.forEach(comic => {
      console.log(`- ${comic.title} (연령: ${comic.rating}, 장르: ${comic.genre})`);
    });
    
    // 성인 웹툰 조회 테스트
    console.log('\n=== 성인 웹툰 API 테스트 ===');
    const adultComics = await prisma.comic.findMany({
      where: {
        OR: [
          { rating: '19' },
          { rating: 'adult' },
          { genre: { contains: 'adult' } }
        ]
      },
      select: {
        id: true,
        title: true,
        rating: true,
        genre: true
      }
    });
    
    console.log(`성인 웹툰: ${adultComics.length}개`);
    adultComics.forEach(comic => {
      console.log(`- ${comic.title} (연령: ${comic.rating}, 장르: ${comic.genre})`);
    });
    
  } catch (error) {
    console.error('에러:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testFiltering();