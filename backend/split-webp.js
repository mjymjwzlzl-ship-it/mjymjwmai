// Strip-split into webp chunks (16000px height) + R2 upload + DB Episode.images update
// Usage: node split-webp.js <comic_title_contains> [chunkHeight=16000] [quality=85]
const { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');
const { PrismaClient } = require('@prisma/client');
const sharp = require('sharp');
const path = require('path');
require('dotenv').config();

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY },
});
const Bucket = process.env.R2_BUCKET_NAME || 'arata';
const p = new PrismaClient();

const TITLE = process.argv[2];
const CHUNK_H = parseInt(process.argv[3] || '16000', 10);
const QUALITY = parseInt(process.argv[4] || '85', 10);
const WEBP_MAX = 16383;
const DELETE_SOURCE = process.argv.includes('--delete-source');

// TITLE optional — if missing or "ALL", process all comics

async function r2Get(key) {
  const o = await s3.send(new GetObjectCommand({ Bucket, Key: key }));
  const chunks = [];
  for await (const c of o.Body) chunks.push(c);
  return Buffer.concat(chunks);
}
async function r2Put(key, body, contentType) {
  await s3.send(new PutObjectCommand({ Bucket, Key: key, Body: body, ContentType: contentType }));
}
async function r2Del(key) {
  await s3.send(new DeleteObjectCommand({ Bucket, Key: key })).catch(() => {});
}
async function r2Exists(key) {
  try { await s3.send(new HeadObjectCommand({ Bucket, Key: key })); return true; } catch { return false; }
}

// Convert R2 path (DB style "/uploads/...") to R2 key
const toKey = (p) => p.startsWith('/') ? p.slice(1) : p;

async function processComic(comic) {
  console.log(`\n========================================`);
  console.log(`📚 ${comic.title} (${comic.id})  chunk=${CHUNK_H}px q=${QUALITY}`);
  console.log(`========================================`);
  const episodes = await p.episode.findMany({ where: { comicId: comic.id }, orderBy: { episodeNumber: 'asc' } });
  console.log(`Episodes: ${episodes.length}`);

  let chTotal = 0, chSkipped = 0, partsTotal = 0;
  for (const ep of episodes) {
    if (!ep.images) { console.log(`SKIP ep${ep.episodeNumber}: no images`); continue; }
    const sources = ep.images.split(',').map(s => s.trim()).filter(Boolean);
    if (!sources.length) continue;

    const newPaths = [];
    let anyChange = false;
    let chProcessed = false;

    for (const src of sources) {
      const srcKey = toKey(src);

      // If src already a webp and we don't need to redo, skip
      // But we want to convert non-webp sources OR webp that came from original chunks (we'll just preserve those)
      if (/\.webp$/i.test(srcKey)) {
        // already webp — keep as is (probably small enough)
        // but check existence; if missing, log
        if (!(await r2Exists(srcKey))) { console.log(`  ⚠️ ep${ep.episodeNumber} missing source webp: ${srcKey}`); newPaths.push(src); continue; }
        newPaths.push(src);
        continue;
      }

      // Non-webp source — process
      let buf;
      try { buf = await r2Get(srcKey); }
      catch (e) { console.log(`  ❌ ep${ep.episodeNumber}: cannot read ${srcKey}: ${e.message.slice(0,60)}`); newPaths.push(src); continue; }
      const meta = await sharp(buf).metadata();
      const { width, height } = meta;

      // Determine target prefix and name (strip extension)
      const ext = path.extname(srcKey);
      const base = srcKey.slice(0, -ext.length); // e.g., "uploads/.../001/살인교실_001화"

      if (height <= WEBP_MAX) {
        // Single webp
        const outKey = `${base}.webp`;
        const outBuf = await sharp(buf).webp({ quality: QUALITY }).toBuffer();
        await r2Put(outKey, outBuf, 'image/webp');
        console.log(`  ✅ ep${ep.episodeNumber} ${path.basename(srcKey)} → 1 webp (${(outBuf.length/1024).toFixed(0)}KB) ${width}x${height}`);
        newPaths.push('/' + outKey);
        partsTotal++;
        anyChange = true;
        chProcessed = true;
        if (DELETE_SOURCE && srcKey !== outKey) await r2Del(srcKey);
      } else {
        // Split into chunks of CHUNK_H px height
        const nParts = Math.ceil(height / CHUNK_H);
        const partKeys = [];
        const pad = nParts >= 10 ? 2 : 2;
        const baseSharp = sharp(buf);
        for (let i = 0; i < nParts; i++) {
          const top = i * CHUNK_H;
          const h = Math.min(CHUNK_H, height - top);
          const outKey = `${base}_p${String(i + 1).padStart(pad, '0')}.webp`;
          const outBuf = await sharp(buf)
            .extract({ left: 0, top, width, height: h })
            .webp({ quality: QUALITY })
            .toBuffer();
          await r2Put(outKey, outBuf, 'image/webp');
          partKeys.push('/' + outKey);
          partsTotal++;
        }
        const totalKB = partKeys.length; // logging only
        console.log(`  ✅ ep${ep.episodeNumber} ${path.basename(srcKey)} → ${nParts} parts (split ${CHUNK_H}px) ${width}x${height}`);
        newPaths.push(...partKeys);
        anyChange = true;
        chProcessed = true;
        if (DELETE_SOURCE) await r2Del(srcKey);
        // Delete leftover old .webp at base key (from previous attempts)
        await r2Del(`${base}.webp`);
      }
    }

    if (anyChange) {
      const newImages = newPaths.join(',');
      await p.episode.update({ where: { id: ep.id }, data: { images: newImages } });
      chTotal++;
    } else { chSkipped++; }
  }

  console.log(`✅ ${comic.title}: 변환 ${chTotal}화, skip ${chSkipped}화, 총 webp ${partsTotal}개`);
  return { chTotal, chSkipped, partsTotal };
}

(async () => {
  let comics;
  if (!TITLE || TITLE === 'ALL') {
    comics = await p.comic.findMany({ orderBy: { title: 'asc' } });
    console.log(`📊 처리할 comic: ${comics.length}개`);
  } else {
    comics = await p.comic.findMany({ where: { title: { contains: TITLE } } });
    if (!comics.length) { console.error(`Comic "${TITLE}" not found`); process.exit(1); }
  }

  const grand = { chTotal: 0, chSkipped: 0, partsTotal: 0 };
  for (const c of comics) {
    try {
      const r = await processComic(c);
      grand.chTotal += r.chTotal; grand.chSkipped += r.chSkipped; grand.partsTotal += r.partsTotal;
    } catch (e) {
      console.error(`❌ ${c.title} ERROR: ${e.message}`);
    }
  }

  console.log(`\n\n🎉 GRAND TOTAL: 변환 ${grand.chTotal}화, skip ${grand.chSkipped}화, 총 webp ${grand.partsTotal}개`);
  await p.$disconnect();
})().catch(e => { console.error('FATAL:', e.message); console.error(e.stack); p.$disconnect(); process.exit(1); });
