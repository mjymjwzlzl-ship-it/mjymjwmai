const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function restoreWebtoons() {
  try {
    console.log('정확한 웹툰 데이터 복구 시작...');
    
    // uploads 폴더의 모든 파일 읽기
    const uploadsDir = path.join(__dirname, 'uploads');
    const files = fs.readdirSync(uploadsDir);
    
    console.log(`총 ${files.length}개 파일 발견`);
    
    // 웹툰별 파일 그룹화 (정확한 분류)
    const webtoons = {
      '사막': {
        title: '사막',
        author: '여우',
        genre: 'romance', // 일반웹툰
        pattern: /사막_/,
        thumbnail: null,
        episodes: {}
      },
      '태권고등학교': {
        title: '태권고등학교',
        author: '태권',
        genre: 'comedy', // 일반웹툰
        pattern: /^\d{13}_\d+_\d+\.png$/, // 타임스탬프_에피소드_페이지.png
        thumbnail: null,
        episodes: {}
      },
      '세상의 종말': {
        title: '세상의 종말',
        author: '익명',
        genre: 'adult', // 성인웹툰
        pattern: /세상의 종말/,
        thumbnail: null,
        episodes: {}
      },
      '교주의 연인': {
        title: '교주의 연인',
        author: '익명',
        genre: 'adult', // 성인웹툰
        pattern: /교주의 연인/,
        thumbnail: null,
        episodes: {}
      },
      '신도시미시': {
        title: '신도시미시',
        author: 'studio',
        genre: 'adult', // 성인웹툰
        pattern: /1754273609728/,
        thumbnail: '/uploads/1754273609728_포스터 표지.jpg',
        episodes: {}
      },
      '작품5': {
        title: '판타지 히어로',
        author: '김작가',
        genre: 'fantasy',
        pattern: /1754279668716/,
        thumbnail: '/uploads/1754279668716_thumbnail.jpg',
        episodes: {}
      },
      '작품6': {
        title: '러브 스토리',
        author: '이작가',
        genre: 'romance',
        pattern: /1754279815666/,
        thumbnail: '/uploads/1754279815666_thumbnail.jpg',
        episodes: {}
      }
    };
    
    // 파일들을 웹툰별로 분류
    files.forEach(filename => {
      if (!filename.match(/\.(jpg|png|jpeg)$/i)) return;
      
      for (const [key, webtoon] of Object.entries(webtoons)) {
        if (filename.match(webtoon.pattern)) {
          // 썸네일 찾기
          if (filename.includes('포스터') || filename.includes('thumbnail') || 
              filename.includes('Thumbnail') || filename.includes('표지') ||
              filename === '0.png') {
            webtoon.thumbnail = `/uploads/${filename}`;
            console.log(`${key} 썸네일: ${filename}`);
            continue;
          }
          
          // 에피소드 번호 추출
          let episodeNum = 1;
          if (key === '세상의 종말') {
            const match = filename.match(/(\d+)화/);
            if (match) episodeNum = parseInt(match[1]);
          } else if (key === '교주의 연인') {
            const match = filename.match(/(\d+)화/);
            if (match) episodeNum = parseInt(match[1]);
          } else if (key === '사막') {
            const match = filename.match(/사막_(\d+)_/);
            if (match) {
              episodeNum = parseInt(match[1]);
              // 0화는 프롤로그로 1화로 처리
              if (episodeNum === 0) episodeNum = 1;
              else episodeNum += 1; // 1화부터 시작하도록 조정
            }
          } else if (key === '태권고등학교') {
            // 태권고등학교: 타임스탬프_에피소드_페이지.png
            const match = filename.match(/^\d{13}_(\d+)_\d+\.png$/);
            if (match) {
              episodeNum = parseInt(match[1]);
              // 에피소드 0을 썸네일로 사용
              if (episodeNum === 0 && !webtoon.thumbnail) {
                webtoon.thumbnail = `/uploads/${filename}`;
                continue;
              }
            }
          }
          
          if (!webtoon.episodes[episodeNum]) {
            webtoon.episodes[episodeNum] = [];
          }
          webtoon.episodes[episodeNum].push(`/uploads/${filename}`);
        }
      }
    });
    
    // 기존 데이터 정리
    await prisma.episode.deleteMany({});
    await prisma.comment.deleteMany({});
    await prisma.comic.deleteMany({});
    console.log('기존 데이터 정리 완료');
    
    // 데이터베이스에 웹툰 생성
    const createdComics = {};
    
    for (const [key, webtoon] of Object.entries(webtoons)) {
      if (Object.keys(webtoon.episodes).length === 0) {
        console.log(`${key}: 에피소드 없음, 건너뜀`);
        continue;
      }
      
      console.log(`${key} 생성 중... (${Object.keys(webtoon.episodes).length}개 에피소드)`);
      
      // 썸네일이 없으면 첫 번째 에피소드의 첫 번째 이미지 사용
      if (!webtoon.thumbnail) {
        const firstEpisodeNum = Math.min(...Object.keys(webtoon.episodes).map(n => parseInt(n)));
        webtoon.thumbnail = webtoon.episodes[firstEpisodeNum][0];
      }
      
      // 웹툰 생성
      const comic = await prisma.comic.create({
        data: {
          title: webtoon.title,
          description: `${webtoon.title} 웹툰`,
          thumbnail: webtoon.thumbnail,
          genre: webtoon.genre,
          authorName: webtoon.author,
          isOfficial: false,
          status: 'ONGOING',
          rating: webtoon.genre === 'adult' ? '19' : 'all'
        }
      });
      
      createdComics[key] = comic;
      console.log(`웹툰 생성: ${comic.title} (${comic.id}) - ${webtoon.genre === 'adult' ? '성인' : '일반'}`);
      
      // 에피소드들 생성 (번호순으로 정렬)
      const sortedEpisodes = Object.keys(webtoon.episodes)
        .map(n => parseInt(n))
        .sort((a, b) => a - b);
        
      for (const episodeNum of sortedEpisodes) {
        const images = webtoon.episodes[episodeNum];
        
        await prisma.episode.create({
          data: {
            title: `${episodeNum}화`,
            episodeNumber: episodeNum,
            comicId: comic.id,
            images: JSON.stringify(images.sort()), // 이미지 정렬
            thumbnail: images[0] // 첫 번째 이미지를 썸네일로
          }
        });
      }
      
      console.log(`에피소드 ${sortedEpisodes.length}개 생성 완료`);
    }
    
    // 카테고리 설정 업데이트
    const categorySettings = {
      all: [], // 일반웹툰만
      popular: [],
      editors: [],
      new: [],
      waitfree: []
    };
    
    const adultCategorySettings = {
      all: [], // 성인웹툰만
      popular: [],
      editors: [],
      new: [],
      waitfree: []
    };
    
    // 일반웹툰 카테고리 설정
    if (createdComics['사막']) {
      categorySettings.all.push(createdComics['사막'].id);
      categorySettings.popular.push(createdComics['사막'].id);
      categorySettings.new.push(createdComics['사막'].id);
      categorySettings.waitfree.push(createdComics['사막'].id);
    }
    
    if (createdComics['태권고등학교']) {
      categorySettings.all.push(createdComics['태권고등학교'].id);
      categorySettings.editors.push(createdComics['태권고등학교'].id);
    }
    
    // 성인웹툰 카테고리 설정
    if (createdComics['세상의 종말']) {
      adultCategorySettings.all.push(createdComics['세상의 종말'].id);
      adultCategorySettings.popular.push(createdComics['세상의 종말'].id);
      adultCategorySettings.new.push(createdComics['세상의 종말'].id);
    }
    
    if (createdComics['교주의 연인']) {
      adultCategorySettings.all.push(createdComics['교주의 연인'].id);
      adultCategorySettings.editors.push(createdComics['교주의 연인'].id);
      adultCategorySettings.waitfree.push(createdComics['교주의 연인'].id);
    }
    
    // 카테고리 설정 파일 업데이트
    const dataDir = path.join(__dirname, 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir);
    }
    
    fs.writeFileSync(
      path.join(dataDir, 'category-settings.json'),
      JSON.stringify(categorySettings, null, 2)
    );
    
    fs.writeFileSync(
      path.join(dataDir, 'adult-category-settings.json'),
      JSON.stringify(adultCategorySettings, null, 2)
    );
    
    console.log('카테고리 설정 파일 업데이트 완료');
    console.log('일반웹툰:', Object.keys(createdComics).filter(k => !['세상의 종말', '교주의 연인'].includes(k)));
    console.log('성인웹툰:', Object.keys(createdComics).filter(k => ['세상의 종말', '교주의 연인'].includes(k)));
    console.log('정확한 웹툰 데이터 복구 완료!');
    
  } catch (error) {
    console.error('복구 중 오류:', error);
  } finally {
    await prisma.$disconnect();
  }
}

restoreWebtoons();