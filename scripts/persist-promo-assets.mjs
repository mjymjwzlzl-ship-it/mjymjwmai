import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const requireFromBackend = createRequire(path.join(root, 'backend', 'package.json'));
const { S3Client, PutObjectCommand, HeadObjectCommand } = requireFromBackend('@aws-sdk/client-s3');

const sourceRoot = path.join(root, 'public', 'images', 'promo');
const uploadRoot = path.join(root, 'backend', 'uploads', 'promo');
const imageExtPattern = /\.(png|jpe?g|webp|svg)$/i;

async function loadEnv(filePath) {
  const envText = await fs.readFile(filePath, 'utf8');
  for (const line of envText.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    process.env[key] = rawValue.replace(/^["']|["']$/g, '');
  }
}

await loadEnv(path.join(root, 'backend', '.env'));

const bucket = process.env.R2_BUCKET_NAME || 'arata';
const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

function contentTypeFor(filename) {
  if (/\.webp$/i.test(filename)) return 'image/webp';
  if (/\.png$/i.test(filename)) return 'image/png';
  if (/\.jpe?g$/i.test(filename)) return 'image/jpeg';
  if (/\.svg$/i.test(filename)) return 'image/svg+xml';
  return 'application/octet-stream';
}

async function uploadFile(localPath, key) {
  const body = await fs.readFile(localPath);
  const normalizedKey = key.replaceAll('\\', '/').normalize('NFC');
  await s3.send(new PutObjectCommand({
    Bucket: bucket,
    Key: normalizedKey,
    Body: body,
    ContentType: contentTypeFor(localPath),
    CacheControl: 'public, max-age=31536000, immutable',
  }));
  const head = await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: normalizedKey }));
  return { key: normalizedKey, bytes: head.ContentLength || body.length };
}

const uploaded = [];

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walk(entryPath));
      continue;
    }
    if (entry.isFile() && imageExtPattern.test(entry.name)) {
      files.push(entryPath);
    }
  }
  return files;
}

for (const sourcePath of await walk(sourceRoot)) {
  const relativePath = path.relative(sourceRoot, sourcePath);
  const uploadPath = path.join(uploadRoot, relativePath);
  const uploadKey = `uploads/promo/${relativePath.replaceAll('\\', '/')}`;
  await fs.mkdir(path.dirname(uploadPath), { recursive: true });
  await fs.copyFile(sourcePath, uploadPath);
  uploaded.push({
    filename: relativePath.replaceAll('\\', '/'),
    ...(await uploadFile(uploadPath, uploadKey)),
  });
}

console.log(JSON.stringify({ uploadedCount: uploaded.length, uploaded }, null, 2));
