const { prisma } = require('./lib/prisma');

async function check() {
  const comics = await prisma.comic.findMany({
    select: { title: true, thumbnail: true }
  });
  
  comics.forEach(c => {
    console.log(c.title + ': ' + c.thumbnail);
  });
  
  await prisma.$disconnect();
}

check();
