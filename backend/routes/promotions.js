// 할인·무료 이벤트 작품: 공개 목록(/api/frontend/promotions) + 관리자(/api/admin/promotions)
const express = require('express');
const { prisma } = require('../lib/prisma');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { generalComicWhere } = require('../services/adult-access');
const { TYPES, refreshPromotions, describePromotion, isLive } = require('../services/promotions');

const router = express.Router();
const adminOnly = [authenticate, requireAdmin];

// GET /api/frontend/promotions?type=all|discount|free&limit=
// discount = 할인, free = 회차 무료 + 무료 대여. 진행 중인 것만(종료되면 자동 제외), 곧 끝나는 순.
router.get('/frontend/promotions', async (req, res) => {
  try {
    const now = new Date();
    const type = String(req.query.type || 'all').toLowerCase();
    const promos = (await prisma.comicPromotion.findMany({
      where: { isActive: true, startAt: { lte: now }, endAt: { gt: now } },
      orderBy: { endAt: 'asc' },
    })).filter((promo) => type === 'all' || (type === 'discount' ? promo.type === 'DISCOUNT' : promo.type !== 'DISCOUNT'));
    const comics = await prisma.comic.findMany({
      where: { id: { in: [...new Set(promos.map((promo) => promo.comicId))] }, isPublished: true, status: { not: 'HIDDEN' }, ...generalComicWhere() },
      select: { id: true, title: true, authorName: true, thumbnail: true, genre: true, status: true, createdAt: true, _count: { select: { episodes: true } } },
    });
    const latestRows = await prisma.episode.groupBy({ by: ['comicId'], where: { comicId: { in: comics.map((c) => c.id) }, createdAt: { lte: now } }, _max: { createdAt: true } });
    const lastEpisodeById = new Map(latestRows.map((row) => [row.comicId, row._max.createdAt]));
    const comicById = new Map(comics.map((comic) => [comic.id, comic]));
    // 작품당 한 칸: 여러 혜택이면 배지를 모두 붙인다
    const items = new Map();
    for (const promo of promos) {
      const comic = comicById.get(promo.comicId);
      if (!comic) continue;
      if (!items.has(comic.id)) {
        items.set(comic.id, { id: comic.id, title: comic.title, author: comic.authorName, thumbnail: comic.thumbnail, genre: comic.genre, totalEpisodes: comic._count.episodes, status: comic.status, createdAt: comic.createdAt, lastEpisodeAt: lastEpisodeById.get(comic.id) || null, promotions: [] });
      }
      items.get(comic.id).promotions.push(describePromotion(promo, now));
    }
    const limit = Math.min(Number(req.query.limit) || 100, 100);
    const list = [...items.values()];
    res.set('Cache-Control', 'public, max-age=30');
    res.json({ total: list.length, items: list.slice(0, limit) });
  } catch (error) {
    console.error('프로모션 목록 오류:', error);
    res.status(500).json({ message: '이벤트 작품을 불러오지 못했습니다.' });
  }
});

function parseBody(body) {
  const data = {};
  if (body.comicId !== undefined) data.comicId = String(body.comicId);
  if (body.type !== undefined) data.type = String(body.type).toUpperCase();
  if (body.value !== undefined) data.value = Math.round(Number(body.value) || 0);
  if (body.title !== undefined) data.title = String(body.title).trim() || null;
  if (body.startAt !== undefined) data.startAt = new Date(body.startAt);
  if (body.endAt !== undefined) data.endAt = new Date(body.endAt);
  if (body.isActive !== undefined) data.isActive = body.isActive === true || body.isActive === 'true';
  return data;
}

function validate(data, isCreate) {
  if (isCreate && (!data.comicId || !data.type || !data.startAt || !data.endAt)) return '작품, 종류, 시작·종료일은 필수입니다.';
  if (data.type && !TYPES.includes(data.type)) return '종류가 올바르지 않습니다.';
  if (data.type === 'DISCOUNT' && !(data.value >= 1 && data.value <= 90)) return '할인율은 1~90% 입니다.';
  if (data.type === 'FREE_EPISODES' && !(data.value >= 1)) return '무료 회차 수는 1 이상입니다.';
  for (const key of ['startAt', 'endAt']) if (data[key] && Number.isNaN(data[key].getTime())) return '날짜 형식이 올바르지 않습니다.';
  if (data.startAt && data.endAt && data.endAt <= data.startAt) return '종료일은 시작일 뒤여야 합니다.';
  return null;
}

router.get('/admin/promotions', adminOnly, async (req, res) => {
  const promos = await prisma.comicPromotion.findMany({ orderBy: [{ endAt: 'desc' }] });
  const comics = await prisma.comic.findMany({ where: { id: { in: [...new Set(promos.map((p) => p.comicId))] } }, select: { id: true, title: true } });
  const titleById = new Map(comics.map((comic) => [comic.id, comic.title]));
  const now = new Date();
  res.json({
    promotions: promos.map((promo) => ({
      ...promo,
      comicTitle: titleById.get(promo.comicId) || '(삭제된 작품)',
      status: !promo.isActive ? 'OFF' : isLive(promo, now) ? 'ONGOING' : new Date(promo.startAt) > now ? 'UPCOMING' : 'ENDED',
      label: describePromotion(promo, now).label,
    })),
  });
});

router.post('/admin/promotions', adminOnly, async (req, res) => {
  const data = parseBody(req.body || {});
  const error = validate(data, true);
  if (error) return res.status(400).json({ message: error });
  if (!(await prisma.comic.findUnique({ where: { id: data.comicId }, select: { id: true } }))) return res.status(400).json({ message: '작품을 찾을 수 없습니다.' });
  const promotion = await prisma.comicPromotion.create({ data });
  await refreshPromotions();
  res.json({ promotion });
});

router.put('/admin/promotions/:promotionId', adminOnly, async (req, res) => {
  const data = parseBody(req.body || {});
  const current = await prisma.comicPromotion.findUnique({ where: { id: req.params.promotionId } });
  if (!current) return res.status(404).json({ message: '프로모션을 찾을 수 없습니다.' });
  const error = validate({ ...current, ...data }, false);
  if (error) return res.status(400).json({ message: error });
  const promotion = await prisma.comicPromotion.update({ where: { id: current.id }, data });
  await refreshPromotions();
  res.json({ promotion });
});

router.delete('/admin/promotions/:promotionId', adminOnly, async (req, res) => {
  try {
    await prisma.comicPromotion.delete({ where: { id: req.params.promotionId } });
    await refreshPromotions();
    res.json({ success: true });
  } catch {
    res.status(404).json({ message: '프로모션을 찾을 수 없습니다.' });
  }
});

module.exports = router;
