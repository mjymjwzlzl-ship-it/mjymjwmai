// 관리자 커뮤니티 관리: /api/admin/community (게시판 현황·게시글·댓글·카테고리)
// 게시글 상태: NORMAL 정상 / HIDDEN 숨김 / DELETED 삭제, "신고 검토 중" = 처리 안 끝난 신고가 있는 글 (신고 관리와 연동)
const express = require('express');
const { prisma } = require('../lib/prisma');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { boardCategories } = require('./board');

const router = express.Router();
router.use('/admin/community', authenticate, requireAdmin);

const who = (u) => (u ? u.nickname || String(u.email || '').split('@')[0] : '-');
const OPEN = ['PENDING', 'PROCESSING'];
async function openReports(kind, ids) {
  if (!ids.length) return new Map();
  const rows = await prisma.report.groupBy({ by: [kind], where: { [kind]: { in: ids }, status: { in: OPEN }, type: kind === 'postId' ? 'POST' : 'POST_COMMENT' }, _count: { _all: true } });
  return new Map(rows.map((r) => [r[kind], r._count._all]));
}
async function worksOf(posts) {
  const cIds = [...new Set(posts.map((p) => p.comicId).filter(Boolean))]; const eIds = [...new Set(posts.map((p) => p.episodeId).filter(Boolean))];
  const [cs, es] = await Promise.all([cIds.length ? prisma.comic.findMany({ where: { id: { in: cIds } }, select: { id: true, title: true } }) : [], eIds.length ? prisma.episode.findMany({ where: { id: { in: eIds } }, select: { id: true, episodeNumber: true } }) : []]);
  return { c: new Map(cs.map((x) => [x.id, x])), e: new Map(es.map((x) => [x.id, x])) };
}

router.get('/admin/community/overview', async (req, res) => {
  const cats = await boardCategories({ all: true });
  const [byCat, byStatus, pinned, reports, comments] = await Promise.all([
    prisma.post.groupBy({ by: ['category'], where: { status: { not: 'DELETED' } }, _count: { _all: true } }),
    prisma.post.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.post.findMany({ where: { isPinned: true, status: { not: 'DELETED' } }, select: { id: true, title: true, noticeType: true, pinnedUntil: true, category: true }, orderBy: { createdAt: 'desc' } }),
    prisma.report.count({ where: { type: { in: ['POST', 'POST_COMMENT'] }, status: { in: OPEN } } }),
    prisma.postComment.groupBy({ by: ['status'], _count: { _all: true } }),
  ]);
  res.json({
    categories: cats.map((c) => ({ ...c, posts: byCat.find((b) => b.category === c.key)?._count._all || 0 })),
    postStatus: Object.fromEntries(byStatus.map((b) => [b.status, b._count._all])),
    commentStatus: Object.fromEntries(comments.map((b) => [b.status, b._count._all])),
    pinned, openReports: reports,
  });
});

router.get('/admin/community/posts', async (req, res) => {
  const where = {};
  if (['NORMAL', 'HIDDEN', 'DELETED'].includes(req.query.status)) where.status = req.query.status;
  if (req.query.category) where.category = String(req.query.category);
  if (req.query.pinned === 'true') where.isPinned = true;
  if (req.query.spoiler === 'true') where.isSpoiler = true;
  const q = String(req.query.q || '').trim();
  if (q) where.OR = [{ title: { contains: q } }, { content: { contains: q } }, { author: { OR: [{ nickname: { contains: q } }, { email: { contains: q } }] } }];
  let posts = await prisma.post.findMany({ where, include: { author: { select: { id: true, nickname: true, email: true, status: true } }, likes: { select: { isUpvote: true } }, _count: { select: { comments: true } } }, orderBy: { createdAt: 'desc' }, take: 500 });
  const reported = await openReports('postId', posts.map((p) => p.id));
  if (req.query.reported === 'true') posts = posts.filter((p) => reported.get(p.id));
  const works = await worksOf(posts);
  const cats = new Map((await boardCategories({ all: true })).map((c) => [c.key, c.name]));
  res.json({
    posts: posts.map((p) => ({
      id: p.id, title: p.title, category: p.category, categoryName: cats.get(p.category) || p.category, status: p.status, statusReason: p.statusReason,
      review: !!reported.get(p.id), openReports: reported.get(p.id) || 0, isSpoiler: p.isSpoiler, noticeType: p.noticeType, isPinned: p.isPinned, pinnedUntil: p.pinnedUntil,
      author: { id: p.author.id, name: who(p.author), email: p.author.email, status: p.author.status }, viewCount: p.viewCount, likeCount: p.likes.filter((l) => l.isUpvote).length, commentCount: p._count.comments,
      work: p.comicId ? { id: p.comicId, title: works.c.get(p.comicId)?.title || '(삭제된 작품)', episodeNumber: p.episodeId ? works.e.get(p.episodeId)?.episodeNumber : null } : null,
      createdAt: p.createdAt,
    })),
  });
});

router.get('/admin/community/posts/:id', async (req, res) => {
  const p = await prisma.post.findUnique({ where: { id: req.params.id }, include: { author: { select: { id: true, nickname: true, email: true, status: true } } } });
  if (!p) return res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });
  const [comments, reports, works] = await Promise.all([
    prisma.postComment.findMany({ where: { postId: p.id }, include: { author: { select: { id: true, nickname: true, email: true } } }, orderBy: { createdAt: 'asc' } }),
    prisma.report.findMany({ where: { OR: [{ postId: p.id, type: 'POST' }, { type: 'POST_COMMENT', postId: p.id }] }, select: { id: true, type: true, reason: true, status: true, createdAt: true, postCommentId: true }, orderBy: { createdAt: 'desc' } }),
    worksOf([p]),
  ]);
  res.json({
    post: { ...p, author: { id: p.author.id, name: who(p.author), email: p.author.email, status: p.author.status }, work: p.comicId ? { id: p.comicId, title: works.c.get(p.comicId)?.title, episodeNumber: p.episodeId ? works.e.get(p.episodeId)?.episodeNumber : null } : null },
    comments: comments.map((c) => ({ id: c.id, parentId: c.parentId, content: c.content, status: c.status, likeCount: c.likeCount, author: { id: c.author.id, name: who(c.author) }, createdAt: c.createdAt })),
    reports,
  });
});

router.patch('/admin/community/posts/:id', async (req, res) => {
  const p = await prisma.post.findUnique({ where: { id: req.params.id } });
  if (!p) return res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });
  const b = req.body || {};
  const data = {};
  if (b.status !== undefined) { if (!['NORMAL', 'HIDDEN', 'DELETED'].includes(b.status)) return res.status(400).json({ message: '상태가 올바르지 않습니다.' }); data.status = b.status; data.statusReason = b.status === 'NORMAL' ? null : String(b.statusReason || '').trim() || (b.status === 'HIDDEN' ? '관리자 숨김' : '관리자 삭제'); }
  if (b.noticeType !== undefined) {
    if (b.noticeType && !['NOTICE', 'IMPORTANT'].includes(b.noticeType)) return res.status(400).json({ message: '고정 종류가 올바르지 않습니다.' });
    data.noticeType = b.noticeType || null; data.isPinned = !!b.noticeType;
  }
  if (b.pinnedUntil !== undefined) { const d = b.pinnedUntil ? new Date(b.pinnedUntil) : null; if (d && Number.isNaN(d.getTime())) return res.status(400).json({ message: '고정 기간이 올바르지 않습니다.' }); data.pinnedUntil = d; }
  if (b.isSpoiler !== undefined) data.isSpoiler = !!b.isSpoiler;
  if (b.category !== undefined) { if (!(await prisma.boardCategory.findUnique({ where: { key: String(b.category) } }))) return res.status(400).json({ message: '분류가 없습니다.' }); data.category = String(b.category); }
  await prisma.post.update({ where: { id: p.id }, data });
  res.json({ success: true });
});
// 영구 삭제: 삭제 상태인 글만 (댓글·좋아요 함께)
router.delete('/admin/community/posts/:id', async (req, res) => {
  const p = await prisma.post.findUnique({ where: { id: req.params.id }, select: { id: true, status: true } });
  if (!p) return res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });
  if (p.status !== 'DELETED') return res.status(400).json({ message: '먼저 [삭제] 상태로 바꾼 글만 영구 삭제할 수 있습니다.' });
  const cIds = (await prisma.postComment.findMany({ where: { postId: p.id }, select: { id: true } })).map((c) => c.id);
  await prisma.$transaction([
    prisma.postCommentLike.deleteMany({ where: { commentId: { in: cIds } } }),
    prisma.postBookmark.deleteMany({ where: { postId: p.id } }),
    prisma.post.delete({ where: { id: p.id } }),
  ]);
  res.json({ success: true });
});

router.get('/admin/community/comments', async (req, res) => {
  const where = {};
  if (['NORMAL', 'HIDDEN', 'DELETED'].includes(req.query.status)) where.status = req.query.status;
  const q = String(req.query.q || '').trim();
  if (q) where.OR = [{ content: { contains: q } }, { author: { OR: [{ nickname: { contains: q } }, { email: { contains: q } }] } }];
  let rows = await prisma.postComment.findMany({ where, include: { author: { select: { id: true, nickname: true, email: true, status: true } }, post: { select: { id: true, title: true } } }, orderBy: { createdAt: 'desc' }, take: 500 });
  const reported = await openReports('postCommentId', rows.map((c) => c.id));
  if (req.query.reported === 'true') rows = rows.filter((c) => reported.get(c.id));
  res.json({ comments: rows.map((c) => ({ id: c.id, content: c.content, status: c.status, isReply: !!c.parentId, likeCount: c.likeCount, openReports: reported.get(c.id) || 0, author: { id: c.author.id, name: who(c.author), email: c.author.email, status: c.author.status }, post: c.post, createdAt: c.createdAt })) });
});
router.patch('/admin/community/comments/:id', async (req, res) => {
  const status = req.body?.status;
  if (!['NORMAL', 'HIDDEN', 'DELETED'].includes(status)) return res.status(400).json({ message: '상태가 올바르지 않습니다.' });
  const r = await prisma.postComment.updateMany({ where: { id: req.params.id }, data: { status } });
  if (!r.count) return res.status(404).json({ message: '댓글을 찾을 수 없습니다.' });
  res.json({ success: true });
});

// 카테고리
const cleanKey = (v) => String(v || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 30);
router.get('/admin/community/categories', async (req, res) => {
  const cats = await boardCategories({ all: true });
  const counts = await prisma.post.groupBy({ by: ['category'], where: { status: { not: 'DELETED' } }, _count: { _all: true } });
  res.json({ categories: cats.map((c) => ({ ...c, posts: counts.find((x) => x.category === c.key)?._count._all || 0 })) });
});
router.post('/admin/community/categories', async (req, res) => {
  const key = cleanKey(req.body?.key); const name = String(req.body?.name || '').trim().slice(0, 20);
  if (!key || !name) return res.status(400).json({ message: '영문 키와 이름을 입력하세요.' });
  if (await prisma.boardCategory.findUnique({ where: { key } })) return res.status(400).json({ message: '이미 있는 키입니다.' });
  const last = await prisma.boardCategory.findFirst({ orderBy: { order: 'desc' }, select: { order: true } });
  const c = await prisma.boardCategory.create({ data: { key, name, description: String(req.body?.description || '').slice(0, 100) || null, adminOnly: !!req.body?.adminOnly, isActive: req.body?.isActive !== false, order: (last?.order ?? -1) + 1 } });
  res.json({ category: c });
});
router.put('/admin/community/categories/:id', async (req, res) => {
  const b = req.body || {}; const data = {};
  if (b.name !== undefined) { data.name = String(b.name || '').trim().slice(0, 20); if (!data.name) return res.status(400).json({ message: '이름을 입력하세요.' }); }
  if (b.description !== undefined) data.description = String(b.description || '').slice(0, 100) || null;
  if (b.adminOnly !== undefined) data.adminOnly = !!b.adminOnly;
  if (b.isActive !== undefined) data.isActive = !!b.isActive;
  const r = await prisma.boardCategory.updateMany({ where: { id: req.params.id }, data });
  if (!r.count) return res.status(404).json({ message: '분류를 찾을 수 없습니다.' });
  res.json({ success: true });
});
router.delete('/admin/community/categories/:id', async (req, res) => {
  const c = await prisma.boardCategory.findUnique({ where: { id: req.params.id } });
  if (!c) return res.status(404).json({ message: '분류를 찾을 수 없습니다.' });
  const n = await prisma.post.count({ where: { category: c.key, status: { not: 'DELETED' } } });
  if (n) return res.status(400).json({ message: `이 분류에 글이 ${n}개 있어 삭제할 수 없습니다. 숨기려면 [사용]을 끄세요.` });
  await prisma.boardCategory.delete({ where: { id: c.id } });
  res.json({ success: true });
});
router.post('/admin/community/categories/reorder', async (req, res) => {
  const ids = Array.isArray(req.body?.ids) ? req.body.ids.map(String) : [];
  await prisma.$transaction(ids.map((id, i) => prisma.boardCategory.updateMany({ where: { id }, data: { order: i } })));
  res.json({ success: true });
});

module.exports = router;
