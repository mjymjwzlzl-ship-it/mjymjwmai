const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

p.comic.findMany({
  where: { title: { contains: '고교정점' } },
  select: {
    id: true,
    title: true,
    status: true,
    thumbnail: true,
    _count: { select: { episodes: true } }
  }
}).then(r => {
  console.log(JSON.stringify(r, null, 2));
  p.$disconnect();
}).catch(e => {
  console.error(e.message);
  p.$disconnect();
});
