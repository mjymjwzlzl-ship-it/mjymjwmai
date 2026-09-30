// 캐릭터 화보관 API (/api/gallery) — 화보 데이터는 ContentItem(contentType PHOTOBOOK)
// 공개 조건: 켜짐·상태 공개·전체 공개·공개일 지남·노출 종료 전, 19세 화보는 19 ON + 성인 인증일 때만
// 탭: 추천(테마 화보전·오늘의 추천·추천 화보·인기·신규·관심 작품/캐릭터 기반) / 인기 / 최신 / 작품별 / 캐릭터별 / 내 화보
// 코인 소장은 기존 /api/contents/:id/unlock (routes/photobooks.js)
const express = require('express');
const multer = require('multer');
const { prisma } = require('../lib/prisma');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { isAdultModeRequest } = require('../services/adult-access');
const { getCuration } = require('../lib/curation');
const { parseList, cleanTags, enrich, matchesType, popularScore, saveImages, charactersOf } = require('../lib/gallery');
const { helpers } = require('./photobooks');

const router = express.Router();
router.use(optionalAuth);
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024, files: 21 }, fileFilter: (req, f, cb) => (/^image\/(jpeg|png|webp|gif)$/.test(f.mimetype) ? cb(null, true) : cb(new Error('이미지 파일만 올릴 수 있습니다.'))) });
const maybeUpload = (req, res, next) => upload.array('images', 20)(req, res, (err) => (err ? res.status(400).json({ message: err.message || '이미지를 올리지 못했습니다.' }) : next()));

const publicWhere = (req) => {
  const now = new Date();
  const adult = isAdultModeRequest(req) && !!req.user?.adultVerified;
  return {
    contentType: 'PHOTOBOOK', isActive: true, status: 'PUBLISHED', visibility: 'PUBLIC',
    ...(adult ? {} : { contentRating: { not: 'ADULT' } }),
    AND: [{ OR: [{ releaseAt: null }, { releaseAt: { lte: now } }] }, { OR: [{ endAt: null }, { endAt: { gt: now } }] }],
  };
};
// 목록 카드용 (이미지 주소 목록은 빼고 대표 이미지만)
const card = (i, me) => ({
  id: i.id, title: i.name, thumbnail: i.thumbnail, assetCount: i.assetCount, coinPrice: i.isFree ? 0 : i.coinPrice, isFree: i.isFree || !i.coinPrice,
  contentRating: i.contentRating, work: i.work, character: i.character, series: i.series, tags: i.tags, creator: i.creator, isOfficial: !i.ownerId,
  likeCount: i.likeCount, viewCount: i.viewCount, saveCount: i.saveCount, releaseAt: i.releaseAt || i.createdAt,
  ...(me ? { isLiked: me.likes.has(i.id), isSaved: me.saves.has(i.id) } : {}),
});
async function myMarks(user, ids) {
  if (!user || !ids.length) return null;
  const [likes, saves] = await Promise.all([
    prisma.photobookLike.findMany({ where: { userId: user.id, itemId: { in: ids } }, select: { itemId: true } }),
    prisma.photobookSave.findMany({ where: { userId: user.id, itemId: { in: ids } }, select: { itemId: true } }),
  ]);
  return { likes: new Set(likes.map((l) => l.itemId)), saves: new Set(saves.map((s) => s.itemId)) };
}
async function publicItems(req) {
  return enrich(await prisma.contentItem.findMany({ where: publicWhere(req), orderBy: [{ releaseAt: 'desc' }, { createdAt: 'desc' }], take: 1000 }));
}
const byId = (list) => new Map(list.map((i) => [i.id, i]));

router.get('/home', async (req, res) => {
  const all = await publicItems(req);
  const map = byId(all);
  const me = await myMarks(req.user, all.map((i) => i.id));
  const pick = (ids) => parseList(ids).map((id) => map.get(id)).filter(Boolean).map((i) => card(i, me));
  const now = new Date();
  const themes = await prisma.photobookTheme.findMany({ where: { isActive: true, AND: [{ OR: [{ startAt: null }, { startAt: { lte: now } }] }, { OR: [{ endAt: null }, { endAt: { gt: now } }] }] }, orderBy: { createdAt: 'desc' } });
  // 관심 작품·캐릭터 기반: 찜한 작품 + 좋아요·저장한 화보의 작품·캐릭터
  let forYou = [];
  if (req.user) {
    const [likes, liked, saved] = await Promise.all([
      prisma.like.findMany({ where: { userId: req.user.id }, select: { comicId: true } }),
      prisma.photobookLike.findMany({ where: { userId: req.user.id }, select: { itemId: true } }),
      prisma.photobookSave.findMany({ where: { userId: req.user.id }, select: { itemId: true } }),
    ]);
    const mine = new Set([...liked, ...saved].map((x) => x.itemId));
    const works = new Set([...likes.map((l) => l.comicId), ...all.filter((i) => mine.has(i.id)).map((i) => i.workId).filter(Boolean)]);
    const chars = new Set(all.filter((i) => mine.has(i.id)).map((i) => i.character?.name).filter(Boolean));
    forYou = all.filter((i) => !mine.has(i.id) && ((i.workId && works.has(i.workId)) || (i.character?.name && chars.has(i.character.name)))).sort((a, b) => popularScore(b) - popularScore(a)).slice(0, 12).map((i) => card(i, me));
  }
  res.json({
    themes: themes.map((t) => ({ id: t.id, title: t.title, description: t.description, bannerUrl: t.bannerUrl, endAt: t.endAt, items: pick(t.itemIds) })),
    today: pick(await getCuration('photobook_today', [])),
    picks: pick(await getCuration('photobook_picks', [])),
    popular: [...all].sort((a, b) => popularScore(b) - popularScore(a)).slice(0, 12).map((i) => card(i, me)),
    latest: all.slice(0, 12).map((i) => card(i, me)),
    forYou, loggedIn: !!req.user,
  });
});

// 목록: ?sort=latest|popular|likes&type=WEBTOON|BOOK|NOVEL|CHAT&q=&field=all|character|work|tag|creator&tag=&workId=&character=&seriesId=&themeId=&page=
router.get('/items', async (req, res) => {
  let list = await publicItems(req);
  const { type, tag, workId, character, seriesId, themeId } = req.query;
  const q = String(req.query.q || '').trim();
  const field = String(req.query.field || 'all');
  list = list.filter((i) => matchesType(i, type ? String(type).toUpperCase() : ''));
  if (tag) list = list.filter((i) => i.tags.includes(String(tag)));
  if (workId) list = list.filter((i) => i.workId === String(workId));
  if (character) list = list.filter((i) => i.character?.name === String(character));
  if (seriesId) list = list.filter((i) => i.seriesId === String(seriesId)).sort((a, b) => a.seriesOrder - b.seriesOrder);
  if (themeId) { const t = await prisma.photobookTheme.findUnique({ where: { id: String(themeId) } }); const ids = parseList(t?.itemIds); list = ids.map((id) => list.find((i) => i.id === id)).filter(Boolean); }
  if (q) {
    const has = (v) => String(v || '').toLowerCase().includes(q.toLowerCase());
    const f = { title: (i) => has(i.name), character: (i) => has(i.character?.name), work: (i) => has(i.work?.title), tag: (i) => i.tags.some(has), creator: (i) => has(i.creator) };
    list = list.filter(f[field] || ((i) => f.title(i) || f.character(i) || f.work(i) || f.tag(i) || f.creator(i)));
  }
  const sort = String(req.query.sort || 'latest');
  if (!seriesId && !themeId) {
    if (sort === 'popular') list.sort((a, b) => popularScore(b) - popularScore(a));
    else if (sort === 'likes') list.sort((a, b) => b.likeCount - a.likeCount || popularScore(b) - popularScore(a));
  }
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const size = 24;
  const slice = list.slice((page - 1) * size, page * size);
  const me = await myMarks(req.user, slice.map((i) => i.id));
  res.json({ items: slice.map((i) => card(i, me)), total: list.length, page, totalPages: Math.max(1, Math.ceil(list.length / size)) });
});

// 작품별·캐릭터별 묶음
router.get('/groups', async (req, res) => {
  const list = await publicItems(req);
  const by = req.query.by === 'character' ? 'character' : 'work';
  const groups = new Map();
  for (const i of list) {
    const key = by === 'work' ? i.work?.id : i.character?.name;
    if (!key) continue;
    const g = groups.get(key) || { key, name: by === 'work' ? i.work.title : i.character.name, work: i.work, character: i.character, count: 0, cover: i.thumbnail, score: 0 };
    g.count += 1; g.score += popularScore(i);
    groups.set(key, g);
  }
  res.json({ by, groups: [...groups.values()].sort((a, b) => b.score - a.score) });
});

router.get('/tags', async (req, res) => {
  const list = await publicItems(req);
  const counts = new Map();
  list.forEach((i) => i.tags.forEach((t) => counts.set(t, (counts.get(t) || 0) + 1)));
  const dict = await prisma.photobookTag.findMany({ where: { isActive: true }, orderBy: { order: 'asc' } });
  const names = [...new Set([...dict.map((d) => d.name), ...counts.keys()])];
  res.json({ tags: names.map((name) => ({ name, count: counts.get(name) || 0 })).filter((t) => t.count > 0).sort((a, b) => b.count - a.count) });
});

// 상세: 공개 화보 또는 내가 만든 화보(비공개·검토 중 포함)
router.get('/items/:id', async (req, res) => {
  const raw = await prisma.contentItem.findUnique({ where: { id: req.params.id } });
  const isOwner = !!raw && !!req.user && raw.ownerId === req.user.id;
  if (!raw || raw.contentType !== 'PHOTOBOOK' || (!isOwner && !helpers.released(raw))) return res.status(404).json({ message: '화보를 찾을 수 없습니다.' });
  if (raw.contentRating === 'ADULT' && !isOwner && !(isAdultModeRequest(req) && req.user?.adultVerified)) return res.status(404).json({ message: '화보를 찾을 수 없습니다.' });
  if (!isOwner) await prisma.contentItem.update({ where: { id: raw.id }, data: { viewCount: { increment: 1 } } });
  const [item] = await enrich([raw]);
  const access = isOwner ? { allowed: true, reason: 'OWNER' } : await helpers.accessFor(req.user, raw);
  const assets = parseList(raw.assets);
  const me = await myMarks(req.user, [raw.id]);
  // 같은 시리즈의 다른 화보
  const seriesItems = raw.seriesId ? (await enrich(await prisma.contentItem.findMany({ where: { ...publicWhere(req), seriesId: raw.seriesId }, orderBy: { seriesOrder: 'asc' } }))).map((i) => card(i)) : [];
  res.json({
    item: {
      ...card(item, me), description: raw.description, status: raw.status, visibility: raw.visibility, isOwner, rejectReason: isOwner ? raw.rejectReason : undefined,
      assets: access.allowed ? assets : assets.slice(0, Math.max(0, raw.previewCount)), previewCount: raw.previewCount, access,
      chatLink: item.work && item.character?.id && item.character.chatReady ? `/chat/webtoon/${item.work.id}/character/${encodeURIComponent(item.character.id)}` : item.work && item.character ? `/chat/webtoon/${item.work.id}` : null,
    },
    series: seriesItems,
  });
});

async function toggle(model, req, res, field) {
  if (!req.user) return res.status(401).json({ message: '로그인이 필요합니다.' });
  const item = await prisma.contentItem.findUnique({ where: { id: req.params.id }, select: { id: true } });
  if (!item) return res.status(404).json({ message: '화보를 찾을 수 없습니다.' });
  const key = { userId_itemId: { userId: req.user.id, itemId: item.id } };
  const existing = await prisma[model].findUnique({ where: key });
  if (existing) await prisma[model].delete({ where: key }); else await prisma[model].create({ data: { userId: req.user.id, itemId: item.id } });
  const count = await prisma[model].count({ where: { itemId: item.id } });
  await prisma.contentItem.update({ where: { id: item.id }, data: { [field]: count } });
  return res.json({ on: !existing, count });
}
router.post('/items/:id/like', (req, res) => toggle('photobookLike', req, res, 'likeCount'));
router.post('/items/:id/save', (req, res) => toggle('photobookSave', req, res, 'saveCount'));
// 이동 수 집계: target = chat(캐릭터와 채팅하기) | work(작품 보기)
router.post('/items/:id/click', async (req, res) => {
  const field = req.body?.target === 'chat' ? 'chatClicks' : req.body?.target === 'work' ? 'workClicks' : null;
  if (!field) return res.status(400).json({ message: 'target 이 필요합니다.' });
  await prisma.contentItem.updateMany({ where: { id: req.params.id }, data: { [field]: { increment: 1 } } });
  res.json({ success: true });
});

// 내 화보: ?tab=all|public|private|saved
router.get('/me', authenticate, async (req, res) => {
  const tab = String(req.query.tab || 'all');
  let rows;
  if (tab === 'saved') {
    const saves = await prisma.photobookSave.findMany({ where: { userId: req.user.id }, orderBy: { createdAt: 'desc' } });
    const items = await prisma.contentItem.findMany({ where: { id: { in: saves.map((s) => s.itemId) } } });
    rows = saves.map((s) => items.find((i) => i.id === s.itemId)).filter((i) => i && (helpers.released(i) || i.ownerId === req.user.id));
  } else {
    rows = await prisma.contentItem.findMany({ where: { ownerId: req.user.id, contentType: 'PHOTOBOOK', status: { not: 'HIDDEN' }, ...(tab === 'public' ? { visibility: 'PUBLIC' } : tab === 'private' ? { visibility: 'PRIVATE' } : {}) }, orderBy: { createdAt: 'desc' } });
  }
  const list = await enrich(rows);
  const me = await myMarks(req.user, list.map((i) => i.id));
  res.json({ items: list.map((i) => ({ ...card(i, me), status: i.status, visibility: i.visibility, rejectReason: i.rejectReason })) });
});

// 사용자 화보 만들기: 전체 공개는 관리자 검토 후 공개(REVIEW), 나만 보기는 바로 저장(DRAFT 대신 PUBLISHED+PRIVATE)
async function userFields(body) {
  const data = {};
  if (body.title !== undefined) { data.name = String(body.title || '').trim().slice(0, 60); if (!data.name) return { error: '화보 제목을 입력하세요.' }; }
  if (body.description !== undefined) data.description = String(body.description || '').trim().slice(0, 1000) || null;
  if (body.tags !== undefined) data.tags = JSON.stringify(cleanTags(typeof body.tags === 'string' && body.tags.startsWith('[') ? parseList(body.tags) : body.tags));
  if (body.visibility !== undefined) data.visibility = body.visibility === 'PRIVATE' ? 'PRIVATE' : 'PUBLIC';
  if (body.workId !== undefined) {
    data.workId = body.workId ? String(body.workId) : null;
    if (data.workId) {
      const comic = await prisma.comic.findUnique({ where: { id: data.workId }, select: { id: true, title: true, rating: true, genre: true } });
      if (!comic) return { error: '연결할 작품을 찾을 수 없습니다.' };
      if (['19', 'ADULT'].includes(comic.rating)) return { error: '19세 작품에는 사용자 화보를 연결할 수 없습니다.' };
    }
  }
  if (body.characterId !== undefined) data.characterId = body.characterId ? String(body.characterId) : null;
  if (body.characterName !== undefined) data.characterName = String(body.characterName || '').trim().slice(0, 40) || null;
  return { data };
}
router.post('/items', authenticate, maybeUpload, async (req, res) => {
  const { data, error } = await userFields({ ...req.body, title: req.body?.title ?? '' });
  if (error) return res.status(400).json({ message: error });
  if (!req.files?.length) return res.status(400).json({ message: '이미지를 1장 이상 올리세요.' });
  const visibility = data.visibility || 'PUBLIC';
  const item = await prisma.contentItem.create({ data: { ...data, contentType: 'PHOTOBOOK', contentRating: 'GENERAL', ownerId: req.user.id, visibility, status: visibility === 'PUBLIC' ? 'REVIEW' : 'PUBLISHED', isFree: true, coinPrice: 0, accessType: 'FREE', assets: '[]' } });
  const urls = await saveImages(item.id, req.files);
  await prisma.contentItem.update({ where: { id: item.id }, data: { assets: JSON.stringify(urls), assetCount: urls.length, previewCount: urls.length, thumbnail: urls[0] } });
  res.json({ id: item.id, status: visibility === 'PUBLIC' ? 'REVIEW' : 'PUBLISHED' });
});
router.put('/items/:id', authenticate, async (req, res) => {
  const item = await prisma.contentItem.findUnique({ where: { id: req.params.id } });
  if (!item || item.ownerId !== req.user.id) return res.status(404).json({ message: '내 화보만 고칠 수 있습니다.' });
  const { data, error } = await userFields(req.body || {});
  if (error) return res.status(400).json({ message: error });
  // 전체 공개로 바꾸거나 공개 화보 내용을 고치면 다시 검토
  if ((data.visibility || item.visibility) === 'PUBLIC' && (data.visibility === 'PUBLIC' || data.name || data.description !== undefined || data.tags)) data.status = 'REVIEW';
  if (data.visibility === 'PRIVATE') data.status = 'PUBLISHED';
  await prisma.contentItem.update({ where: { id: item.id }, data });
  res.json({ success: true, status: data.status || item.status });
});
router.delete('/items/:id', authenticate, async (req, res) => {
  const item = await prisma.contentItem.findUnique({ where: { id: req.params.id } });
  if (!item || item.ownerId !== req.user.id) return res.status(404).json({ message: '내 화보만 지울 수 있습니다.' });
  await prisma.$transaction([prisma.photobookLike.deleteMany({ where: { itemId: item.id } }), prisma.photobookSave.deleteMany({ where: { itemId: item.id } }), prisma.contentItem.delete({ where: { id: item.id } })]);
  res.json({ success: true });
});

// 만들기 화면: 작품 검색·캐릭터 목록
router.get('/works', async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (!q) return res.json({ works: [] });
  res.json({ works: await prisma.comic.findMany({ where: { title: { contains: q }, isPublished: true, NOT: { rating: { in: ['19', 'ADULT', 'adult'] } } }, select: { id: true, title: true, contentType: true }, take: 20 }) });
});
router.get('/works/:id/characters', async (req, res) => {
  const comic = await prisma.comic.findUnique({ where: { id: req.params.id }, select: { id: true, title: true, rating: true, genre: true } });
  res.json({ characters: await charactersOf(comic) });
});

module.exports = router;
