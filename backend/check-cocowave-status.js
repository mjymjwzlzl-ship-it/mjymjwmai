const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const cocowave = await prisma.user.findUnique({
    where: { email: 'cocowave@arata.co.kr' }
  });

  if (!cocowave) {
    console.log('cocowave account not found');
    return;
  }

  const totalComics = await prisma.comic.count({
    where: { authorId: cocowave.id }
  });

  const hiddenComics = await prisma.comic.count({
    where: {
      authorId: cocowave.id,
      status: 'HIDDEN'
    }
  });

  const officialComics = await prisma.comic.count({
    where: {
      authorId: cocowave.id,
      isOfficial: true
    }
  });

  console.log('AWS Server DB Status:');
  console.log(`  Email: ${cocowave.email}`);
  console.log(`  Total comics: ${totalComics}`);
  console.log(`  Hidden comics: ${hiddenComics}`);
  console.log(`  Official comics: ${officialComics}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
