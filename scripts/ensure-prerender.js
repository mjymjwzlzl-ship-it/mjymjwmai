const fs = require('fs');
const path = require('path');

const prerenderPath = path.join(__dirname, '..', '.next', 'prerender-manifest.json');
const nextDir = path.join(__dirname, '..', '.next');

// prerender-manifest.json 기본 내용
const defaultPrerenderManifest = {
  version: 3,
  routes: {},
  dynamicRoutes: {},
  notFoundRoutes: [],
  preview: {
    previewModeId: "preview-mode-id",
    previewModeSigningKey: "signing-key",
    previewModeEncryptionKey: "encryption-key"
  }
};

// .next 디렉토리가 없으면 생성
if (!fs.existsSync(nextDir)) {
  console.error('❌ .next 디렉토리가 없습니다. 먼저 npm run build를 실행하세요.');
  process.exit(1);
}

// prerender-manifest.json 파일 확인 및 생성
if (!fs.existsSync(prerenderPath)) {
  console.log('⚠️  prerender-manifest.json 파일이 없습니다. 생성 중...');
  fs.writeFileSync(prerenderPath, JSON.stringify(defaultPrerenderManifest, null, 2));
  console.log('✅ prerender-manifest.json 파일 생성 완료!');
} else {
  console.log('✅ prerender-manifest.json 파일이 존재합니다.');
}