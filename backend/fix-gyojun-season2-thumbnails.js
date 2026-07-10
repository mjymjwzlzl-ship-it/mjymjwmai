const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const prisma = new PrismaClient();

(async () => {
  try {
    console.log('='.repeat(60));
    console.log('고교전설 시즌2 에피소드 썸네일 연동 시작');
    console.log('='.repeat(60));

    // 고교전설 시즌2 웹툰 찾기
    const webtoon = await prisma.comic.findFirst({
      where: {
        title: '고교전설 시즌2'
      },
      include: {
        episodes: {
          orderBy: { episodeNumber: 'asc' }
        }
      }
    });

    if (!webtoon) {
      console.log('❌ 고교전설 시즌2 웹툰을 찾을 수 없습니다.');
      return;
    }

    console.log(`\n✅ 웹툰 정보:`);
    console.log(`  제목: ${webtoon.title}`);
    console.log(`  ID: ${webtoon.id}`);
    console.log(`  에피소드 수: ${webtoon.episodes.length}`);

    // 썸네일 폴더 경로
    const thumbnailFolder = path.join(__dirname, 'uploads/webtoons/general/고교전설 시즌2/thumbnails');

    console.log(`\n📁 썸네일 폴더: ${thumbnailFolder}`);

    if (!fs.existsSync(thumbnailFolder)) {
      console.log('❌ 썸네일 폴더가 존재하지 않습니다.');
      return;
    }

    // 썸네일 파일 목록
    const thumbnailFiles = fs.readdirSync(thumbnailFolder).filter(f =>
      f.endsWith('.webp') || f.endsWith('.jpg') || f.endsWith('.png')
    );

    console.log(`📸 썸네일 파일 수: ${thumbnailFiles.length}\n`);

    // 에피소드별 썸네일 업데이트
    let successCount = 0;
    let failCount = 0;

    console.log('🔄 에피소드 썸네일 업데이트 중...\n');

    for (const episode of webtoon.episodes) {
      const episodeNum = episode.episodeNumber;

      // 파일명 형식: 001화.webp, 002화.webp, ...
      const paddedNum = String(episodeNum).padStart(3, '0');
      const thumbnailFileName = `${paddedNum}화.webp`;
      const thumbnailPath = `/uploads/webtoons/general/고교전설 시즌2/thumbnails/${thumbnailFileName}`;

      // 실제 파일 존재 여부 확인
      const fullPath = path.join(thumbnailFolder, thumbnailFileName);
      const fileExists = fs.existsSync(fullPath);

      if (fileExists) {
        // DB 업데이트
        await prisma.episode.update({
          where: { id: episode.id },
          data: { thumbnail: thumbnailPath }
        });

        successCount++;
        console.log(`✅ ${episodeNum}화: "${episode.title}" → ${thumbnailFileName}`);
      } else {
        failCount++;
        console.log(`❌ ${episodeNum}화: "${episode.title}" - 파일 없음 (${thumbnailFileName})`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 업데이트 완료');
    console.log('='.repeat(60));
    console.log(`✅ 성공: ${successCount}개`);
    console.log(`❌ 실패: ${failCount}개`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
})();
