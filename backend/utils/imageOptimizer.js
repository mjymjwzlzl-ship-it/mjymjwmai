const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

// WebP 변환 함수
async function convertToWebP(inputPath, quality = 85) {
  try {
    const webpPath = inputPath.replace(/\.(jpg|jpeg|png)$/i, '.webp');
    
    await sharp(inputPath)
      .webp({ quality })
      .toFile(webpPath);
    
    const inputStats = await fs.stat(inputPath);
    const outputStats = await fs.stat(webpPath);
    
    console.log(`✅ WebP 변환 완료: ${path.basename(inputPath)} → ${path.basename(webpPath)} (${((1 - outputStats.size / inputStats.size) * 100).toFixed(1)}% 절감)`);
    
    return webpPath;
  } catch (error) {
    console.error(`WebP 변환 실패: ${inputPath}`, error.message);
    return null;
  }
}

// 이미지 리사이징 함수 (모바일 최적화 + WebP 호환)
async function resizeImage(inputPath, maxWidth = 1200, maxHeight = 14000) {
  try {
    const metadata = await sharp(inputPath).metadata();

    // WebP 포맷 제한: 16,383px (안전하게 14,000px로 제한)
    // 이미지가 이미 작으면 리사이징 불필요
    if (metadata.width <= maxWidth && metadata.height <= maxHeight) {
      return inputPath;
    }

    const resizedPath = inputPath.replace(/\.(jpg|jpeg|png)$/i, '_resized.$1');

    // width와 height 둘 다 고려해서 리사이징
    let resizeOptions = {
      withoutEnlargement: true,
      fit: 'inside'
    };

    await sharp(inputPath)
      .resize(maxWidth, maxHeight, resizeOptions)
      .jpeg({ quality: 90 })
      .toFile(resizedPath);

    // 원본 파일을 리사이즈된 파일로 교체
    await fs.unlink(inputPath);
    await fs.rename(resizedPath, inputPath);

    const resizedMetadata = await sharp(inputPath).metadata();
    console.log(`✅ 이미지 리사이징 완료: ${path.basename(inputPath)} (${metadata.width}x${metadata.height}px → ${resizedMetadata.width}x${resizedMetadata.height}px)`);

    return inputPath;
  } catch (error) {
    console.error(`이미지 리사이징 실패: ${inputPath}`, error.message);
    return inputPath;
  }
}

// 업로드된 이미지 최적화 (리사이징 + WebP 변환)
async function optimizeUploadedImage(filePath, options = {}) {
  const { maxWidth = 1200, webpQuality = 85, createWebP = true } = options;

  try {
    // Skip if already WebP
    if (filePath.toLowerCase().endsWith('.webp')) {
      return filePath;
    }

    // 1. 이미지 리사이징 (모바일 최적화)
    const resizedPath = await resizeImage(filePath, maxWidth);

    // 2. WebP 버전 생성
    if (createWebP) {
      await convertToWebP(resizedPath, webpQuality);
    }

    return resizedPath;
  } catch (error) {
    console.error('이미지 최적화 실패:', error);
    return filePath;
  }
}

// 여러 이미지 배치 최적화
async function optimizeMultipleImages(filePaths, options = {}) {
  const results = [];
  
  for (const filePath of filePaths) {
    const result = await optimizeUploadedImage(filePath, options);
    results.push(result);
  }
  
  return results;
}

module.exports = {
  convertToWebP,
  resizeImage,
  optimizeUploadedImage,
  optimizeMultipleImages
};