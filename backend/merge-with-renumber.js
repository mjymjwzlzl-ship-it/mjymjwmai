const { prisma } = require('./lib/prisma');

async function mergeWithRenumbering() {
  try {
    console.log('에피소드 번호를 조정하여 사막/samac 웹툰 통합 중...');
    
    // Find the main 사막 comic
    const mainComic = await prisma.comic.findFirst({
      where: { 
        title: '사막',
        NOT: { title: { contains: 'samac' } }
      },
      include: { episodes: true }
    });
    
    // Find all samac comics
    const samacComics = await prisma.comic.findMany({
      where: { title: { contains: 'samac' } },
      include: { episodes: true }
    });
    
    if (!mainComic || samacComics.length === 0) {
      console.log('통합할 웹툰을 찾을 수 없습니다.');
      return;
    }
    
    console.log(`메인 사막 웹툰: ${mainComic.episodes.length}개 에피소드`);
    console.log(`통합할 samac 웹툰: ${samacComics.length}개`);
    
    // Get the highest episode number in main comic
    const maxEpisodeNumber = Math.max(...mainComic.episodes.map(ep => ep.episodeNumber));
    console.log(`현재 최대 에피소드 번호: ${maxEpisodeNumber}`);
    
    let nextEpisodeNumber = maxEpisodeNumber + 1;
    
    // Process each samac comic
    for (const samacComic of samacComics) {
      console.log(`\n"${samacComic.title}" 처리 중... (${samacComic.episodes.length}개 에피소드)`);
      
      // Sort samac episodes by their original episode number
      const sortedEpisodes = samacComic.episodes.sort((a, b) => a.episodeNumber - b.episodeNumber);
      
      // Move and renumber each episode
      for (const episode of sortedEpisodes) {
        console.log(`  - 에피소드 ${episode.episodeNumber} -> ${nextEpisodeNumber} (제목: ${episode.title})`);
        
        await prisma.episode.update({
          where: { id: episode.id },
          data: { 
            comicId: mainComic.id,
            episodeNumber: nextEpisodeNumber,
            title: `${nextEpisodeNumber}화 (구 ${episode.title})`
          }
        });
        
        nextEpisodeNumber++;
      }
      
      // Delete the samac comic
      await prisma.comic.delete({
        where: { id: samacComic.id }
      });
      
      console.log(`"${samacComic.title}" 삭제됨`);
    }
    
    // Final verification
    const finalComic = await prisma.comic.findUnique({
      where: { id: mainComic.id },
      include: { episodes: true }
    });
    
    const sortedFinalEpisodes = finalComic.episodes.sort((a, b) => a.episodeNumber - b.episodeNumber);
    
    console.log(`\n✅ 통합 완료!`);
    console.log(`최종 에피소드 수: ${finalComic.episodes.length}개`);
    console.log(`에피소드 범위: ${sortedFinalEpisodes[0].episodeNumber} ~ ${sortedFinalEpisodes[sortedFinalEpisodes.length-1].episodeNumber}`);
    
    // Show final episode list
    console.log('\n=== 최종 에피소드 목록 ===');
    sortedFinalEpisodes.forEach(episode => {
      const imageCount = JSON.parse(episode.images).length;
      console.log(`${episode.episodeNumber}: ${episode.title} (${imageCount}개 이미지)`);
    });
    
  } catch (error) {
    console.error('오류:', error);
  } finally {
    await prisma.$disconnect();
  }
}

mergeWithRenumbering();