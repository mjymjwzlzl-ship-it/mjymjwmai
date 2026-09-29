// 순결게임 2화, 5화 specific uploader with filename remapping
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
const BASE = '/home/ubuntu/arata-originals/순결게임';
const R2_PREFIX = 'uploads/webtoons/adult/순결게임';

const targets = [
  { src: '순결게임_2화(JPG)', chapter: '002', filePrefix: '순결게임_02', srcPattern: /순결게임_2화 \((\d+)\)\.jpg/ },
  { src: '순결게임_5화(JPG)', chapter: '005', filePrefix: '순결게임_05', srcPattern: /순결게임_5화 \((\d+)\)\.jpg/ },
];

async function putFile(localPath, key, contentType) {
  await s3.send(new PutObjectCommand({ Bucket, Key: key, Body: fs.readFileSync(localPath), ContentType: contentType }));
}

(async () => {
  let totalPages = 0;
  for (const t of targets) {
    const dir = path.join(BASE, t.src);
    if (!fs.existsSync(dir)) { console.log(`MISSING: ${dir}`); continue; }
    const files = fs.readdirSync(dir)
      .map(f => ({ name: f, m: f.match(t.srcPattern) }))
      .filter(x => x.m)
      .map(x => ({ name: x.name, page: parseInt(x.m[1]) }))
      .sort((a, b) => a.page - b.page);
    console.log(`\n[${t.src}] ${files.length} pages → ${t.chapter}`);
    for (const f of files) {
      const fpath = path.join(dir, f.name);
      const targetName = `${t.filePrefix}_${String(f.page).padStart(3, '0')}.jpg`;
      const targetWebp = targetName.replace(/\.jpg$/, '.webp');
      try {
        const meta = await sharp(fpath).metadata();
        const sizeMB = (fs.statSync(fpath).size/1024/1024).toFixed(1);
        if (meta.width < 400) { console.log(`  ❌ ${f.name}: ${meta.width}px source low, skip`); continue; }

        const key = `${R2_PREFIX}/${t.chapter}/${targetName}`;
        await putFile(fpath, key, 'image/jpeg');
        console.log(`  ✅ ${f.name} (${meta.width}x${meta.height} ${sizeMB}MB) → ${key}`);
        totalPages++;

        const webpKey = `${R2_PREFIX}/${t.chapter}/${targetWebp}`;
        const webpPath = path.join(dir, '_tmp_' + targetWebp);
        if (meta.height <= 16383) {
          try {
            await sharp(fpath).webp({ quality: 85 }).toFile(webpPath);
            await putFile(webpPath, webpKey, 'image/webp');
            console.log(`  ✅ webp → ${webpKey}`);
            fs.unlinkSync(webpPath);
          } catch (we) {
            await s3.send(new DeleteObjectCommand({ Bucket, Key: webpKey })).catch(()=>{});
            console.log(`  ⚠️ webp gen failed, old removed`);
          }
        } else {
          await s3.send(new DeleteObjectCommand({ Bucket, Key: webpKey })).catch(()=>{});
          console.log(`  🗑️ old webp removed (height > 16383)`);
        }
      } catch (e) {
        console.error(`  ❌ ${f.name}: ${e.message.slice(0,80)}`);
      }
    }
  }
  console.log(`\n=== Pages uploaded: ${totalPages} ===`);
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
