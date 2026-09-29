import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const requireFromRoot = createRequire(path.join(root, 'package.json'));
const requireFromBackend = createRequire(path.join(root, 'backend', 'package.json'));
const sharp = requireFromRoot('sharp');
const { S3Client, PutObjectCommand, HeadObjectCommand } = requireFromBackend('@aws-sdk/client-s3');

const version = 'ratio-20260708';
const bannerImageRoot = path.join(root, 'banner image');
const uploadRoot = path.join(root, 'backend', 'uploads', 'webtoons', 'general');

const targets = [
  { title: '사막', sourceFolder: '사막', uploadFolder: '사막' },
  { title: '세상의 종말', sourceFolder: '세상의 종말', uploadFolder: '세상의 종말' },
  { title: '교주의 연인', sourceFolder: '교주의 연인', uploadFolder: '교주의 연인' },
  { title: '최강일진이었던 사나이', sourceFolder: '최강일진이었던 사나이', uploadFolder: '최강일진이었던 사나이' },
  { title: '고교전설 레드드래곤', sourceFolder: '고교전설 레드드래곤', uploadFolder: '고교전설 레드드래곤' },
  { title: '고교전설 시즌2', sourceFolder: '고교전설 부스트', uploadFolder: '고교전설 시즌2' },
  { title: '프로젝트 이더', sourceFolder: '프로젝트 이더', uploadFolder: '프로젝트 이더' },
  { title: '삼국지 병의', sourceFolder: '삼국지병의', uploadFolder: '삼국지 병의' },
];

const outputs = [
  { filename: 'thumbnail.webp', ratio: 16 / 9, width: 960, height: 540 },
  { filename: 'thumbnail-16x9.webp', ratio: 16 / 9, width: 960, height: 540 },
  { filename: 'banner-4x3.webp', ratio: 4 / 3, width: 960, height: 720 },
  { filename: 'poster.webp', ratio: 3 / 4, width: 720, height: 960 },
  { filename: 'wide.webp', ratio: 3, width: 1440, height: 480 },
];

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

async function listImageFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && /\.(png|jpe?g|webp)$/i.test(entry.name))
    .map((entry) => path.join(dir, entry.name));
}

async function getMetadata(filePath) {
  const metadata = await sharp(filePath).metadata();
  return {
    filePath,
    width: metadata.width || 0,
    height: metadata.height || 0,
    ratio: metadata.width && metadata.height ? metadata.width / metadata.height : 0,
    size: (await fs.stat(filePath)).size,
  };
}

function pickSource(files, desiredRatio) {
  return files
    .map((file) => ({
      ...file,
      score: Math.abs(file.ratio - desiredRatio),
    }))
    .sort((a, b) => a.score - b.score || b.size - a.size)[0];
}

async function renderAsset(sourcePath, outPath, width, height) {
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await sharp(sourcePath)
    .resize(width, height, { fit: 'cover', position: 'attention' })
    .webp({ quality: 88 })
    .toFile(outPath);
}

async function uploadAsset(uploadFolder, filename) {
  const localPath = path.join(uploadRoot, uploadFolder, filename);
  const body = await fs.readFile(localPath);
  const key = `uploads/webtoons/general/${uploadFolder}/${filename}`.normalize('NFC');

  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      await s3.send(new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: 'image/webp',
        CacheControl: 'public, max-age=31536000, immutable',
      }));
      break;
    } catch (error) {
      if (attempt === 5) throw error;
      await new Promise((resolve) => setTimeout(resolve, attempt * 700));
    }
  }

  let head;
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      head = await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
      break;
    } catch (error) {
      if (attempt === 5) throw error;
      await new Promise((resolve) => setTimeout(resolve, attempt * 700));
    }
  }
  return { key, bytes: head.ContentLength };
}

async function fetchAllComics() {
  const comics = [];
  const headers = { Authorization: 'Bearer admin-authenticated' };
  let page = 1;
  let totalPages = 1;

  do {
    const res = await fetch(`https://api.arata.co.kr/api/admin/comics?page=${page}&limit=100&locale=ko`, { headers });
    if (!res.ok) throw new Error(`admin comics page ${page}: ${res.status}`);
    const json = await res.json();
    comics.push(...(json.comics || []));
    totalPages = json.pagination?.totalPages || page;
    page += 1;
  } while (page <= totalPages);

  return comics;
}

async function updateComicThumbnail(comic, uploadFolder) {
  const thumbnail = `/uploads/webtoons/general/${uploadFolder}/thumbnail.webp?v=${version}`;
  const body = {
    title: comic.title,
    authorName: comic.authorName || '',
    status: comic.status || 'ONGOING',
    genres: comic.genre || '',
    thumbnail,
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
    throw new Error(`update ${comic.title}: ${res.status} ${await res.text()}`);
  }

  return thumbnail;
}

const generated = [];
const uploaded = [];

for (const target of targets) {
  const logoDir = path.join(bannerImageRoot, target.sourceFolder, '로고');
  const imageFiles = await Promise.all((await listImageFiles(logoDir)).map(getMetadata));

  for (const output of outputs) {
    const picked = pickSource(imageFiles, output.ratio);
    const outPath = path.join(uploadRoot, target.uploadFolder, output.filename);
    await renderAsset(picked.filePath, outPath, output.width, output.height);
    generated.push({
      title: target.title,
      filename: output.filename,
      source: path.basename(picked.filePath),
      sourceRatio: Number(picked.ratio.toFixed(3)),
    });
    uploaded.push({ title: target.title, filename: output.filename, ...(await uploadAsset(target.uploadFolder, output.filename)) });
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
  updated.push({
    title: target.title,
    id: comic.id,
    thumbnail: await updateComicThumbnail(comic, target.uploadFolder),
  });
}

console.log(JSON.stringify({ version, generated, uploaded, updated, missing }, null, 2));
