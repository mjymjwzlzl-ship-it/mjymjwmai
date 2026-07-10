const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

async function convertToWebP(directory) {
  try {
    const files = await fs.readdir(directory, { withFileTypes: true });
    
    for (const file of files) {
      const fullPath = path.join(directory, file.name);
      
      if (file.isDirectory()) {
        // 재귀적으로 하위 디렉토리 처리
        await convertToWebP(fullPath);
      } else if (file.isFile()) {
        const ext = path.extname(file.name).toLowerCase();
        
        // JPG, JPEG, PNG 파일만 처리
        if (['.jpg', '.jpeg', '.png'].includes(ext)) {
          const webpPath = fullPath.replace(/\.(jpg|jpeg|png)$/i, '.webp');
          
          // WebP 파일이 이미 존재하는지 확인
          try {
            await fs.access(webpPath);
            console.log(`✓ 이미 변환됨: ${file.name}`);
          } catch {
            // WebP 파일이 없으면 변환
            console.log(`변환 중: ${file.name} → ${path.basename(webpPath)}`);
            
            try {
              await sharp(fullPath)
                .webp({ 
                  quality: 85,
                  effort: 4
                })
                .toFile(webpPath);
              
              // 원본 파일 삭제
              await fs.unlink(fullPath);
              console.log(`✓ 변환 완료 및 원본 삭제: ${file.name}`);
            } catch (error) {
              console.error(`✗ 변환 실패: ${file.name}`, error.message);
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('디렉토리 읽기 실패:', error);
  }
}

async function main() {
  console.log('=== 이미지 WebP 변환 시작 ===\n');
  
  const directories = [
    path.join(__dirname, 'uploads'),
    path.join(__dirname, 'uploads', 'episodes'),
    path.join(__dirname, 'uploads', 'comics'),
    path.join(__dirname, 'uploads', 'banners')
  ];
  
  for (const dir of directories) {
    console.log(`\n📁 디렉토리: ${dir}`);
    try {
      await fs.access(dir);
      await convertToWebP(dir);
    } catch {
      console.log(`  - 디렉토리 없음, 건너뜀`);
    }
  }
  
  console.log('\n=== 변환 완료 ===');
}

main().catch(console.error);