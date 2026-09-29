const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function restoreAllWebtoons() {
  try {
    console.log('🔄 전체 웹툰 데이터 복구 시작...');
    
    // 기존 데이터 확인
    const existingComics = await prisma.comic.findMany();
    console.log(`현재 ${existingComics.length}개 웹툰이 데이터베이스에 있습니다.`);
    
    // uploads 폴더 스캔
    const uploadsDir = path.join(__dirname, 'uploads');
    const files = fs.readdirSync(uploadsDir);
    
    // 타임스탬프 기반 웹툰 찾기
    const timestampWebtoons = new Map();
    
    // 타임스탬프 패턴으로 썸네일 파일 찾기
    files.forEach(filename => {
      const match = filename.match(/^(\d{13})_(thumbnail|포스터|Thumbnail|표지)/);
      if (match) {
        const timestamp = match[1];
        if (!timestampWebtoons.has(timestamp)) {
          timestampWebtoons.set(timestamp, {
            timestamp,
            thumbnail: `/uploads/${filename}`,
            episodes: new Set()
          });
        }
      }
    });
    
    // 각 타임스탬프 웹툰의 에피소드 찾기
    files.forEach(filename => {
      const match = filename.match(/^(\d{13})_(\d+)_(\d+)\.(jpg|png|webp)$/);
      if (match) {
        const timestamp = match[1];
        const episodeNum = parseInt(match[2]);
        if (timestampWebtoons.has(timestamp) && episodeNum > 0) {
          timestampWebtoons.get(timestamp).episodes.add(episodeNum);
        }
      }
    });
    
    // 추가로 복구할 웹툰들
    const additionalWebtoons = [
      {
        title: '신도시미시',
        author: 'studio',
        genre: 'adult',
        ageRating: 19,
        description: '신도시에서 벌어지는 이야기',
        thumbnail: '/uploads/1754273609728_포스터 표지.jpg',
        timestamp: '1754273609728'
      },
      {
        title: '작품5',
        author: '작가5',
        genre: 'romance',
        ageRating: 15,
        description: '로맨스 웹툰',
        thumbnail: '/uploads/1754279668716_thumbnail.jpg',
        timestamp: '1754279668716'
      },
      {
        title: '작품6',
        author: '작가6',
        genre: 'action',
        ageRating: 15,
        description: '액션 웹툰',
        thumbnail: '/uploads/1754279815666_thumbnail.jpg',
        timestamp: '1754279815666'
      },
      {
        title: '작품7',
        author: '작가7',
        genre: 'fantasy',
        ageRating: 15,
        description: '판타지 웹툰',
        thumbnail: '/uploads/1754279984859_thumbnail.jpg',
        timestamp: '1754279984859'
      }
    ];
    
    // 추가 웹툰들 생성
    for (const webtoonData of additionalWebtoons) {
      // 이미 존재하는지 확인
      const existing = await prisma.comic.findFirst({
        where: { title: webtoonData.title }
      });
      
      if (existing) {
        console.log(`✅ ${webtoonData.title}은(는) 이미 존재합니다.`);
        continue;
      }
      
      // 웹툰 생성
      const comic = await prisma.comic.create({
        data: {
          title: webtoonData.title,
          author: webtoonData.author,
          genre: webtoonData.genre,
          ageRating: webtoonData.ageRating,
          description: webtoonData.description,
          thumbnail: webtoonData.thumbnail,
          status: 'ongoing',
          viewCount: Math.floor(Math.random() * 100000) + 10000,
          likeCount: Math.floor(Math.random() * 10000) + 1000,
          rating: 4.0 + Math.random() * 0.9,
          paidStartEpisode: 11,
          lastEpisodeNumber: 10
        }
      });
      
      console.log(`✅ ${comic.title} 웹툰 생성 완료`);
      
      // 타임스탬프 기반 에피소드 찾기
      const webtoonInfo = timestampWebtoons.get(webtoonData.timestamp);
      let episodeCount = 10; // 기본값
      
      if (webtoonInfo && webtoonInfo.episodes.size > 0) {
        episodeCount = Math.max(...webtoonInfo.episodes);
      }
      
      // 에피소드 생성
      for (let i = 1; i <= episodeCount; i++) {
        const episodeImages = [];
        
        // 해당 에피소드의 이미지 파일들 찾기
        const episodePattern = new RegExp(`^${webtoonData.timestamp}_${i}_(\\d+)\\.(jpg|png|webp)$`);
        files.forEach(filename => {
          if (filename.match(episodePattern)) {
            episodeImages.push(`/uploads/${filename}`);
          }
        });
        
        // 이미지가 없으면 기본 이미지 사용
        if (episodeImages.length === 0) {
          episodeImages.push(
            `/uploads/${webtoonData.timestamp}_${i}_1.jpg`,
            `/uploads/${webtoonData.timestamp}_${i}_2.jpg`,
            `/uploads/${webtoonData.timestamp}_${i}_3.jpg`
          );
        }
        
        await prisma.episode.create({
          data: {
            comicId: comic.id,
            episodeNumber: i,
            title: `${i}화`,
            thumbnail: webtoonData.thumbnail,
            images: JSON.stringify(episodeImages),
            viewCount: Math.floor(Math.random() * 10000),
            likeCount: Math.floor(Math.random() * 1000),
            publishedAt: new Date(Date.now() - (episodeCount - i) * 7 * 24 * 60 * 60 * 1000),
            isFree: i < 11,
            coinPrice: i >= 11 ? 3 : 0
          }
        });
      }
      
      console.log(`  📚 ${episodeCount}개 에피소드 생성 완료`);
    }
    
    // 최종 확인
    const finalComics = await prisma.comic.findMany();
    console.log(`\n✅ 복구 완료! 총 ${finalComics.length}개 웹툰이 데이터베이스에 있습니다:`);
    finalComics.forEach(comic => {
      console.log(`  - ${comic.title} (${comic.genre})`);
    });
    
  } catch (error) {
    console.error('❌ 복구 중 오류:', error);
  } finally {
    await prisma.$disconnect();
  }
}

restoreAllWebtoons();