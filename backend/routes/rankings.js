// 작품 랭킹 (/api/frontend/rankings)
// - popular  [인기 작품]  : 누적 지표 = 누적 조회수 + 찜 수 × 10 + 회차 평점 합계(평균 × 참여 수)
// - realtime [실시간 랭킹]: 최근 24시간 회차 조회 수 (조회가 있었던 작품만)
// - new      [신작]      : 런칭(등록)일 최신순, 7일 이내는 isNew
// - webtoon / book / novel [TOP N]: 유형별 인기 점수 순. N 은 등록 작품 수에 맞춰 20·50·100 중 하나
// 성인 작품은 제외한다 (홈·일반 목록용).
const express = require('express');
const { prisma } = require('../lib/prisma');
const { generalComicWhere } = require('../services/adult-access');
const { contentTypeOf } = require('../lib/content-format');

const router = express.Router();
const KINDS = ['popular', 'realtime', 'new', 'webtoon', 'book', 'novel'];
const REALTIME_HOURS = 24;

const topSize = (count) => (count > 50 ? 100 : count > 20 ? 50 : 20);

async function buildRankings() {
  const comics = await prisma.comic.findMany({
    where: { isPublished: true, status: { not: 'HIDDEN' }, locale: 'ko', ...generalComicWhere() },
    select: { id: true, title: true, authorName: true, thumbnail: true, genre: true, status: true, contentType: true, viewCount: true, createdAt: true, _count: { select: { episodes: true, likes: true } } },
  });
  const ids = comics.map((comic) => comic.id);
  const since = new Date(Date.now() - REALTIME_HOURS * 60 * 60 * 1000);

  const [recentViews, ratingRows] = await Promise.all([
    prisma.view.groupBy({ by: ['comicId'], where: { comicId: { in: ids }, createdAt: { gte: since } }, _count: { _all: true } }),
    prisma.rating.findMany({ where: { episode: { comicId: { in: ids } } }, select: { score: true, episode: { select: { comicId: true } } } }),
  ]);
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
      isNew: Date.now() - new Date(comic.createdAt).getTime() <= 7 * 24 * 60 * 60 * 1000,
    };
  });

  const byPopular = (a, b) => b.popularScore - a.popularScore || b.views - a.views;
  const popular = [...items].sort(byPopular);
  const realtime = items.filter((item) => item.recentViews > 0).sort((a, b) => b.recentViews - a.recentViews || byPopular(a, b));
  const ofType = (type) => popular.filter((item) => item.contentType === type);
  const newest = [...items].sort((a, b) => new Date(b.launchedAt).getTime() - new Date(a.launchedAt).getTime() || byPopular(a, b));
  return { popular, realtime, new: newest, webtoon: ofType('webtoon'), book: ofType('book'), novel: ofType('novel') };
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
      const list = data[kind];
      const top = kind === 'new' ? Math.min(list.length, 20) : kind === 'popular' || kind === 'realtime' ? Math.min(list.length, 100) : Math.min(list.length, topSize(list.length));
      result[kind] = { total: list.length, top, items: withRank(list, Math.min(limit, top)) };
    }
    res.set('Cache-Control', 'public, max-age=60');
    res.json({ realtimeHours: REALTIME_HOURS, rankings: result });
  } catch (error) {
    console.error('랭킹 조회 오류:', error);
    res.status(500).json({ message: '랭킹을 불러오지 못했습니다.' });
  }
});

module.exports = router;
