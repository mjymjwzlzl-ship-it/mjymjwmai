// Usage: node upload-salin-originals.js <local_dir>
// Reads D:\arata-originals\살인교실 style path; for each chapter folder, finds the png,
// converts to webp via sharp (q=85), uploads BOTH to R2 overwriting existing keys.
const { S3Client, PutObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');
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

const LOCAL_DIR = process.argv[2] || '/tmp/살인교실';
const WORK_NAME = path.basename(LOCAL_DIR);
const R2_PREFIX = `uploads/webtoons/adult/${WORK_NAME}`;

async function uploadFile(localPath, key, contentType) {
  const data = fs.readFileSync(localPath);
  await s3.send(new PutObjectCommand({
    Bucket, Key: key, Body: data, ContentType: contentType,
  }));
  return data.length;
}

(async () => {
  console.log(`Local dir: ${LOCAL_DIR}`);
  console.log(`R2 prefix: ${R2_PREFIX}`);

  const entries = fs.readdirSync(LOCAL_DIR, { withFileTypes: true })
    .filter(e => e.isDirectory())
    .map(e => e.name)
    .sort();

  console.log(`Chapter folders: ${entries.length}`);

  let okCount = 0, skipCount = 0, errCount = 0;
  for (const chapter of entries) {
    const chDir = path.join(LOCAL_DIR, chapter);
    const files = fs.readdirSync(chDir).filter(f => /\.png$/i.test(f));
    if (files.length === 0) {
      console.log(`SKIP ${chapter}: no png`);
      skipCount++;
      continue;
    }
    if (files.length > 1) {
      console.log(`WARN ${chapter}: ${files.length} png files, using ${files[0]}`);
    }
    const pngName = files[0];
    const pngPath = path.join(chDir, pngName);
    const webpName = pngName.replace(/\.png$/i, '.webp');
    const webpPath = path.join(chDir, webpName);

    try {
      const stat = fs.statSync(pngPath);
      const pngMeta = await sharp(pngPath).metadata();
      console.log(`\n[${chapter}] ${pngName} ${(stat.size/1024/1024).toFixed(1)}MB ${pngMeta.width}x${pngMeta.height}`);

      if (pngMeta.width < 400) {
        console.log(`  ❌ source still low-res (${pngMeta.width}px), skipping`);
        errCount++;
        continue;
      }

      // Generate webp
      await sharp(pngPath).webp({ quality: 85 }).toFile(webpPath);
      const webpStat = fs.statSync(webpPath);
      console.log(`  → webp generated: ${(webpStat.size/1024).toFixed(0)}KB`);

      // Upload png
      const pngKey = `${R2_PREFIX}/${chapter}/${pngName}`;
      await uploadFile(pngPath, pngKey, 'image/png');
      console.log(`  ✅ PNG uploaded: ${pngKey}`);

      // Upload webp
      const webpKey = `${R2_PREFIX}/${chapter}/${webpName}`;
      await uploadFile(webpPath, webpKey, 'image/webp');
      console.log(`  ✅ WEBP uploaded: ${webpKey}`);

      okCount++;
    } catch (e) {
      console.error(`  ❌ ${chapter}: ${e.message}`);
      errCount++;
    }
  }

  console.log(`\n=== Summary: OK=${okCount} SKIP=${skipCount} ERR=${errCount} ===`);
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
