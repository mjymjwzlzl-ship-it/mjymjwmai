// 관리자: 작품 연재 상태·공지 (/api/admin/comic-status)
const express = require('express');
const { prisma } = require('../lib/prisma');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();
const STATUSES = ['ONGOING', 'HIATUS', 'COMPLETED', 'SUSPENDED', 'HIDDEN'];

router.get('/admin/comic-status', authenticate, requireAdmin, async (req, res) => {
  const comics = await prisma.comic.findMany({
    select: { id: true, title: true, authorName: true, thumbnail: true, rating: true, status: true, statusNotice: true, resumeAt: true, isPublished: true },
    orderBy: { title: 'asc' },
  });
  res.json({ comics });
});

router.put('/admin/comic-status/:comicId', authenticate, requireAdmin, async (req, res) => {
  const { status, statusNotice, resumeAt } = req.body || {};
  if (status !== undefined && !STATUSES.includes(status)) return res.status(400).json({ message: '연재 상태 값이 올바르지 않습니다.' });
  const data = {};
  if (status !== undefined) data.status = status;
  if (statusNotice !== undefined) data.statusNotice = String(statusNotice || '').trim() || null;
  if (resumeAt !== undefined) {
    data.resumeAt = resumeAt ? new Date(resumeAt) : null;
    if (data.resumeAt && Number.isNaN(data.resumeAt.getTime())) return res.status(400).json({ message: '재개 예정일 형식이 올바르지 않습니다.' });
  }
  try {
    const comic = await prisma.comic.update({ where: { id: req.params.comicId }, data, select: { id: true, status: true, statusNotice: true, resumeAt: true } });
    res.json({ comic });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ message: '작품을 찾을 수 없습니다.' });
    throw error;
  }
});

module.exports = router;
