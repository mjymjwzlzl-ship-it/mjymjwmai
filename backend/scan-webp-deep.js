// Re-scan with 2MB range to catch webp files that 200KB range couldn't parse
const { S3Client, ListObjectsV2Command, GetObjectCommand } = require('@aws-sdk/client-s3');
const sharp = require('sharp');
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
const PREFIX = process.argv[2] || 'uploads/webtoons/';
const WIDTH_THRESHOLD = parseInt(process.argv[3] || '400', 10);
const RANGE = 2 * 1024 * 1024;

async function* listAll(prefix) {
  let token;
  do {
    const r = await s3.send(new ListObjectsV2Command({ Bucket, Prefix: prefix, ContinuationToken: token, MaxKeys: 1000 }));
    if (r.Contents) for (const o of r.Contents) yield o;
    token = r.IsTruncated ? r.NextContinuationToken : undefined;
  } while (token);
}

async function getDimensions(key, sizeHint) {
  const range = Math.min(RANGE, sizeHint || RANGE);
  const obj = await s3.send(new GetObjectCommand({ Bucket, Key: key, Range: `bytes=0-${range}` }));
  const chunks = [];
  for await (const c of obj.Body) chunks.push(c);
  const buf = Buffer.concat(chunks);
  const meta = await sharp(buf).metadata();
  return { width: meta.width, height: meta.height };
}

(async () => {
  console.error(`Deep-scan prefix=${PREFIX} threshold=<${WIDTH_THRESHOLD}px range=${RANGE/1024/1024}MB`);
  const sampled = new Map();
  const sizeMap = new Map();
  for await (const o of listAll(PREFIX)) {
    if (!/\.(jpe?g|png|webp)$/i.test(o.Key)) continue;
    if (/\/thumbnail/i.test(o.Key)) continue;
    const folder = o.Key.substring(0, o.Key.lastIndexOf('/'));
    if (!sampled.has(folder)) { sampled.set(folder, o.Key); sizeMap.set(folder, o.Size); }
  }
  console.error(`Folders: ${sampled.size}`);

  const folders = [...sampled.entries()];
  const lowRes = [];
  const errors = [];
  let idx = 0, done = 0;
  const CON = 8;
  async function worker() {
    while (idx < folders.length) {
      const [folder, key] = folders[idx++];
      try {
        const d = await getDimensions(key, sizeMap.get(folder));
        if (d.width < WIDTH_THRESHOLD) {
          lowRes.push({ folder, key, ...d, size: sizeMap.get(folder) });
          console.log(`LOW_RES\t${d.width}x${d.height}\t${Math.round(sizeMap.get(folder)/1024)}KB\t${key}`);
        }
      } catch (e) {
        errors.push({ key, err: e.message });
      }
      done++;
      if (done % 100 === 0) console.error(`  progress ${done}/${folders.length}`);
    }
  }
  await Promise.all(Array(CON).fill(0).map(worker));

  console.error(`\n=== Summary ===`);
  console.error(`Scanned: ${folders.length - errors.length}, LowRes: ${lowRes.length}, Errors: ${errors.length}`);
  if (errors.length && errors.length < 30) errors.forEach(e => console.error(`  ERR ${e.key}: ${e.err}`));

  const byWork = new Map();
  for (const r of lowRes) {
    const work = r.folder.substring(0, r.folder.lastIndexOf('/'));
    if (!byWork.has(work)) byWork.set(work, []);
    byWork.get(work).push(r);
  }
  console.error(`\n=== 작품별 저해상도 회차 ===`);
  for (const [w, ch] of [...byWork.entries()].sort((a,b) => b[1].length - a[1].length)) {
    console.error(`  ${ch.length}회차\t${w}`);
  }
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
