const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAdultThumbnails() {
  const adults = await prisma.comic.findMany({
    where: { rating: '19' },
    select: { title: true, thumbnail: true },
    take: 5
  });

  console.log('Adult webtoon thumbnails:');
  adults.forEach(a => {
    console.log(`\n제목: ${a.title}`);
    console.log(`썸네일: ${a.thumbnail}`);
  });

  await prisma.$disconnect();
}

checkAdultThumbnails().catch(console.error);
