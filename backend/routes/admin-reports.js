// 관리자 신고 관리: /api/admin/report-center
// 상태: PENDING(접수) → PROCESSING(확인 중) → RESOLVED(처리 완료) / REJECTED(반려). 바꿀 때마다 ReportHistory 에 한 줄(메모 포함).
// 상세에는 같은 대상(댓글·회차·작품·사용자)의 지난 신고와 처리 메모를 함께 보여 준다.
const express = require('express');
const path = require('path');
const fs = require('fs');
const { prisma } = require('../lib/prisma');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { reasonLabel, TYPE_LABEL, STATUS_LABEL } = require('../lib/report-reasons');

const router = express.Router();
router.use('/admin/report-center', authenticate, requireAdmin);

const STATUSES = ['PENDING', 'PROCESSING', 'RESOLVED', 'REJECTED'];
const REPORT_IMAGE_DIR = path.join(__dirname, '../private/report-images');
const include = {
  reporter: { select: { id: true, nickname: true, email: true } },
  targetUser: { select: { id: true, nickname: true, email: true } },
  comic: { select: { id: true, title: true } },
  episode: { select: { id: true, episodeNumber: true, title: true, comic: { select: { id: true, title: true } } } },
  comment: { select: { id: true, content: true, isSpoiler: true, hiddenAt: true, userId: true, createdAt: true } },
};
const who = (u) => (u ? u.nickname || String(u.email || '').split('@')[0] : null);
const shape = (r) => ({
  id: r.id, type: r.type, typeLabel: TYPE_LABEL[r.type] || r.type, reason: r.reason, reasonLabel: reasonLabel(r.type, r.reason),
  description: r.description, status: r.status, statusLabel: STATUS_LABEL[r.status] || r.status, resolution: r.resolution,
  createdAt: r.createdAt, updatedAt: r.updatedAt, resolvedAt: r.resolvedAt, hasImage: !!r.imageUrl,
  // 예전 회차 신고는 comicId 가 비어 있어 회차의 작품으로 채운다
  comic: r.comic || r.episode?.comic || null, episode: r.episode ? { id: r.episode.id, episodeNumber: r.episode.episodeNumber, title: r.episode.title } : null, comment: r.comment, reporter: r.reporter ? { id: r.reporter.id, name: who(r.reporter) } : null,
  targetUser: r.targetUser ? { id: r.targetUser.id, name: who(r.targetUser) } : null,
});
// 같은 대상: 댓글 > 회차 > 작품(회차 없는 작품 신고) > 사용자
const sameTargetWhere = (r) => {
  if (r.commentId) return { commentId: r.commentId };
  if (r.episodeId) return { episodeId: r.episodeId };
  if (r.comicId) return { comicId: r.comicId, episodeId: null, commentId: null };
  if (r.targetUserId) return { targetUserId: r.targetUserId };
  return null;
};

router.get('/admin/report-center', async (req, res) => {
  const where = {};
  if (STATUSES.includes(req.query.status)) where.status = req.query.status;
  if (['COMIC', 'EPISODE', 'COMMENT', 'USER'].includes(req.query.type)) where.type = req.query.type === 'COMIC' ? { in: ['COMIC', 'EPISODE'] } : req.query.type;
  const q = String(req.query.q || '').trim();
  if (q) where.OR = [{ description: { contains: q } }, { comic: { title: { contains: q } } }, { comment: { content: { contains: q } } }];
  const [reports, counts] = await Promise.all([
    prisma.report.findMany({ where, include, orderBy: { createdAt: 'desc' }, take: 200 }),
    prisma.report.groupBy({ by: ['status'], _count: { _all: true } }),
  ]);
  // 같은 대상 신고 수 (반복 신고 표시)
  const repeat = new Map();
  for (const r of reports) {
    const key = r.commentId || r.episodeId || (r.comicId && `c:${r.comicId}`) || r.targetUserId;
    repeat.set(key, (repeat.get(key) || 0) + 1);
  }
  res.json({
    reports: reports.map((r) => ({ ...shape(r), sameTargetCount: repeat.get(r.commentId || r.episodeId || (r.comicId && `c:${r.comicId}`) || r.targetUserId) || 1 })),
    counts: Object.fromEntries(STATUSES.map((s) => [s, counts.find((c) => c.status === s)?._count._all || 0])),
  });
});

router.get('/admin/report-center/:id', async (req, res) => {
  const report = await prisma.report.findUnique({ where: { id: req.params.id }, include });
  if (!report) return res.status(404).json({ message: '신고를 찾을 수 없습니다.' });
  const sameWhere = sameTargetWhere(report);
  const [history, previous] = await Promise.all([
    prisma.reportHistory.findMany({ where: { reportId: report.id }, orderBy: { createdAt: 'asc' } }),
    sameWhere ? prisma.report.findMany({ where: { ...sameWhere, id: { not: report.id } }, include, orderBy: { createdAt: 'desc' }, take: 20 }) : [],
  ]);
  res.json({
    report: shape(report),
    history: history.map((h) => ({ ...h, fromLabel: h.fromStatus ? STATUS_LABEL[h.fromStatus] : null, toLabel: STATUS_LABEL[h.toStatus] || h.toStatus })),
    previous: previous.map(shape),
  });
});

// 상태 변경 + 메모. hideComment=true 면 신고된 댓글을 숨긴다(처리 완료일 때), unhideComment 로 되돌림
router.patch('/admin/report-center/:id', async (req, res) => {
  const report = await prisma.report.findUnique({ where: { id: req.params.id } });
  if (!report) return res.status(404).json({ message: '신고를 찾을 수 없습니다.' });
  const status = req.body?.status;
  const memo = String(req.body?.memo || '').trim().slice(0, 1000) || null;
  if (!STATUSES.includes(status)) return res.status(400).json({ message: '처리 상태가 올바르지 않습니다.' });
  if (status === report.status && !memo && !req.body?.hideComment && !req.body?.unhideComment) return res.status(400).json({ message: '바뀐 내용이 없습니다.' });
  const admin = await prisma.user.findUnique({ where: { id: req.user.id || req.user.userId }, select: { id: true, nickname: true, email: true } });
  const final = status === 'RESOLVED' || status === 'REJECTED';
  let extraMemo = '';
  if (report.commentId && req.body?.hideComment) {
    await prisma.comment.update({ where: { id: report.commentId }, data: { hiddenAt: new Date(), hiddenReason: memo || reasonLabel(report.type, report.reason) } });
    extraMemo = ' [댓글 숨김]';
  } else if (report.commentId && req.body?.unhideComment) {
    await prisma.comment.update({ where: { id: report.commentId }, data: { hiddenAt: null, hiddenReason: null } });
    extraMemo = ' [댓글 숨김 해제]';
  }
  await prisma.report.update({
    where: { id: report.id },
    data: { status, ...(memo ? { resolution: memo } : {}), resolvedAt: final ? new Date() : null, resolvedBy: final ? admin?.id || 'admin' : null },
  });
  await prisma.reportHistory.create({
    data: { reportId: report.id, fromStatus: report.status, toStatus: status, memo: (memo || '') + extraMemo || null, adminId: admin?.id, adminName: who(admin) || '관리자' },
  });
  res.json({ success: true });
});

// 첨부 스크린샷 (관리자만)
router.get('/admin/report-center/:id/image', async (req, res) => {
  const report = await prisma.report.findUnique({ where: { id: req.params.id }, select: { imageUrl: true } });
  if (!report?.imageUrl) return res.status(404).json({ message: '첨부 이미지가 없습니다.' });
  const file = path.join(REPORT_IMAGE_DIR, path.basename(report.imageUrl));
  if (!fs.existsSync(file)) return res.status(404).json({ message: '첨부 이미지 파일이 없습니다.' });
  res.set('Cache-Control', 'private, no-store');
  res.sendFile(file);
});

module.exports = router;
