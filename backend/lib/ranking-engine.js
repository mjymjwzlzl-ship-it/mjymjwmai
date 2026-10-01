// 노출 관리 랭킹 엔진: 오늘의 추천작(today) · 추천 신작(new) · 인기 작품(popular) · 실시간 랭킹(realtime)
// 영역마다 관리자가 고른 집계 기준(metric)·집계 기간(period)으로 자동 순위를 내고, 고정한 작품은 지정한 순위에 둔다.
// 설정은 HomeCuration key `ranking_<area>` = { metric, period, size, newWithinDays, pins: [{ id, rank }] }
// 결과는 영역별 1분 캐시(설정·고정을 바꾸면 비움). 홈·랭킹 페이지·관리자 미리보기가 모두 이것을 쓴다.
const { prisma } = require('./prisma');
const { generalComicWhere } = require('../services/adult-access');
const { contentTypeOf } = require('./content-format');
const { isNewLaunch } = require('./badges');
const { getCuration, setCuration } = require('./curation');

const METRICS = {
  views: '조회순', likes: '찜순', purchases: '구매순', reads: '열람순', hearts: '좋아요순', rising: '최근 상승순', composite: '종합 인기순', launch: '런칭 최신순',
};
const METRIC_HELP = {
  views: '기간 안 회차 조회 수 (전체 기간 = 누적 조회수)',
  likes: '기간 안 새로 찜한 수 (전체 기간 = 현재 찜 수)',
  purchases: '기간 안 회차 구매(소장·대여) 수',
  reads: '기간 안 작품을 본 회원 수 (같은 사람 여러 번 = 1)',
  hearts: '기간 안 회차 좋아요 수',
  rising: '기간 조회 수 − 바로 앞 같은 길이 기간 조회 수 (전체 기간이면 24시간 기준)',
  composite: '조회×1 + 찜×10 + 구매×20 + 열람×3 + 좋아요×5 (같은 기간)',
  launch: '런칭일 최신순 (추천 신작 전용)',
};
const WEIGHTS = { views: 1, likes: 10, purchases: 20, reads: 3, hearts: 5 };
const PERIODS = { '1h': ['최근 1시간', 3600e3], '24h': ['최근 24시간', 86400e3], '7d': ['최근 7일', 7 * 86400e3], '30d': ['최근 30일', 30 * 86400e3], all: ['전체 기간', null] };
const AREAS = {
  today: { label: '오늘의 추천작', defaults: { metric: 'composite', period: '7d', size: 6 }, legacyPins: 'today_picks' },
  new: { label: '추천 신작', defaults: { metric: 'views', period: 'all', size: 20, newWithinDays: 30 }, legacyPins: 'new_picks' },
  popular: { label: '인기 작품', defaults: { metric: 'composite', period: 'all', size: 100 }, legacyPins: 'popular_pins' },
  realtime: { label: '실시간 랭킹', defaults: { metric: 'views', period: '24h', size: 100 }, legacyPins: null },
};

async function getConfig(area) {
  const def = AREAS[area];
  let cfg = await getCuration(`ranking_${area}`, null);
  if (!cfg) {
    // 처음: 예전 수동 목록(오늘의 추천작·추천 신작 직접 고른 작품, 인기 상단 고정)을 순위 고정으로 옮긴다
    const legacy = def.legacyPins ? await getCuration(def.legacyPins, []) : [];
    cfg = { ...def.defaults, pins: legacy.map((id, i) => ({ id: String(id), rank: i + 1 })) };
    await setCuration(`ranking_${area}`, cfg, 'migration');
  }
  return { ...def.defaults, ...cfg, pins: Array.isArray(cfg.pins) ? cfg.pins : [] };
}
async function saveConfig(area, patch, by) {
  const cur = await getConfig(area);
  const next = { ...cur, ...patch };
  if (!METRICS[next.metric] || (next.metric === 'launch' && area !== 'new')) throw new Error('집계 기준이 올바르지 않습니다.');
  if (!PERIODS[next.period]) throw new Error('집계 기간이 올바르지 않습니다.');
  next.size = Math.max(1, Math.min(100, Number(next.size) || AREAS[area].defaults.size));
  if (area === 'new') next.newWithinDays = Math.max(1, Math.min(365, Number(next.newWithinDays) || 30));
  next.pins = (next.pins || []).map((p) => ({ id: String(p.id), rank: Math.max(1, Math.min(next.size, Number(p.rank) || 1)) }))
    .filter((p, i, arr) => arr.findIndex((x) => x.id === p.id) === i);
  await setCuration(`ranking_${area}`, next, by);
  clearCache();
  return next;
}

// 기간별 지표 (작품 id → 값). 같은 기간은 1분 동안 재사용
const metricCache = new Map();
async function metricsFor(period, comicIds) {
  const key = period;
  const hit = metricCache.get(key);
  if (hit && Date.now() - hit.at < 60e3) return hit.data;
  const now = Date.now();
  const span = PERIODS[period][1];
  const from = span ? new Date(now - span) : null;
  const where = (field = 'createdAt') => (from ? { [field]: { gte: from } } : {});
  const count = (rows, get) => { const m = new Map(); for (const r of rows) { const id = get(r); if (id) m.set(id, (m.get(id) || 0) + 1); } return m; };
  const [comics, views, readsRows, likes, purchases, hearts, prevViews] = await Promise.all([
    prisma.comic.findMany({ where: { id: { in: comicIds } }, select: { id: true, viewCount: true, _count: { select: { likes: true } } } }),
    from ? prisma.view.groupBy({ by: ['comicId'], where: { comicId: { in: comicIds }, ...where() }, _count: { _all: true } }) : null,
    prisma.view.groupBy({ by: ['comicId', 'userId'], where: { comicId: { in: comicIds }, userId: { not: null }, ...where() } }),
    from ? prisma.like.groupBy({ by: ['comicId'], where: { comicId: { in: comicIds }, ...where() }, _count: { _all: true } }) : null,
    prisma.purchase.findMany({ where: { episode: { comicId: { in: comicIds } }, ...where() }, select: { episode: { select: { comicId: true } } } }),
    prisma.episodeLike.findMany({ where: { episode: { comicId: { in: comicIds } }, ...where() }, select: { episode: { select: { comicId: true } } } }),
    // 상승: 바로 앞 같은 길이 기간 (전체 기간은 24시간 기준)
    (async () => {
      const len = span || 86400e3;
      const cur = await prisma.view.groupBy({ by: ['comicId'], where: { comicId: { in: comicIds }, createdAt: { gte: new Date(now - len) } }, _count: { _all: true } });
      const prev = await prisma.view.groupBy({ by: ['comicId'], where: { comicId: { in: comicIds }, createdAt: { gte: new Date(now - 2 * len), lt: new Date(now - len) } }, _count: { _all: true } });
      return { cur: new Map(cur.map((r) => [r.comicId, r._count._all])), prev: new Map(prev.map((r) => [r.comicId, r._count._all])) };
    })(),
  ]);
  const viewMap = from ? new Map(views.map((r) => [r.comicId, r._count._all])) : new Map(comics.map((c) => [c.id, c.viewCount || 0]));
  const likeMap = from ? new Map(likes.map((r) => [r.comicId, r._count._all])) : new Map(comics.map((c) => [c.id, c._count.likes]));
  const readMap = count(readsRows, (r) => r.comicId);
  const buyMap = count(purchases, (r) => r.episode?.comicId);
  const heartMap = count(hearts, (r) => r.episode?.comicId);
  const data = new Map();
  for (const id of comicIds) {
    const m = { views: viewMap.get(id) || 0, likes: likeMap.get(id) || 0, purchases: buyMap.get(id) || 0, reads: readMap.get(id) || 0, hearts: heartMap.get(id) || 0, rising: (prevViews.cur.get(id) || 0) - (prevViews.prev.get(id) || 0) };
    m.composite = Object.entries(WEIGHTS).reduce((a, [k, w]) => a + m[k] * w, 0);
    data.set(id, m);
  }
  metricCache.set(key, { at: Date.now(), data });
  return data;
}

// 후보 작품 (일반 공개 작품). 오늘의 추천작·추천 신작은 홈 카드 영역이라 웹소설 제외, 추천 신작은 런칭 N일 이내
async function pool() {
  const comics = await prisma.comic.findMany({
    where: { isPublished: true, status: { not: 'HIDDEN' }, locale: 'ko', ...generalComicWhere() },
    select: { id: true, title: true, authorName: true, thumbnail: true, genre: true, status: true, contentType: true, viewCount: true, createdAt: true, _count: { select: { episodes: true, likes: true } } },
  });
  const latest = await prisma.episode.groupBy({ by: ['comicId'], where: { comicId: { in: comics.map((c) => c.id) }, createdAt: { lte: new Date() } }, _max: { createdAt: true } });
  const last = new Map(latest.map((r) => [r.comicId, r._max.createdAt]));
  return comics.map((c) => ({
    id: c.id, title: c.title, author: c.authorName, thumbnail: c.thumbnail, genre: c.genre, status: c.status, totalEpisodes: c._count.episodes,
    contentType: contentTypeOf(c), views: c.viewCount, likes: c._count.likes, launchedAt: c.createdAt, lastEpisodeAt: last.get(c.id) || null, isNew: isNewLaunch(c.createdAt),
  }));
}

const cache = new Map();
function clearCache() { cache.clear(); metricCache.clear(); }

async function computeArea(area) {
  const hit = cache.get(area);
  if (hit && Date.now() - hit.computedAt < 60e3) return hit;
  const cfg = await getConfig(area);
  const all = await pool();
  const byId = new Map(all.map((c) => [c.id, c]));
  let candidates = all;
  if (area === 'today' || area === 'new') candidates = all.filter((c) => c.contentType !== 'novel');
  if (area === 'new') candidates = candidates.filter((c) => Date.now() - new Date(c.launchedAt).getTime() <= cfg.newWithinDays * 86400e3);
  const metrics = await metricsFor(cfg.period, all.map((c) => c.id));
  const valueOf = (c) => (cfg.metric === 'launch' ? new Date(c.launchedAt).getTime() : metrics.get(c.id)?.[cfg.metric] || 0);
  let auto = [...candidates].sort((a, b) => valueOf(b) - valueOf(a) || (metrics.get(b.id)?.composite || 0) - (metrics.get(a.id)?.composite || 0) || new Date(b.launchedAt) - new Date(a.launchedAt));
  // 실시간 랭킹·최근 상승은 기간 안 움직임이 있는 작품만
  if (area === 'realtime' || cfg.metric === 'rising') auto = auto.filter((c) => valueOf(c) > 0);
  // 고정: 지정 순위에 놓고 나머지는 자동 순서로 채운다 (후보 밖 작품도 고정하면 노출)
  const pins = cfg.pins.filter((p) => byId.has(p.id)).sort((a, b) => a.rank - b.rank);
  const pinnedIds = new Set(pins.map((p) => p.id));
  const rest = auto.filter((c) => !pinnedIds.has(c.id));
  const slots = [];
  const size = Math.min(cfg.size, Math.max(pins.length ? pins[pins.length - 1].rank : 0, rest.length + pins.length));
  for (let rank = 1; rank <= size; rank += 1) {
    const pin = pins.find((p) => p.rank === rank && !slots.some((s) => s.id === p.id));
    if (pin) slots.push({ ...byId.get(pin.id), pinned: true });
    else if (rest.length) slots.push({ ...rest.shift(), pinned: false });
  }
  // 같은 순위에 고정이 겹치면 뒤로 밀린 고정 작품도 빠짐없이
  for (const p of pins) if (!slots.some((s) => s.id === p.id) && slots.length < cfg.size) slots.push({ ...byId.get(p.id), pinned: true });
  const items = slots.map((c, i) => ({ ...c, rank: i + 1, metricValue: cfg.metric === 'launch' ? null : valueOf(c), metrics: metrics.get(c.id) || {}, popularScore: metrics.get(c.id)?.composite || 0, recentViews: metrics.get(c.id)?.views || 0 }));
  const result = { area, label: AREAS[area].label, config: cfg, metricLabel: METRICS[cfg.metric], periodLabel: PERIODS[cfg.period][0], computedAt: Date.now(), candidates: candidates.length, items };
  cache.set(area, result);
  return result;
}

module.exports = { AREAS, METRICS, METRIC_HELP, PERIODS, WEIGHTS, getConfig, saveConfig, computeArea, clearCache };
