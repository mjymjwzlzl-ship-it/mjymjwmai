const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findGajunggyosa() {
  const result = await prisma.comic.findMany({
    where: {
      OR: [
        { title: { contains: '가정교사' } },
        { title: { contains: '교사' } }
      ]
    },
    select: { id: true, title: true, thumbnail: true, rating: true }
  });

  console.log(`Found ${result.length} webtoons:`);
  result.forEach(w => {
    console.log(`\nID: ${w.id}`);
    console.log(`제목: ${w.title}`);
    console.log(`등급: ${w.rating}`);
    console.log(`썸네일: ${w.thumbnail}`);
  });

  await prisma.$disconnect();
}

findGajunggyosa().catch(console.error);
