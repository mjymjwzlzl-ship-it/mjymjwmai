const express = require('express');
const router = express.Router();
const { prisma } = require('../lib/prisma');

// 검색 API
router.get('/', async (req, res) => {
  try {
    const { q, adult } = req.query;

    if (!q || q.trim().length === 0) {
      return res.json({ results: [] });
    }

    const searchTerm = q.trim();
    const isAdultMode = adult === 'true' || adult === '1';
    console.log('검색어:', searchTerm, '성인모드:', isAdultMode);

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
            }
          ]
        }
      ]
    };

    // soft-hide: 공개 검색에는 isPublished=true만 노출
    webtoonWhere.AND.push({ isPublished: true });

    // 성인 모드에 따라 필터링
    if (isAdultMode) {
      // 성인 모드: 성인 웹툰만
      webtoonWhere.AND.push({
        OR: [
          { rating: '19' },
          { rating: 'ADULT' },
          { rating: 'adult' },
          { genre: { contains: 'adult' } }
        ]
      });
    } else {
      // 일반 모드: 성인 웹툰 제외
      webtoonWhere.AND.push({
        NOT: {
          OR: [
            { rating: '19' },
            { rating: 'ADULT' },
            { rating: 'adult' },
            { genre: { contains: 'adult' } }
          ]
        }
      });
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
    const novels = await prisma.novel.findMany({
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
          { isAdult: isAdultMode } // 성인 모드에 따라 필터링
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

    // 조회수 순으로 정렬
    const allResults = [...webtoonResults, ...novelResults].sort((a, b) =>
      (b.viewCount || 0) - (a.viewCount || 0)
    );

    console.log(`검색 결과: 웹툰 ${webtoons.length}개, 소설 ${novels.length}개, 총 ${allResults.length}개`);

    res.json({
      results: allResults,
      count: {
        webtoons: webtoons.length,
        novels: novels.length,
        total: allResults.length
      }
    });

  } catch (error) {
    console.error('검색 오류:', error);
    res.status(500).json({
      message: '검색 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

module.exports = router;
