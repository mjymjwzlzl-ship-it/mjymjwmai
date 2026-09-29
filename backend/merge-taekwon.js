const { prisma } = require('./lib/prisma');

async function mergeTaekwonComics() {
  try {
    console.log('태권고등학교 웹툰들 확인 및 통합 중...');
    
    // Find both taekwon comics
    const mainTaekwon = await prisma.comic.findFirst({
      where: { 
        title: '태권고등학교',
        NOT: { title: { contains: '추가분' } }
      },
      include: { episodes: true }
    });
    
    const additionalTaekwon = await prisma.comic.findFirst({
      where: { title: { contains: '태권고등학교' }, title: { contains: '추가분' } },
      include: { episodes: true }
    });
    
    console.log(`메인 태권고등학교: ${mainTaekwon ? mainTaekwon.episodes.length + '개 에피소드' : '없음'}`);
    console.log(`태권고등학교 추가분: ${additionalTaekwon ? additionalTaekwon.episodes.length + '개 에피소드' : '없음'}`);
    
    if (!mainTaekwon || !additionalTaekwon) {
      console.log('통합할 태권고등학교 웹툰을 찾을 수 없습니다.');
      
      // Show all taekwon related comics
      const allTaekwon = await prisma.comic.findMany({
        where: { title: { contains: '태권' } },
        include: { episodes: true }
      });
      
      console.log('\n태권 관련 웹툰들:');
      allTaekwon.forEach(comic => {
        console.log(`- "${comic.title}" (${comic.episodes.length}개 에피소드)`);
      });
      return;
    }
    
    // Get the highest episode number in main comic
    const maxEpisodeNumber = Math.max(...mainTaekwon.episodes.map(ep => ep.episodeNumber));
    console.log(`현재 메인 태권고등학교 최대 에피소드 번호: ${maxEpisodeNumber}`);
    
    let nextEpisodeNumber = maxEpisodeNumber + 1;
    
    // Sort additional episodes and move them
    const sortedAdditionalEpisodes = additionalTaekwon.episodes.sort((a, b) => a.episodeNumber - b.episodeNumber);
    
    console.log('\n추가분 에피소드들을 메인으로 이동 중...');
    for (const episode of sortedAdditionalEpisodes) {
      console.log(`  - 에피소드 ${episode.episodeNumber} -> ${nextEpisodeNumber} (제목: ${episode.title})`);
      
      await prisma.episode.update({
        where: { id: episode.id },
        data: { 
          comicId: mainTaekwon.id,
          episodeNumber: nextEpisodeNumber,
          title: `${nextEpisodeNumber}화 (구 ${episode.title})`
        }
      });
      
      nextEpisodeNumber++;
    }
    
    // Delete the additional comic
    await prisma.comic.delete({
      where: { id: additionalTaekwon.id }
    });
    
    console.log(`"${additionalTaekwon.title}" 삭제됨`);
    
    // Final verification
    const finalComic = await prisma.comic.findUnique({
      where: { id: mainTaekwon.id },
      include: { episodes: true }
    });
    
    const sortedFinalEpisodes = finalComic.episodes.sort((a, b) => a.episodeNumber - b.episodeNumber);
    
    console.log(`\n✅ 태권고등학교 통합 완료!`);
    console.log(`최종 에피소드 수: ${finalComic.episodes.length}개`);
    console.log(`에피소드 범위: ${sortedFinalEpisodes[0].episodeNumber} ~ ${sortedFinalEpisodes[sortedFinalEpisodes.length-1].episodeNumber}`);
    
  } catch (error) {
    console.error('오류:', error);
  } finally {
    await prisma.$disconnect();
  }
}

mergeTaekwonComics();