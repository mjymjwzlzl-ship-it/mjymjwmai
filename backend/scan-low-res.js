// Scan R2 for low-res webtoon images (width < 400px)
// Samples first image of each chapter folder, fetches first 200KB for sharp metadata
const { S3Client, ListObjectsV2Command, GetObjectCommand } = require('@aws-sdk/client-s3');
const dotenv = require('dotenv');
const sharp = require('sharp');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});
const Bucket = process.env.R2_BUCKET_NAME || 'arata';
const PREFIX = process.argv[2] || 'uploads/webtoons/';
const WIDTH_THRESHOLD = parseInt(process.argv[3] || '400', 10);

async function* listAll(prefix) {
  let token;
  do {
    const r = await s3.send(new ListObjectsV2Command({ Bucket, Prefix: prefix, ContinuationToken: token, MaxKeys: 1000 }));
    if (r.Contents) for (const o of r.Contents) yield o;
    token = r.IsTruncated ? r.NextContinuationToken : undefined;
  } while (token);
}

async function getDimensions(key) {
  const obj = await s3.send(new GetObjectCommand({ Bucket, Key: key, Range: 'bytes=0-200000' }));
  const chunks = [];
  for await (const c of obj.Body) chunks.push(c);
  const buf = Buffer.concat(chunks);
  const meta = await sharp(buf).metadata();
  return { width: meta.width, height: meta.height };
}

(async () => {
  console.error(`Scanning prefix=${PREFIX} threshold=<${WIDTH_THRESHOLD}px`);
  const sampled = new Map();
  const sizeMap = new Map();
  let totalImages = 0;

  for await (const o of listAll(PREFIX)) {
    if (!/\.(jpe?g|png|webp)$/i.test(o.Key)) continue;
    // skip thumbnails dir
    if (/\/thumbnail/i.test(o.Key)) continue;
    totalImages++;
    const folder = o.Key.substring(0, o.Key.lastIndexOf('/'));
    if (!sampled.has(folder)) {
      sampled.set(folder, o.Key);
      sizeMap.set(folder, o.Size);
    }
  }
  console.error(`Total images: ${totalImages}, distinct chapter folders: ${sampled.size}`);

  const folders = [...sampled.entries()];
  const lowRes = [];
  const errors = [];
  const all = [];
  const CONCURRENCY = 10;
  let idx = 0;
  let done = 0;

  async function worker() {
    while (idx < folders.length) {
      const i = idx++;
      const [folder, key] = folders[i];
      try {
        const { width, height } = await getDimensions(key);
        const size = sizeMap.get(folder);
        all.push({ folder, key, width, height, size });
        if (width < WIDTH_THRESHOLD) {
          lowRes.push({ folder, key, width, height, size });
          console.log(`LOW_RES\t${width}x${height}\t${Math.round(size/1024)}KB\t${key}`);
        }
      } catch (e) {
        errors.push({ key, err: e.message });
      }
      done++;
      if (done % 50 === 0) console.error(`  progress: ${done}/${folders.length}`);
    }
  }
  await Promise.all(Array(CONCURRENCY).fill(0).map(worker));

  console.error(`\n=== Summary ===`);
  console.error(`Total chapters scanned: ${all.length}`);
  console.error(`LOW-RES chapters (width < ${WIDTH_THRESHOLD}): ${lowRes.length}`);
  console.error(`Errors: ${errors.length}`);
  if (errors.length) errors.slice(0,5).forEach(e => console.error(`  ERR: ${e.key} — ${e.err}`));

  // Group low-res by work (parent of chapter folder)
  const byWork = new Map();
  for (const r of lowRes) {
    const workFolder = r.folder.substring(0, r.folder.lastIndexOf('/'));
    if (!byWork.has(workFolder)) byWork.set(workFolder, []);
    byWork.get(workFolder).push(r);
  }
  console.error(`\n=== 작품별 저해상도 회차 수 ===`);
  for (const [work, chapters] of [...byWork.entries()].sort((a,b) => b[1].length - a[1].length)) {
    console.error(`  ${chapters.length}회차\t${work}`);
  }
})();
