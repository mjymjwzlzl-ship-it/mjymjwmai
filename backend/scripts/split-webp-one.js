#!/usr/bin/env node
const { S3Client, GetObjectCommand, PutObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');
const { PrismaClient } = require('@prisma/client');
const sharp = require('sharp');
const path = require('path');
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
const TITLE = args.get('--title');
const RATING = args.get('--rating');
const CHUNK_H = parseInt(args.get('--height') || '5000', 10);
const QUALITY = parseInt(args.get('--quality') || '85', 10);
if (!TITLE || !RATING) {
  console.error('Usage: node scripts/split-webp-one.js --title <exact title> --rating <19|ADULT|GENERAL> [--height 5000] [--quality 85]');
  process.exit(2);
}

const WEBP_MAX = 16383;
const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY },
});
const Bucket = process.env.R2_BUCKET_NAME || 'arata';
const p = new PrismaClient();
const toKey = (v) => v.startsWith('/') ? v.slice(1) : v;

async function r2Get(key) {
  const o = await s3.send(new GetObjectCommand({ Bucket, Key: key }));
  const chunks = [];
  for await (const c of o.Body) chunks.push(c);
  return Buffer.concat(chunks);
}
async function r2Put(key, body) {
  await s3.send(new PutObjectCommand({ Bucket, Key: key, Body: body, ContentType: 'image/webp' }));
}
async function r2Exists(key) {
  try { await s3.send(new HeadObjectCommand({ Bucket, Key: key })); return true; } catch { return false; }
}

async function main() {
  const comic = await p.comic.findFirst({ where: { title: TITLE, rating: RATING } });
  if (!comic) throw new Error(`Comic not found: ${TITLE} (${RATING})`);
  const episodes = await p.episode.findMany({ where: { comicId: comic.id }, orderBy: { episodeNumber: 'asc' } });
  let changedEpisodes = 0;
  let skippedEpisodes = 0;
  let partsTotal = 0;
  for (const ep of episodes) {
    const sources = String(ep.images || '').split(',').map((s) => s.trim()).filter(Boolean);
    if (!sources.length) continue;
    const newPaths = [];
    let changed = false;
    for (const src of sources) {
      const srcKey = toKey(src);
      if (/\.webp$/i.test(srcKey)) {
        if (!(await r2Exists(srcKey))) console.log(`missing webp: ${srcKey}`);
        newPaths.push(src);
        continue;
      }
      let buf;
      try { buf = await r2Get(srcKey); }
      catch (e) { console.log(`cannot read ${srcKey}: ${e.message}`); newPaths.push(src); continue; }
      const meta = await sharp(buf).metadata();
      const width = meta.width;
      const height = meta.height;
      const base = srcKey.slice(0, -path.extname(srcKey).length);
      if (!width || !height) { newPaths.push(src); continue; }
      if (height <= WEBP_MAX) {
        const outKey = `${base}.webp`;
        const outBuf = await sharp(buf).webp({ quality: QUALITY }).toBuffer();
        await r2Put(outKey, outBuf);
        newPaths.push('/' + outKey);
        partsTotal++;
        changed = true;
      } else {
        const nParts = Math.ceil(height / CHUNK_H);
        for (let i = 0; i < nParts; i++) {
          const top = i * CHUNK_H;
          const h = Math.min(CHUNK_H, height - top);
          const outKey = `${base}_p${String(i + 1).padStart(2, '0')}.webp`;
          const outBuf = await sharp(buf).extract({ left: 0, top, width, height: h }).webp({ quality: QUALITY }).toBuffer();
          await r2Put(outKey, outBuf);
          newPaths.push('/' + outKey);
          partsTotal++;
        }
        changed = true;
      }
    }
    if (changed) {
      await p.episode.update({ where: { id: ep.id }, data: { images: newPaths.join(',') } });
      changedEpisodes++;
    } else {
      skippedEpisodes++;
    }
  }
  console.log(JSON.stringify({ title: comic.title, rating: comic.rating, comicId: comic.id, changedEpisodes, skippedEpisodes, partsTotal }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
}).finally(async () => {
  await p.$disconnect();
});
