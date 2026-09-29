const { prisma } = require('./lib/prisma');

async function mergeSamacComics() {
  try {
    console.log('Prisma object:', prisma);
    console.log('사막과 samac 웹툰 합치기 시작...');
    
    // Find both comics
    const samacComic = await prisma.comic.findFirst({
      where: { title: { contains: 'samac' } },
      include: { episodes: true }
    });
    
    const deseartComic = await prisma.comic.findFirst({
      where: { 
        title: '사막',
        NOT: { title: { contains: 'samac' } }
      },
      include: { episodes: true }
    });
    
    if (!samacComic || !deseartComic) {
      console.log('사막 또는 samac 웹툰을 찾을 수 없습니다.');
      console.log('samac:', samacComic ? '찾음' : '없음');
      console.log('사막:', deseartComic ? '찾음' : '없음');
      return;
    }
    
    console.log(`사막 웹툰: ${deseartComic.episodes.length}개 에피소드`);
    console.log(`samac 웹툰: ${samacComic.episodes.length}개 에피소드`);
    
    // Move all samac episodes to the main 사막 comic
    const samacEpisodes = samacComic.episodes;
    
    for (const episode of samacEpisodes) {
      await prisma.episode.update({
        where: { id: episode.id },
        data: { comicId: deseartComic.id }
      });
      console.log(`에피소드 ${episode.episodeNumber} 이동됨`);
    }
    
    // Delete the duplicate samac comic
    await prisma.comic.delete({
      where: { id: samacComic.id }
    });
    
    console.log(`samac 웹툰 삭제됨. 모든 에피소드가 사막으로 이동됨.`);
    
    // Check final result
    const finalComic = await prisma.comic.findUnique({
      where: { id: deseartComic.id },
      include: { episodes: true }
    });
    
    console.log(`최종 사막 웹툰: ${finalComic.episodes.length}개 에피소드`);
    
    // Sort episodes by episode number
    const sortedEpisodes = finalComic.episodes.sort((a, b) => a.episodeNumber - b.episodeNumber);
    console.log('에피소드 목록:');
    sortedEpisodes.forEach(ep => {
      console.log(`  ${ep.episodeNumber}: ${ep.title} (${ep.filename})`);
    });
    
  } catch (error) {
    console.error('오류:', error);
  } finally {
    await prisma.$disconnect();
  }
}

mergeSamacComics();