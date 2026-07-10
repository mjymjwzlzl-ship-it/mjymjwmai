// Generic uploader: chapter folder → R2 (PNG/JPG/JPEG, webp generated when height ≤ 16383)
// Usage: node upload-generic.js <local_dir> <r2_prefix>
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});
const Bucket = process.env.R2_BUCKET_NAME || 'arata';

const LOCAL_DIR = process.argv[2];
const R2_PREFIX = process.argv[3];
if (!LOCAL_DIR || !R2_PREFIX) { console.error('Usage: node upload-generic.js <local> <r2_prefix>'); process.exit(1); }

const EXCLUDE = /^(배너|banner|preview|썸네일|thumbnail)$/i;
const IMG = /\.(png|jpe?g)$/i;

const ctype = (f) => /\.png$/i.test(f) ? 'image/png' : 'image/jpeg';

async function putFile(localPath, key, contentType) {
  await s3.send(new PutObjectCommand({ Bucket, Key: key, Body: fs.readFileSync(localPath), ContentType: contentType }));
}

(async () => {
  console.log(`Local: ${LOCAL_DIR}`);
  console.log(`R2 prefix: ${R2_PREFIX}`);
  const chapters = fs.readdirSync(LOCAL_DIR, { withFileTypes: true })
    .filter(e => e.isDirectory() && !EXCLUDE.test(e.name))
    .map(e => e.name).sort();
  console.log(`Chapters: ${chapters.length}\n`);

  let ok = 0, err = 0, pageCount = 0;
  for (const ch of chapters) {
    const chDir = path.join(LOCAL_DIR, ch);
    const files = fs.readdirSync(chDir).filter(f => IMG.test(f)).sort();
    if (!files.length) { console.log(`SKIP ${ch}: no images`); continue; }
    console.log(`\n[${ch}] ${files.length} page(s)`);
    let chOk = true;
    for (const fname of files) {
      const fpath = path.join(chDir, fname);
      try {
        const meta = await sharp(fpath).metadata();
        const sizeMB = (fs.statSync(fpath).size/1024/1024).toFixed(1);
        if (meta.width < 400) {
          console.log(`  ❌ ${fname}: ${meta.width}x${meta.height} ${sizeMB}MB — source still low-res, skip`);
          chOk = false;
          continue;
        }
        const key = `${R2_PREFIX}/${ch}/${fname}`;
        await putFile(fpath, key, ctype(fname));
        console.log(`  ✅ ${fname} (${meta.width}x${meta.height} ${sizeMB}MB) → ${key}`);
        pageCount++;
        // webp companion (only if height ≤ 16383)
        const webpName = fname.replace(/\.(png|jpe?g)$/i, '.webp');
        const webpPath = path.join(chDir, webpName);
        const webpKey = `${R2_PREFIX}/${ch}/${webpName}`;
        if (meta.height <= 16383) {
          try {
            await sharp(fpath).webp({ quality: 85 }).toFile(webpPath);
            await putFile(webpPath, webpKey, 'image/webp');
            console.log(`  ✅ webp → ${webpKey}`);
            fs.unlinkSync(webpPath);
          } catch (we) {
            await s3.send(new DeleteObjectCommand({ Bucket, Key: webpKey })).catch(()=>{});
            console.log(`  ⚠️ webp failed, old removed`);
          }
        } else {
          await s3.send(new DeleteObjectCommand({ Bucket, Key: webpKey })).catch(()=>{});
          console.log(`  🗑️ old webp removed (height ${meta.height} > 16383)`);
        }
      } catch (e) {
        console.error(`  ❌ ${fname}: ${e.message.slice(0,80)}`);
        chOk = false;
      }
    }
    if (chOk) ok++; else err++;
  }
  console.log(`\n=== Summary: chapters OK=${ok} ERR=${err}, pages uploaded=${pageCount} ===`);
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
