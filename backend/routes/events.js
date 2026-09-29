// 이벤트: 공개 목록(/api/events) + 관리자 등록·수정·삭제(/api/admin/events)
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const sharp = require('sharp');
const { prisma } = require('../lib/prisma');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();
const adminOnly = [authenticate, requireAdmin];
const UPLOAD_DIR = path.join(__dirname, '../uploads/events');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)) return cb(null, true);
    cb(new Error('이미지 파일만 업로드할 수 있습니다.'));
  },
});

function eventStatus(event, now = new Date()) {
  if (new Date(event.startAt) > now) return 'UPCOMING';
  if (event.endAt && new Date(event.endAt) < now) return 'ENDED';
  return 'ONGOING';
}

const withStatus = (event) => ({ ...event, status: eventStatus(event) });

// 업로드 이미지는 webp 로 저장 (가로 1280 까지)
async function saveThumbnail(file) {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  const name = `event-${Date.now()}-${Math.round(Math.random() * 1e6)}.webp`;
  await sharp(file.buffer).rotate().resize({ width: 1280, withoutEnlargement: true }).webp({ quality: 85 }).toFile(path.join(UPLOAD_DIR, name));
  return `/uploads/events/${name}`;
}

function parseBody(body) {
  const data = {};
  if (body.title !== undefined) data.title = String(body.title).trim();
  if (body.summary !== undefined) data.summary = String(body.summary).trim() || null;
  if (body.link !== undefined) data.link = String(body.link).trim();
  if (body.thumbnailUrl !== undefined && String(body.thumbnailUrl).trim()) data.thumbnailUrl = String(body.thumbnailUrl).trim();
  if (body.startAt !== undefined) data.startAt = new Date(body.startAt);
  if (body.endAt !== undefined) data.endAt = body.endAt ? new Date(body.endAt) : null;
  if (body.isActive !== undefined) data.isActive = body.isActive === true || body.isActive === 'true';
  if (body.isFeatured !== undefined) data.isFeatured = body.isFeatured === true || body.isFeatured === 'true';
  if (body.order !== undefined) data.order = Number(body.order) || 0;
  return data;
}

function validate(data, isCreate) {
  if (isCreate && (!data.title || !data.link || !data.startAt)) return '제목, 이동 링크, 시작일은 필수입니다.';
  if (data.startAt && Number.isNaN(data.startAt.getTime())) return '시작일 형식이 올바르지 않습니다.';
  if (data.endAt && Number.isNaN(data.endAt.getTime())) return '종료일 형식이 올바르지 않습니다.';
  if (data.startAt && data.endAt && data.endAt < data.startAt) return '종료일이 시작일보다 빠릅니다.';
  if (data.link && !/^(\/|https?:\/\/)/.test(data.link)) return '링크는 / 또는 http(s):// 로 시작해야 합니다.';
  return null;
}

// GET /api/events?status=ongoing|upcoming|ended|all&featured=1&limit=4
router.get('/events', async (req, res) => {
  try {
    const status = String(req.query.status || 'all').toUpperCase();
    const events = (await prisma.event.findMany({
      where: { isActive: true, ...(req.query.featured === '1' ? { isFeatured: true } : {}) },
      orderBy: [{ order: 'asc' }, { startAt: 'desc' }],
    })).map(withStatus);
    const filtered = status === 'ALL' ? events : events.filter((event) => event.status === status);
    const limit = Math.min(Number(req.query.limit) || 100, 100);
    res.set('Cache-Control', 'public, max-age=60');
    res.json({ events: filtered.slice(0, limit) });
  } catch (error) {
    console.error('이벤트 목록 오류:', error);
    res.status(500).json({ message: '이벤트를 불러오지 못했습니다.' });
  }
});

router.get('/admin/events', adminOnly, async (req, res) => {
  const events = await prisma.event.findMany({ orderBy: [{ order: 'asc' }, { startAt: 'desc' }] });
  res.json({ events: events.map(withStatus) });
});

router.post('/admin/events', adminOnly, upload.single('thumbnail'), async (req, res) => {
  try {
    const data = parseBody(req.body);
    if (req.file) data.thumbnailUrl = await saveThumbnail(req.file);
    const error = validate(data, true) || (!data.thumbnailUrl ? '썸네일 이미지가 필요합니다.' : null);
    if (error) return res.status(400).json({ message: error });
    const event = await prisma.event.create({ data });
    res.json({ event: withStatus(event) });
  } catch (error) {
    console.error('이벤트 등록 오류:', error);
    res.status(500).json({ message: error.message || '이벤트를 등록하지 못했습니다.' });
  }
});

router.put('/admin/events/:eventId', adminOnly, upload.single('thumbnail'), async (req, res) => {
  try {
    const data = parseBody(req.body);
    if (req.file) data.thumbnailUrl = await saveThumbnail(req.file);
    const error = validate(data, false);
    if (error) return res.status(400).json({ message: error });
    const event = await prisma.event.update({ where: { id: req.params.eventId }, data });
    res.json({ event: withStatus(event) });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ message: '이벤트를 찾을 수 없습니다.' });
    console.error('이벤트 수정 오류:', error);
    res.status(500).json({ message: '이벤트를 수정하지 못했습니다.' });
  }
});

router.delete('/admin/events/:eventId', adminOnly, async (req, res) => {
  try {
    await prisma.event.delete({ where: { id: req.params.eventId } });
    res.json({ success: true });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ message: '이벤트를 찾을 수 없습니다.' });
    res.status(500).json({ message: '이벤트를 삭제하지 못했습니다.' });
  }
});

module.exports = router;
