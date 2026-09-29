const { prisma } = require('./lib/prisma');

async function deleteShindomisi() {
  try {
    console.log('신도미시 웹툰 찾기 및 삭제...');
    
    // 신도미시 관련 웹툰들 찾기
    const shindomisiComics = await prisma.comic.findMany({
      where: {
        OR: [
          { title: { contains: '신도미시' } },
          { title: { contains: '신도시 미시' } },
        ]
      },
      include: { episodes: true }
    });
    
    console.log(`찾은 신도미시 관련 웹툰: ${shindomisiComics.length}개`);
    
    for (const comic of shindomisiComics) {
      console.log(`\n삭제 중: "${comic.title}" (ID: ${comic.id})`);
      console.log(`  - 에피소드 수: ${comic.episodes.length}개`);
      
      // 에피소드들 먼저 삭제 (CASCADE로 자동 삭제되지만 명시적으로 확인)
      if (comic.episodes.length > 0) {
        console.log(`  - 에피소드들 삭제 중...`);
        await prisma.episode.deleteMany({
          where: { comicId: comic.id }
        });
      }
      
      // 웹툰 삭제
      await prisma.comic.delete({
        where: { id: comic.id }
      });
      
      console.log(`  ✅ "${comic.title}" 삭제 완료`);
    }
    
    console.log(`\n총 ${shindomisiComics.length}개의 신도미시 관련 웹툰 삭제 완료`);
    
    // 삭제 후 확인
    const remainingComics = await prisma.comic.findMany({
      where: {
        OR: [
          { title: { contains: '신도미시' } },
          { title: { contains: '신도시 미시' } },
        ]
      }
    });
    
    if (remainingComics.length === 0) {
      console.log('✅ 모든 신도미시 관련 웹툰이 성공적으로 삭제되었습니다.');
    } else {
      console.log(`⚠️  아직 ${remainingComics.length}개의 신도미시 관련 웹툰이 남아있습니다.`);
    }
    
  } catch (error) {
    console.error('오류:', error);
  } finally {
    await prisma.$disconnect();
  }
}

deleteShindomisi();