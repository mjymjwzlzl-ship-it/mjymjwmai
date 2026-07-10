const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

// 웹툰 이미지 최적화 설정
const WEBTOON_CONFIG = {
  maxWidth: 800,      // 웹툰은 세로로 긴 이미지이므로 너비 제한
  quality: 85,        // WebP 품질 (85가 최적)
  effort: 4,          // 압축 노력 (0-6, 높을수록 느리지만 압축률 좋음)
  format: 'webp'      // 출력 포맷
};

async function optimizeImage(inputPath, outputPath) {
  try {
    const metadata = await sharp(inputPath).metadata();
    
    // 이미지가 너무 큰 경우만 리사이즈
    const shouldResize = metadata.width > WEBTOON_CONFIG.maxWidth;
    
    let pipeline = sharp(inputPath);
    
    if (shouldResize) {
      pipeline = pipeline.resize(WEBTOON_CONFIG.maxWidth, null, {
        withoutEnlargement: true,
        fit: 'inside'
      });
    }
    
    // WebP로 변환 및 최적화
    await pipeline
      .webp({
        quality: WEBTOON_CONFIG.quality,
        effort: WEBTOON_CONFIG.effort,
        lossless: false,
        nearLossless: false,
        smartSubsample: true,
        reductionEffort: 4
      })
      .toFile(outputPath);
    
    // 파일 크기 비교
    const originalStats = await fs.stat(inputPath);
    const optimizedStats = await fs.stat(outputPath);
    const reduction = ((1 - optimizedStats.size / originalStats.size) * 100).toFixed(2);
    
    console.log(`✓ ${path.basename(inputPath)} → ${path.basename(outputPath)}`);
    console.log(`  크기: ${(originalStats.size / 1024 / 1024).toFixed(2)}MB → ${(optimizedStats.size / 1024 / 1024).toFixed(2)}MB (${reduction}% 감소)`);
    
    return {
      original: originalStats.size,
      optimized: optimizedStats.size,
      reduction: parseFloat(reduction)
    };
  } catch (error) {
    console.error(`✗ 최적화 실패: ${inputPath}`, error.message);
    return null;
  }
}

async function optimizeDirectory(directory) {
  let totalOriginal = 0;
  let totalOptimized = 0;
  let fileCount = 0;
  
  try {
    const files = await fs.readdir(directory, { withFileTypes: true });
    
    for (const file of files) {
      const fullPath = path.join(directory, file.name);
      
      if (file.isDirectory()) {
        // 재귀적으로 하위 디렉토리 처리
        const subResult = await optimizeDirectory(fullPath);
        totalOriginal += subResult.totalOriginal;
        totalOptimized += subResult.totalOptimized;
        fileCount += subResult.fileCount;
      } else if (file.isFile()) {
        const ext = path.extname(file.name).toLowerCase();
        
        // 이미지 파일만 처리
        if (['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
          let outputPath;
          
          if (ext === '.webp') {
            // 이미 WebP인 경우 재최적화
            outputPath = fullPath.replace('.webp', '_opt.webp');
          } else {
            // 다른 포맷은 WebP로 변환
            outputPath = fullPath.replace(/\.(jpg|jpeg|png)$/i, '.webp');
          }
          
          // 이미 최적화된 파일이 있는지 확인
          try {
            await fs.access(outputPath);
            if (ext !== '.webp') {
              console.log(`✓ 이미 최적화됨: ${file.name}`);
              continue;
            }
          } catch {
            // 파일이 없으면 최적화 진행
          }
          
          const result = await optimizeImage(fullPath, outputPath);
          
          if (result) {
            totalOriginal += result.original;
            totalOptimized += result.optimized;
            fileCount++;
            
            // 원본 파일 삭제 (WebP가 아닌 경우만)
            if (ext !== '.webp') {
              await fs.unlink(fullPath);
              console.log(`  원본 삭제: ${file.name}`);
            } else if (result.reduction > 10) {
              // WebP 재최적화의 경우 10% 이상 감소했을 때만 교체
              await fs.unlink(fullPath);
              await fs.rename(outputPath, fullPath);
              console.log(`  재최적화 완료: ${file.name}`);
            } else {
              // 개선이 미미하면 임시 파일 삭제
              await fs.unlink(outputPath);
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('디렉토리 읽기 실패:', error);
  }
  
  return { totalOriginal, totalOptimized, fileCount };
}

async function main() {
  console.log('=== 웹툰 이미지 최적화 시작 ===\n');
  console.log('설정:');
  console.log(`- 최대 너비: ${WEBTOON_CONFIG.maxWidth}px`);
  console.log(`- WebP 품질: ${WEBTOON_CONFIG.quality}`);
  console.log(`- 압축 노력: ${WEBTOON_CONFIG.effort}\n`);
  
  const directories = [
    path.join(__dirname, 'uploads'),
    path.join(__dirname, 'uploads', 'episodes'),
    path.join(__dirname, 'uploads', 'comics'),
    path.join(__dirname, 'uploads', 'banners')
  ];
  
  let grandTotalOriginal = 0;
  let grandTotalOptimized = 0;
  let grandTotalFiles = 0;
  
  for (const dir of directories) {
    console.log(`\n📁 디렉토리: ${dir}`);
    try {
      await fs.access(dir);
      const result = await optimizeDirectory(dir);
      grandTotalOriginal += result.totalOriginal;
      grandTotalOptimized += result.totalOptimized;
      grandTotalFiles += result.fileCount;
    } catch {
      console.log(`  - 디렉토리 없음, 건너뜀`);
    }
  }
  
  console.log('\n=== 최적화 완료 ===');
  console.log(`\n총 ${grandTotalFiles}개 파일 최적화`);
  console.log(`원본 크기: ${(grandTotalOriginal / 1024 / 1024).toFixed(2)}MB`);
  console.log(`최적화 후: ${(grandTotalOptimized / 1024 / 1024).toFixed(2)}MB`);
  console.log(`총 절감: ${((1 - grandTotalOptimized / grandTotalOriginal) * 100).toFixed(2)}%`);
}

main().catch(console.error);