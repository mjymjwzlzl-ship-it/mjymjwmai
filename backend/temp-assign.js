const { prisma } = require('./lib/prisma');

async function assign() {
  try {
    const user = await prisma.user.findUnique({ 
      where: { email: 'carryer123@naver.com' } 
    });
    
    if (!user) { 
      console.log('사용자 없음'); 
      return; 
    }
    
    const titles = ['사막', '태권고등학교', '세상의 종말', '교주의 연인'];
    
    for (const title of titles) {
      const comic = await prisma.comic.findFirst({ where: { title } });
      if (comic) {
        await prisma.comic.update({ 
          where: { id: comic.id }, 
          data: { authorId: user.id } 
        });
        console.log('OK: ' + title);
      } else {
        console.log('NOT FOUND: ' + title);
      }
    }
  } catch (e) { 
    console.error(e); 
  } finally { 
    await prisma.$disconnect(); 
  }
}

assign();
