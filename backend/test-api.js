const { prisma } = require('./lib/prisma');

async function testAPI() {
  try {
    console.log('인기작 API 테스트 중...');
    
    // 사막 웹툰 찾기
    const samacComic = await prisma.comic.findFirst({
      where: { title: '사막' },
      select: {
        id: true,
        title: true,
        thumbnail: true,
        authorName: true,
        genre: true,
        isOfficial: true,
        viewCount: true,
        likeCount: true
      }
    });
    
    if (samacComic) {
      console.log('\n=== 사막 웹툰 원본 데이터 ===');
      console.log(JSON.stringify(samacComic, null, 2));
      
      // API 응답 형태로 변환
      const apiResponse = {
        id: samacComic.id,
        title: samacComic.title,
        author: samacComic.authorName,
        genre: samacComic.genre,
        thumbnailUrl: samacComic.thumbnail || "/api/placeholder/300/400",
        viewCount: samacComic.viewCount || 0,
        commentCount: 0,
        rating: 4.0,
        totalEpisodes: 0,
        updatedAt: new Date().toISOString(),
        isOfficial: samacComic.isOfficial || false
      };
      
      console.log('\n=== API 응답 형태 ===');
      console.log(JSON.stringify(apiResponse, null, 2));
    } else {
      console.log('사막 웹툰을 찾을 수 없습니다.');
    }
    
  } catch (error) {
    console.error('오류:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testAPI();