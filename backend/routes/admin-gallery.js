// 관리자 화보 관리: /api/admin/gallery
// 화보 목록·등록·수정(이미지 여러 장·대표 이미지·작품/캐릭터 연결·태그·설명·공개 상태·공개일/예약·노출 종료·가격)
// 사용자 화보 검수(검토 대기 → 공개 승인/반려/숨김), 시리즈, 테마 화보전(이벤트 연결), 태그 사전, 오늘의 추천·추천 화보, 통계
const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const multer = require('multer');
const { prisma } = require('../lib/prisma');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { getCuration, setCuration } = require('../lib/curation');
const { parseList, cleanTags, enrich, popularScore, saveImages, charactersOf } = require('../lib/gallery');

const router = express.Router();
router.use('/admin/gallery', authenticate, requireAdmin);
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024, files: 101 }, fileFilter: (req, f, cb) => (/^image\/(jpeg|png|webp|gif)$/.test(f.mimetype) ? cb(null, true) : cb(new Error('이미지 파일만 올릴 수 있습니다.'))) });
const files = (req, res, next) => upload.fields([{ name: 'images', maxCount: 100 }, { name: 'banner', maxCount: 1 }])(req, res, (err) => (err ? res.status(400).json({ message: err.message }) : next()));
const STATUSES = ['PUBLISHED', 'DRAFT', 'REVIEW', 'HIDDEN', 'REJECTED'];
const dateOrNull = (v) => { if (!v) return null; const d = new Date(v); return Number.isNaN(d.getTime()) ? undefined : d; };

async function openReports(ids) {
  if (!ids.length) return new Map();
  const rows = await prisma.report.groupBy({ by: ['photobookId'], where: { type: 'PHOTOBOOK', photobookId: { in: ids }, status: { in: ['PENDING', 'PROCESSING'] } }, _count: { _all: true } });
  return new Map(rows.map((r) => [r.photobookId, r._count._all]));
}
const brief = (i, reports) => ({
  id: i.id, title: i.name, thumbnail: i.thumbnail, status: i.status, visibility: i.visibility, isOfficial: !i.ownerId, creator: i.creator,
  work: i.work, character: i.character, series: i.series, tags: i.tags, assetCount: i.assetCount, coinPrice: i.isFree ? 0 : i.coinPrice, contentRating: i.contentRating,
  viewCount: i.viewCount, likeCount: i.likeCount, saveCount: i.saveCount, chatClicks: i.chatClicks, workClicks: i.workClicks,
  releaseAt: i.releaseAt, endAt: i.endAt, createdAt: i.createdAt, rejectReason: i.rejectReason, openReports: reports?.get(i.id) || 0,
});

router.get('/admin/gallery/items', async (req, res) => {
  const where = { contentType: 'PHOTOBOOK' };
  if (STATUSES.includes(req.query.status)) where.status = req.query.status;
  if (req.query.owner === 'user') where.ownerId = { not: null };
  if (req.query.owner === 'official') where.ownerId = null;
  let list = await enrich(await prisma.contentItem.findMany({ where, orderBy: { createdAt: 'desc' }, take: 1000 }));
  const q = String(req.query.q || '').trim();
  if (q) list = list.filter((i) => [i.name, i.work?.title, i.character?.name, i.creator, ...i.tags].some((v) => String(v || '').includes(q)));
  const reports = await openReports(list.map((i) => i.id));
  if (req.query.reported === 'true') list = list.filter((i) => reports.get(i.id));
  const counts = await prisma.contentItem.groupBy({ by: ['status'], where: { contentType: 'PHOTOBOOK' }, _count: { _all: true } });
  res.json({ items: list.map((i) => brief(i, reports)), counts: Object.fromEntries(counts.map((c) => [c.status, c._count._all])) });
});

router.get('/admin/gallery/items/:id', async (req, res) => {
  const raw = await prisma.contentItem.findUnique({ where: { id: req.params.id } });
  if (!raw) return res.status(404).json({ message: '화보를 찾을 수 없습니다.' });
  const [i] = await enrich([raw]);
  const reports = await prisma.report.findMany({ where: { type: 'PHOTOBOOK', photobookId: raw.id }, select: { id: true, reason: true, status: true, createdAt: true, description: true }, orderBy: { createdAt: 'desc' } });
  const purchases = await prisma.userContentPurchase.count({ where: { contentId: raw.id, contentType: 'PHOTOBOOK' } });
  res.json({ item: { ...brief(i), description: raw.description, assets: parseList(raw.assets), previewCount: raw.previewCount, isFree: raw.isFree, characterId: raw.characterId, characterName: raw.characterName, workId: raw.workId, seriesId: raw.seriesId, seriesOrder: raw.seriesOrder, purchases }, reports });
});

async function fields(b) {
  const data = {};
  if (b.title !== undefined) { data.name = String(b.title || '').trim().slice(0, 80); if (!data.name) return { error: '화보 제목을 입력하세요.' }; }
  if (b.description !== undefined) data.description = String(b.description || '').trim().slice(0, 2000) || null;
  if (b.tags !== undefined) data.tags = JSON.stringify(cleanTags(typeof b.tags === 'string' && b.tags.startsWith('[') ? parseList(b.tags) : b.tags));
  if (b.status !== undefined) { if (!STATUSES.includes(b.status)) return { error: '공개 상태가 올바르지 않습니다.' }; data.status = b.status; }
  if (b.workId !== undefined) { data.workId = b.workId ? String(b.workId) : null; if (data.workId && !(await prisma.comic.findUnique({ where: { id: data.workId }, select: { id: true } }))) return { error: '연결할 작품을 찾을 수 없습니다.' }; }
  if (b.characterId !== undefined) data.characterId = b.characterId ? String(b.characterId) : null;
  if (b.characterName !== undefined) data.characterName = String(b.characterName || '').trim().slice(0, 40) || null;
  for (const k of ['releaseAt', 'endAt']) if (b[k] !== undefined) { const d = dateOrNull(b[k]); if (d === undefined) return { error: '날짜가 올바르지 않습니다.' }; data[k] = d; }
  if (data.releaseAt && data.endAt && data.endAt <= data.releaseAt) return { error: '노출 종료는 공개일보다 뒤여야 합니다.' };
  if (b.coinPrice !== undefined) { const n = Number(b.coinPrice); if (!Number.isInteger(n) || n < 0) return { error: '가격은 0 이상 정수로 입력하세요.' }; data.coinPrice = n; data.isFree = n === 0; data.accessType = n === 0 ? 'FREE' : 'COIN'; }
  if (b.previewCount !== undefined) data.previewCount = Math.max(0, Number(b.previewCount) || 0);
  if (b.contentRating !== undefined) data.contentRating = b.contentRating === 'ADULT' ? 'ADULT' : 'GENERAL';
  if (b.seriesId !== undefined) data.seriesId = b.seriesId ? String(b.seriesId) : null;
  if (b.seriesOrder !== undefined) data.seriesOrder = Number(b.seriesOrder) || 0;
  return { data };
}

router.post('/admin/gallery/items', files, async (req, res) => {
  const { data, error } = await fields({ ...req.body, title: req.body?.title ?? '' });
  if (error) return res.status(400).json({ message: error });
  const imgs = req.files?.images || [];
  if (!imgs.length) return res.status(400).json({ message: '화보 이미지를 1장 이상 올리세요.' });
  const item = await prisma.contentItem.create({ data: { status: 'PUBLISHED', visibility: 'PUBLIC', isFree: true, coinPrice: 0, accessType: 'FREE', ...data, contentType: 'PHOTOBOOK', assets: '[]' } });
  const urls = await saveImages(item.id, imgs);
  const thumbIndex = Math.min(urls.length - 1, Math.max(0, Number(req.body?.thumbnailIndex) || 0));
  await prisma.contentItem.update({ where: { id: item.id }, data: { assets: JSON.stringify(urls), assetCount: urls.length, thumbnail: urls[thumbIndex], previewCount: data.previewCount ?? (data.coinPrice ? Math.min(4, urls.length) : urls.length) } });
  res.json({ id: item.id });
});

// 수정: 새 이미지 추가(images), 이미지 순서·삭제(assets JSON), 대표 이미지(thumbnail 주소)
router.put('/admin/gallery/items/:id', files, async (req, res) => {
  const item = await prisma.contentItem.findUnique({ where: { id: req.params.id } });
  if (!item) return res.status(404).json({ message: '화보를 찾을 수 없습니다.' });
  const { data, error } = await fields(req.body || {});
  if (error) return res.status(400).json({ message: error });
  let assets = req.body?.assets !== undefined ? parseList(req.body.assets).filter((u) => parseList(item.assets).includes(u)) : parseList(item.assets);
  const added = req.files?.images?.length ? await saveImages(item.id, req.files.images) : [];
  assets = [...assets, ...added];
  if (!assets.length) return res.status(400).json({ message: '이미지가 한 장은 있어야 합니다.' });
  const thumbnail = req.body?.thumbnail && assets.includes(req.body.thumbnail) ? req.body.thumbnail : assets.includes(item.thumbnail) ? item.thumbnail : assets[0];
  if (data.status === 'PUBLISHED' || data.status === 'HIDDEN') data.rejectReason = null;
  await prisma.contentItem.update({ where: { id: item.id }, data: { ...data, assets: JSON.stringify(assets), assetCount: assets.length, thumbnail, previewCount: Math.min(data.previewCount ?? item.previewCount, assets.length) } });
  res.json({ success: true, added: added.length });
});

router.delete('/admin/gallery/items/:id', async (req, res) => {
  const item = await prisma.contentItem.findUnique({ where: { id: req.params.id } });
  if (!item) return res.status(404).json({ message: '화보를 찾을 수 없습니다.' });
  const bought = await prisma.userContentPurchase.count({ where: { contentId: item.id, contentType: 'PHOTOBOOK' } });
  if (bought) return res.status(409).json({ message: `소장한 회원이 ${bought}명 있어 삭제할 수 없습니다. [숨김]으로 내려 주세요.` });
  await prisma.$transaction([prisma.photobookLike.deleteMany({ where: { itemId: item.id } }), prisma.photobookSave.deleteMany({ where: { itemId: item.id } }), prisma.contentItem.delete({ where: { id: item.id } })]);
  await fs.rm(path.join(__dirname, '../uploads/photobooks', item.id), { recursive: true, force: true }).catch(() => {});
  res.json({ success: true });
});

// 검수: approve(공개 승인) | reject(반려, 사유 필수) | hide(숨김) | unhide(공개로)
router.post('/admin/gallery/items/:id/review', async (req, res) => {
  const action = req.body?.action; const reason = String(req.body?.reason || '').trim().slice(0, 300);
  const map = { approve: 'PUBLISHED', reject: 'REJECTED', hide: 'HIDDEN', unhide: 'PUBLISHED' };
  if (!map[action]) return res.status(400).json({ message: '처리 방법이 올바르지 않습니다.' });
  if (action === 'reject' && !reason) return res.status(400).json({ message: '반려 사유를 입력하세요.' });
  const r = await prisma.contentItem.updateMany({ where: { id: req.params.id, contentType: 'PHOTOBOOK' }, data: { status: map[action], rejectReason: action === 'reject' ? reason : action === 'hide' ? reason || null : null } });
  if (!r.count) return res.status(404).json({ message: '화보를 찾을 수 없습니다.' });
  res.json({ success: true });
});

router.get('/admin/gallery/works/:id/characters', async (req, res) => {
  const comic = await prisma.comic.findUnique({ where: { id: req.params.id }, select: { id: true, title: true, rating: true, genre: true } });
  res.json({ characters: await charactersOf(comic) });
});

// 시리즈
router.get('/admin/gallery/series', async (req, res) => {
  const list = await prisma.photobookSeries.findMany({ orderBy: [{ order: 'asc' }, { createdAt: 'desc' }] });
  const items = await prisma.contentItem.findMany({ where: { seriesId: { in: list.map((s) => s.id) } }, select: { id: true, name: true, thumbnail: true, seriesId: true, seriesOrder: true, status: true }, orderBy: { seriesOrder: 'asc' } });
  res.json({ series: list.map((s) => ({ ...s, items: items.filter((i) => i.seriesId === s.id).map((i) => ({ id: i.id, title: i.name, thumbnail: i.thumbnail, status: i.status })) })) });
});
router.post('/admin/gallery/series', async (req, res) => {
  const title = String(req.body?.title || '').trim().slice(0, 60);
  if (!title) return res.status(400).json({ message: '시리즈명을 입력하세요.' });
  res.json({ series: await prisma.photobookSeries.create({ data: { title, description: String(req.body?.description || '').slice(0, 300) || null, characterName: String(req.body?.characterName || '').slice(0, 40) || null, workId: req.body?.workId || null } }) });
});
router.put('/admin/gallery/series/:id', async (req, res) => {
  const b = req.body || {}; const data = {};
  for (const k of ['title', 'description', 'characterName']) if (b[k] !== undefined) data[k] = String(b[k] || '').trim() || (k === 'title' ? undefined : null);
  if (b.isActive !== undefined) data.isActive = !!b.isActive;
  await prisma.photobookSeries.update({ where: { id: req.params.id }, data });
  // 포함 화보·순서: ids 순서대로 seriesOrder
  if (Array.isArray(b.itemIds)) {
    await prisma.contentItem.updateMany({ where: { seriesId: req.params.id, id: { notIn: b.itemIds } }, data: { seriesId: null, seriesOrder: 0 } });
    await prisma.$transaction(b.itemIds.map((id, i) => prisma.contentItem.updateMany({ where: { id }, data: { seriesId: req.params.id, seriesOrder: i } })));
  }
  res.json({ success: true });
});
router.delete('/admin/gallery/series/:id', async (req, res) => {
  await prisma.contentItem.updateMany({ where: { seriesId: req.params.id }, data: { seriesId: null, seriesOrder: 0 } });
  await prisma.photobookSeries.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});

// 테마 화보전 (+ 이벤트로도 등록)
router.get('/admin/gallery/themes', async (req, res) => {
  const now = new Date();
  const list = await prisma.photobookTheme.findMany({ orderBy: { createdAt: 'desc' } });
  res.json({ themes: list.map((t) => ({ ...t, itemIds: parseList(t.itemIds), live: t.isActive && (!t.startAt || t.startAt <= now) && (!t.endAt || t.endAt > now) })) });
});
async function themeData(req) {
  const b = req.body || {}; const data = {};
  if (b.title !== undefined) { data.title = String(b.title || '').trim().slice(0, 60); if (!data.title) return { error: '테마명을 입력하세요.' }; }
  if (b.description !== undefined) data.description = String(b.description || '').slice(0, 300) || null;
  if (b.itemIds !== undefined) data.itemIds = JSON.stringify(parseList(b.itemIds));
  for (const k of ['startAt', 'endAt']) if (b[k] !== undefined) { const d = dateOrNull(b[k]); if (d === undefined) return { error: '기간이 올바르지 않습니다.' }; data[k] = d; }
  if (b.isActive !== undefined) data.isActive = b.isActive === true || b.isActive === 'true';
  const banner = req.files?.banner?.[0];
  if (banner) { const [url] = await saveImages('themes', [banner]); data.bannerUrl = url; }
  return { data };
}
router.post('/admin/gallery/themes', files, async (req, res) => {
  const { data, error } = await themeData(req);
  if (error || !data.title) return res.status(400).json({ message: error || '테마명을 입력하세요.' });
  let theme = await prisma.photobookTheme.create({ data });
  // 이벤트 관리에도 등록: 이벤트 페이지 → 화보관 테마로
  if (req.body?.createEvent === 'true' && theme.bannerUrl) {
    const ev = await prisma.event.create({ data: { title: theme.title, summary: theme.description, thumbnailUrl: theme.bannerUrl, link: `/gallery?theme=${theme.id}`, startAt: theme.startAt || new Date(), endAt: theme.endAt, isActive: theme.isActive } });
    theme = await prisma.photobookTheme.update({ where: { id: theme.id }, data: { eventId: ev.id } });
  }
  res.json({ theme });
});
router.put('/admin/gallery/themes/:id', files, async (req, res) => {
  const { data, error } = await themeData(req);
  if (error) return res.status(400).json({ message: error });
  const theme = await prisma.photobookTheme.update({ where: { id: req.params.id }, data });
  if (theme.eventId) await prisma.event.updateMany({ where: { id: theme.eventId }, data: { title: theme.title, summary: theme.description, ...(theme.bannerUrl ? { thumbnailUrl: theme.bannerUrl } : {}), ...(theme.startAt ? { startAt: theme.startAt } : {}), endAt: theme.endAt, isActive: theme.isActive } });
  res.json({ theme });
});
router.delete('/admin/gallery/themes/:id', async (req, res) => {
  const t = await prisma.photobookTheme.findUnique({ where: { id: req.params.id } });
  if (!t) return res.status(404).json({ message: '테마를 찾을 수 없습니다.' });
  await prisma.photobookTheme.delete({ where: { id: t.id } });
  res.json({ success: true, eventId: t.eventId });
});

// 태그 사전: 사용 수와 함께, 이름 바꾸면 화보에도 반영, 지우면 화보에서도 뺀다
async function allTagUse() {
  const rows = await prisma.contentItem.findMany({ where: { contentType: 'PHOTOBOOK' }, select: { id: true, tags: true } });
  return rows;
}
router.get('/admin/gallery/tags', async (req, res) => {
  const dict = await prisma.photobookTag.findMany({ orderBy: [{ order: 'asc' }, { name: 'asc' }] });
  const counts = new Map(); (await allTagUse()).forEach((r) => parseList(r.tags).forEach((t) => counts.set(t, (counts.get(t) || 0) + 1)));
  const names = [...new Set([...dict.map((d) => d.name), ...counts.keys()])];
  res.json({ tags: names.map((name) => ({ name, count: counts.get(name) || 0, inDictionary: dict.some((d) => d.name === name), isActive: dict.find((d) => d.name === name)?.isActive ?? true })) });
});
router.post('/admin/gallery/tags', async (req, res) => {
  const [name] = cleanTags([req.body?.name]);
  if (!name) return res.status(400).json({ message: '태그 이름을 입력하세요.' });
  await prisma.photobookTag.upsert({ where: { name }, create: { name }, update: { isActive: true } });
  res.json({ success: true });
});
router.put('/admin/gallery/tags/:name', async (req, res) => {
  const from = String(req.params.name); const [to] = cleanTags([req.body?.name]);
  if (!to) return res.status(400).json({ message: '새 이름을 입력하세요.' });
  for (const r of await allTagUse()) { const t = parseList(r.tags); if (t.includes(from)) await prisma.contentItem.update({ where: { id: r.id }, data: { tags: JSON.stringify([...new Set(t.map((x) => (x === from ? to : x)))]) } }); }
  await prisma.photobookTag.deleteMany({ where: { name: from } });
  await prisma.photobookTag.upsert({ where: { name: to }, create: { name: to }, update: {} });
  res.json({ success: true });
});
router.delete('/admin/gallery/tags/:name', async (req, res) => {
  const name = String(req.params.name);
  for (const r of await allTagUse()) { const t = parseList(r.tags); if (t.includes(name)) await prisma.contentItem.update({ where: { id: r.id }, data: { tags: JSON.stringify(t.filter((x) => x !== name)) } }); }
  await prisma.photobookTag.deleteMany({ where: { name } });
  res.json({ success: true });
});

// 오늘의 추천·추천 화보 (관리자 지정), 인기 화보는 자동
const CUR = { today: 'photobook_today', picks: 'photobook_picks' };
router.get('/admin/gallery/curation', async (req, res) => {
  const out = {};
  for (const [k, key] of Object.entries(CUR)) { const ids = await getCuration(key, []); const rows = await enrich(await prisma.contentItem.findMany({ where: { id: { in: ids } } })); out[k] = ids.map((id) => rows.find((r) => r.id === id)).filter(Boolean).map((i) => brief(i)); }
  const popular = (await enrich(await prisma.contentItem.findMany({ where: { contentType: 'PHOTOBOOK', status: 'PUBLISHED', visibility: 'PUBLIC', isActive: true } }))).sort((a, b) => popularScore(b) - popularScore(a)).slice(0, 12).map((i) => ({ ...brief(i), score: popularScore(i) }));
  res.json({ ...out, popular });
});
router.put('/admin/gallery/curation/:key', async (req, res) => {
  const key = CUR[req.params.key];
  if (!key) return res.status(400).json({ message: '알 수 없는 목록입니다.' });
  const ids = [...new Set((Array.isArray(req.body?.ids) ? req.body.ids : []).map(String))].slice(0, 12);
  await setCuration(key, ids, req.user.id);
  res.json({ success: true });
});

// 통계
router.get('/admin/gallery/stats', async (req, res) => {
  const list = await enrich(await prisma.contentItem.findMany({ where: { contentType: 'PHOTOBOOK' } }));
  const tagStats = new Map();
  for (const i of list) for (const t of i.tags) { const s = tagStats.get(t) || { tag: t, items: 0, views: 0, likes: 0, saves: 0 }; s.items += 1; s.views += i.viewCount; s.likes += i.likeCount; s.saves += i.saveCount; tagStats.set(t, s); }
  const sum = (k) => list.reduce((a, i) => a + (i[k] || 0), 0);
  res.json({
    totals: { items: list.length, views: sum('viewCount'), likes: sum('likeCount'), saves: sum('saveCount'), chatClicks: sum('chatClicks'), workClicks: sum('workClicks') },
    items: list.map((i) => brief(i)).sort((a, b) => b.viewCount - a.viewCount),
    tags: [...tagStats.values()].sort((a, b) => b.views + b.likes * 5 - (a.views + a.likes * 5)),
  });
});

module.exports = router;
