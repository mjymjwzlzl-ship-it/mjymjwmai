// 관리자 노출 관리: /api/admin/exposure
// 작품 정보는 작품 관리(Comic)가 기준, 여기는 "사용자 화면 어디에 무엇을 보여 줄지"만.
// - 오늘의 추천작(today_picks)·추천 신작(new_picks)·인기 작품 상단 고정(popular_pins): 작품 id 순서 목록
// - 홈 화면 섹션(home_sections): 순서·노출
// - 자동 분류 현황(요일·매일·완결·신작·최신 업데이트)·랭킹 현황: 읽기 전용 (작품 정보로 자동 계산)
const express = require('express');
const { prisma } = require('../lib/prisma');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { adultComicWhere, generalComicWhere } = require('../services/adult-access');
const { autoCategories } = require('../lib/auto-categories');
const { HOME_SECTIONS, LIST_KEYS, getCuration, setCuration, homeSections } = require('../lib/curation');
const rankingsRouter = require('./rankings');
const { contentTypeOf } = require('../lib/content-format');

const router = express.Router();
router.use('/admin/exposure', authenticate, requireAdmin);

const brief = (c) => ({ id: c.id, title: c.title, thumbnail: c.thumbnail, status: c.status, type: contentTypeOf(c), rating: c.rating, createdAt: c.createdAt, lastEpisodeAt: c.lastEpisodeAt || null, isPublished: c.isPublished });
async function worksByIds(ids) {
  const rows = await prisma.comic.findMany({ where: { id: { in: ids } }, select: { id: true, title: true, thumbnail: true, status: true, contentType: true, rating: true, createdAt: true, isPublished: true } });
  const byId = new Map(rows.map((r) => [r.id, r]));
  return ids.map((id) => byId.get(id)).filter(Boolean).map(brief);
}

router.get('/admin/exposure', async (req, res) => {
  const [today, fresh, pins] = await Promise.all(LIST_KEYS.map((k) => getCuration(k, [])));
  res.json({
    sections: await homeSections(),
    todayPicks: await worksByIds(today), newPicks: await worksByIds(fresh), popularPins: await worksByIds(pins),
  });
});

router.put('/admin/exposure/sections', async (req, res) => {
  const list = Array.isArray(req.body?.sections) ? req.body.sections : [];
  const known = new Set(HOME_SECTIONS.map((s) => s.key));
  const clean = list.filter((s) => known.has(s?.key)).map((s) => ({ key: s.key, visible: s.visible !== false }));
  if (!clean.length) return res.status(400).json({ message: '섹션 정보가 없습니다.' });
  await setCuration('home_sections', clean, req.user.id || req.user.userId);
  res.json({ sections: await homeSections() });
});

const LIMIT = { today_picks: 6, new_picks: 6, popular_pins: 10 };
router.put('/admin/exposure/list/:key', async (req, res) => {
  const key = req.params.key;
  if (!LIST_KEYS.includes(key)) return res.status(400).json({ message: '알 수 없는 목록입니다.' });
  const ids = [...new Set((Array.isArray(req.body?.ids) ? req.body.ids : []).map(String))];
  if (ids.length > LIMIT[key]) return res.status(400).json({ message: `최대 ${LIMIT[key]}개까지 고를 수 있습니다.` });
  const found = await prisma.comic.findMany({ where: { id: { in: ids } }, select: { id: true } });
  if (found.length !== ids.length) return res.status(400).json({ message: '찾을 수 없는 작품이 있습니다.' });
  await setCuration(key, ids, req.user.id || req.user.userId);
  if (key === 'popular_pins') rankingsRouter.clearRankingCache();
  res.json({ works: await worksByIds(ids) });
});

// 자동 분류 현황: 사용자 화면과 같은 규칙(lib/auto-categories)으로 계산해 보여 준다
router.get('/admin/exposure/auto', async (req, res) => {
  const audience = req.query.audience === 'adult' ? 'adult' : 'general';
  const locale = req.query.locale === 'en' ? 'en' : 'ko';
  const comics = await prisma.comic.findMany({
    where: { locale, isPublished: true, status: { not: 'HIDDEN' }, ...(audience === 'adult' ? adultComicWhere() : generalComicWhere()) },
    select: { id: true, title: true, thumbnail: true, status: true, contentType: true, rating: true, createdAt: true, isPublished: true, updateDays: true },
  });
  const rows = await prisma.episode.groupBy({ by: ['comicId'], where: { comicId: { in: comics.map((c) => c.id) }, createdAt: { lte: new Date() } }, _max: { createdAt: true } });
  const last = new Map(rows.map((r) => [r.comicId, r._max.createdAt]));
  for (const c of comics) c.lastEpisodeAt = last.get(c.id) || null;
  const auto = autoCategories(comics);
  const out = {};
  for (const [k, list] of Object.entries(auto)) if (k !== 'completed') out[k] = list.map(brief);
  res.json({ audience, locale, total: comics.length, categories: out });
});

router.get('/admin/exposure/rankings', async (req, res) => {
  const data = await rankingsRouter.rankings();
  const pick = (list, n) => list.slice(0, n).map((x, i) => ({ rank: i + 1, id: x.id, title: x.title, type: x.contentType, score: x.popularScore, views: x.views, recentViews: x.recentViews, likes: x.likes, pinned: !!x.pinned, launchedAt: x.launchedAt }));
  res.json({ popular: pick(data.popular, 30), realtime: pick(data.realtime, 30), new: pick(data.new, 20) });
});

module.exports = router;
