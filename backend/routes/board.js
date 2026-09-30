// 커뮤니티 게시판 API (/api/board) — 예전 /api/community 는 예전 화면 호환용으로 남김
// - 분류(BoardCategory), 작품·회차 연결, 스포일러 가림, 공지·중요 고정(기간), 추천(좋아요)·베스트(10+), 저장(북마크)
// - 정렬 최신·조회·추천·댓글, 검색 범위 제목·내용·작성자·작품명, 페이지 번호
// - 댓글·대댓글·댓글 좋아요, 차단한 사용자 글·댓글 숨김, 신고는 /api/report/submit (POST·POST_COMMENT)
// - 알림: 내 글에 댓글, 내 댓글에 답글 → 알림함 [커뮤니티]
const express = require('express');
const { prisma } = require('../lib/prisma');
const { authenticate, optionalAuth } = require('../middleware/auth');

const router = express.Router();
router.use(optionalAuth);

const PAGE_SIZE = 20;
const BEST_MIN = 10;
const isAdmin = (u) => !!u && ['ADMIN', 'CS_ADMIN'].includes(u.role);
const who = (u) => (u ? u.nickname || String(u.email || '').split('@')[0] : '알 수 없음');
const DEFAULT_CATEGORIES = [
  { key: 'free', name: '자유', order: 0 },
  { key: 'talk', name: '작품 이야기', order: 1 },
  { key: 'recommend', name: '작품 추천', order: 2 },
  { key: 'question', name: '질문', order: 3 },
  { key: 'creation', name: '창작', order: 4 },
  { key: 'notice', name: '공지', order: 5, adminOnly: true },
];

async function categories({ all = false } = {}) {
  if (!(await prisma.boardCategory.count())) {
    for (const c of DEFAULT_CATEGORIES) await prisma.boardCategory.create({ data: c }).catch(() => {});
    // 예전 글(general 등)은 [자유]로
    await prisma.post.updateMany({ where: { category: { notIn: DEFAULT_CATEGORIES.map((c) => c.key) } }, data: { category: 'free' } });
  }
  return prisma.boardCategory.findMany({ where: all ? {} : { isActive: true }, orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] });
}
async function blockedIdsOf(user) {
  if (!user) return new Set();
  return new Set((await prisma.blockedUser.findMany({ where: { blockerId: user.id }, select: { blockedId: true } })).map((b) => b.blockedId));
}
const pinnedNow = (p, now = new Date()) => p.isPinned && (!p.pinnedUntil || p.pinnedUntil > now);

async function workInfo(posts) {
  const comicIds = [...new Set(posts.map((p) => p.comicId).filter(Boolean))];
  const episodeIds = [...new Set(posts.map((p) => p.episodeId).filter(Boolean))];
  const [comics, episodes] = await Promise.all([
    comicIds.length ? prisma.comic.findMany({ where: { id: { in: comicIds } }, select: { id: true, title: true, contentType: true } }) : [],
    episodeIds.length ? prisma.episode.findMany({ where: { id: { in: episodeIds } }, select: { id: true, episodeNumber: true, title: true } }) : [],
  ]);
  return { comics: new Map(comics.map((c) => [c.id, c])), episodes: new Map(episodes.map((e) => [e.id, e])) };
}
function shapePost(p, ctx, { full = false } = {}) {
  const likes = (p.likes || []).filter((l) => l.isUpvote).length;
  const comic = p.comicId ? ctx.works.comics.get(p.comicId) : null;
  const episode = p.episodeId ? ctx.works.episodes.get(p.episodeId) : null;
  return {
    id: p.id, title: p.title, category: p.category, categoryName: ctx.catName.get(p.category) || p.category,
    ...(full ? { content: p.content } : { excerpt: String(p.content || '').replace(/\s+/g, ' ').slice(0, 80) }),
    author: who(p.author), authorId: p.authorId, isMine: !!ctx.user && ctx.user.id === p.authorId,
    viewCount: p.viewCount || 0, likeCount: likes, commentCount: p._count?.comments ?? 0,
    isBest: likes >= BEST_MIN, isSpoiler: p.isSpoiler, noticeType: p.noticeType, pinned: pinnedNow(p), pinnedUntil: p.pinnedUntil,
    work: comic ? { id: comic.id, title: comic.title, contentType: comic.contentType, episode: episode ? { id: episode.id, number: episode.episodeNumber, title: episode.title } : null } : null,
    createdAt: p.createdAt, updatedAt: p.updatedAt,
  };
}
const postInclude = { author: { select: { id: true, nickname: true, email: true } }, likes: { select: { isUpvote: true } }, _count: { select: { comments: { where: { status: 'NORMAL' } } } } };

router.get('/categories', async (req, res) => {
  const list = await categories();
  res.json({ categories: list.map((c) => ({ key: c.key, name: c.name, description: c.description, adminOnly: c.adminOnly, canWrite: !c.adminOnly || isAdmin(req.user) })) });
});

// 목록: ?category=&sort=latest|views|likes|comments|best&q=&field=all|title|content|author|work&page=&comicId=
router.get('/posts', async (req, res) => {
  const cats = await categories();
  const catName = new Map(cats.map((c) => [c.key, c.name]));
  const category = String(req.query.category || '');
  const sort = ['views', 'likes', 'comments', 'best'].includes(req.query.sort) ? req.query.sort : 'latest';
  const q = String(req.query.q || '').trim();
  const field = ['title', 'content', 'author', 'work'].includes(req.query.field) ? req.query.field : 'all';
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const blocked = await blockedIdsOf(req.user);
  const now = new Date();

  const where = { status: 'NORMAL', isAdult: false };
  if (category && category !== 'all') where.category = category;
  if (req.query.comicId) where.comicId = String(req.query.comicId);
  if (blocked.size) where.authorId = { notIn: [...blocked] };
  if (q) {
    const byWork = async () => (await prisma.comic.findMany({ where: { title: { contains: q } }, select: { id: true } })).map((c) => c.id);
    const byAuthor = { author: { OR: [{ nickname: { contains: q } }, { email: { startsWith: q } }] } };
    if (field === 'title') where.title = { contains: q };
    else if (field === 'content') where.content = { contains: q };
    else if (field === 'author') Object.assign(where, byAuthor);
    else if (field === 'work') where.comicId = { in: await byWork() };
    else where.OR = [{ title: { contains: q } }, { content: { contains: q } }, byAuthor, { comicId: { in: await byWork() } }];
  }
  // 고정 글(공지·중요): 검색·작품 필터가 없을 때 1페이지 맨 위, 전체 분류에서는 모든 분류의 고정 글
  const pinnedWhere = { status: 'NORMAL', isPinned: true, OR: [{ pinnedUntil: null }, { pinnedUntil: { gt: now } }], ...(category && category !== 'all' ? { category } : {}) };
  const showPinned = page === 1 && !q && !req.query.comicId && sort !== 'best';
  const pinnedRows = showPinned ? await prisma.post.findMany({ where: pinnedWhere, include: postInclude, orderBy: [{ noticeType: 'asc' }, { createdAt: 'desc' }], take: 10 }) : [];

  // 추천·댓글순·베스트는 계산이 필요해 후보를 받아 정렬 (게시글 수가 수천 개 넘어가면 캐시 컬럼으로 바꿀 것)
  let rows; let total;
  if (sort === 'latest' || sort === 'views') {
    total = await prisma.post.count({ where });
    rows = await prisma.post.findMany({ where, include: postInclude, orderBy: sort === 'views' ? [{ viewCount: 'desc' }, { createdAt: 'desc' }] : { createdAt: 'desc' }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE });
  } else {
    const all = await prisma.post.findMany({ where, include: postInclude, take: 3000, orderBy: { createdAt: 'desc' } });
    const likesOf = (p) => p.likes.filter((l) => l.isUpvote).length;
    let list = all;
    if (sort === 'best') list = all.filter((p) => likesOf(p) >= BEST_MIN);
    list = [...list].sort(sort === 'comments' ? (a, b) => b._count.comments - a._count.comments || b.createdAt - a.createdAt : (a, b) => likesOf(b) - likesOf(a) || b.createdAt - a.createdAt);
    total = list.length;
    rows = list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  }
  const works = await workInfo([...pinnedRows, ...rows]);
  const ctx = { user: req.user, catName, works };
  res.json({
    pinned: pinnedRows.map((p) => shapePost(p, ctx)),
    posts: rows.map((p) => shapePost(p, ctx)),
    page, pageSize: PAGE_SIZE, total, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  });
});

router.get('/posts/:id', async (req, res) => {
  const post = await prisma.post.findUnique({ where: { id: req.params.id }, include: postInclude });
  if (!post || post.status === 'DELETED' || (post.status !== 'NORMAL' && !isAdmin(req.user) && req.user?.id !== post.authorId)) return res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });
  await prisma.post.update({ where: { id: post.id }, data: { viewCount: { increment: 1 } } });
  post.viewCount += 1;
  const cats = await categories({ all: true });
  const blocked = await blockedIdsOf(req.user);
  const works = await workInfo([post]);
  const ctx = { user: req.user, catName: new Map(cats.map((c) => [c.key, c.name])), works };
  const [liked, bookmarked, comments] = await Promise.all([
    req.user ? prisma.postLike.findUnique({ where: { userId_postId: { userId: req.user.id, postId: post.id } } }) : null,
    req.user ? prisma.postBookmark.findUnique({ where: { userId_postId: { userId: req.user.id, postId: post.id } } }) : null,
    prisma.postComment.findMany({ where: { postId: post.id }, include: { author: { select: { id: true, nickname: true, email: true } } }, orderBy: { createdAt: 'asc' } }),
  ]);
  const myLikes = req.user ? new Set((await prisma.postCommentLike.findMany({ where: { userId: req.user.id, commentId: { in: comments.map((c) => c.id) } }, select: { commentId: true } })).map((l) => l.commentId)) : new Set();
  const shapeC = (c) => ({
    id: c.id, parentId: c.parentId, deleted: c.status === 'DELETED', hidden: c.status === 'HIDDEN', content: c.status === 'NORMAL' ? c.content : '',
    author: c.status === 'NORMAL' ? who(c.author) : '', authorId: c.authorId, isMine: !!req.user && req.user.id === c.authorId,
    isBlocked: blocked.has(c.authorId), likeCount: c.likeCount, isLiked: myLikes.has(c.id), createdAt: c.createdAt,
  });
  // 원댓글 + 답글 (삭제된 원댓글은 답글이 있을 때만 "삭제된 댓글입니다"로 남김)
  const tops = comments.filter((c) => !c.parentId);
  // 원댓글이 삭제·숨김이어도 답글이 있으면 자리만 남긴다 (답글은 정상인 것만)
  const tree = tops.map((c) => ({ ...shapeC(c), replies: comments.filter((r) => r.parentId === c.id && r.status === 'NORMAL').map(shapeC) }))
    .filter((c) => (!c.deleted && !c.hidden) || c.replies.length);
  res.json({
    post: { ...shapePost(post, ctx, { full: true }), status: post.status, isLiked: !!liked?.isUpvote, isBookmarked: !!bookmarked, authorBlocked: blocked.has(post.authorId) },
    comments: tree,
  });
});

async function validatePost(body, user, { partial = false } = {}) {
  const data = {};
  if (body.title !== undefined) data.title = String(body.title || '').trim().slice(0, 100);
  if (body.content !== undefined) data.content = String(body.content || '').trim().slice(0, 20000);
  if (!partial || body.title !== undefined) if (!data.title) return { error: '제목을 입력하세요.' };
  if (!partial || body.content !== undefined) if (!data.content) return { error: '내용을 입력하세요.' };
  if (body.category !== undefined || !partial) {
    const cat = await prisma.boardCategory.findUnique({ where: { key: String(body.category || '') } });
    if (!cat || !cat.isActive) return { error: '게시판 분류를 고르세요.' };
    if (cat.adminOnly && !isAdmin(user)) return { error: '이 분류는 관리자만 글을 쓸 수 있습니다.' };
    data.category = cat.key;
  }
  if (body.isSpoiler !== undefined) data.isSpoiler = body.isSpoiler === true || body.isSpoiler === 'true';
  if (body.comicId !== undefined) {
    data.comicId = body.comicId ? String(body.comicId) : null;
    data.episodeId = body.episodeId ? String(body.episodeId) : null;
    if (data.comicId && !(await prisma.comic.findUnique({ where: { id: data.comicId }, select: { id: true } }))) return { error: '연결할 작품을 찾을 수 없습니다.' };
    if (data.episodeId) {
      const ep = await prisma.episode.findUnique({ where: { id: data.episodeId }, select: { comicId: true } });
      if (!ep || ep.comicId !== data.comicId) return { error: '연결할 회차가 그 작품의 회차가 아닙니다.' };
    }
  }
  return { data };
}

router.post('/posts', authenticate, async (req, res) => {
  await categories();
  const { data, error } = await validatePost(req.body || {}, req.user);
  if (error) return res.status(400).json({ message: error });
  const post = await prisma.post.create({ data: { ...data, authorId: req.user.id, ...(data.category === 'notice' ? { isPinned: true, noticeType: 'NOTICE' } : {}) } });
  res.json({ id: post.id });
});
router.put('/posts/:id', authenticate, async (req, res) => {
  const post = await prisma.post.findUnique({ where: { id: req.params.id } });
  if (!post || post.status === 'DELETED') return res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });
  if (post.authorId !== req.user.id) return res.status(403).json({ message: '내 글만 고칠 수 있습니다.' });
  const { data, error } = await validatePost(req.body || {}, req.user, { partial: true });
  if (error) return res.status(400).json({ message: error });
  await prisma.post.update({ where: { id: post.id }, data });
  res.json({ success: true });
});
router.delete('/posts/:id', authenticate, async (req, res) => {
  const post = await prisma.post.findUnique({ where: { id: req.params.id } });
  if (!post || post.status === 'DELETED') return res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });
  if (post.authorId !== req.user.id && !isAdmin(req.user)) return res.status(403).json({ message: '내 글만 지울 수 있습니다.' });
  await prisma.post.update({ where: { id: post.id }, data: { status: 'DELETED', statusReason: post.authorId === req.user.id ? '작성자 삭제' : '관리자 삭제' } });
  res.json({ success: true });
});

router.post('/posts/:id/like', authenticate, async (req, res) => {
  const post = await prisma.post.findUnique({ where: { id: req.params.id }, select: { id: true, authorId: true, status: true } });
  if (!post || post.status !== 'NORMAL') return res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });
  if (post.authorId === req.user.id) return res.status(400).json({ message: '내 글은 추천할 수 없어요.', code: 'OWN_POST' });
  const key = { userId_postId: { userId: req.user.id, postId: post.id } };
  const existing = await prisma.postLike.findUnique({ where: key });
  if (existing?.isUpvote) await prisma.postLike.delete({ where: key });
  else await prisma.postLike.upsert({ where: key, create: { userId: req.user.id, postId: post.id, isUpvote: true }, update: { isUpvote: true } });
  const likeCount = await prisma.postLike.count({ where: { postId: post.id, isUpvote: true } });
  res.json({ liked: !existing?.isUpvote, likeCount });
});
router.post('/posts/:id/bookmark', authenticate, async (req, res) => {
  const post = await prisma.post.findUnique({ where: { id: req.params.id }, select: { id: true, status: true } });
  if (!post || post.status === 'DELETED') return res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });
  const key = { userId_postId: { userId: req.user.id, postId: post.id } };
  const existing = await prisma.postBookmark.findUnique({ where: key });
  if (existing) await prisma.postBookmark.delete({ where: key }); else await prisma.postBookmark.create({ data: { userId: req.user.id, postId: post.id } });
  res.json({ bookmarked: !existing });
});

async function notify(userId, item) {
  if (!userId) return;
  const pref = await prisma.notificationPreference.findUnique({ where: { userId } });
  if (pref && pref.community === false) return;
  await prisma.notification.create({ data: { userId, type: 'COMMUNITY', ...item } }).catch((e) => { if (e.code !== 'P2002') throw e; });
}

router.post('/posts/:id/comments', authenticate, async (req, res) => {
  const post = await prisma.post.findUnique({ where: { id: req.params.id }, select: { id: true, title: true, authorId: true, status: true } });
  if (!post || post.status !== 'NORMAL') return res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });
  const content = String(req.body?.content || '').trim().slice(0, 1000);
  if (!content) return res.status(400).json({ message: '댓글 내용을 입력하세요.' });
  let parent = null;
  if (req.body?.parentId) {
    parent = await prisma.postComment.findUnique({ where: { id: String(req.body.parentId) }, select: { id: true, parentId: true, postId: true, authorId: true } });
    if (!parent || parent.postId !== post.id) return res.status(400).json({ message: '답글을 달 댓글을 찾을 수 없습니다.' });
  }
  const comment = await prisma.postComment.create({ data: { content, postId: post.id, authorId: req.user.id, parentId: parent ? parent.parentId || parent.id : null } });
  // 로그인 미들웨어의 user 에는 닉네임이 없을 수 있어 다시 읽는다
  const me = await prisma.user.findUnique({ where: { id: req.user.id }, select: { nickname: true, email: true } });
  const name = who(me);
  const link = `/community/post/${post.id}#c-${comment.id}`;
  if (post.authorId !== req.user.id) await notify(post.authorId, { title: `내 글 「${post.title.slice(0, 30)}」에 댓글이 달렸어요`, body: `${name}: ${content.slice(0, 60)}`, link, dedupeKey: `pc:${comment.id}:post` });
  // 답글: 답을 단 댓글의 작성자에게 (글 작성자와 같으면 위의 댓글 알림으로 충분)
  const parentAuthor = parent?.authorId;
  if (parentAuthor && parentAuthor !== req.user.id && parentAuthor !== post.authorId) await notify(parentAuthor, { title: '내 댓글에 답글이 달렸어요', body: `${name}: ${content.slice(0, 60)}`, link, dedupeKey: `pc:${comment.id}:reply` });
  res.json({ comment: { id: comment.id, parentId: comment.parentId, content, author: name, authorId: req.user.id, isMine: true, isBlocked: false, likeCount: 0, isLiked: false, createdAt: comment.createdAt, replies: [] } });
});
router.delete('/comments/:id', authenticate, async (req, res) => {
  const c = await prisma.postComment.findUnique({ where: { id: req.params.id } });
  if (!c || c.status === 'DELETED') return res.status(404).json({ message: '댓글을 찾을 수 없습니다.' });
  if (c.authorId !== req.user.id && !isAdmin(req.user)) return res.status(403).json({ message: '내 댓글만 지울 수 있습니다.' });
  await prisma.postComment.update({ where: { id: c.id }, data: { status: 'DELETED' } });
  res.json({ success: true });
});
router.put('/comments/:id', authenticate, async (req, res) => {
  const c = await prisma.postComment.findUnique({ where: { id: req.params.id } });
  if (!c || c.status !== 'NORMAL') return res.status(404).json({ message: '댓글을 찾을 수 없습니다.' });
  if (c.authorId !== req.user.id) return res.status(403).json({ message: '내 댓글만 고칠 수 있습니다.' });
  const content = String(req.body?.content || '').trim().slice(0, 1000);
  if (!content) return res.status(400).json({ message: '댓글 내용을 입력하세요.' });
  await prisma.postComment.update({ where: { id: c.id }, data: { content } });
  res.json({ success: true });
});
router.post('/comments/:id/like', authenticate, async (req, res) => {
  const c = await prisma.postComment.findUnique({ where: { id: req.params.id }, select: { id: true, authorId: true, status: true } });
  if (!c || c.status !== 'NORMAL') return res.status(404).json({ message: '댓글을 찾을 수 없습니다.' });
  if (c.authorId === req.user.id) return res.status(400).json({ message: '내 댓글에는 좋아요를 누를 수 없어요.', code: 'OWN_COMMENT' });
  const key = { userId_commentId: { userId: req.user.id, commentId: c.id } };
  const existing = await prisma.postCommentLike.findUnique({ where: key });
  if (existing) await prisma.postCommentLike.delete({ where: key }); else await prisma.postCommentLike.create({ data: { userId: req.user.id, commentId: c.id } });
  const likeCount = await prisma.postCommentLike.count({ where: { commentId: c.id } });
  await prisma.postComment.update({ where: { id: c.id }, data: { likeCount } });
  res.json({ liked: !existing, likeCount });
});

// 내 활동: ?tab=posts|comments|bookmarks
router.get('/me', authenticate, async (req, res) => {
  const cats = await categories({ all: true });
  const catName = new Map(cats.map((c) => [c.key, c.name]));
  const tab = req.query.tab;
  if (tab === 'comments') {
    const rows = await prisma.postComment.findMany({ where: { authorId: req.user.id, status: 'NORMAL' }, include: { post: { select: { id: true, title: true, status: true } } }, orderBy: { createdAt: 'desc' }, take: 200 });
    return res.json({ comments: rows.filter((c) => c.post && c.post.status !== 'DELETED').map((c) => ({ id: c.id, content: c.content, createdAt: c.createdAt, isReply: !!c.parentId, post: { id: c.post.id, title: c.post.title } })) });
  }
  const rows = tab === 'bookmarks'
    ? (await prisma.postBookmark.findMany({ where: { userId: req.user.id }, orderBy: { createdAt: 'desc' }, take: 200 })).map((b) => b.postId)
    : null;
  const posts = await prisma.post.findMany({
    where: tab === 'bookmarks' ? { id: { in: rows }, status: 'NORMAL' } : { authorId: req.user.id, status: { not: 'DELETED' } },
    include: postInclude, orderBy: { createdAt: 'desc' }, take: 200,
  });
  const ordered = tab === 'bookmarks' ? rows.map((id) => posts.find((p) => p.id === id)).filter(Boolean) : posts;
  const ctx = { user: req.user, catName, works: await workInfo(ordered) };
  res.json({ posts: ordered.map((p) => ({ ...shapePost(p, ctx), status: p.status })) });
});

// 글쓰기 작품·회차 연결용
router.get('/works', async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (!q) return res.json({ works: [] });
  const rows = await prisma.comic.findMany({ where: { title: { contains: q }, isPublished: true, NOT: { rating: { in: ['19', 'ADULT', 'adult'] } } }, select: { id: true, title: true, contentType: true }, take: 20 });
  res.json({ works: rows });
});
router.get('/works/:id/episodes', async (req, res) => {
  const rows = await prisma.episode.findMany({ where: { comicId: req.params.id, createdAt: { lte: new Date() } }, select: { id: true, episodeNumber: true, title: true }, orderBy: { episodeNumber: 'asc' } });
  res.json({ episodes: rows });
});

module.exports = router;
module.exports.boardCategories = categories;
