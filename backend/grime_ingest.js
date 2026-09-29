// grime_ingest.js — idempotent ingest of ONE staged grime work into ARATA (R2 + Comic/Episode).
// Uploads page images to R2 as jpg, find-or-creates Comic, upserts Episodes (images -> jpg paths).
// Then run:  node split-webp.js "<title>" 5000   to convert jpg -> webp and rewrite images.
// Usage: node grime_ingest.js --title "<title>" --genre adult|general [--stage-root /opt/ARATA/backend/_grime_stage]
const { S3Client, PutObjectCommand, HeadObjectCommand } = require("@aws-sdk/client-s3");
const { PrismaClient } = require("@prisma/client");
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const args = new Map();
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (a.startsWith("--")) {
    const n = process.argv[i + 1];
    if (n && !n.startsWith("--")) { args.set(a, n); i++; } else args.set(a, true);
  }
}
const TITLE = args.get("--title");
const GENRE = args.get("--genre"); // adult | general
const STAGE_ROOT = args.get("--stage-root") || "/opt/ARATA/backend/_grime_stage";
if (!TITLE || !["adult", "general"].includes(GENRE)) {
  console.error('Usage: node grime_ingest.js --title "<title>" --genre adult|general [--stage-root DIR]');
  process.exit(2);
}
const RATING = GENRE === "adult" ? "19" : "all";
const PAID_START = 2;

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY },
});
const Bucket = process.env.R2_BUCKET_NAME || "arata";
const p = new PrismaClient();

const IMG = /\.(jpe?g|png)$/i;
const pad3 = (n) => String(n).padStart(3, "0");
const ctype = (f) => (/\.png$/i.test(f) ? "image/png" : "image/jpeg");

async function r2Put(key, body, contentType) {
  await s3.send(new PutObjectCommand({ Bucket, Key: key, Body: body, ContentType: contentType }));
}
async function r2Exists(key) {
  try { await s3.send(new HeadObjectCommand({ Bucket, Key: key })); return true; } catch { return false; }
}
function parseImages(v) {
  if (!v) return [];
  return String(v).split(",").map((s) => s.trim()).filter(Boolean);
}

async function main() {
  const stageDir = path.join(STAGE_ROOT, TITLE);
  if (!fs.existsSync(stageDir)) throw new Error(`stage dir missing: ${stageDir}`);

  // 1) find-or-create Comic (idempotent by NORMALIZED title+rating to avoid case/spacing dups)
  const norm = (s) => String(s).normalize("NFC").replace(/\(完\)/g, "").replace(/\s+/g, "").toLowerCase().trim();
  const allSameRating = await p.comic.findMany({ where: { rating: RATING }, orderBy: { createdAt: "asc" } });
  const existing = allSameRating.filter((c) => norm(c.title) === norm(TITLE));
  if (existing.length > 1) throw new Error(`${TITLE}: ${existing.length} duplicate Comic rows (rating ${RATING}); refusing`);
  let comic = existing[0];
  if (!comic) {
    comic = await p.comic.create({
      data: {
        title: TITLE, description: "", thumbnail: null,
        genre: GENRE, rating: RATING, status: "ONGOING", authorName: "문스튜디오",
        paidStartEpisode: PAID_START, episodeCoinPrice: 3, locale: "ko", isOfficial: true,
      },
    });
    console.log(`[comic] created ${comic.id}`);
  } else {
    console.log(`[comic] reuse ${comic.id} (episodes exist: check per-episode)`);
  }

  // 2) thumbnail -> webp -> R2 -> comic.thumbnail
  const thumbSrc = ["thumbnail.jpg", "thumbnail.png", "thumbnail.jpeg"].map((f) => path.join(stageDir, f)).find(fs.existsSync);
  if (thumbSrc) {
    const thumbKey = `uploads/webtoons/${GENRE}/${TITLE}/thumbnail.webp`;
    const buf = await sharp(fs.readFileSync(thumbSrc)).webp({ quality: 85 }).toBuffer();
    await r2Put(thumbKey, buf, "image/webp");
    const thumbPath = "/" + thumbKey;
    if (comic.thumbnail !== thumbPath) await p.comic.update({ where: { id: comic.id }, data: { thumbnail: thumbPath } });
    console.log(`[thumb] ${thumbKey}`);
  }

  // 3) episodes
  const epDirs = fs.readdirSync(stageDir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && /^\d{3}$/.test(e.name))
    .map((e) => e.name).sort();
  let created = 0, updated = 0, skipped = 0, uploaded = 0;
  for (const epName of epDirs) {
    const epN = parseInt(epName, 10);
    const dir = path.join(stageDir, epName);
    const files = fs.readdirSync(dir).filter((f) => IMG.test(f)).sort();
    if (!files.length) { console.log(`[ep ${epN}] no images, skip`); continue; }

    const existingEp = await p.episode.findFirst({ where: { comicId: comic.id, episodeNumber: epN } });
    // Resume: if episode exists and already fully webp, skip
    if (existingEp) {
      const imgs = parseImages(existingEp.images);
      if (imgs.length && imgs.every((u) => /\.webp$/i.test(u))) { skipped++; continue; }
    }

    // upload pages as jpg to R2
    const imagePaths = [];
    for (const f of files) {
      const key = `uploads/webtoons/${GENRE}/${TITLE}/${epName}/${f}`;
      if (!(await r2Exists(key))) { await r2Put(key, fs.readFileSync(path.join(dir, f)), ctype(f)); uploaded++; }
      imagePaths.push("/" + key);
    }
    const data = {
      title: `${epN}화`, episodeNumber: epN, images: imagePaths.join(","),
      isFree: epN < PAID_START, locale: "ko",
    };
    if (existingEp) { await p.episode.update({ where: { id: existingEp.id }, data }); updated++; }
    else { await p.episode.create({ data: { ...data, comicId: comic.id } }); created++; }
  }

  console.log(JSON.stringify({ title: TITLE, comicId: comic.id, rating: RATING, epDirs: epDirs.length, created, updated, skipped, pagesUploaded: uploaded }, null, 2));
}

main().catch((e) => { console.error("ERR:", e.message); process.exitCode = 1; }).finally(async () => { await p.$disconnect(); });
