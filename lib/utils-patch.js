const fs = require('fs');
const filePath = 'D:/ARATA/lib/utils.ts';
let content = fs.readFileSync(filePath, 'utf8');

const oldCode = `// 이미지 URL 생성 (S3 등)
export function getImageUrl(path: string): string {
  if (!path) return '/images/placeholder.png'
  
  // 이미 전체 URL인 경우
  if (path.startsWith('http')) {
    return path
  }
  
  // placeholder API인 경우 그대로 반환
  if (path.startsWith('/api/placeholder')) {
    return path
  }
  
  // /uploads로 시작하는 경우 - rewrites가 처리하도록 그대로 반환
  if (path.startsWith('/uploads/')) {
    return path
  }
  
  // uploads로 시작하는 경우 (슬래시 없이)
  if (path.startsWith('uploads/')) {
    return \`/\${path}\`
  }
  
  // 로컬 이미지 경로인 경우
  if (path.startsWith('/')) {
    return path
  }
  
  // 그 외의 경우 /uploads/ 경로로 변환
  return \`/uploads/\${path}\`
}`;

const newCode = `// CDN URL (프로덕션에서 Cloudflare R2 CDN 사용)
const CDN_URL = 'https://cdn.arata.co.kr'

// 이미지 URL 생성 (CDN 사용)
export function getImageUrl(path: string): string {
  if (!path) return '/images/placeholder.png'

  // 이미 전체 URL인 경우
  if (path.startsWith('http')) {
    return path
  }

  // placeholder API인 경우 그대로 반환
  if (path.startsWith('/api/placeholder')) {
    return path
  }

  // 로컬 개발 환경에서는 API 서버 사용
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    if (path.startsWith('/uploads/')) {
      return path
    }
    if (path.startsWith('uploads/')) {
      return \`/\${path}\`
    }
    return path.startsWith('/') ? path : \`/uploads/\${path}\`
  }

  // 프로덕션: CDN 사용
  if (path.startsWith('/uploads/')) {
    return \`\${CDN_URL}\${path}\`
  }

  if (path.startsWith('uploads/')) {
    return \`\${CDN_URL}/\${path}\`
  }

  // 로컬 이미지 경로인 경우 (public 폴더)
  if (path.startsWith('/images/') || path.startsWith('/icons/')) {
    return path
  }

  // 그 외의 경우 CDN /uploads/ 경로로 변환
  return \`\${CDN_URL}/uploads/\${path}\`
}`;

if (content.includes('// 이미지 URL 생성 (S3 등)')) {
  content = content.replace(oldCode, newCode);
  fs.writeFileSync(filePath, content);
  console.log('utils.ts 수정 완료!');
} else {
  console.log('이미 수정되었거나 패턴을 찾을 수 없음');
}
