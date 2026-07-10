// 프로젝트 이더 (A.R.I.A.) 채팅용 작품 생성 스크립트
const { prisma } = require('./lib/prisma');

async function main() {
  const title = '프로젝트 이더';

  const existing = await prisma.comic.findFirst({ where: { title } });
  if (existing) {
    console.log('이미 존재:', existing.id);
    return;
  }

  const comic = await prisma.comic.create({
    data: {
      title,
      description:
        '여성만 발현하는 초능력. 세계를 지키는 국제 초능력 방위 기구 A.R.I.A.의 소녀들과, 지구를 노리는 외계 제국 네메시스. 유일한 남성 지휘관인 당신이 그녀들을 이끈다.',
      thumbnail: '/uploads/webtoons/general/프로젝트 이더/thumbnail.png',
      genre: 'fantasy',
      isOfficial: true,
      status: 'ONGOING',
      rating: 'all',
      authorName: 'ARATA',
      paidStartEpisode: 1,
    },
  });

  console.log('생성 완료:', comic.id);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
