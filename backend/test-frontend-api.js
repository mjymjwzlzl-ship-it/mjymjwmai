const { prisma } = require('./lib/prisma');
const fs = require('fs');

async function testFrontendAPI() {
  try {
    console.log('=== 프론트엔드 API 테스트 ===\n');
    
    // 인기작 API 시뮬레이션
    console.log('1. 인기작 API 시뮬레이션 (/api/frontend/categories/popular)');
    
    // 카테고리 설정 로드
    let categorySettings = { all: [], popular: [], editors: [], new: [], waitfree: [] };
    try {
      categorySettings = JSON.parse(fs.readFileSync('./data/category-settings.json', 'utf8'));
    } catch (error) {
      console.log('카테고리 설정 로드 실패:', error.message);
    }
    
    const popularIds = categorySettings.popular || [];
    console.log('인기작 ID 목록:', popularIds);
    
    if (popularIds.length === 0) {
      console.log('❌ 인기작 설정이 비어있음');
      return;
    }
    
    // 실제 웹툰 조회
    const comics = await prisma.comic.findMany({
      where: {
        id: { in: popularIds }
      },
      select: {
        id: true,
        title: true,
        thumbnail: true,
        authorName: true,
        genre: true,
        viewCount: true,
        likeCount: true,
        createdAt: true,
        updatedAt: true,
        isOfficial: true
      }
    });
    
    console.log(`실제 조회된 웹툰: ${comics.length}개`);
    
    // API 응답 형태로 변환
    const apiResponse = {
      comics: comics.map(comic => ({
        id: comic.id,
        title: comic.title,
        author: comic.authorName,
        genre: comic.genre,
        thumbnailUrl: comic.thumbnail || "/api/placeholder/300/400",
        viewCount: comic.viewCount || 0,
        commentCount: 0, // 댓글은 별도 계산 필요
        rating: 4.0,
        totalEpisodes: 0, // 에피소드는 별도 계산 필요
        updatedAt: comic.updatedAt || comic.createdAt,
        isOfficial: comic.isOfficial || false
      })),
      total: comics.length
    };
    
    console.log('\n최종 API 응답:');
    console.log(JSON.stringify(apiResponse, null, 2));
    
    // 각 웹툰의 에피소드 수 확인
    console.log('\n2. 각 웹툰의 에피소드 수 확인:');
    for (const comic of comics) {
      const episodeCount = await prisma.episode.count({
        where: { comicId: comic.id }
      });
      console.log(`   - ${comic.title}: ${episodeCount}개 에피소드`);
    }
    
  } catch (error) {
    console.error('API 테스트 중 오류:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testFrontendAPI();