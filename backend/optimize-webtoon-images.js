const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

// 웹툰 이미지 공격적 최적화 설정
const WEBTOON_CONFIG = {
  // 모바일 우선 최적화
  mobile: {
    width: 720,        // 모바일 최적 너비
    quality: 80,       // 품질 (80이면 충분)
    effort: 6          // 최대 압축
  },
  // 썸네일 생성
  thumbnail: {
    width: 360,        // 썸네일 너비
    quality: 70,       // 썸네일은 낮은 품질
    suffix: '_thumb'
  },
  // Progressive JPEG 설정
  progressive: true
};

async function createProgressiveWebP(inputPath, outputPath, config) {
  try {
    const metadata = await sharp(inputPath).metadata();
    
    // 너비가 config.width보다 큰 경우만 리사이즈
    const shouldResize = metadata.width > config.width;
    
    let pipeline = sharp(inputPath);
    
    if (shouldResize) {
      pipeline = pipeline.resize(config.width, null, {
        withoutEnlargement: true,
        fit: 'inside',
        kernel: sharp.kernel.lanczos3  // 더 나은 품질의 리사이징
      });
    }
    
    // Progressive WebP 생성
    await pipeline
      .webp({
        quality: config.quality,
        effort: config.effort,
        lossless: false,
        nearLossless: false,
        smartSubsample: true,
        reductionEffort: 6,
        pageHeight: 0  // Progressive 렌더링 활성화
      })
      .toFile(outputPath);
    
    return true;
  } catch (error) {
    console.error(`실패: ${inputPath}`, error.message);
    return false;
  }
}

async function createThumbnail(inputPath, outputDir, config) {
  try {
    const basename = path.basename(inputPath, path.extname(inputPath));
    const thumbPath = path.join(outputDir, `${basename}${config.suffix}.webp`);
    
    await sharp(inputPath)
      .resize(config.width, null, {
        withoutEnlargement: true,
        fit: 'inside'
      })
      .webp({
        quality: config.quality,
        effort: 3  // 썸네일은 빠르게
      })
      .toFile(thumbPath);
    
    return thumbPath;
  } catch (error) {
    console.error(`썸네일 생성 실패: ${inputPath}`, error.message);
    return null;
  }
}

async function optimizeWebtoonImage(inputPath) {
  const ext = path.extname(inputPath).toLowerCase();
  const dir = path.dirname(inputPath);
  const basename = path.basename(inputPath, ext);
  
  // WebP가 아닌 경우 변환
  let webpPath = inputPath;
  if (ext !== '.webp') {
    webpPath = path.join(dir, `${basename}.webp`);
    
    // 이미 변환된 파일이 있는지 확인
    try {
      await fs.access(webpPath);
      console.log(`✓ 이미 변환됨: ${basename}${ext}`);
      
      // 원본 삭제
      await fs.unlink(inputPath);
    } catch {
      // WebP 변환
      const success = await createProgressiveWebP(inputPath, webpPath, WEBTOON_CONFIG.mobile);
      if (success) {
        console.log(`✓ 변환 완료: ${basename}${ext} → ${basename}.webp`);
        
        // 원본 삭제
        await fs.unlink(inputPath);
      }
    }
  } else {
    // 이미 WebP인 경우 재최적화
    const tempPath = path.join(dir, `${basename}_temp.webp`);
    const success = await createProgressiveWebP(webpPath, tempPath, WEBTOON_CONFIG.mobile);
    
    if (success) {
      // 파일 크기 비교
      const originalStats = await fs.stat(webpPath);
      const optimizedStats = await fs.stat(tempPath);
      
      if (optimizedStats.size < originalStats.size * 0.9) {
        // 10% 이상 개선된 경우 교체
        await fs.unlink(webpPath);
        await fs.rename(tempPath, webpPath);
        
        const reduction = ((1 - optimizedStats.size / originalStats.size) * 100).toFixed(1);
        console.log(`✓ 재최적화: ${basename}.webp (${reduction}% 감소)`);
      } else {
        // 개선이 미미하면 임시 파일 삭제
        await fs.unlink(tempPath);
      }
    }
  }
  
  // 썸네일 생성 (에피소드 이미지인 경우만)
  if (webpPath.includes('episode') || webpPath.includes('comic')) {
    const thumbPath = path.join(dir, `${basename}${WEBTOON_CONFIG.thumbnail.suffix}.webp`);
    
    try {
      await fs.access(thumbPath);
    } catch {
      // 썸네일이 없으면 생성
      await createThumbnail(webpPath, dir, WEBTOON_CONFIG.thumbnail);
      console.log(`  └ 썸네일 생성: ${basename}${WEBTOON_CONFIG.thumbnail.suffix}.webp`);
    }
  }
}

async function processDirectory(directory) {
  try {
    const files = await fs.readdir(directory, { withFileTypes: true });
    
    for (const file of files) {
      const fullPath = path.join(directory, file.name);
      
      if (file.isDirectory()) {
        await processDirectory(fullPath);
      } else if (file.isFile()) {
        const ext = path.extname(file.name).toLowerCase();
        
        // 썸네일이 아닌 이미지 파일만 처리
        if (['.jpg', '.jpeg', '.png', '.webp'].includes(ext) && !file.name.includes('_thumb')) {
          await optimizeWebtoonImage(fullPath);
        }
      }
    }
  } catch (error) {
    console.error(`디렉토리 처리 실패: ${directory}`, error.message);
  }
}

async function main() {
  console.log('=== 공격적 웹툰 이미지 최적화 시작 ===\n');
  console.log('설정:');
  console.log(`- 모바일 너비: ${WEBTOON_CONFIG.mobile.width}px`);
  console.log(`- 모바일 품질: ${WEBTOON_CONFIG.mobile.quality}`);
  console.log(`- 썸네일 너비: ${WEBTOON_CONFIG.thumbnail.width}px`);
  console.log(`- Progressive 렌더링: 활성화\n`);
  
  const uploadDir = path.join(__dirname, 'uploads');
  
  console.log(`📁 처리 중: ${uploadDir}\n`);
  await processDirectory(uploadDir);
  
  console.log('\n=== 최적화 완료 ===');
}

main().catch(console.error);