const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const prisma = new PrismaClient();

(async () => {
  try {
    // 고교전설 시즌2 웹툰 찾기
    const webtoons = await prisma.comic.findMany({
      where: {
        title: {
          contains: '고교전설'
        }
      },
      include: {
        episodes: {
          orderBy: { episodeNumber: 'asc' }
        }
      }
    });

    console.log(`\n📚 찾은 웹툰 수: ${webtoons.length}\n`);

    for (const webtoon of webtoons) {
      console.log('='.repeat(60));
      console.log(`📖 제목: ${webtoon.title}`);
      console.log(`🆔 ID: ${webtoon.id}`);
      console.log(`📂 Category: ${webtoon.category}`);
      console.log(`📊 에피소드 수: ${webtoon.episodes.length}`);
      console.log('='.repeat(60));

      // uploads 폴더에서 썸네일 확인
      const webtoonFolder = path.join(__dirname, 'uploads/webtoons', webtoon.category || 'general', webtoon.title);
      const thumbnailFolder = path.join(webtoonFolder, 'thumbnails');

      console.log(`\n📁 썸네일 폴더 경로: ${thumbnailFolder}`);

      let thumbnailFiles = [];
      if (fs.existsSync(thumbnailFolder)) {
        console.log('✅ 썸네일 폴더 존재함');
        thumbnailFiles = fs.readdirSync(thumbnailFolder).filter(f =>
          f.endsWith('.jpg') || f.endsWith('.png') || f.endsWith('.webp')
        );
        console.log(`📸 썸네일 파일 수: ${thumbnailFiles.length}`);
        console.log('썸네일 파일 목록:');
        thumbnailFiles.forEach(f => console.log(`  - ${f}`));
      } else {
        console.log('❌ 썸네일 폴더 없음');
      }

      // 에피소드별 썸네일 상태 확인
      console.log('\n📋 에피소드별 썸네일 상태:\n');

      let missingThumbnails = 0;
      let existingThumbnails = 0;

      for (const episode of webtoon.episodes) {
        const thumbnailPath = episode.thumbnail;
        const hasThumbnail = thumbnailPath && thumbnailPath.trim() !== '';

        if (!hasThumbnail) {
          missingThumbnails++;
          console.log(`❌ ${episode.episodeNumber}화: "${episode.title}" - 썸네일 없음 (DB에 경로 없음)`);
        } else {
          // 실제 파일 존재 여부 확인
          // thumbnailPath는 '/uploads/...'로 시작하므로 앞의 '/'를 제거하고 __dirname과 결합
          const relativePath = thumbnailPath.replace(/^\//, '');
          const fullPath = path.join(__dirname, relativePath);
          const fileExists = fs.existsSync(fullPath);

          if (fileExists) {
            existingThumbnails++;
            console.log(`✅ ${episode.episodeNumber}화: "${episode.title}" - 썸네일 있음 (${thumbnailPath})`);
          } else {
            missingThumbnails++;
            console.log(`⚠️  ${episode.episodeNumber}화: "${episode.title}" - DB 경로 있으나 파일 없음 (${thumbnailPath})`);
          }
        }
      }

      console.log('\n' + '='.repeat(60));
      console.log(`📊 요약:`);
      console.log(`  ✅ 썸네일 있음: ${existingThumbnails}/${webtoon.episodes.length}`);
      console.log(`  ❌ 썸네일 없음: ${missingThumbnails}/${webtoon.episodes.length}`);
      console.log('='.repeat(60) + '\n');
    }

  } catch (error) {
    console.error('❌ 오류:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
})();
