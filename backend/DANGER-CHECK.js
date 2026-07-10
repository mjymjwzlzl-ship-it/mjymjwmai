// 이 파일을 실행하기 전에 반드시 확인하세요!
const DANGEROUS_COMMANDS = [
  'deleteMany',
  'truncate',
  'DROP',
  'DELETE FROM',
  'prisma migrate reset',
  'prisma db push --force-reset'
];

const fs = require('fs');
const path = require('path');

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const dangers = [];
  
  DANGEROUS_COMMANDS.forEach(cmd => {
    if (content.includes(cmd)) {
      dangers.push(cmd);
    }
  });
  
  if (dangers.length > 0) {
    console.log('⚠️⚠️⚠️ 위험한 명령어 발견! ⚠️⚠️⚠️');
    console.log(`파일: ${filePath}`);
    console.log(`위험 명령어: ${dangers.join(', ')}`);
    console.log('\n정말로 실행하시겠습니까? 데이터가 삭제될 수 있습니다!');
    return false;
  }
  return true;
}

// 실행하려는 스크립트 체크
const scriptToCheck = process.argv[2];
if (scriptToCheck) {
  const isSafe = checkFile(scriptToCheck);
  if (!isSafe) {
    console.log('\n❌ 실행 중단됨. 위험한 스크립트입니다.');
    process.exit(1);
  }
}

module.exports = { checkFile };