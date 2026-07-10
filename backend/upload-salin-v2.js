// v2: PNG 항상 업로드, webp는 height ≤ 16383일 때만, 실패 시 기존 webp 삭제
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
const WORK_NAME = path.basename(LOCAL_DIR);
const R2_PREFIX = `uploads/webtoons/adult/${WORK_NAME}`;

async function putFile(localPath, key, contentType) {
  const data = fs.readFileSync(localPath);
  await s3.send(new PutObjectCommand({ Bucket, Key: key, Body: data, ContentType: contentType }));
  return data.length;
}

(async () => {
  console.log(`Local dir: ${LOCAL_DIR}`);
  console.log(`R2 prefix: ${R2_PREFIX}`);

  const entries = fs.readdirSync(LOCAL_DIR, { withFileTypes: true })
    .filter(e => e.isDirectory() && e.name !== '배너')
    .map(e => e.name).sort();
  console.log(`Chapter folders: ${entries.length}`);

  let ok = 0, err = 0;
  for (const ch of entries) {
    const chDir = path.join(LOCAL_DIR, ch);
    const pngs = fs.readdirSync(chDir).filter(f => /\.png$/i.test(f));
    if (pngs.length === 0) { console.log(`SKIP ${ch}: no png`); continue; }
    const pngName = pngs[0];
    const pngPath = path.join(chDir, pngName);
    const webpName = pngName.replace(/\.png$/i, '.webp');
    const webpPath = path.join(chDir, webpName);
    const pngKey = `${R2_PREFIX}/${ch}/${pngName}`;
    const webpKey = `${R2_PREFIX}/${ch}/${webpName}`;

    try {
      const meta = await sharp(pngPath).metadata();
      const sizeMB = (fs.statSync(pngPath).size / 1024 / 1024).toFixed(1);
      console.log(`\n[${ch}] ${pngName} ${sizeMB}MB ${meta.width}x${meta.height}`);

      if (meta.width < 400) { console.log(`  ❌ source low-res, skip`); err++; continue; }

      // 1) PNG 업로드 항상
      await putFile(pngPath, pngKey, 'image/png');
      console.log(`  ✅ PNG: ${pngKey}`);

      // 2) WebP — height ≤ 16383일 때만
      if (meta.height <= 16383) {
        try {
          await sharp(pngPath).webp({ quality: 85 }).toFile(webpPath);
          await putFile(webpPath, webpKey, 'image/webp');
          console.log(`  ✅ WEBP: ${webpKey} (${(fs.statSync(webpPath).size/1024).toFixed(0)}KB)`);
        } catch (we) {
          console.log(`  ⚠️ webp gen failed: ${we.message.slice(0,60)} — deleting old webp from R2`);
          await s3.send(new DeleteObjectCommand({ Bucket, Key: webpKey })).catch(()=>{});
        }
      } else {
        // 너무 길어서 webp 불가 → 기존 저해상도 webp 삭제
        await s3.send(new DeleteObjectCommand({ Bucket, Key: webpKey })).catch(()=>{});
        console.log(`  🗑️ old WEBP deleted (height ${meta.height} > webp limit 16383, png-only mode)`);
      }
      ok++;
    } catch (e) {
      console.error(`  ❌ ${ch}: ${e.message}`);
      err++;
    }
  }
  console.log(`\n=== Summary: OK=${ok} ERR=${err} ===`);
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
