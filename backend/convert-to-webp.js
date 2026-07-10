const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

// WebP 변환 설정
const QUALITY = 85; // WebP 품질 (1-100)
const BATCH_SIZE = 10; // 동시 처리할 이미지 수

// 이미지 변환 함수
async function convertToWebP(inputPath, outputPath, quality = QUALITY) {
  try {
    await sharp(inputPath)
      .webp({ quality })
      .toFile(outputPath);
    
    const inputStats = await fs.stat(inputPath);
    const outputStats = await fs.stat(outputPath);
    const savedPercentage = ((1 - outputStats.size / inputStats.size) * 100).toFixed(1);
    
    return {
      original: inputPath,
      webp: outputPath,
      originalSize: inputStats.size,
      webpSize: outputStats.size,
      saved: savedPercentage + '%'
    };
  } catch (error) {
    console.error(`변환 실패: ${inputPath}`, error.message);
    return null;
  }
}

// 디렉토리 내 모든 이미지 찾기
async function findImages(dir) {
  const images = [];
  const files = await fs.readdir(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = await fs.stat(filePath);
    
    if (stat.isDirectory()) {
      // 재귀적으로 하위 디렉토리 검색
      const subImages = await findImages(filePath);
      images.push(...subImages);
    } else if (/\.(jpg|jpeg|png)$/i.test(file)) {
      // WebP 파일이 이미 있는지 확인
      const webpPath = filePath.replace(/\.(jpg|jpeg|png)$/i, '.webp');
      const webpExists = await fs.access(webpPath).then(() => true).catch(() => false);
      
      if (!webpExists) {
        images.push(filePath);
      }
    }
  }
  
  return images;
}

// 배치 처리
async function processBatch(images, startIndex, batchSize) {
  const batch = images.slice(startIndex, startIndex + batchSize);
  const promises = batch.map(async (imagePath) => {
    const webpPath = imagePath.replace(/\.(jpg|jpeg|png)$/i, '.webp');
    return convertToWebP(imagePath, webpPath);
  });
  
  return Promise.all(promises);
}

// 메인 실행 함수
async function main() {
  console.log('🚀 WebP 변환 시작...\n');
  
  const uploadsDir = path.join(__dirname, 'uploads');
  
  // uploads 디렉토리 확인
  try {
    await fs.access(uploadsDir);
  } catch {
    console.error('❌ uploads 디렉토리를 찾을 수 없습니다.');
    return;
  }
  
  // 이미지 파일 찾기
  console.log('📁 이미지 파일 검색 중...');
  const images = await findImages(uploadsDir);
  console.log(`✅ ${images.length}개의 변환 필요한 이미지 발견\n`);
  
  if (images.length === 0) {
    console.log('모든 이미지가 이미 WebP로 변환되었거나 변환할 이미지가 없습니다.');
    return;
  }
  
  // 진행 상황 표시
  let converted = 0;
  let totalSaved = 0;
  let totalOriginalSize = 0;
  let totalWebPSize = 0;
  const results = [];
  
  // 배치 처리
  for (let i = 0; i < images.length; i += BATCH_SIZE) {
    const batchResults = await processBatch(images, i, BATCH_SIZE);
    
    for (const result of batchResults) {
      if (result) {
        converted++;
        totalOriginalSize += result.originalSize;
        totalWebPSize += result.webpSize;
        results.push(result);
        
        console.log(`✅ [${converted}/${images.length}] ${path.basename(result.original)} → WebP (${result.saved} 절감)`);
      }
    }
    
    // 진행률 표시
    const progress = Math.round((Math.min(i + BATCH_SIZE, images.length) / images.length) * 100);
    console.log(`📊 진행률: ${progress}%\n`);
  }
  
  // 결과 요약
  console.log('\n========================================');
  console.log('📊 WebP 변환 완료!');
  console.log('========================================');
  console.log(`✅ 성공: ${converted}개`);
  console.log(`❌ 실패: ${images.length - converted}개`);
  console.log(`📦 원본 총 크기: ${(totalOriginalSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`📦 WebP 총 크기: ${(totalWebPSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`💾 절감된 용량: ${((totalOriginalSize - totalWebPSize) / 1024 / 1024).toFixed(2)} MB`);
  console.log(`📈 평균 압축률: ${((1 - totalWebPSize / totalOriginalSize) * 100).toFixed(1)}%`);
  
  // 가장 많이 절감된 파일 Top 5
  if (results.length > 0) {
    console.log('\n🏆 가장 많이 압축된 파일 TOP 5:');
    results
      .sort((a, b) => parseFloat(b.saved) - parseFloat(a.saved))
      .slice(0, 5)
      .forEach((result, index) => {
        console.log(`${index + 1}. ${path.basename(result.original)} - ${result.saved} 절감`);
      });
  }
}

// 명령줄 인자 처리
if (process.argv.includes('--help')) {
  console.log(`
WebP 이미지 변환 도구

사용법:
  node convert-to-webp.js [옵션]

옵션:
  --help     도움말 표시
  --quality  WebP 품질 설정 (1-100, 기본값: 85)

예제:
  node convert-to-webp.js
  node convert-to-webp.js --quality 90
  `);
  process.exit(0);
}

// 품질 설정
const qualityArg = process.argv.indexOf('--quality');
if (qualityArg !== -1 && process.argv[qualityArg + 1]) {
  const quality = parseInt(process.argv[qualityArg + 1]);
  if (quality >= 1 && quality <= 100) {
    QUALITY = quality;
  }
}

// 실행
main().catch(console.error);