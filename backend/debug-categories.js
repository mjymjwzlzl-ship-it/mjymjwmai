const { prisma } = require('./lib/prisma');
const fs = require('fs');

async function debugCategories() {
  try {
    console.log('=== 카테고리 및 웹툰 상태 디버깅 ===\n');
    
    // 1. 모든 웹툰 확인
    const allComics = await prisma.comic.findMany({
      select: {
        id: true,
        title: true,
        thumbnail: true,
        createdAt: true
      }
    });
    
    console.log(`1. 데이터베이스 전체 웹툰: ${allComics.length}개`);
    allComics.forEach(comic => {
      console.log(`   - ${comic.title} (ID: ${comic.id})`);
    });
    
    // 2. 일반 카테고리 설정 확인
    console.log('\n2. 일반 카테고리 설정:');
    try {
      const categorySettings = JSON.parse(fs.readFileSync('./data/category-settings.json', 'utf8'));
      console.log(JSON.stringify(categorySettings, null, 2));
      
      // 카테고리에 있는 웹툰들이 실제로 존재하는지 확인
      console.log('\n   카테고리 내 웹툰 존재 확인:');
      for (const [category, ids] of Object.entries(categorySettings)) {
        console.log(`   - ${category}: ${ids.length}개`);
        for (const id of ids) {
          const comic = allComics.find(c => c.id === id);
          console.log(`     * ${id}: ${comic ? comic.title : '❌ 존재하지 않음'}`);
        }
      }
    } catch (error) {
      console.log('   일반 카테고리 설정 파일 읽기 실패:', error.message);
    }
    
    // 3. 성인 카테고리 설정 확인
    console.log('\n3. 성인 카테고리 설정:');
    try {
      const adultCategorySettings = JSON.parse(fs.readFileSync('./data/adult-category-settings.json', 'utf8'));
      console.log(JSON.stringify(adultCategorySettings, null, 2));
      
      // 성인 카테고리에 있는 웹툰들이 실제로 존재하는지 확인
      console.log('\n   성인 카테고리 내 웹툰 존재 확인:');
      for (const [category, ids] of Object.entries(adultCategorySettings)) {
        console.log(`   - ${category}: ${ids.length}개`);
        for (const id of ids) {
          const comic = allComics.find(c => c.id === id);
          console.log(`     * ${id}: ${comic ? comic.title : '❌ 존재하지 않음'}`);
        }
      }
    } catch (error) {
      console.log('   성인 카테고리 설정 파일 읽기 실패:', error.message);
    }
    
    // 4. API 응답 시뮬레이션
    console.log('\n4. 인기작 API 응답 시뮬레이션:');
    try {
      const categorySettings = JSON.parse(fs.readFileSync('./data/category-settings.json', 'utf8'));
      const popularIds = categorySettings.popular || [];
      
      const popularComics = await prisma.comic.findMany({
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
          createdAt: true
        }
      });
      
      console.log(`   인기작 설정 ID: ${popularIds.length}개`);
      console.log(`   실제 찾은 인기작: ${popularComics.length}개`);
      
      popularComics.forEach(comic => {
        console.log(`   - ${comic.title} (조회수: ${comic.viewCount})`);
      });
      
    } catch (error) {
      console.log('   인기작 API 시뮬레이션 실패:', error.message);
    }
    
  } catch (error) {
    console.error('디버깅 중 오류:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugCategories();