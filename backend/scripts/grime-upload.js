#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { S3Client, PutObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const args = new Map();
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (a.startsWith('--')) {
    const next = process.argv[i + 1];
    if (next && !next.startsWith('--')) { args.set(a, next); i++; }
    else args.set(a, true);
  }
}

const work = args.get('--work');
const category = args.get('--category') || 'general';
const source = args.get('--source');
const dryRun = args.has('--dry-run');
const authorName = args.get('--author-name');
const description = args.get('--description');
const genreArg = args.get('--genre');
const statusArg = args.get('--status') || 'COMPLETED';
if (!work || !source || !['general', 'adult'].includes(category)) {
  console.error('Usage: node grime-upload.js --work <title> --category general|adult --source <workDir> --author-name <actual author> [--description <plot>] [--genre <genre>] [--status <status>] [--dry-run]');
  process.exit(2);
}
if (!dryRun && (!authorName || authorName === '그리메')) {
  console.error('--author-name is required for real publish and must not be 그리메');
  process.exit(2);
}

const imageRe = /\.(jpe?g|png)$/i;
const systemRe = /(^|\/)(@eaDir|\.DS_Store|Thumbs\.db|\._[^/]+|\._DAV|\.DAV)(\/|$)/i;
const coverRe = /(표지|로고|타이틀|일러스트)/;
const skipEpisodeDirRe = /(캐릭터|포트폴리오|배경|NPC)/i;
const contentType = (file) => /\.png$/i.test(file) ? 'image/png' : 'image/jpeg';
const ext = (file) => /\.png$/i.test(file) ? 'png' : 'jpg';
const nfc = (s) => String(s).normalize('NFC');
const pad3 = (n) => String(n).padStart(3, '0');

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});
const Bucket = process.env.R2_BUCKET_NAME || 'arata';
const prisma = new PrismaClient();

function walk(dir, out = []) {
  let ents = [];
  try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of ents) {
    const p = path.join(dir, e.name);
    if (systemRe.test(p)) continue;
    if (e.isDirectory()) walk(p, out);
    else if (imageRe.test(e.name)) out.push(p);
  }
  return out;
}

function natural(a, b) {
  return a.localeCompare(b, 'ko', { numeric: true, sensitivity: 'base' });
}

function episodeNumberFromDir(name) {
  const s = nfc(name);
  const m = s.match(/(?:Ep\.?\s*)?(\d{1,4})\s*(?:화)?/i);
  if (!m) return null;
  return Number(m[1]);
}

function directDirs(dir) {
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !systemRe.test(e.name))
    .map((e) => path.join(dir, e.name));
}

function collectEpisodes(root) {
  const episodes = [];
  for (const d of directDirs(root)) {
    const base = nfc(path.basename(d));
    if (coverRe.test(base) || skipEpisodeDirRe.test(base)) continue;
    const episodeNumber = episodeNumberFromDir(base);
    if (episodeNumber === null) continue;
    const images = walk(d).sort(natural);
    if (images.length) episodes.push({ episodeNumber, title: `${episodeNumber}화`, images });
  }
  episodes.sort((a, b) => a.episodeNumber - b.episodeNumber);
  const seen = new Set();
  for (const ep of episodes) {
    if (seen.has(ep.episodeNumber)) throw new Error(`Duplicate episode number: ${ep.episodeNumber}`);
    seen.add(ep.episodeNumber);
  }
  return episodes;
}

function collectCoverCandidates(root) {
  const dirs = directDirs(root).filter((d) => coverRe.test(nfc(path.basename(d))));
  return dirs.flatMap((d) => walk(d)).sort(natural);
}

async function r2Exists(Key) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket, Key }));
    return true;
  } catch {
    return false;
  }
}

async function r2PutIfMissing(Key, Body, ContentType) {
  const exists = await r2Exists(Key);
  if (dryRun) {
    console.log(`${exists ? 'SKIP' : 'PUT'} ${Key}`);
    return { uploaded: false, skipped: exists };
  }
  if (exists) return { uploaded: false, skipped: true };
  await s3.send(new PutObjectCommand({ Bucket, Key, Body, ContentType }));
  return { uploaded: true, skipped: false };
}

async function chooseCover(root) {
  const files = collectCoverCandidates(root);
  if (!files.length) return null;
  const ranked = [];
  for (const file of files) {
    try {
      const meta = await sharp(file).metadata();
      ranked.push({ file, width: meta.width || 0, height: meta.height || 0 });
    } catch {}
  }
  ranked.sort((a, b) => {
    const an = nfc(path.basename(a.file));
    const bn = nfc(path.basename(b.file));
    const as = (an.includes('표지') ? 2 : 0) - (an.includes('로고') ? 1 : 0);
    const bs = (bn.includes('표지') ? 2 : 0) - (bn.includes('로고') ? 1 : 0);
    if (as !== bs) return bs - as;
    const av = a.height >= a.width ? 1 : 0;
    const bv = b.height >= b.width ? 1 : 0;
    if (av !== bv) return bv - av;
    return (b.width * b.height) - (a.width * a.height);
  });
  return ranked[0]?.file || files[0];
}

async function main() {
  const root = path.resolve(source);
  const episodes = collectEpisodes(root);
  if (!episodes.length) throw new Error(`No episode images found under ${root}`);

  let uploaded = 0;
  let skipped = 0;
  const uploadedEpisodes = [];
  for (const ep of episodes) {
    const urls = [];
    for (let i = 0; i < ep.images.length; i++) {
      const file = ep.images[i];
      const Key = `uploads/webtoons/${category}/${work}/${pad3(ep.episodeNumber)}/${work}_${pad3(ep.episodeNumber)}_${String(i + 1).padStart(3, '0')}.${ext(file)}`;
      const res = await r2PutIfMissing(Key, fs.createReadStream(file), contentType(file));
      if (res.uploaded) uploaded++;
      if (res.skipped) skipped++;
      urls.push(`/${Key}`);
    }
    uploadedEpisodes.push({ ...ep, urls });
  }

  const coverFile = await chooseCover(root);
  let thumbnail = null;
  if (coverFile) {
    const Key = `uploads/webtoons/${category}/${work}/thumbnail.webp`;
    const body = await sharp(coverFile).rotate().webp({ quality: 85 }).toBuffer();
    const res = await r2PutIfMissing(Key, body, 'image/webp');
    if (res.uploaded) uploaded++;
    if (res.skipped) skipped++;
    thumbnail = `/${Key}`;
  }

  if (dryRun) {
    console.log(JSON.stringify({ dryRun, work, category, episodes: uploadedEpisodes.map((e) => ({ episodeNumber: e.episodeNumber, imageCount: e.urls.length })), coverFile, thumbnail, uploaded, skipped }, null, 2));
    return;
  }

  const rating = category === 'adult' ? '19' : 'GENERAL';
  const existing = await prisma.comic.findFirst({ where: { title: work, rating }, include: { episodes: true } });
  if (existing) {
    throw new Error(`Refusing to update existing comic: ${existing.id}`);
  }
  const paidStartEpisode = category === 'adult' ? 2 : 4;
  const episodeCoinPrice = 3;
  const comic = await prisma.comic.create({
    data: {
      title: work,
      description: description || `${work}입니다.`,
      thumbnail,
      genre: genreArg || (category === 'adult' ? 'adult' : 'drama'),
      rating,
      status: statusArg,
      authorName,
      paidStartEpisode,
      episodeCoinPrice,
      locale: 'ko',
      isOfficial: true,
    },
  });

  const created = [];
  for (const ep of uploadedEpisodes) {
    const isFree = ep.episodeNumber < paidStartEpisode;
    const row = await prisma.episode.create({
      data: {
        comicId: comic.id,
        episodeNumber: ep.episodeNumber,
        title: ep.title,
        thumbnail: ep.urls[0] || thumbnail,
        images: ep.urls.join(','),
        isFree,
        coinPrice: isFree ? 0 : episodeCoinPrice,
        locale: 'ko',
      },
    });
    created.push({ id: row.id, episodeNumber: row.episodeNumber });
  }

  console.log(JSON.stringify({ work, category, comicId: comic.id, authorName, description: comic.description, genre: comic.genre, status: comic.status, thumbnail, uploaded, skipped, created }, null, 2));
}

main().catch(async (err) => {
  console.error(err);
  process.exitCode = 1;
}).finally(async () => {
  await prisma.$disconnect();
});
