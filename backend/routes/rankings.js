// 작품 랭킹 (/api/frontend/rankings)
// - today / new / popular / realtime [오늘의 추천작·추천 신작·인기 작품·실시간 랭킹]:
//   관리자 [노출 관리]에서 영역마다 고른 집계 기준·기간 + 고정 순위로 lib/ranking-engine 이 계산
// - webtoon / book / novel [TOP N]: 유형별 인기 점수(누적 조회수 + 찜 × 10 + 평점 합계) 순. N 은 등록 작품 수에 맞춰 20·50·100 중 하나
// 성인 작품은 제외한다 (홈·일반 목록용).
const express = require('express');
const { prisma } = require('../lib/prisma');
const { generalComicWhere } = require('../services/adult-access');
const { contentTypeOf } = require('../lib/content-format');
const { isNewLaunch } = require('../lib/badges');
const engine = require('../lib/ranking-engine');

const router = express.Router();
const KINDS = ['today', 'popular', 'realtime', 'new', 'webtoon', 'book', 'novel'];
const ENGINE_AREAS = ['today', 'popular', 'realtime', 'new'];
const REALTIME_HOURS = 24;

const topSize = (count) => (count > 50 ? 100 : count > 20 ? 50 : 20);

async function buildRankings() {
  const comics = await prisma.comic.findMany({
    where: { isPublished: true, status: { not: 'HIDDEN' }, locale: 'ko', ...generalComicWhere() },
    select: { id: true, title: true, authorName: true, thumbnail: true, genre: true, status: true, contentType: true, viewCount: true, createdAt: true, _count: { select: { episodes: true, likes: true } } },
  });
  const ids = comics.map((comic) => comic.id);
  const since = new Date(Date.now() - REALTIME_HOURS * 60 * 60 * 1000);

  const [recentViews, ratingRows, latestRows] = await Promise.all([
    prisma.view.groupBy({ by: ['comicId'], where: { comicId: { in: ids }, createdAt: { gte: since } }, _count: { _all: true } }),
    prisma.rating.findMany({ where: { episode: { comicId: { in: ids } } }, select: { score: true, episode: { select: { comicId: true } } } }),
    prisma.episode.groupBy({ by: ['comicId'], where: { comicId: { in: ids }, createdAt: { lte: new Date() } }, _max: { createdAt: true } }),
  ]);
  const lastEpisodeById = new Map(latestRows.map((row) => [row.comicId, row._max.createdAt]));
  const recentById = new Map(recentViews.map((row) => [row.comicId, row._count._all]));
  const ratingById = new Map();
  for (const row of ratingRows) {
    const entry = ratingById.get(row.episode.comicId) || { sum: 0, count: 0 };
    entry.sum += row.score;
    entry.count += 1;
    ratingById.set(row.episode.comicId, entry);
  }

  const items = comics.map((comic) => {
    const rating = ratingById.get(comic.id) || { sum: 0, count: 0 };
    const likes = comic._count.likes;
    return {
      id: comic.id,
      title: comic.title,
      author: comic.authorName,
      thumbnail: comic.thumbnail,
      genre: comic.genre,
      status: comic.status,
      totalEpisodes: comic._count.episodes,
      contentType: contentTypeOf(comic),
      views: comic.viewCount,
      likes,
      rating: rating.count ? Math.round((rating.sum / rating.count) * 10) / 10 : 0,
      ratingCount: rating.count,
      recentViews: recentById.get(comic.id) || 0,
      popularScore: comic.viewCount + likes * 10 + rating.sum,
      launchedAt: comic.createdAt,
      lastEpisodeAt: lastEpisodeById.get(comic.id) || null,
      isNew: isNewLaunch(comic.createdAt),
    };
  });

  const byPopular = (a, b) => b.popularScore - a.popularScore || b.views - a.views;
  const ofType = (type) => [...items].sort(byPopular).filter((item) => item.contentType === type);
  // 노출 관리 영역: 엔진 결과에 평점만 덧붙인다
  const byId = new Map(items.map((item) => [item.id, item]));
  const areas = {};
  for (const area of ENGINE_AREAS) {
    const r = await engine.computeArea(area);
    areas[area] = { criteria: { metric: r.config.metric, metricLabel: r.metricLabel, period: r.config.period, periodLabel: r.periodLabel, computedAt: r.computedAt }, list: r.items.map((x) => ({ ...x, rating: byId.get(x.id)?.rating || 0, ratingCount: byId.get(x.id)?.ratingCount || 0 })) };
  }
  return { areas, webtoon: ofType('webtoon'), book: ofType('book'), novel: ofType('novel') };
}

// 집계는 1분 캐시 (홈에서 자주 불린다)
let cache = { at: 0, data: null };
async function rankings() {
  if (!cache.data || Date.now() - cache.at > 60 * 1000) cache = { at: Date.now(), data: await buildRankings() };
  return cache.data;
}

const withRank = (list, limit) => list.slice(0, limit).map((item, index) => ({ ...item, rank: index + 1 }));

// GET /api/frontend/rankings?kind=popular&limit=5  (kind 없으면 다섯 가지 모두)
router.get('/rankings', async (req, res) => {
  try {
    const data = await rankings();
    const limit = Math.max(1, Math.min(Number(req.query.limit) || 100, 100));
    const kinds = KINDS.includes(String(req.query.kind)) ? [String(req.query.kind)] : KINDS;
    const result = {};
    for (const kind of kinds) {
      const area = data.areas[kind];
      if (area) { result[kind] = { total: area.list.length, top: area.list.length, criteria: area.criteria, items: area.list.slice(0, limit) }; continue; }
      const list = data[kind];
      const top = Math.min(list.length, topSize(list.length));
      result[kind] = { total: list.length, top, items: withRank(list, Math.min(limit, top)) };
    }
    res.set('Cache-Control', 'no-cache'); // 노출 관리 집계 기준·고정을 바꾸면 바로 보이게 (서버는 1분 메모리 캐시, 저장 때 비움)
    res.json({ realtimeHours: REALTIME_HOURS, rankings: result });
  } catch (error) {
    console.error('랭킹 조회 오류:', error);
    res.status(500).json({ message: '랭킹을 불러오지 못했습니다.' });
  }
});

// GET /api/frontend/tags : 공개 작품에 쓰인 태그 (많이 쓰인 순). 목록·검색 태그 필터용
router.get('/tags', async (req, res) => {
  const { parseTags } = require('../lib/tags');
  const rows = await prisma.comic.findMany({ where: { isPublished: true, status: { not: 'HIDDEN' }, tags: { not: null }, ...generalComicWhere() }, select: { tags: true, contentType: true, id: true } });
  const type = String(req.query.type || '');
  const counts = new Map();
  for (const row of rows) {
    if (type && contentTypeOf(row) !== type) continue;
    for (const tag of parseTags(row.tags)) counts.set(tag, (counts.get(tag) || 0) + 1);
  }
  res.set('Cache-Control', 'public, max-age=60');
  res.json({ tags: [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ko')).map(([name, count]) => ({ name, count })) });
});

module.exports = router;
// 관리자 노출 관리·통계에서 같은 집계를 쓴다
module.exports.rankings = rankings;
module.exports.clearRankingCache = () => { cache = { at: 0, data: null }; engine.clearCache(); };
