const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'prisma', 'dev.db');
const backupDir = path.join(__dirname, 'backups');

// backups 폴더 생성
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir);
}

// 백업 실행
const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
const backupPath = path.join(backupDir, `dev.db.backup-${timestamp}`);

if (fs.existsSync(dbPath)) {
  fs.copyFileSync(dbPath, backupPath);
  console.log(`✅ 백업 완료: ${backupPath}`);
} else {
  console.log('❌ 데이터베이스 파일이 없습니다.');
}