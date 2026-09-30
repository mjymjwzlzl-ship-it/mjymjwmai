// 관리자센터 [작품 관리]: 작품별 상세 조정 (MIB 관리자 작품 편집을 참고해 확장)
// GET    /api/admin/works                       목록 (검색·유형·상태·공개 필터, UP/NEW 배지)
// GET    /api/admin/works/:id                   상세 + 회차 목록
// PATCH  /api/admin/works/:id                   작품 정보·판매 설정·유형·연재 상태·런칭일·공개 여부
// POST   /api/admin/works/:id/thumbnail         표지 업로드 (webp 변환)
// POST   /api/admin/works/:id/episodes          새 회차 (웹툰: 이미지 여러 장 / 웹소설: 본문), 공개 일시 지정 = 예약 공개
// PATCH  /api/admin/works/:id/episodes/:epId    회차 제목·공개 일시·웹소설 본문
// DELETE /api/admin/works/:id/episodes/:epId    회차 삭제 (구매·조회 기록이 있으면 거절)
// 배지 기준(사이트와 동일): UP = 한국 시간 오늘 공개된 회차가 있는 작품, NEW = 런칭(작품 등록일) 7일 이내.
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const sharp = require('sharp');
const { prisma } = require('../lib/prisma');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { contentTypeOf } = require('../lib/content-format');
const { parseCredits, normalizeCredits } = require('../lib/credits');
const { refreshPromotions } = require('../services/promotions');

const router = express.Router();
router.use('/admin/works', authenticate, requireAdmin);

const UPLOAD_ROOT = path.join(__dirname, '../uploads');
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024, files: 300 },
  fileFilter: (req, file, cb) => (/^image\/(jpeg|png|webp|gif)$/.test(file.mimetype) ? cb(null, true) : cb(new Error('이미지 파일만 올릴 수 있습니다.'))),
});

const { isUpToday, isNewLaunch, newUntil, kstDay } = require('../lib/badges');
const { applyStatusNotice } = require('../services/status-notice');
const { parseTags, normalizeTags } = require('../lib/tags');
const parseImages = (value) => {
  if (Array.isArray(value)) return value;
  try { const parsed = JSON.parse(value); if (Array.isArray(parsed)) return parsed; } catch {}
  return String(value || '').split(',').map((s) => s.trim()).filter(Boolean);
};

async function latestPublished(comicIds) {
  const rows = await prisma.episode.groupBy({ by: ['comicId'], where: { comicId: { in: comicIds }, createdAt: { lte: new Date() } }, _max: { createdAt: true } });
  return new Map(rows.map((row) => [row.comicId, row._max.createdAt]));
}

// 등록된 태그 전체 (관리자 태그 선택용, 많이 쓰인 순)
router.get('/admin/works-tags', authenticate, requireAdmin, async (req, res) => {
  const rows = await prisma.comic.findMany({ where: { tags: { not: null } }, select: { tags: true } });
  const counts = new Map();
  for (const row of rows) for (const tag of parseTags(row.tags)) counts.set(tag, (counts.get(tag) || 0) + 1);
  res.json({ tags: [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ko')).map(([name, count]) => ({ name, count })) });
});

router.get('/admin/works', async (req, res) => {
  const q = String(req.query.q || '').trim();
  const where = {
    ...(q ? { OR: [{ title: { contains: q } }, { authorName: { contains: q } }] } : {}),
    ...(req.query.status ? { status: String(req.query.status) } : {}),
    ...(req.query.published === 'false' ? { isPublished: false } : req.query.published === 'true' ? { isPublished: true } : {}),
    ...(req.query.rating === 'adult' ? { rating: { in: ['19', 'ADULT', 'adult'] } } : req.query.rating === 'general' ? { rating: { notIn: ['19', 'ADULT', 'adult'] } } : {}),
  };
  const comics = await prisma.comic.findMany({
    where,
    select: { id: true, title: true, authorName: true, thumbnail: true, genre: true, rating: true, status: true, contentType: true, isPublished: true, paidStartEpisode: true, episodeCoinPrice: true, viewCount: true, createdAt: true, _count: { select: { episodes: true } } },
    orderBy: { createdAt: 'desc' },
  });
  const latest = await latestPublished(comics.map((c) => c.id));
  const scheduledRows = await prisma.episode.groupBy({ by: ['comicId'], where: { comicId: { in: comics.map((c) => c.id) }, createdAt: { gt: new Date() } }, _count: { _all: true } });
  const scheduledById = new Map(scheduledRows.map((row) => [row.comicId, row._count._all]));
  const type = String(req.query.type || '');
  const list = comics
    .map((c) => ({ ...c, type: contentTypeOf(c), episodes: c._count.episodes, scheduled: scheduledById.get(c.id) || 0, lastEpisodeAt: latest.get(c.id) || null, badges: { up: isUpToday(latest.get(c.id)), new: isNewLaunch(c.createdAt), hiatus: c.status === 'HIATUS', suspended: c.status === 'SUSPENDED' } }))
    .filter((c) => !type || c.type === type);
  res.json({ works: list });
});

router.get('/admin/works/:id', async (req, res) => {
  const comic = await prisma.comic.findUnique({
    where: { id: req.params.id },
    include: {
      episodes: { orderBy: { episodeNumber: 'asc' }, select: { id: true, episodeNumber: true, title: true, thumbnail: true, images: true, textContent: true, authorNote: true, createdAt: true, viewCount: true, _count: { select: { purchases: true } } } },
    },
  });
  if (!comic) return res.status(404).json({ message: '작품을 찾을 수 없습니다.' });
  const now = new Date();
  const published = comic.episodes.filter((ep) => ep.createdAt <= now);
  const lastEpisodeAt = published.length ? published.reduce((max, ep) => (ep.createdAt > max ? ep.createdAt : max), published[0].createdAt) : null;
  const isFreeEp = (n) => comic.paidStartEpisode === 0 || n < comic.paidStartEpisode;
  res.json({
    work: {
      ...comic,
      type: contentTypeOf(comic),
      tags: parseTags(comic.tags),
      credits: parseCredits(comic),
      episodes: undefined,
      badges: { up: isUpToday(lastEpisodeAt), new: isNewLaunch(comic.createdAt), hiatus: comic.status === 'HIATUS', suspended: comic.status === 'SUSPENDED' },
      newUntil: newUntil(comic.createdAt),
      lastEpisodeAt,
      // 예약 공개 대기 회차 (공개 예정 시각 순)
      upcoming: comic.episodes.filter((ep) => ep.createdAt > now).sort((a, b) => a.createdAt - b.createdAt).map((ep) => ({ id: ep.id, episodeNumber: ep.episodeNumber, title: ep.title, publishAt: ep.createdAt })),
    },
    episodes: comic.episodes.map((ep) => ({
      id: ep.id,
      episodeNumber: ep.episodeNumber,
      title: ep.title,
      thumbnail: ep.thumbnail,
      publishedAt: ep.createdAt,
      scheduled: ep.createdAt > now,
      publishedToday: ep.createdAt <= now && kstDay(ep.createdAt) === kstDay(now),
      free: isFreeEp(ep.episodeNumber),
      imageCount: parseImages(ep.images).length,
      textLength: ep.textContent ? ep.textContent.length : 0,
      textContent: comic.contentType === 'NOVEL' ? ep.textContent || '' : undefined,
      authorNote: ep.authorNote || '',
      viewCount: ep.viewCount,
      purchases: ep._count.purchases,
    })),
  });
});

const TYPES = { webtoon: 'WEBTOON', book: 'BOOK', novel: 'NOVEL', WEBTOON: 'WEBTOON', BOOK: 'BOOK', NOVEL: 'NOVEL' };
const STATUSES = ['ONGOING', 'HIATUS', 'COMPLETED', 'SUSPENDED', 'HIDDEN'];

router.patch('/admin/works/:id', async (req, res) => {
  const b = req.body || {};
  const data = {};
  for (const key of ['title', 'authorName', 'genre', 'description', 'thumbnail']) if (b[key] !== undefined) data[key] = String(b[key]).trim();
  if (data.title === '') return res.status(400).json({ message: '제목은 비울 수 없습니다.' });
  // 참여자(글·그림·스튜디오): 저장하면 작가 표시(authorName)도 이름을 이어 맞춘다(검색·목록 표시용)
  if (b.credits !== undefined) {
    const credits = normalizeCredits(b.credits);
    data.credits = credits.length ? JSON.stringify(credits) : null;
    if (credits.length) data.authorName = [...new Set(credits.map((c) => c.name))].join(', ');
  }
  if (b.contentType !== undefined) {
    if (!TYPES[b.contentType]) return res.status(400).json({ message: '유형이 올바르지 않습니다.' });
    data.contentType = TYPES[b.contentType];
  }
  if (b.rating !== undefined) data.rating = ['19', 'ADULT'].includes(String(b.rating)) ? '19' : 'GENERAL';
  if (b.status !== undefined) {
    if (!STATUSES.includes(b.status)) return res.status(400).json({ message: '연재 상태가 올바르지 않습니다.' });
    data.status = b.status;
  }
  if (b.resumeAt !== undefined) data.resumeAt = b.resumeAt ? new Date(b.resumeAt) : null;
  if (b.isPublished !== undefined) data.isPublished = Boolean(b.isPublished);
  if (b.isOfficial !== undefined) data.isOfficial = Boolean(b.isOfficial);
  // 런칭일 = 작품 등록일(createdAt). NEW 배지는 이 날부터 7일
  if (b.launchedAt !== undefined) {
    const date = new Date(b.launchedAt);
    if (Number.isNaN(date.getTime())) return res.status(400).json({ message: '런칭일 형식이 올바르지 않습니다.' });
    data.createdAt = date;
  }
  if (b.tags !== undefined) data.tags = JSON.stringify(normalizeTags(b.tags));
  if (b.updateDays !== undefined) data.updateDays = JSON.stringify((Array.isArray(b.updateDays) ? b.updateDays : []).filter((d) => ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].includes(d)));
  for (const [key, min, max] of [['paidStartEpisode', 0, 100000], ['episodeCoinPrice', 0, 1000], ['rentalDays', 1, 365]]) {
    if (b[key] === undefined) continue;
    const value = Number(b[key]);
    if (!Number.isInteger(value) || value < min || value > max) return res.status(400).json({ message: `${key} 값이 올바르지 않습니다.` });
    data[key] = value;
  }
  if (b.rentalCoinPrice !== undefined) {
    if (b.rentalCoinPrice === null || b.rentalCoinPrice === '') data.rentalCoinPrice = null;
    else {
      const value = Number(b.rentalCoinPrice);
      if (!Number.isInteger(value) || value < 0) return res.status(400).json({ message: '대여가가 올바르지 않습니다.' });
      data.rentalCoinPrice = value;
    }
  }
  try {
    const before = await prisma.comic.findUnique({ where: { id: req.params.id }, select: { status: true } });
    const comic = await prisma.comic.update({ where: { id: req.params.id }, data });
    // 휴재·판매중지로 바꾸거나 풀면 [작품 공지] 자동 등록/고정 해제 (연재 상태 화면과 같은 규칙)
    if (before && data.status && before.status !== data.status) await applyStatusNotice(comic.id, before.status, data.status, { resumeAt: comic.resumeAt, message: comic.statusNotice });
    await refreshPromotions();
    res.json({ work: { ...comic, type: contentTypeOf(comic) } });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ message: '작품을 찾을 수 없습니다.' });
    throw error;
  }
});

router.post('/admin/works/:id/thumbnail', upload.single('thumbnail'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: '이미지를 올려 주세요.' });
  const comic = await prisma.comic.findUnique({ where: { id: req.params.id }, select: { id: true } });
  if (!comic) return res.status(404).json({ message: '작품을 찾을 수 없습니다.' });
  const dir = path.join(UPLOAD_ROOT, 'webtoons', 'admin', comic.id);
  await fs.mkdir(dir, { recursive: true });
  const name = `thumbnail-${Date.now()}.webp`;
  await sharp(req.file.buffer).rotate().resize({ width: 900, withoutEnlargement: true }).webp({ quality: 88 }).toFile(path.join(dir, name));
  const url = `/uploads/webtoons/admin/${comic.id}/${name}`;
  await prisma.comic.update({ where: { id: comic.id }, data: { thumbnail: url } });
  res.json({ thumbnail: url });
});

router.post('/admin/works/:id/episodes', upload.array('images', 300), async (req, res) => {
  const comic = await prisma.comic.findUnique({ where: { id: req.params.id }, select: { id: true, contentType: true, _count: { select: { episodes: true } } } });
  if (!comic) return res.status(404).json({ message: '작품을 찾을 수 없습니다.' });
  const last = await prisma.episode.findFirst({ where: { comicId: comic.id }, orderBy: { episodeNumber: 'desc' }, select: { episodeNumber: true } });
  const episodeNumber = Number(req.body.episodeNumber) || (last ? last.episodeNumber + 1 : 1);
  if (await prisma.episode.findFirst({ where: { comicId: comic.id, episodeNumber } })) return res.status(409).json({ message: `${episodeNumber}화가 이미 있습니다.` });
  const title = String(req.body.title || '').trim() || `${episodeNumber}화`;
  const publishedAt = req.body.publishedAt ? new Date(req.body.publishedAt) : new Date();
  if (Number.isNaN(publishedAt.getTime())) return res.status(400).json({ message: '공개 일시가 올바르지 않습니다.' });
  const isNovel = comic.contentType === 'NOVEL';
  let images = [];
  let textContent = null;
  if (isNovel) {
    textContent = String(req.body.textContent || '').trim();
    if (!textContent) return res.status(400).json({ message: '웹소설 본문을 입력해 주세요.' });
  } else {
    if (!req.files?.length) return res.status(400).json({ message: '회차 이미지를 올려 주세요.' });
    // 파일 이름 순서대로 webp 변환 (MIB·기존 회차와 같은 세로 긴 이미지 슬라이스)
    const files = [...req.files].sort((a, b) => a.originalname.localeCompare(b.originalname, 'ko', { numeric: true }));
    const dir = path.join(UPLOAD_ROOT, 'webtoons', 'admin', comic.id, `${episodeNumber}`);
    await fs.mkdir(dir, { recursive: true });
    for (const [index, file] of files.entries()) {
      const name = `${episodeNumber}_${String(index + 1).padStart(3, '0')}.webp`;
      await sharp(file.buffer).rotate().webp({ quality: 85 }).toFile(path.join(dir, name));
      images.push(`/uploads/webtoons/admin/${comic.id}/${episodeNumber}/${name}`);
    }
  }
  const episode = await prisma.episode.create({
    data: { comicId: comic.id, episodeNumber, title, images: isNovel ? '[]' : images.join(','), textContent, authorNote: String(req.body.authorNote || '').trim().slice(0, 1000) || null, createdAt: publishedAt },
  });
  await prisma.comic.update({ where: { id: comic.id }, data: { updatedAt: new Date() } });
  res.json({ episode: { id: episode.id, episodeNumber, title, publishedAt, scheduled: publishedAt > new Date(), imageCount: images.length } });
});

router.patch('/admin/works/:id/episodes/:epId', async (req, res) => {
  const episode = await prisma.episode.findUnique({ where: { id: req.params.epId }, select: { comicId: true } });
  if (!episode || episode.comicId !== req.params.id) return res.status(404).json({ message: '회차를 찾을 수 없습니다.' });
  const data = {};
  if (req.body.title !== undefined) data.title = String(req.body.title).trim() || undefined;
  if (req.body.publishedAt !== undefined) {
    const date = new Date(req.body.publishedAt);
    if (Number.isNaN(date.getTime())) return res.status(400).json({ message: '공개 일시가 올바르지 않습니다.' });
    data.createdAt = date;
  }
  if (req.body.textContent !== undefined) data.textContent = String(req.body.textContent);
  // 작가의 말: 비우면 삭제(null) → 뷰어에서 영역이 사라진다
  if (req.body.authorNote !== undefined) data.authorNote = String(req.body.authorNote || '').trim().slice(0, 1000) || null;
  const updated = await prisma.episode.update({ where: { id: req.params.epId }, data, select: { id: true, title: true, createdAt: true } });
  res.json({ episode: { ...updated, publishedAt: updated.createdAt } });
});

router.delete('/admin/works/:id/episodes/:epId', async (req, res) => {
  const episode = await prisma.episode.findUnique({ where: { id: req.params.epId }, select: { comicId: true, _count: { select: { purchases: true } } } });
  if (!episode || episode.comicId !== req.params.id) return res.status(404).json({ message: '회차를 찾을 수 없습니다.' });
  if (episode._count.purchases > 0) return res.status(409).json({ message: `구매 기록이 ${episode._count.purchases}건 있는 회차라 삭제할 수 없습니다. 비공개가 필요하면 공개 일시를 미래로 바꾸세요.` });
  // 조회 기록만 지우고 삭제. 댓글·평점 등 사용자 기록이 남아 있으면 지우지 않고 거절한다
  try {
    await prisma.$transaction([
      prisma.view.deleteMany({ where: { episodeId: req.params.epId } }),
      prisma.episode.delete({ where: { id: req.params.epId } }),
    ]);
  } catch (error) {
    if (error.code === 'P2003' || error.code === 'P2014') return res.status(409).json({ message: '댓글·평점 등 사용자 기록이 있는 회차라 삭제할 수 없습니다. 숨기려면 공개 일시를 미래로 바꾸세요.' });
    throw error;
  }
  res.json({ success: true });
});

module.exports = router;
