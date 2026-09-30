// 작가·스튜디오 상세: GET /api/frontend/creators/:name?sort=latest|popular
// 참여 작품 = credits(없으면 authorName 분리)에 이 이름이 정확히 있는 공개 작품. 역할(글/그림/스튜디오)도 함께.
// 성인 작품은 19 ON + 로그인 + 성인 인증일 때만, 아니면 수(hiddenAdult)만 알려 준다(검색과 같은 기준).
const express = require('express');
const { prisma } = require('../lib/prisma');
const { optionalAuth } = require('../middleware/auth');
const { isAdultComic, isAdultModeRequest } = require('../services/adult-access');
const { parseCredits, isLinkableName } = require('../lib/credits');
const { contentTypeOf } = require('../lib/content-format');
const { parseTags } = require('../lib/tags');

const router = express.Router();

router.get('/creators/:name', optionalAuth, async (req, res) => {
  const name = String(req.params.name || '').replace(/\s+/g, ' ').trim();
  if (!isLinkableName(name)) return res.status(404).json({ message: '작가 정보를 찾을 수 없습니다.' });
  const sort = req.query.sort === 'popular' ? 'popular' : 'latest';
  const adultAllowed = isAdultModeRequest(req) && !!req.user?.adultVerified;
  if (isAdultModeRequest(req)) { res.set('Cache-Control', 'private, no-store'); res.set('Vary', 'Authorization'); }

  // 후보: 이름이 authorName 이나 credits 에 들어 있는 공개 작품 → 정확히 같은 이름만 남긴다
  const candidates = await prisma.comic.findMany({
    where: { isPublished: true, OR: [{ authorName: { contains: name } }, { credits: { contains: name } }] },
    select: {
      id: true, title: true, thumbnail: true, genre: true, status: true, contentType: true, rating: true, tags: true,
      authorName: true, credits: true, viewCount: true, likeCount: true, createdAt: true,
      episodes: { where: { createdAt: { lte: new Date() } }, select: { createdAt: true }, orderBy: { createdAt: 'desc' }, take: 1 },
      _count: { select: { episodes: true } },
    },
  });
  const matched = [];
  let hiddenAdult = 0;
  for (const comic of candidates) {
    const roles = parseCredits(comic).filter((c) => c.name === name).map((c) => c.role);
    if (!roles.length) continue;
    const adult = isAdultComic(comic);
    if (adult && !adultAllowed) { hiddenAdult += 1; continue; }
    matched.push({
      id: comic.id, title: comic.title, thumbnail: comic.thumbnail, genre: comic.genre, status: comic.status,
      contentType: contentTypeOf(comic), rating: comic.rating, isAdult: adult, tags: parseTags(comic.tags),
      roles: [...new Set(roles)], credits: parseCredits(comic), viewCount: comic.viewCount || 0, likeCount: comic.likeCount || 0,
      totalEpisodes: comic._count.episodes, createdAt: comic.createdAt, lastEpisodeAt: comic.episodes[0]?.createdAt || null,
    });
  }
  const latestOf = (w) => new Date(w.lastEpisodeAt || w.createdAt).getTime();
  matched.sort(sort === 'popular' ? (a, b) => b.viewCount - a.viewCount || latestOf(b) - latestOf(a) : (a, b) => latestOf(b) - latestOf(a));
  if (!matched.length && !hiddenAdult) return res.status(404).json({ message: '작가 정보를 찾을 수 없습니다.' });

  // 대표 역할: 스튜디오로만 참여했으면 스튜디오, 아니면 작가(글·그림 등 역할 목록)
  const roleSet = [...new Set(matched.flatMap((w) => w.roles))];
  res.json({
    name,
    kind: roleSet.length && roleSet.every((r) => r === '스튜디오') ? 'studio' : 'creator',
    roles: roleSet,
    sort,
    counts: { total: matched.length, webtoon: matched.filter((w) => w.contentType === 'webtoon').length, book: matched.filter((w) => w.contentType === 'book').length, novel: matched.filter((w) => w.contentType === 'novel').length },
    works: matched,
    hiddenAdult,
  });
});

module.exports = router;
