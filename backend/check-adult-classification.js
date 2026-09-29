const { prisma } = require('./lib/prisma');

async function checkComics() {
  try {
    const allComics = await prisma.comic.findMany({
      select: {
        id: true,
        title: true,
        rating: true,
        genre: true
      }
    });
    
    console.log('=== 전체 웹툰 목록 ===');
    allComics.forEach(comic => {
      const isAdult = comic.rating === '19' || comic.rating === 'adult' || (comic.genre && comic.genre.includes('adult'));
      console.log(`ID: ${comic.id}, 제목: ${comic.title}, 연령등급: ${comic.rating}, 장르: ${comic.genre}, 성인여부: ${isAdult ? '성인' : '일반'}`);
    });
    
    const adultComics = allComics.filter(comic => 
      comic.rating === '19' || 
      comic.rating === 'adult' || 
      (comic.genre && comic.genre.includes('adult'))
    );
    
    console.log(`\n=== 성인 웹툰 (${adultComics.length}개) ===`);
    adultComics.forEach(comic => {
      console.log(`- ${comic.title} (ID: ${comic.id}, 연령: ${comic.rating})`);
    });
    
    const generalComics = allComics.filter(comic => 
      !(comic.rating === '19' || 
        comic.rating === 'adult' || 
        (comic.genre && comic.genre.includes('adult')))
    );
    
    console.log(`\n=== 일반 웹툰 (${generalComics.length}개) ===`);
    generalComics.forEach(comic => {
      console.log(`- ${comic.title} (ID: ${comic.id}, 연령: ${comic.rating})`);
    });
    
  } catch (error) {
    console.error('에러:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkComics();