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
const manifestPath = args.get('--manifest');
if (!manifestPath) {
  console.error('Usage: node scripts/grime-upload-batch.js --manifest /tmp/work-manifest.json');
  process.exit(2);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const work = manifest.title;
const category = manifest.category;
const source = manifest.remoteSource || manifest.source;
const meta = manifest.meta || {};
if (!work || !source || !['general', 'adult'].includes(category)) throw new Error('Invalid manifest');

const imageRe = /\.(jpe?g|png)$/i;
const systemRe = /(^|\/)(@eaDir|\.DS_Store|Thumbs\.db|\._[^/]+|\._DAV|\.DAV)(\/|$)/i;
const coverRe = /(표지|로고|타이틀|일러스트)/;
const skipEpisodeDirRe = /(캐릭터|포트폴리오|배경|NPC)/i;
const nfc = (s) => String(s || '').normalize('NFC');
const pad3 = (n) => String(n).padStart(3, '0');
const natural = (a, b) => nfc(a).localeCompare(nfc(b), 'ko', { numeric: true, sensitivity: 'base' });
const contentType = (file) => /\.png$/i.test(file) ? 'image/png' : 'image/jpeg';
const ext = (file) => /\.png$/i.test(file) ? 'png' : 'jpg';

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

function directDirs(dir) {
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !systemRe.test(e.name))
    .map((e) => path.join(dir, e.name));
}

function episodeNumberFromDir(name) {
  const m = nfc(name).match(/(?:Ep\.?\s*)?(\d{1,4})\s*(?:화)?/i);
  return m ? Number(m[1]) : null;
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
  return episodes;
}

function collectCoverCandidates(root) {
  const generated = path.join(root, '__generated_cover', 'thumbnail.webp');
  const out = fs.existsSync(generated) ? [generated] : [];
  for (const d of directDirs(root).filter((p) => coverRe.test(nfc(path.basename(p))))) {
    out.push(...walk(d));
  }
  return out.sort(natural);
}

async function r2Exists(Key) {
  try { await s3.send(new HeadObjectCommand({ Bucket, Key })); return true; }
  catch { return false; }
}

async function r2PutIfMissing(Key, Body, ContentType) {
  const exists = await r2Exists(Key);
  if (exists) return { uploaded: false, skipped: true };
  await s3.send(new PutObjectCommand({ Bucket, Key, Body, ContentType }));
  return { uploaded: true, skipped: false };
}

async function coverBuffer(root, episodes) {
  const candidates = collectCoverCandidates(root);
  for (const file of candidates) {
    try {
      if (/\.webp$/i.test(file)) return fs.readFileSync(file);
      return await sharp(file).rotate().resize(548, 652, { fit: 'cover', position: 'attention' }).webp({ quality: 85 }).toBuffer();
    } catch {}
  }
  const first = episodes[0]?.images?.[0];
  if (!first) return null;
  return sharp(first).rotate().resize(548, 652, { fit: 'cover', position: 'top' }).webp({ quality: 85 }).toBuffer();
}

async function main() {
  const root = path.resolve(source);
  const episodes = collectEpisodes(root);
  if (!episodes.length) throw new Error(`No episode images found under ${root}`);
  const rating = category === 'adult' ? '19' : 'GENERAL';
  const paidStartEpisode = category === 'adult' ? 2 : 4;
  const episodeCoinPrice = 3;
  const existing = await prisma.comic.findFirst({
    where: category === 'adult' ? { title: work, rating: { in: ['19', 'ADULT'] } } : { title: work, rating },
    include: { episodes: true },
    orderBy: { createdAt: 'asc' },
  });
  const existingNumbers = new Set((existing?.episodes || []).map((e) => e.episodeNumber));
  const missingEpisodes = episodes.filter((e) => !existingNumbers.has(e.episodeNumber));
  if (existing && !missingEpisodes.length) {
    console.log(JSON.stringify({ work, category, rating: existing.rating, comicId: existing.id, mode: 'complete-skip', uploaded: 0, skipped: 0, created: [], thumbnail: existing.thumbnail }, null, 2));
    return;
  }

  let uploaded = 0;
  let skipped = 0;
  let thumbnail = existing?.thumbnail || null;
  const needThumb = !existing || !existing.thumbnail;
  if (needThumb) {
    const body = await coverBuffer(root, episodes);
    if (body) {
      const Key = `uploads/webtoons/${category}/${work}/thumbnail.webp`;
      const res = await r2PutIfMissing(Key, body, 'image/webp');
      if (res.uploaded) uploaded++;
      if (res.skipped) skipped++;
      thumbnail = `/${Key}`;
    }
  }

  const comic = existing || await prisma.comic.create({
    data: {
      title: work,
      description: meta.description || `${work}입니다.`,
      thumbnail,
      genre: meta.genre || (category === 'adult' ? 'adult' : 'drama'),
      rating,
      status: meta.status || 'COMPLETED',
      authorName: meta.authorName || '미상',
      paidStartEpisode,
      episodeCoinPrice,
      locale: 'ko',
      isOfficial: true,
    },
  });

  if (existing && needThumb && thumbnail) {
    await prisma.comic.update({ where: { id: existing.id }, data: { thumbnail } });
  }

  const created = [];
  for (const ep of missingEpisodes) {
    const urls = [];
    for (let i = 0; i < ep.images.length; i++) {
      const file = ep.images[i];
      const Key = `uploads/webtoons/${category}/${work}/${pad3(ep.episodeNumber)}/${work}_${pad3(ep.episodeNumber)}_${String(i + 1).padStart(3, '0')}.${ext(file)}`;
      const res = await r2PutIfMissing(Key, fs.createReadStream(file), contentType(file));
      if (res.uploaded) uploaded++;
      if (res.skipped) skipped++;
      urls.push(`/${Key}`);
    }
    const isFree = ep.episodeNumber < (comic.paidStartEpisode || paidStartEpisode);
    const row = await prisma.episode.create({
      data: {
        comicId: comic.id,
        episodeNumber: ep.episodeNumber,
        title: ep.title,
        thumbnail: urls[0] || thumbnail,
        images: urls.join(','),
        isFree,
        coinPrice: isFree ? 0 : (comic.episodeCoinPrice || episodeCoinPrice),
        locale: 'ko',
      },
    });
    created.push({ id: row.id, episodeNumber: row.episodeNumber, imageCount: urls.length });
  }

  const finalCount = await prisma.episode.count({ where: { comicId: comic.id } });
  console.log(JSON.stringify({ work, category, rating: comic.rating, comicId: comic.id, mode: existing ? 'supplement' : 'new', thumbnail, uploaded, skipped, created, finalEpisodeCount: finalCount }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
}).finally(async () => {
  await prisma.$disconnect();
});
