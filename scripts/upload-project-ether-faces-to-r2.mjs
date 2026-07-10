import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const requireFromBackend = createRequire(path.join(root, 'backend', 'package.json'));
const { S3Client, PutObjectCommand, HeadObjectCommand } = requireFromBackend('@aws-sdk/client-s3');

const envText = await fs.readFile(path.join(root, 'backend', '.env'), 'utf8');
for (const line of envText.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
  if (!match) continue;
  const [, key, rawValue] = match;
  process.env[key] = rawValue.replace(/^["']|["']$/g, '');
}

const sourceDir = String.raw`\\moonbooks\아벨301호\작품(일반)\프로젝트 이더\얼굴_클로즈업_컷\고퀄`;
const localDir = path.join(root, 'backend', 'uploads', 'webtoons', 'general', '프로젝트 이더', '얼굴');
const bucket = process.env.R2_BUCKET_NAME || 'arata';
const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

await fs.mkdir(localDir, { recursive: true });

const entries = await fs.readdir(sourceDir, { withFileTypes: true });
const pngFiles = entries
  .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.png'))
  .map((entry) => entry.name)
  .sort((a, b) => a.localeCompare(b, 'ko'));

const uploaded = [];
for (const filename of pngFiles) {
  const sourcePath = path.join(sourceDir, filename);
  const localPath = path.join(localDir, filename);
  const body = await fs.readFile(sourcePath);
  await fs.writeFile(localPath, body);

  const key = `uploads/webtoons/general/프로젝트 이더/얼굴/${filename}`.normalize('NFC');
  await s3.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: 'image/png',
    CacheControl: 'public, max-age=31536000, immutable',
  }));
  const head = await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
  uploaded.push({ filename, bytes: body.length, uploadedBytes: head.ContentLength });
}

console.log(JSON.stringify({ uploaded }, null, 2));
