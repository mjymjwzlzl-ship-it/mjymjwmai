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

const bucket = process.env.R2_BUCKET_NAME || 'arata';
const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const targets = [
  { title: '사막', folder: '사막' },
  { title: '세상의 종말', folder: '세상의 종말' },
  { title: '교주의 연인', folder: '교주의 연인' },
  { title: '최강일진이었던 사나이', folder: '최강일진이었던 사나이' },
  { title: '고교전설 레드드래곤', folder: '고교전설 레드드래곤' },
  { title: '고교전설 시즌2', folder: '고교전설 시즌2' },
  { title: '프로젝트 이더', folder: '프로젝트 이더' },
  { title: '삼국지 병의', folder: '삼국지 병의' },
];

const assetNames = [
  'thumbnail.webp',
  'thumbnail-16x9.webp',
  'banner-4x3.webp',
  'poster.webp',
  'wide.webp',
];

function contentTypeFor(filename) {
  if (filename.endsWith('.webp')) return 'image/webp';
  if (filename.endsWith('.png')) return 'image/png';
  if (filename.endsWith('.jpg') || filename.endsWith('.jpeg')) return 'image/jpeg';
  return 'application/octet-stream';
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function uploadAsset(folder, filename) {
  const localPath = path.join(root, 'backend', 'uploads', 'webtoons', 'general', folder, filename);
  if (!(await exists(localPath))) {
    return { skipped: true, filename };
  }

  const body = await fs.readFile(localPath);
  const key = `uploads/webtoons/general/${folder}/${filename}`.normalize('NFC');
  await s3.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: contentTypeFor(filename),
    CacheControl: 'public, max-age=31536000, immutable',
  }));

  const head = await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
  return { skipped: false, filename, bytes: body.length, uploadedBytes: head.ContentLength };
}

async function fetchAllComics() {
  const headers = { Authorization: 'Bearer admin-authenticated' };
  const comics = [];
  let page = 1;
  let totalPages = 1;

  do {
    const res = await fetch(`https://api.arata.co.kr/api/admin/comics?page=${page}&limit=100&locale=ko`, { headers });
    if (!res.ok) throw new Error(`admin comics ${page}: ${res.status}`);
    const json = await res.json();
    comics.push(...(json.comics || []));
    totalPages = json.pagination?.totalPages || page;
    page += 1;
  } while (page <= totalPages);

  return comics;
}

async function updateComicThumbnail(comic, folder) {
  const body = {
    title: comic.title,
    authorName: comic.authorName || '',
    status: comic.status || 'ONGOING',
    genres: comic.genre || '',
    thumbnail: `/uploads/webtoons/general/${folder}/thumbnail.webp`,
  };

  const res = await fetch(`https://api.arata.co.kr/api/admin/comics/${comic.id}`, {
    method: 'PUT',
    headers: {
      Authorization: 'Bearer admin-authenticated',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`update ${comic.title}: ${res.status} ${text}`);
  }

  const json = await res.json();
  return json.comic?.thumbnail;
}

const uploaded = [];
for (const target of targets) {
  for (const filename of assetNames) {
    const result = await uploadAsset(target.folder, filename);
    if (!result.skipped) uploaded.push({ title: target.title, ...result });
  }
}

const comics = await fetchAllComics();
const updated = [];
const missing = [];

for (const target of targets) {
  const comic = comics.find((item) => item.title === target.title);
  if (!comic) {
    missing.push(target.title);
    continue;
  }

  const thumbnail = await updateComicThumbnail(comic, target.folder);
  updated.push({ title: target.title, id: comic.id, thumbnail });
}

console.log(JSON.stringify({ uploaded, updated, missing }, null, 2));
