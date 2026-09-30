// 관리자 배너 관리: /api/admin/banner-center
// 홈 대배너의 유일한 기준. 여기 등록·켜짐·기간 안 → 홈 > 대배너 노출, 삭제하면 홈에서도 빠진다 (lib/banners.js).
// [이벤트 관리 > 대배너에 추가]도 여기로 배너를 만든다(이벤트 종료일을 노출 종료로 기본 설정, 바꿀 수 있음).
const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const multer = require('multer');
const sharp = require('sharp');
const { prisma } = require('../lib/prisma');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { PLACEMENTS, bannerState } = require('../lib/banners');

const router = express.Router();
router.use('/admin/banner-center', authenticate, requireAdmin);

const BANNER_DIR = path.join(__dirname, '../uploads/banners');
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => (/^image\/(jpeg|png|webp|gif)$/.test(file.mimetype) ? cb(null, true) : cb(new Error('이미지 파일(JPG·PNG·WEBP·GIF)만 올릴 수 있습니다.'))),
});
const maybeUpload = (req, res, next) => upload.single('image')(req, res, (err) => (err ? res.status(400).json({ message: err.message || '이미지를 올리지 못했습니다.' }) : next()));

async function saveImage(file) {
  await fs.mkdir(BANNER_DIR, { recursive: true });
  const name = `banner-${Date.now()}-${Math.round(Math.random() * 1e6)}.webp`;
  // 글자가 들어 있는 배너가 잘리지 않게 자르지 않고 폭만 줄인다
  await sharp(file.buffer).rotate().resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 88 }).toFile(path.join(BANNER_DIR, name));
  return `/uploads/banners/${name}`;
}
const bool = (v, fallback) => (v === undefined ? fallback : v === true || v === 'true' || v === '1');
const dateOrNull = (v) => { if (!v) return null; const d = new Date(v); return Number.isNaN(d.getTime()) ? undefined : d; };

// 입력 정리 (create=true 면 필수값 확인)
async function parseBody(body, file, { create }) {
  const data = {};
  for (const key of ['title', 'subtitle', 'description', 'ctaText', 'ctaLink', 'type']) if (body[key] !== undefined) data[key] = String(body[key] || '').trim();
  if (body.placement !== undefined) {
    if (!PLACEMENTS[body.placement]) return { error: '노출 위치가 올바르지 않습니다.' };
    data.placement = body.placement;
  }
  if (body.webtoonId !== undefined) data.webtoonId = body.webtoonId ? String(body.webtoonId) : null;
  if (body.showText !== undefined) data.showText = bool(body.showText, true);
  if (body.isActive !== undefined) data.isActive = bool(body.isActive, true);
  for (const key of ['startAt', 'endAt']) {
    if (body[key] === undefined) continue;
    const d = dateOrNull(body[key]);
    if (d === undefined) return { error: `${key === 'startAt' ? '노출 시작' : '노출 종료'} 일시가 올바르지 않습니다.` };
    data[key] = d;
  }
  if (file) data.imageUrl = await saveImage(file);
  else if (body.imageUrl) data.imageUrl = String(body.imageUrl).trim();
  if (data.webtoonId && !(await prisma.comic.findUnique({ where: { id: data.webtoonId }, select: { id: true } }))) return { error: '연결할 작품을 찾을 수 없습니다.' };
  if (create) {
    if (!data.title) return { error: '배너 제목을 입력하세요.' };
    if (!data.imageUrl) return { error: '배너 이미지를 올리세요.' };
    if (!data.ctaLink && !data.webtoonId) return { error: '누르면 이동할 링크를 넣거나 작품을 연결하세요.' };
  } else if (data.title === '') return { error: '배너 제목은 비울 수 없습니다.' };
  if (data.startAt && data.endAt && data.endAt <= data.startAt) return { error: '노출 종료는 시작보다 뒤여야 합니다.' };
  return { data };
}

const shape = (b, events, now) => {
  const ev = b.eventId ? events.get(b.eventId) : null;
  return {
    ...b, state: bannerState(b, now), placementLabel: PLACEMENTS[b.placement] || b.placement,
    webtoonTitle: b.webtoon?.title || null, webtoon: undefined,
    event: ev ? { id: ev.id, title: ev.title, endAt: ev.endAt, ended: !!(ev.endAt && ev.endAt <= now) || !ev.isActive } : b.eventId ? { id: b.eventId, title: '(삭제된 이벤트)', ended: true } : null,
  };
};

router.get('/admin/banner-center', async (req, res) => {
  const now = new Date();
  const banners = await prisma.banner.findMany({ orderBy: [{ order: 'asc' }, { createdAt: 'asc' }], include: { webtoon: { select: { title: true } } } });
  const eventIds = banners.map((b) => b.eventId).filter(Boolean);
  const events = new Map((eventIds.length ? await prisma.event.findMany({ where: { id: { in: eventIds } } }) : []).map((e) => [e.id, e]));
  res.json({ banners: banners.map((b) => shape(b, events, now)), placements: PLACEMENTS });
});

router.post('/admin/banner-center', maybeUpload, async (req, res) => {
  const { data, error } = await parseBody(req.body || {}, req.file, { create: true });
  if (error) return res.status(400).json({ message: error });
  const last = await prisma.banner.findFirst({ orderBy: { order: 'desc' }, select: { order: true } });
  const banner = await prisma.banner.create({ data: { placement: 'HOME_MAIN', type: 'event', ...data, order: (last?.order ?? -1) + 1 } });
  res.json({ banner });
});

router.put('/admin/banner-center/:id', maybeUpload, async (req, res) => {
  const current = await prisma.banner.findUnique({ where: { id: req.params.id } });
  if (!current) return res.status(404).json({ message: '배너를 찾을 수 없습니다.' });
  const { data, error } = await parseBody(req.body || {}, req.file, { create: false });
  if (error) return res.status(400).json({ message: error });
  const start = data.startAt !== undefined ? data.startAt : current.startAt;
  const end = data.endAt !== undefined ? data.endAt : current.endAt;
  if (start && end && end <= start) return res.status(400).json({ message: '노출 종료는 시작보다 뒤여야 합니다.' });
  const banner = await prisma.banner.update({ where: { id: current.id }, data });
  res.json({ banner });
});

router.delete('/admin/banner-center/:id', async (req, res) => {
  const result = await prisma.banner.deleteMany({ where: { id: req.params.id } });
  if (!result.count) return res.status(404).json({ message: '배너를 찾을 수 없습니다.' });
  res.json({ success: true });
});

// 순서: 화면 위→아래 = 대배너 왼쪽→오른쪽
router.post('/admin/banner-center/reorder', async (req, res) => {
  const ids = Array.isArray(req.body?.ids) ? req.body.ids.map(String) : [];
  if (!ids.length) return res.status(400).json({ message: '순서를 보낼 배너가 없습니다.' });
  await prisma.$transaction(ids.map((id, index) => prisma.banner.updateMany({ where: { id }, data: { order: index } })));
  res.json({ success: true });
});

// 이벤트로 대배너 만들기: 제목·요약·이미지·링크를 가져오고 노출 종료 = 이벤트 종료일(바꿀 수 있음)
router.post('/admin/banner-center/from-event/:eventId', async (req, res) => {
  const event = await prisma.event.findUnique({ where: { id: req.params.eventId } });
  if (!event) return res.status(404).json({ message: '이벤트를 찾을 수 없습니다.' });
  const existing = await prisma.banner.findFirst({ where: { eventId: event.id } });
  if (existing) return res.status(409).json({ message: '이미 대배너에 등록된 이벤트입니다. [배너 관리]에서 확인하세요.', bannerId: existing.id });
  if (!event.thumbnailUrl) return res.status(400).json({ message: '이벤트 이미지가 없어 배너를 만들 수 없습니다.' });
  const last = await prisma.banner.findFirst({ orderBy: { order: 'desc' }, select: { order: true } });
  const banner = await prisma.banner.create({
    data: {
      title: event.title, subtitle: event.summary || '', imageUrl: event.thumbnailUrl, ctaLink: event.link || `/events`, ctaText: '이벤트 보기',
      type: 'event', placement: 'HOME_MAIN', showText: true, isActive: true,
      startAt: event.startAt > new Date() ? event.startAt : null, endAt: event.endAt || null, eventId: event.id,
      order: (last?.order ?? -1) + 1,
    },
  });
  res.json({ banner });
});

module.exports = router;
