// 작품 연재 상태·작품 공지
// - 공개: GET /api/frontend/comics/:comicId/notices
// - 관리자: /api/admin/comic-status (상태·재개 예정일), /api/admin/comics/:comicId/notices (공지 등록·수정·삭제)
// 상태를 휴재·판매중지로 바꾸거나 휴재에서 연재중으로 되돌리면 [중요] 공지를 자동으로 만든다.
const express = require('express');
const { prisma } = require('../lib/prisma');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();
const adminOnly = [authenticate, requireAdmin];
const STATUSES = ['ONGOING', 'HIATUS', 'COMPLETED', 'SUSPENDED', 'HIDDEN'];
const NOTICE_TYPES = ['HIATUS', 'RESUME', 'SCHEDULE', 'SUSPENDED', 'GENERAL'];

const kstDate = (value) => new Date(value).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Seoul' });
const sortNotices = { orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }] };

router.get('/frontend/comics/:comicId/notices', async (req, res) => {
  const comic = await prisma.comic.findUnique({ where: { id: req.params.comicId }, select: { isPublished: true } });
  if (!comic || comic.isPublished === false) return res.status(404).json({ message: '작품을 찾을 수 없습니다.' });
  const notices = await prisma.comicNotice.findMany({ where: { comicId: req.params.comicId }, ...sortNotices, take: 50 });
  res.set('Cache-Control', 'public, max-age=60');
  res.json({ notices });
});

router.get('/admin/comic-status', adminOnly, async (req, res) => {
  const [comics, counts] = await Promise.all([
    prisma.comic.findMany({ select: { id: true, title: true, authorName: true, rating: true, status: true, statusNotice: true, resumeAt: true }, orderBy: { title: 'asc' } }),
    prisma.comicNotice.groupBy({ by: ['comicId'], _count: { _all: true } }),
  ]);
  const countById = new Map(counts.map((row) => [row.comicId, row._count._all]));
  res.json({ comics: comics.map((comic) => ({ ...comic, noticeCount: countById.get(comic.id) || 0 })) });
});

// 상태 변경 시 자동 공지 내용
function autoNotice(prev, next, { resumeAt, message }) {
  const extra = message ? `\n\n${message}` : '';
  if (next === 'HIATUS' && prev !== 'HIATUS') {
    return { type: 'HIATUS', title: '휴재 안내', content: `작품이 잠시 휴재합니다. ${resumeAt ? `연재 재개 예정일은 ${kstDate(resumeAt)}입니다.` : '연재 재개 일정이 정해지면 다시 안내해 드릴게요.'} 지금까지 공개된 회차는 그대로 볼 수 있어요.${extra}` };
  }
  if (next === 'ONGOING' && prev === 'HIATUS') {
    return { type: 'RESUME', title: '연재 재개 안내', content: `휴재를 마치고 연재를 다시 시작합니다. 기다려 주셔서 감사합니다.${extra}` };
  }
  if (next === 'SUSPENDED' && prev !== 'SUSPENDED') {
    return { type: 'SUSPENDED', title: '판매중지 안내', content: `이 작품은 판매가 중지되어 유료 회차를 새로 대여·소장할 수 없습니다. 이미 소장한 회차와 대여 기간이 남은 회차, 무료 회차는 계속 볼 수 있어요.${extra}` };
  }
  return null;
}

router.put('/admin/comic-status/:comicId', adminOnly, async (req, res) => {
  const { status, statusNotice, resumeAt, createNotice = true } = req.body || {};
  if (status !== undefined && !STATUSES.includes(status)) return res.status(400).json({ message: '연재 상태 값이 올바르지 않습니다.' });
  const current = await prisma.comic.findUnique({ where: { id: req.params.comicId }, select: { id: true, status: true } });
  if (!current) return res.status(404).json({ message: '작품을 찾을 수 없습니다.' });
  const data = {};
  if (status !== undefined) data.status = status;
  if (statusNotice !== undefined) data.statusNotice = String(statusNotice || '').trim() || null;
  if (resumeAt !== undefined) {
    data.resumeAt = resumeAt ? new Date(resumeAt) : null;
    if (data.resumeAt && Number.isNaN(data.resumeAt.getTime())) return res.status(400).json({ message: '재개 예정일 형식이 올바르지 않습니다.' });
  }
  const comic = await prisma.comic.update({ where: { id: current.id }, data, select: { id: true, status: true, statusNotice: true, resumeAt: true } });
  let notice = null;
  const auto = status !== undefined && createNotice !== false && autoNotice(current.status, status, { resumeAt: comic.resumeAt, message: comic.statusNotice });
  if (auto) {
    // 이전 휴재·판매중지 공지는 고정 해제 (지난 안내가 맨 위에 남지 않게)
    await prisma.comicNotice.updateMany({ where: { comicId: current.id, isPinned: true, type: { in: ['HIATUS', 'SUSPENDED'] } }, data: { isPinned: false } });
    notice = await prisma.comicNotice.create({ data: { comicId: current.id, ...auto, isPinned: auto.type !== 'RESUME' } });
  }
  res.json({ comic, notice });
});

function parseNotice(body) {
  const data = {};
  if (body.type !== undefined) data.type = String(body.type).toUpperCase();
  if (body.title !== undefined) data.title = String(body.title).trim();
  if (body.content !== undefined) data.content = String(body.content).trim();
  if (body.isPinned !== undefined) data.isPinned = body.isPinned === true || body.isPinned === 'true';
  return data;
}

router.get('/admin/comics/:comicId/notices', adminOnly, async (req, res) => {
  res.json({ notices: await prisma.comicNotice.findMany({ where: { comicId: req.params.comicId }, ...sortNotices }) });
});

router.post('/admin/comics/:comicId/notices', adminOnly, async (req, res) => {
  const data = parseNotice(req.body || {});
  if (!data.title || !data.content) return res.status(400).json({ message: '제목과 내용을 입력하세요.' });
  if (data.type && !NOTICE_TYPES.includes(data.type)) return res.status(400).json({ message: '공지 유형이 올바르지 않습니다.' });
  if (!(await prisma.comic.findUnique({ where: { id: req.params.comicId }, select: { id: true } }))) return res.status(404).json({ message: '작품을 찾을 수 없습니다.' });
  res.json({ notice: await prisma.comicNotice.create({ data: { ...data, comicId: req.params.comicId } }) });
});

router.put('/admin/comics/:comicId/notices/:noticeId', adminOnly, async (req, res) => {
  const data = parseNotice(req.body || {});
  if (data.type && !NOTICE_TYPES.includes(data.type)) return res.status(400).json({ message: '공지 유형이 올바르지 않습니다.' });
  const result = await prisma.comicNotice.updateMany({ where: { id: req.params.noticeId, comicId: req.params.comicId }, data });
  if (!result.count) return res.status(404).json({ message: '공지를 찾을 수 없습니다.' });
  res.json({ success: true });
});

router.delete('/admin/comics/:comicId/notices/:noticeId', adminOnly, async (req, res) => {
  const result = await prisma.comicNotice.deleteMany({ where: { id: req.params.noticeId, comicId: req.params.comicId } });
  if (!result.count) return res.status(404).json({ message: '공지를 찾을 수 없습니다.' });
  res.json({ success: true });
});

module.exports = router;
