const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkData() {
  try {
    const comics = await prisma.comic.findMany();
    const users = await prisma.user.findMany();
    const episodes = await prisma.episode.findMany();
    
    console.log('📊 Database Status:');
    console.log(`- Comics: ${comics.length}`);
    console.log(`- Users: ${users.length}`);
    console.log(`- Episodes: ${episodes.length}`);
    
    if (comics.length > 0) {
      console.log('\n📚 Comics in database:');
      comics.forEach(comic => {
        console.log(`  - ${comic.title} by ${comic.author}`);
      });
    }
  } catch (error) {
    console.error('Error checking database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();