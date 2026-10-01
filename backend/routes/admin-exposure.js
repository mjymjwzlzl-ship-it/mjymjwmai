// 관리자 노출 관리: /api/admin/exposure
// 작품 정보는 작품 관리(Comic)가 기준, 여기는 "사용자 화면 어디에 무엇을 보여 줄지"만.
// - 오늘의 추천작·추천 신작·인기 작품·실시간 랭킹: 영역별 집계 기준·기간 + 고정 순위 (lib/ranking-engine, HomeCuration ranking_<area>)
// - 홈 화면 섹션(home_sections): 순서·노출
// - 자동 분류 현황(요일·매일·완결·신작·최신 업데이트): 읽기 전용 (작품 정보로 자동 계산)
const express = require('express');
const { prisma } = require('../lib/prisma');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { adultComicWhere, generalComicWhere } = require('../services/adult-access');
const { autoCategories } = require('../lib/auto-categories');
const { HOME_SECTIONS, setCuration, homeSections } = require('../lib/curation');
const rankingsRouter = require('./rankings');
const { contentTypeOf } = require('../lib/content-format');
const engine = require('../lib/ranking-engine');

const router = express.Router();
router.use('/admin/exposure', authenticate, requireAdmin);

const brief = (c) => ({ id: c.id, title: c.title, thumbnail: c.thumbnail, status: c.status, type: contentTypeOf(c), rating: c.rating, createdAt: c.createdAt, lastEpisodeAt: c.lastEpisodeAt || null, isPublished: c.isPublished });

router.get('/admin/exposure', async (req, res) => {
  res.json({ sections: await homeSections() });
});

router.put('/admin/exposure/sections', async (req, res) => {
  const list = Array.isArray(req.body?.sections) ? req.body.sections : [];
  const known = new Set(HOME_SECTIONS.map((s) => s.key));
  const clean = list.filter((s) => known.has(s?.key)).map((s) => ({ key: s.key, visible: s.visible !== false }));
  if (!clean.length) return res.status(400).json({ message: '섹션 정보가 없습니다.' });
  await setCuration('home_sections', clean, req.user.id || req.user.userId);
  res.json({ sections: await homeSections() });
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

// ── 순위 영역(오늘의 추천작·추천 신작·인기 작품·실시간 랭킹): 집계 기준·기간 + 고정 ──
// 순위는 자동 집계가 기본. [고정]한 작품은 지정 순위에 머물고 나머지는 자동 순서로 채운다.
async function rankingView(area) {
  const r = await engine.computeArea(area);
  return {
    area, label: r.label, config: r.config, metricLabel: r.metricLabel, periodLabel: r.periodLabel, computedAt: r.computedAt, candidates: r.candidates,
    options: {
      metrics: Object.entries(engine.METRICS).filter(([k]) => k !== 'launch' || area === 'new').map(([key, label]) => ({ key, label, help: engine.METRIC_HELP[key] })),
      periods: Object.entries(engine.PERIODS).map(([key, [label]]) => ({ key, label })), weights: engine.WEIGHTS,
    },
    items: r.items.map((x) => ({ rank: x.rank, id: x.id, title: x.title, thumbnail: x.thumbnail, type: x.contentType, status: x.status, launchedAt: x.launchedAt, pinned: x.pinned, metricValue: x.metricValue, metrics: x.metrics })),
  };
}
const areaOf = (req, res) => { const a = req.params.area; if (!engine.AREAS[a]) { res.status(400).json({ message: '알 수 없는 영역입니다.' }); return null; } return a; };
const by = (req) => req.user.id || req.user.userId;
const refresh = () => rankingsRouter.clearRankingCache();

router.get('/admin/exposure/ranking/:area', async (req, res) => {
  const area = areaOf(req, res); if (!area) return;
  try { res.json(await rankingView(area)); } catch (e) { console.error('순위 집계 오류:', e); res.status(500).json({ message: '순위를 집계하지 못했습니다.' }); }
});
// 집계 기준·기간·노출 개수(·신작 범위) 저장
router.put('/admin/exposure/ranking/:area', async (req, res) => {
  const area = areaOf(req, res); if (!area) return;
  const b = req.body || {};
  const patch = {};
  for (const k of ['metric', 'period', 'size', 'newWithinDays']) if (b[k] !== undefined) patch[k] = b[k];
  try { await engine.saveConfig(area, patch, by(req)); refresh(); res.json(await rankingView(area)); } catch (e) { res.status(400).json({ message: e.message }); }
});
// 지금 다시 집계
router.post('/admin/exposure/ranking/:area/recompute', async (req, res) => {
  const area = areaOf(req, res); if (!area) return;
  refresh(); res.json(await rankingView(area));
});
// 고정 조작: pin(현재 순위에 고정) / unpin / move(id 를 rank 로 옮기고 고정) / add(작품을 rank 에 고정 추가) / pinAll / unpinAll
router.post('/admin/exposure/ranking/:area/pins', async (req, res) => {
  const area = areaOf(req, res); if (!area) return;
  const { action } = req.body || {};
  const id = req.body?.id ? String(req.body.id) : '';
  const cur = await engine.computeArea(area);
  const cfg = cur.config;
  const shown = new Map(cur.items.map((x) => [x.id, x.rank]));
  let pins = cfg.pins.filter((p) => p.id !== id);
  // 같은 순위에 이미 고정된 작품은 한 칸씩 뒤로 (겹치지 않게)
  const place = (list, pid, rank) => {
    let r = rank;
    const out = list.map((p) => ({ ...p }));
    const sorted = out.filter((p) => p.rank >= r).sort((a, b) => a.rank - b.rank);
    for (const p of sorted) { if (p.rank === r) { p.rank += 1; r += 1; } else break; }
    return [...out, { id: pid, rank }].filter((p) => p.rank <= cfg.size);
  };
  try {
    if (action === 'unpinAll') pins = [];
    else if (action === 'pinAll') pins = cur.items.map((x) => ({ id: x.id, rank: x.rank }));
    else if (!id) return res.status(400).json({ message: '작품을 지정해 주세요.' });
    else if (action === 'unpin') { /* 위에서 뺐다 */ }
    else if (action === 'pin') { if (!shown.has(id)) return res.status(400).json({ message: '지금 순위에 없는 작품입니다. [작품 추가]로 순위를 지정하세요.' }); pins = place(pins, id, shown.get(id)); }
    else if (action === 'move' || action === 'add') {
      const rank = Math.max(1, Math.min(cfg.size, Number(req.body.rank) || 1));
      if (action === 'add') {
        const found = await prisma.comic.findFirst({ where: { id, isPublished: true, status: { not: 'HIDDEN' }, locale: 'ko', ...generalComicWhere() }, select: { id: true, contentType: true } });
        if (!found) return res.status(400).json({ message: '공개된 일반 작품만 넣을 수 있습니다.' });
        if ((area === 'today' || area === 'new') && contentTypeOf(found) === 'novel') return res.status(400).json({ message: '홈 카드 영역이라 웹소설은 넣을 수 없습니다.' });
        pins = place(pins, id, rank);
      } else {
        // 옮기는 자리에 고정 작품이 있으면 서로 자리를 바꾼다
        const from = shown.get(id);
        const other = pins.find((p) => p.rank === rank);
        if (other && from) other.rank = from;
        pins = other && from ? [...pins, { id, rank }] : place(pins, id, rank);
      }
    } else return res.status(400).json({ message: '알 수 없는 동작입니다.' });
    await engine.saveConfig(area, { pins }, by(req));
    refresh();
    res.json(await rankingView(area));
  } catch (e) { res.status(400).json({ message: e.message }); }
});

module.exports = router;
