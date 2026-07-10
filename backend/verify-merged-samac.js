const { prisma } = require('./lib/prisma');

async function verifyMergedComic() {
  try {
    console.log('합쳐진 사막 웹툰 확인 중...');
    
    // Find the remaining 사막 comic
    const samacComic = await prisma.comic.findFirst({
      where: { title: '사막' },
      include: { episodes: true }
    });
    
    if (!samacComic) {
      console.log('사막 웹툰을 찾을 수 없습니다.');
      return;
    }
    
    console.log(`\n=== 합쳐진 사막 웹툰 정보 ===`);
    console.log(`제목: ${samacComic.title}`);
    console.log(`총 에피소드 수: ${samacComic.episodes.length}개`);
    console.log(`생성일: ${samacComic.createdAt}`);
    
    // Sort episodes by episode number
    const sortedEpisodes = samacComic.episodes.sort((a, b) => a.episodeNumber - b.episodeNumber);
    
    console.log('\n=== 에피소드 목록 ===');
    sortedEpisodes.forEach((episode, index) => {
      const images = JSON.parse(episode.images);
      console.log(`${index + 1}. Episode ${episode.episodeNumber}: ${episode.title}`);
      console.log(`   - 파일 수: ${images.length}개`);
      console.log(`   - 첫 번째 파일: ${images[0]}`);
      if (images.length > 1) {
        console.log(`   - 마지막 파일: ${images[images.length - 1]}`);
      }
      console.log('');
    });
    
    // Check for any remaining samac comics
    const remainingSamac = await prisma.comic.findMany({
      where: { title: { contains: 'samac' } }
    });
    
    if (remainingSamac.length > 0) {
      console.log(`\n⚠️  경고: samac이 포함된 웹툰이 ${remainingSamac.length}개 더 있습니다:`);
      remainingSamac.forEach(comic => {
        console.log(`- ${comic.title} (ID: ${comic.id})`);
      });
    } else {
      console.log('\n✅ 성공: 모든 samac 웹툰이 사막으로 통합되었습니다.');
    }
    
    // Summary statistics
    const totalFiles = sortedEpisodes.reduce((total, episode) => {
      return total + JSON.parse(episode.images).length;
    }, 0);
    
    console.log(`\n=== 통계 ===`);
    console.log(`총 에피소드: ${samacComic.episodes.length}개`);
    console.log(`총 이미지 파일: ${totalFiles}개`);
    console.log(`평균 이미지/에피소드: ${(totalFiles / samacComic.episodes.length).toFixed(1)}개`);
    
  } catch (error) {
    console.error('오류:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyMergedComic();