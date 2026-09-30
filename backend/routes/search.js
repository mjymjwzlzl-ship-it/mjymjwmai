const express = require('express');
const router = express.Router();
const { prisma } = require('../lib/prisma');
const { optionalAuth } = require('../middleware/auth');
const { adultComicWhere, generalComicWhere, isAdultModeRequest } = require('../services/adult-access');

// 성인 작품: 19 ON(adultMode=true) + 로그인 + 성인 인증일 때만 일반 작품과 함께 검색된다.
// 그 밖에는 빼고, 제목·작가·태그가 맞는 성인 작품 수만 hiddenAdult 로 알려 준다(목록·제목은 보내지 않음).
router.use(optionalAuth);

// 검색 API
router.get('/', async (req, res) => {
  try {
    const { q, adult } = req.query;
    // ?tag=회귀 : 태그로 찾기 (검색어 없이도 가능)
    const tag = String(req.query.tag || '').trim();

    if ((!q || q.trim().length === 0) && !tag) {
      return res.json({ results: [] });
    }

    // '#회귀' 처럼 샵을 붙여 검색하면 태그 검색
    let searchTerm = (q || '').trim();
    let hashTag = '';
    if (/^#\S/.test(searchTerm)) { hashTag = searchTerm.slice(1).trim(); searchTerm = ''; }
    const isAdultMode = isAdultModeRequest(req) && !!req.user?.adultVerified;
    if (isAdultModeRequest(req)) { res.set('Cache-Control', 'private, no-store'); res.set('Vary', 'Authorization'); }

    // 웹툰 검색 조건
    const webtoonWhere = {
      AND: [
        {
          OR: [
            {
              title: {
                contains: searchTerm
              }
            },
            {
              authorName: {
                contains: searchTerm
              }
            },
            {
              genre: {
                contains: searchTerm
              }
            },
            {
              description: {
                contains: searchTerm
              }
            },
            { tags: { contains: searchTerm } }
          ]
        }
      ]
    };
    if (!searchTerm) webtoonWhere.AND.shift();
    if (tag) webtoonWhere.AND.push({ tags: { contains: JSON.stringify(tag) } });
    if (hashTag) webtoonWhere.AND.push({ tags: { contains: hashTag } });

    // soft-hide: 공개 검색에는 isPublished=true만 노출
    webtoonWhere.AND.push({ isPublished: true });

    // 성인 작품: 19 ON + 성인 인증이면 일반 작품과 함께, 아니면 제외(몇 개가 가려졌는지만 센다)
    let hiddenAdult = 0;
    if (!isAdultMode) {
      hiddenAdult = await prisma.comic.count({ where: { AND: [...webtoonWhere.AND, adultComicWhere()] } });
      webtoonWhere.AND.push(generalComicWhere());
    }

    // 웹툰 검색 (Comic 모델 사용)
    const webtoons = await prisma.comic.findMany({
      where: webtoonWhere,
      select: {
        id: true,
        title: true,
        authorName: true,
        thumbnail: true,
        rating: true, // 연령등급 ("19", "ADULT", "all" 등)
        description: true,
        genre: true,
        tags: true,
        contentType: true,
        status: true,
        viewCount: true,
        createdAt: true,
        _count: {
          select: {
            episodes: true
          }
        }
      },
      orderBy: {
        viewCount: 'desc'
      },
      take: 50
    });

    // 소설 검색
    // 태그만으로 찾을 때는 예전 소설(Novel) 테이블은 건너뛴다
    const novels = !searchTerm ? [] : await prisma.novel.findMany({
      where: {
        AND: [
          {
            OR: [
              {
                title: {
                  contains: searchTerm
                }
              },
              {
                genre: {
                  contains: searchTerm
                }
              },
              {
                description: {
                  contains: searchTerm
                }
              }
            ]
          },
          { isBlocked: false }, // 차단된 소설 제외
          ...(isAdultMode ? [] : [{ isAdult: false }]) // 19 ON + 성인 인증이면 성인 소설도 함께
        ]
      },
      select: {
        id: true,
        title: true,
        thumbnail: true,
        isAdult: true,
        description: true,
        genre: true,
        viewCount: true,
        createdAt: true,
        author: {
          select: {
            nickname: true
          }
        }
      },
      orderBy: {
        viewCount: 'desc'
      },
      take: 50
    });

    // 결과 합치기
    const webtoonResults = webtoons.map(w => ({
      ...w,
      type: 'webtoon'
    }));

    const novelResults = novels.map(n => ({
      id: n.id,
      title: n.title,
      authorName: n.author?.nickname || '알 수 없음',
      thumbnail: n.thumbnail,
      rating: n.isAdult ? '19' : 'all', // 연령등급 형식 맞추기
      description: n.description,
      genre: n.genre,
      viewCount: n.viewCount,
      createdAt: n.createdAt,
      type: 'novel'
    }));

    // 제목 정확히 일치 → 제목이 검색어로 시작 → 조회수 순
    const titleRank = (item) => {
      const title = String(item.title || '').trim();
      if (!searchTerm) return 2;
      if (title === searchTerm) return 0;
      return title.startsWith(searchTerm) ? 1 : 2;
    };
    const allResults = [...webtoonResults, ...novelResults].sort((a, b) =>
      titleRank(a) - titleRank(b) || (b.viewCount || 0) - (a.viewCount || 0)
    );

    res.json({
      results: allResults,
      count: {
        webtoons: webtoons.length,
        novels: novels.length,
        total: allResults.length
      },
      adultMode: isAdultMode,
      hiddenAdult,
    });

  } catch (error) {
    console.error('검색 오류:', error);
    res.status(500).json({
      message: '검색 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
