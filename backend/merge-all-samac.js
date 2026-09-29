const { prisma } = require('./lib/prisma');

async function mergeAllSamacComics() {
  try {
    console.log('모든 사막/samac 웹툰 통합 중...');
    
    // Find the main 사막 comic (without samac in title)
    const mainComic = await prisma.comic.findFirst({
      where: { 
        title: '사막',
        NOT: { title: { contains: 'samac' } }
      },
      include: { episodes: true }
    });
    
    // Find all comics with samac in title
    const samacComics = await prisma.comic.findMany({
      where: { title: { contains: 'samac' } },
      include: { episodes: true }
    });
    
    console.log(`메인 사막 웹툰: ${mainComic ? '찾음' : '없음'}`);
    console.log(`samac 웹툰들: ${samacComics.length}개`);
    
    if (!mainComic) {
      console.log('메인 사막 웹툰을 찾을 수 없습니다.');
      return;
    }
    
    if (samacComics.length === 0) {
      console.log('통합할 samac 웹툰이 없습니다.');
      return;
    }
    
    console.log(`\n현재 메인 사막 웹툰: ${mainComic.episodes.length}개 에피소드`);
    
    // Move all samac episodes to main comic
    for (const samacComic of samacComics) {
      console.log(`\n"${samacComic.title}" 처리 중... (${samacComic.episodes.length}개 에피소드)`);
      
      for (const episode of samacComic.episodes) {
        await prisma.episode.update({
          where: { id: episode.id },
          data: { comicId: mainComic.id }
        });
        console.log(`  - 에피소드 ${episode.episodeNumber} 이동됨`);
      }
      
      // Delete the samac comic
      await prisma.comic.delete({
        where: { id: samacComic.id }
      });
      
      console.log(`"${samacComic.title}" 삭제됨`);
    }
    
    // Check final result
    const finalComic = await prisma.comic.findUnique({
      where: { id: mainComic.id },
      include: { episodes: true }
    });
    
    console.log(`\n✅ 완료: 최종 사막 웹툰에 ${finalComic.episodes.length}개 에피소드`);
    
    // Sort episodes and show summary
    const sortedEpisodes = finalComic.episodes.sort((a, b) => a.episodeNumber - b.episodeNumber);
    const uniqueEpisodes = [...new Set(sortedEpisodes.map(ep => ep.episodeNumber))];
    
    console.log(`고유 에피소드 번호: ${uniqueEpisodes.length}개`);
    console.log(`에피소드 범위: ${Math.min(...uniqueEpisodes)} ~ ${Math.max(...uniqueEpisodes)}`);
    
    if (sortedEpisodes.length !== uniqueEpisodes.length) {
      console.log(`⚠️  중복된 에피소드가 ${sortedEpisodes.length - uniqueEpisodes.length}개 있을 수 있습니다.`);
    }
    
  } catch (error) {
    console.error('오류:', error);
  } finally {
    await prisma.$disconnect();
  }
}

mergeAllSamacComics();