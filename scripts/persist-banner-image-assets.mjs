import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import crypto from 'node:crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const requireFromRoot = createRequire(path.join(root, 'package.json'));
const requireFromBackend = createRequire(path.join(root, 'backend', 'package.json'));
const sharp = requireFromRoot('sharp');
const { S3Client, PutObjectCommand, HeadObjectCommand } = requireFromBackend('@aws-sdk/client-s3');

const version = 'no-logo-20260709b';
const bannerImageRoot = path.join(root, 'banner image');
const webtoonUploadRoot = path.join(root, 'backend', 'uploads', 'webtoons', 'general');
const sourceArchiveRoot = path.join(root, 'backend', 'uploads', 'source-assets', 'banner-image');

const folderAliases = new Map([
  ['고교전설 부스트', { uploadFolder: '고교전설 시즌2', dbTitle: '고교전설 시즌2' }],
  ['삼국지병의', { uploadFolder: '삼국지 병의', dbTitle: '삼국지 병의' }],
]);

const outputs = [
  { filename: 'thumbnail.webp', ratio: 16 / 9, width: 960, height: 540 },
  { filename: 'thumbnail-16x9.webp', ratio: 16 / 9, width: 960, height: 540 },
  { filename: 'banner-4x3.webp', ratio: 4 / 3, width: 960, height: 720 },
  { filename: 'poster.webp', ratio: 3 / 4, width: 720, height: 960 },
  { filename: 'wide.webp', ratio: 3, width: 1440, height: 480 },
];

const imageExtPattern = /\.(png|jpe?g|webp)$/i;

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

async function listImageFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && imageExtPattern.test(entry.name))
    .map((entry) => path.join(dir, entry.name));
}

async function getImageMeta(filePath) {
  const metadata = await sharp(filePath).metadata();
  const stat = await fs.stat(filePath);
  return {
    filePath,
    name: path.basename(filePath),
    width: metadata.width || 0,
    height: metadata.height || 0,
    ratio: metadata.width && metadata.height ? metadata.width / metadata.height : 0,
    size: stat.size,
  };
}

function pickSource(files, desiredRatio) {
  return [...files]
    .map((file) => ({ ...file, score: Math.abs(file.ratio - desiredRatio) }))
    .sort((a, b) => a.score - b.score || b.size - a.size)[0];
}

async function findAssetFolders(workDir) {
  const entries = await fs.readdir(workDir, { withFileTypes: true });
  const dirs = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  const noLogoDir =
    dirs.find((name) => name.normalize('NFC').toLowerCase() === 'no로고') ||
    dirs.find((name) => name.normalize('NFC').toLowerCase() === 'no 로고') ||
    dirs.find((name) => /no\s*로고/i.test(name));
  const logoDir = dirs.find((name) => name === '로고') || dirs.find((name) => name.includes('로고') && !/no/i.test(name));
  const fallbackDir = logoDir || noLogoDir || dirs[0];
  if (!fallbackDir) return null;

  const serviceDir = path.join(workDir, noLogoDir || fallbackDir);
  const archiveDirs = [...new Set([noLogoDir, logoDir, fallbackDir].filter(Boolean))].map((name) => ({
    name,
    dir: path.join(workDir, name),
  }));

  return { serviceDir, archiveDirs, serviceFolderName: noLogoDir || fallbackDir };
}

async function discoverTargets() {
  const entries = await fs.readdir(bannerImageRoot, { withFileTypes: true });
  const targets = [];

  for (const entry of entries.filter((item) => item.isDirectory())) {
    const sourceFolder = entry.name.normalize('NFC');
    const workDir = path.join(bannerImageRoot, entry.name);
    const assetFolders = await findAssetFolders(workDir);
    if (!assetFolders) continue;

    const alias = folderAliases.get(sourceFolder);
    targets.push({
      sourceFolder,
      serviceSourceDir: assetFolders.serviceDir,
      serviceFolderName: assetFolders.serviceFolderName,
      archiveDirs: assetFolders.archiveDirs,
      uploadFolder: (alias?.uploadFolder || sourceFolder).normalize('NFC'),
      dbTitle: (alias?.dbTitle || sourceFolder).normalize('NFC'),
    });
  }

  return targets.sort((a, b) => a.dbTitle.localeCompare(b.dbTitle, 'ko'));
}

async function renderAsset(sourcePath, outPath, width, height) {
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await sharp(sourcePath)
    .resize(width, height, { fit: 'cover', position: 'attention' })
    .webp({ quality: 90 })
    .toFile(outPath);
}

function contentTypeFor(filename) {
  if (/\.webp$/i.test(filename)) return 'image/webp';
  if (/\.png$/i.test(filename)) return 'image/png';
  if (/\.jpe?g$/i.test(filename)) return 'image/jpeg';
  return 'application/octet-stream';
}

async function uploadFile(localPath, key, cacheControl = 'public, max-age=31536000, immutable') {
  const body = await fs.readFile(localPath);
  const normalizedKey = key.replaceAll('\\', '/').normalize('NFC');

  await s3.send(new PutObjectCommand({
    Bucket: bucket,
    Key: normalizedKey,
    Body: body,
    ContentType: contentTypeFor(localPath),
    CacheControl: cacheControl,
  }));

  const head = await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: normalizedKey }));
  return { key: normalizedKey, bytes: head.ContentLength || body.length };
}

async function copyAndUploadOriginals(target) {
  const preserved = [];

  for (const archiveDir of target.archiveDirs) {
    const paths = await listImageFiles(archiveDir.dir);
    const files = await Promise.all(paths.map(getImageMeta));

    for (const file of files) {
      const body = await fs.readFile(file.filePath);
      const hash = crypto.createHash('sha1').update(body).digest('hex').slice(0, 12);
      const ext = path.extname(file.name).toLowerCase();
      const base = path.basename(file.name, path.extname(file.name)).replace(/[^\p{L}\p{N}_-]+/gu, '-');
      const filename = `${base}-${hash}${ext}`;
      const archivePath = path.join(sourceArchiveRoot, target.sourceFolder, archiveDir.name, filename);
      await fs.mkdir(path.dirname(archivePath), { recursive: true });
      await fs.writeFile(archivePath, body);

      preserved.push({
        title: target.dbTitle,
        sourceKind: archiveDir.name,
        filename,
        localPath: archivePath,
        ...(await uploadFile(archivePath, `uploads/source-assets/banner-image/${target.sourceFolder}/${archiveDir.name}/${filename}`)),
      });
    }
  }

  return preserved;
}

async function fetchAllComics() {
  const headers = { Authorization: 'Bearer admin-authenticated' };
  const comics = [];
  let page = 1;
  let totalPages = 1;

  do {
    const res = await fetch(`https://api.arata.co.kr/api/admin/comics?page=${page}&limit=100&locale=ko`, { headers });
    if (!res.ok) throw new Error(`admin comics page ${page}: ${res.status} ${await res.text()}`);
    const json = await res.json();
    comics.push(...(json.comics || []));
    totalPages = json.pagination?.totalPages || page;
    page += 1;
  } while (page <= totalPages);

  return comics;
}

async function updateComicThumbnail(comic, target) {
  const thumbnail = `/uploads/webtoons/general/${target.uploadFolder}/thumbnail.webp?v=${version}`;
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

  if (!res.ok) throw new Error(`update ${comic.title}: ${res.status} ${await res.text()}`);
  return thumbnail;
}

const targets = await discoverTargets();
const generated = [];
const uploaded = [];
const preservedOriginals = [];
const skipped = [];

for (const target of targets) {
  const imagePaths = await listImageFiles(target.serviceSourceDir);
  if (imagePaths.length === 0) {
    skipped.push({ title: target.dbTitle, reason: 'no source images', sourceDir: target.serviceSourceDir });
    continue;
  }

  const imageFiles = await Promise.all(imagePaths.map(getImageMeta));
  preservedOriginals.push(...(await copyAndUploadOriginals(target)));

  for (const output of outputs) {
    const picked = pickSource(imageFiles, output.ratio);
    const outPath = path.join(webtoonUploadRoot, target.uploadFolder, output.filename);
    await renderAsset(picked.filePath, outPath, output.width, output.height);
    generated.push({
      title: target.dbTitle,
      filename: output.filename,
      sourceKind: target.serviceFolderName,
      source: picked.name,
      sourceRatio: Number(picked.ratio.toFixed(3)),
    });
    uploaded.push({
      title: target.dbTitle,
      filename: output.filename,
      ...(await uploadFile(outPath, `uploads/webtoons/general/${target.uploadFolder}/${output.filename}`)),
    });
  }
}

const comics = await fetchAllComics();
const updated = [];
const missing = [];

for (const target of targets) {
  const matches = comics.filter((comic) => String(comic.title || '').normalize('NFC') === target.dbTitle);
  if (matches.length === 0) {
    missing.push(target.dbTitle);
    continue;
  }

  for (const comic of matches) {
    updated.push({
      title: target.dbTitle,
      id: comic.id,
      thumbnail: await updateComicThumbnail(comic, target),
    });
  }
}

console.log(JSON.stringify({
  version,
  targets: targets.map(({ sourceFolder, serviceFolderName, uploadFolder, dbTitle }) => ({
    sourceFolder,
    serviceFolderName,
    uploadFolder,
    dbTitle,
  })),
  generated,
  generatedCount: generated.length,
  uploadedCount: uploaded.length,
  preservedOriginalCount: preservedOriginals.length,
  updated,
  missing,
  skipped,
}, null, 2));
