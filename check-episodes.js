const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkEpisodes() {
  const episodes = await prisma.episode.findMany({
    take: 10,
    select: {
      id: true,
      title: true,
      episodeNumber: true,
      comicId: true,
      comic: {
        select: {
          title: true,
          paidStartEpisode: true,
          episodeCoinPrice: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
  
  console.log('에피소드 목록:');
  episodes.forEach(ep => {
    const isFree = ep.comic.paidStartEpisode === 0 || ep.episodeNumber < ep.comic.paidStartEpisode;
    const coinPrice = isFree ? 0 : (ep.comic.episodeCoinPrice || 3);
    console.log('- ID: ' + ep.id);
    console.log('  제목: ' + ep.title + ' (' + ep.episodeNumber + '화)');
    console.log('  웹툰: ' + ep.comic.title);
    console.log('  무료여부: ' + (isFree ? '무료' : '유료'));
    console.log('  코인가격: ' + coinPrice + '코인');
    console.log('');
  });
  
  await prisma.$disconnect();
}

checkEpisodes();