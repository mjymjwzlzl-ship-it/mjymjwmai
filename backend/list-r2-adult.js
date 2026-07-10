const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const R2_CONFIG = {
  accountId: process.env.R2_ACCOUNT_ID,
  accessKeyId: process.env.R2_ACCESS_KEY_ID,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  bucketName: process.env.R2_BUCKET_NAME || 'arata',
};

if (!R2_CONFIG.accountId || !R2_CONFIG.accessKeyId || !R2_CONFIG.secretAccessKey) {
  console.error('❌ R2 환경변수가 설정되지 않았습니다.');
  process.exit(1);
}

const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_CONFIG.accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_CONFIG.accessKeyId,
    secretAccessKey: R2_CONFIG.secretAccessKey,
  },
});

async function listAdultFiles() {
  try {
    const command = new ListObjectsV2Command({
      Bucket: R2_CONFIG.bucketName,
      Prefix: 'uploads/webtoons/adult/',
      MaxKeys: 50
    });

    const response = await s3Client.send(command);

    console.log(`\nR2에서 찾은 adult 파일: ${response.Contents?.length || 0}개\n`);

    if (response.Contents && response.Contents.length > 0) {
      response.Contents.forEach((item, index) => {
        console.log(`${index + 1}. ${item.Key} (${(item.Size / 1024).toFixed(2)} KB)`);
      });
    } else {
      console.log('❌ R2에 adult 파일이 없습니다!');
    }

    console.log(`\n총 ${response.KeyCount}개, IsTruncated: ${response.IsTruncated}`);
  } catch (error) {
    console.error('❌ R2 조회 실패:', error.message);
  }
}

listAdultFiles();
