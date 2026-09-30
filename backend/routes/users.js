const { getJwtSecret } = require('../lib/jwt-secret');
const express = require('express');
const { prisma } = require('../lib/prisma');
const { authenticate } = require('../middleware/auth');
const jwt = require('jsonwebtoken');

const router = express.Router();

// JWT 토큰 검증 미들웨어
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: '로그인이 필요합니다.' });
  }

  jwt.verify(token, getJwtSecret(), (err, user) => {
    if (err) {
      return res.status(403).json({ message: '유효하지 않은 토큰입니다.' });
    }
    req.user = user;
    next();
  });
};

// GET: /api/users/me - 현재 로그인한 사용자 정보
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        nickname: true,
        avatar: true,
        role: true,
        coinBalance: true,
        adultVerified: true,
        adultVerifiedAt: true,
        birthYear: true,
        provider: true,
        needsProfileSetup: true,
        createdAt: true,
        _count: {
          select: {
            comics: true,
            likes: true,
            comments: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }

    // coins 필드로 매핑 (Header 컴포넌트가 기대하는 형식)
    const response = {
      ...user,
      coins: user.coinBalance || 0
    };

    res.json(response);

  } catch (error) {
    console.error('사용자 정보 조회 오류:', error);
    res.status(500).json({ message: '사용자 정보 조회 중 오류가 발생했습니다.' });
  }
});

// GET: 사용자 프로필 조회
router.get('/profile', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        avatar: true,
        role: true,
        createdAt: true,
        _count: {
          select: {
            comics: true,
            likes: true,
            comments: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }

    res.json(user);

  } catch (error) {
    console.error('프로필 조회 오류:', error);
    res.status(500).json({ message: '프로필 조회 중 오류가 발생했습니다.' });
  }
});

// PUT: 프로필 수정
router.put('/profile', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { username, avatar } = req.body;

    // 사용자명 중복 확인
    if (username) {
      const existingUser = await prisma.user.findFirst({
        where: {
          username,
          NOT: { id: userId }
        }
      });

      if (existingUser) {
        return res.status(409).json({ message: '이미 사용 중인 사용자명입니다.' });
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        username,
        avatar,
        updatedAt: new Date()
      },
      select: {
        id: true,
        email: true,
        username: true,
        avatar: true,
        role: true
      }
    });

    res.json({
      message: '프로필이 수정되었습니다.',
      user: updatedUser
    });

  } catch (error) {
    console.error('프로필 수정 오류:', error);
    res.status(500).json({ message: '프로필 수정 중 오류가 발생했습니다.' });
  }
});

// GET: 좋아요한 웹툰 목록
router.get('/likes', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    const totalCount = await prisma.like.count({
      where: { userId }
    });

    const likes = await prisma.like.findMany({
      where: { userId },
      include: {
        comic: {
          select: {
            id: true,
            title: true,
            thumbnail: true,
            genre: true,
            status: true,
            authorName: true,
            author: {
              select: {
                id: true,
                username: true
              }
            },
            _count: {
              select: {
                episodes: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: (pageNum - 1) * limitNum,
      take: limitNum
    });

    res.json({
      comics: likes.map(like => like.comic),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitNum)
      }
    });

  } catch (error) {
    console.error('좋아요 목록 조회 오류:', error);
    res.status(500).json({ message: '좋아요 목록 조회 중 오류가 발생했습니다.' });
  }
});

// POST: 웹툰 좋아요
router.post('/likes/:comicId', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { comicId } = req.params;

    // 이미 좋아요했는지 확인
    const existingLike = await prisma.like.findUnique({
      where: {
        userId_comicId: {
          userId,
          comicId
        }
      }
    });

    if (existingLike) {
      // 좋아요 취소
      await prisma.$transaction([
        prisma.like.delete({
          where: {
            userId_comicId: {
              userId,
              comicId
            }
          }
        }),
        prisma.comic.update({
          where: { id: comicId },
          data: { likeCount: { decrement: 1 } }
        })
      ]);

      res.json({ message: '좋아요가 취소되었습니다.', liked: false });
    } else {
      // 좋아요 추가
      await prisma.$transaction([
        prisma.like.create({
          data: {
            userId,
            comicId
          }
        }),
        prisma.comic.update({
          where: { id: comicId },
          data: { likeCount: { increment: 1 } }
        })
      ]);

      res.json({ message: '좋아요가 추가되었습니다.', liked: true });
    }

  } catch (error) {
    console.error('좋아요 처리 오류:', error);
    res.status(500).json({ message: '좋아요 처리 중 오류가 발생했습니다.' });
  }
});

// GET: 최근 본 웹툰 목록 (진행률 포함)
router.get('/history', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    // 최근 본 웹툰 목록 가져오기
    const recentComics = await prisma.comic.findMany({
      where: {
        isPublished: true, // soft-hide: 공개 목록(최근 본)에는 노출작만
        views: {
          some: {
            userId: userId
          }
        }
      },
      include: {
        _count: {
          select: {
            episodes: true
          }
        },
        views: {
          where: {
            userId: userId
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 1
        }
      },
      orderBy: {
        views: {
          _count: 'desc'
        }
      },
      take: limitNum,
      skip: (pageNum - 1) * limitNum
    });

    // 각 웹툰에 대한 진행률 계산
    const comicsWithProgress = await Promise.all(
      recentComics.map(async (comic) => {
        // 본 에피소드 수 계산 (중복 제거)
        const viewedEpisodes = await prisma.view.findMany({
          where: {
            userId: userId,
            comicId: comic.id,
            episodeId: {
              not: null
            }
          },
          distinct: ['episodeId'],
          select: {
            episodeId: true
          }
        });

        const totalEpisodes = comic._count.episodes;
        const viewedCount = viewedEpisodes.length;
        const progress = totalEpisodes > 0 ? Math.round((viewedCount / totalEpisodes) * 100) : 0;

        return {
          id: comic.id,
          title: comic.title,
          thumbnail: comic.thumbnail,
          genre: comic.genre,
          status: comic.status,
          rating: comic.rating, // 성인/일반 구분
          authorName: comic.authorName,
          authorId: comic.authorId,
          totalEpisodes: totalEpisodes,
          viewedEpisodes: viewedCount,
          progress: progress,
          lastViewedAt: comic.views[0]?.createdAt
        };
      })
    );

    const totalCount = await prisma.comic.count({
      where: {
        isPublished: true, // soft-hide: 최근 본 목록 카운트 일치
        views: {
          some: {
            userId: userId
          }
        }
      }
    });

    res.json({
      comics: comicsWithProgress,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitNum)
      }
    });

  } catch (error) {
    console.error('시청 기록 조회 오류:', error);
    res.status(500).json({ message: '시청 기록 조회 중 오류가 발생했습니다.' });
  }
});

// POST: 에피소드 읽음 처리
router.post('/episodes/:episodeId/read', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { episodeId } = req.params;
    
    // 에피소드 정보 확인
    const episode = await prisma.episode.findUnique({
      where: { id: episodeId },
      select: {
        id: true,
        comicId: true,
        episodeNumber: true,
        isFree: true
      }
    });
    
    if (!episode) {
      return res.status(404).json({ message: '에피소드를 찾을 수 없습니다.' });
    }
    
    // 무료 에피소드인 경우 구매 기록 생성 (읽음 표시용)
    if (episode.isFree !== false) {
      // 이미 구매(읽음) 기록이 있는지 확인
      const existingPurchase = await prisma.purchase.findUnique({
        where: {
          userId_episodeId: {
            userId,
            episodeId
          }
        }
      });
      
      if (!existingPurchase) {
        // 무료 에피소드는 코인 0으로 구매 기록 생성
        await prisma.purchase.create({
          data: {
            userId,
            episodeId,
            coinPrice: 0
          }
        });
      }
    }
    
    res.json({ success: true, message: '읽음 처리 완료' });
  } catch (error) {
    console.error('읽음 처리 오류:', error);
    res.status(500).json({ message: '읽음 처리 중 오류가 발생했습니다.' });
  }
});

// GET: 특정 웹툰의 읽은 에피소드 목록
router.get('/comics/:comicId/read-episodes', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { comicId } = req.params;
    
    // 구매한 에피소드 = 읽은 에피소드
    const purchases = await prisma.purchase.findMany({
      where: { 
        userId,
        episode: {
          comicId: comicId
        }
      },
      select: {
        episodeId: true,
        episode: {
          select: {
            episodeNumber: true
          }
        }
      }
    });
    
    const readEpisodes = purchases.map(p => p.episode.episodeNumber);
    const lastReadEpisode = readEpisodes.length > 0 ? Math.max(...readEpisodes) : 0;
    
    res.json({
      readEpisodes,
      lastReadEpisode
    });
  } catch (error) {
    console.error('읽은 에피소드 조회 오류:', error);
    res.status(500).json({ message: '읽은 에피소드 조회 중 오류가 발생했습니다.' });
  }
});

// 내 서재 공통: 작품 카드 정보 + 마지막 업데이트(최신 회차 등록 시각)
const LIBRARY_COMIC_SELECT = {
  id: true,
  title: true,
  authorName: true,
  thumbnail: true,
  genre: true,
  rating: true,
  status: true,
  contentType: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { episodes: true } },
};

async function latestEpisodeDates(comicIds) {
  if (comicIds.length === 0) return new Map();
  const rows = await prisma.episode.groupBy({
    by: ['comicId'],
    where: { comicId: { in: comicIds }, createdAt: { lte: new Date() } },
    _max: { createdAt: true },
  });
  return new Map(rows.map((row) => [row.comicId, row._max.createdAt]));
}

// 내 서재 숨김 목록 { comicId → hiddenAt }
async function hiddenMap(userId, section) {
  const rows = await prisma.libraryHide.findMany({ where: { userId, section }, select: { comicId: true, hiddenAt: true } });
  return new Map(rows.map((row) => [row.comicId, row.hiddenAt]));
}

// POST: /api/users/library/remove { section: viewed|liked|purchased, comicIds: [] }
// 열람·구매: 내 서재 목록에서만 뺀다(구매·소장·대여 내역과 열람 권한은 그대로). 찜: 찜 해제 = 작품 알림도 해제.
router.post('/library/remove', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const section = String(req.body?.section || '');
  const comicIds = [...new Set((Array.isArray(req.body?.comicIds) ? req.body.comicIds : []).map(String))].slice(0, 500);
  if (!['viewed', 'liked', 'purchased'].includes(section) || !comicIds.length) return res.status(400).json({ message: '삭제할 작품을 선택하세요.' });
  if (section === 'liked') {
    const result = await prisma.like.deleteMany({ where: { userId, comicId: { in: comicIds } } });
    return res.json({ success: true, removed: result.count });
  }
  const now = new Date();
  for (const comicId of comicIds) {
    await prisma.libraryHide.upsert({
      where: { userId_comicId_section: { userId, comicId, section } },
      create: { userId, comicId, section, hiddenAt: now },
      update: { hiddenAt: now },
    });
  }
  res.json({ success: true, removed: comicIds.length });
});

// GET: /api/users/library/reading - 열람한 작품 (열람 기록 전체, 작품별 1개)
router.get('/library/reading', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const views = await prisma.view.findMany({
      where: { userId, episodeId: { not: null } },
      select: {
        comicId: true,
        episodeId: true,
        createdAt: true,
        episode: { select: { episodeNumber: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // 작품별: 마지막 열람 시각, 가장 뒤 회차, 본 회차 수
    const comicMap = new Map();
    for (const view of views) {
      if (!view.episode) continue;
      let entry = comicMap.get(view.comicId);
      if (!entry) {
        entry = {
          comicId: view.comicId,
          lastReadEpisodeId: view.episodeId,
          lastReadEpisodeNumber: view.episode.episodeNumber,
          lastReadAt: view.createdAt,
          episodes: new Set(),
        };
        comicMap.set(view.comicId, entry);
      }
      // views 는 최신순: 처음 만난 기록 = 마지막으로 본 회차 (이어보기 기준)
      entry.episodes.add(view.episodeId);
    }

    // 내 서재에서 지운 작품: 지운 뒤 다시 본 기록이 없으면 빼기
    const viewedHides = await hiddenMap(userId, 'viewed');
    for (const [comicId, entry] of comicMap) if (viewedHides.has(comicId) && entry.lastReadAt <= viewedHides.get(comicId)) comicMap.delete(comicId);

    const comicIds = Array.from(comicMap.keys());
    const [comics, latest, episodeRows] = await Promise.all([
      prisma.comic.findMany({ where: { id: { in: comicIds } }, select: LIBRARY_COMIC_SELECT }),
      latestEpisodeDates(comicIds),
      prisma.episode.findMany({ where: { comicId: { in: comicIds }, createdAt: { lte: new Date() } }, select: { id: true, comicId: true, episodeNumber: true }, orderBy: { episodeNumber: 'asc' } }),
    ]);
    const comicById = new Map(comics.map((comic) => [comic.id, comic]));
    // 마지막으로 본 회차의 다음 회차 (끝까지 본 경우 [다음 화 이어보기])
    const episodesByComic = new Map();
    for (const row of episodeRows) {
      if (!episodesByComic.has(row.comicId)) episodesByComic.set(row.comicId, []);
      episodesByComic.get(row.comicId).push(row);
    }
    const nextOf = (comicId, number) => (episodesByComic.get(comicId) || []).find((row) => row.episodeNumber > number) || null;

    const webtoons = Array.from(comicMap.values())
      .filter((entry) => comicById.has(entry.comicId))
      .map((entry) => {
        const comic = comicById.get(entry.comicId);
        const totalEpisodes = comic._count.episodes;
        const viewedEpisodes = entry.episodes.size;
        return {
          id: `read_${entry.comicId}`,
          comicId: entry.comicId,
          comic,
          lastReadEpisodeId: entry.lastReadEpisodeId,
          lastReadEpisodeNumber: entry.lastReadEpisodeNumber,
          nextEpisodeId: nextOf(entry.comicId, entry.lastReadEpisodeNumber)?.id || null,
          nextEpisodeNumber: nextOf(entry.comicId, entry.lastReadEpisodeNumber)?.episodeNumber ?? null,
          lastReadAt: entry.lastReadAt,
          lastUpdatedAt: latest.get(entry.comicId) || comic.updatedAt,
          totalEpisodes,
          viewedEpisodes,
          progress: totalEpisodes > 0 ? Math.min(100, Math.round((viewedEpisodes / totalEpisodes) * 100)) : 0,
        };
      })
      .sort((a, b) => new Date(b.lastReadAt).getTime() - new Date(a.lastReadAt).getTime());

    res.json({ webtoons });
  } catch (error) {
    console.error('열람한 작품 목록 조회 오류:', error);
    res.status(500).json({ message: '열람한 작품 목록 조회 중 오류가 발생했습니다.' });
  }
});

// GET: /api/users/library/liked - 찜한 작품 (전체)
router.get('/library/liked', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const likedComics = await prisma.like.findMany({
      where: { userId },
      select: { id: true, comicId: true, createdAt: true, comic: { select: LIBRARY_COMIC_SELECT } },
      orderBy: { createdAt: 'desc' },
    });
    const latest = await latestEpisodeDates(likedComics.map((like) => like.comicId));

    const webtoons = likedComics
      .filter((like) => like.comic)
      .map((like) => ({
        id: like.id,
        comicId: like.comicId,
        comic: like.comic,
        totalEpisodes: like.comic._count.episodes,
        lastUpdatedAt: latest.get(like.comicId) || like.comic.updatedAt,
        createdAt: like.createdAt,
      }));

    res.json({ webtoons });
  } catch (error) {
    console.error('좋아요한 웹툰 목록 조회 오류:', error);
    res.status(500).json({ message: '좋아요한 웹툰 목록 조회 중 오류가 발생했습니다.' });
  }
});

// GET: /api/users/library/purchased - 구매 작품 (소장한 회차가 있는 작품, 대여만 한 작품 제외)
router.get('/library/purchased', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const purchases = await prisma.purchase.findMany({
      where: { userId, type: 'OWN' },
      select: {
        episodeId: true,
        createdAt: true,
        episode: { select: { episodeNumber: true, comicId: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const comicMap = new Map();
    for (const purchase of purchases) {
      if (!purchase.episode) continue;
      const comicId = purchase.episode.comicId;
      const entry = comicMap.get(comicId);
      if (!entry) {
        comicMap.set(comicId, {
          comicId,
          ownedEpisodes: 1,
          lastPurchasedAt: purchase.createdAt,
          lastOwnedEpisodeId: purchase.episodeId,
          lastOwnedEpisodeNumber: purchase.episode.episodeNumber,
        });
      } else {
        entry.ownedEpisodes += 1;
        if (purchase.episode.episodeNumber > entry.lastOwnedEpisodeNumber) {
          entry.lastOwnedEpisodeNumber = purchase.episode.episodeNumber;
          entry.lastOwnedEpisodeId = purchase.episodeId;
        }
      }
    }

    // 내 서재에서 지운 작품: 지운 뒤 새로 산 회차가 없으면 빼기 (소장 권한은 그대로)
    const purchasedHides = await hiddenMap(userId, 'purchased');
    for (const [comicId, entry] of comicMap) if (purchasedHides.has(comicId) && entry.lastPurchasedAt <= purchasedHides.get(comicId)) comicMap.delete(comicId);

    const comicIds = Array.from(comicMap.keys());
    const [comics, latest] = await Promise.all([
      prisma.comic.findMany({ where: { id: { in: comicIds } }, select: LIBRARY_COMIC_SELECT }),
      latestEpisodeDates(comicIds),
    ]);
    const comicById = new Map(comics.map((comic) => [comic.id, comic]));

    const webtoons = Array.from(comicMap.values())
      .filter((entry) => comicById.has(entry.comicId))
      .map((entry) => {
        const comic = comicById.get(entry.comicId);
        return {
          ...entry,
          comic,
          totalEpisodes: comic._count.episodes,
          lastUpdatedAt: latest.get(entry.comicId) || comic.updatedAt,
        };
      });

    res.json({ webtoons });
  } catch (error) {
    console.error('구매 작품 목록 조회 오류:', error);
    res.status(500).json({ message: '구매 작품 목록 조회 중 오류가 발생했습니다.' });
  }
});

// GET: /api/users/webtoon-progress - 독자별 웹툰 진행도 조회 (채팅용)
router.get('/webtoon-progress', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    console.log(`\n🔍 [/webtoon-progress] 요청 받음 - userId: ${userId}`);

    // 사용자가 조회한 모든 웹툰의 에피소드 가져오기
    const viewedEpisodes = await prisma.view.findMany({
      where: {
        userId: userId
      },
      select: {
        comicId: true,
        episodeId: true,
        episode: {
          select: {
            episodeNumber: true
          }
        }
      }
    });

    console.log(`📊 [/webtoon-progress] 조회 기록: ${viewedEpisodes.length}개`);

    // 웹툰별로 그룹화하고 최대 화수 계산
    const progressMap = new Map();

    for (const view of viewedEpisodes) {
      const comicId = view.comicId;
      const episodeNumber = view.episode?.episodeNumber || 0;

      if (!progressMap.has(comicId)) {
        progressMap.set(comicId, {
          comicId: comicId,
          viewedEpisodes: [],
          maxEpisodeViewed: 0
        });
      }

      const progress = progressMap.get(comicId);
      progress.viewedEpisodes.push(episodeNumber);
      progress.maxEpisodeViewed = Math.max(progress.maxEpisodeViewed, episodeNumber);
    }

    // 각 웹툰의 총 에피소드 수 조회
    const comicIds = Array.from(progressMap.keys()).filter(id => id != null && id !== '');

    // comicIds가 비어있으면 빈 배열 반환
    if (comicIds.length === 0) {
      return res.json({
        success: true,
        data: []
      });
    }

    const comics = await prisma.comic.findMany({
      where: {
        id: {
          in: comicIds
        }
      },
      select: {
        id: true,
        title: true,
        _count: {
          select: {
            episodes: true
          }
        }
      }
    });

    // 최종 결과 생성
    const result = comics.map(comic => {
      const progress = progressMap.get(comic.id);
      // progress가 없는 경우 기본값 사용
      if (!progress) {
        return {
          comicId: comic.id,
          title: comic.title,
          totalEpisodes: comic._count.episodes,
          viewedEpisodesCount: 0,
          maxEpisodeViewed: 0,
          progressPercentage: 0
        };
      }
      return {
        comicId: comic.id,
        title: comic.title,
        totalEpisodes: comic._count.episodes,
        viewedEpisodesCount: progress.viewedEpisodes.length,
        maxEpisodeViewed: progress.maxEpisodeViewed,
        progressPercentage: comic._count.episodes > 0
          ? Math.round((progress.viewedEpisodes.length / comic._count.episodes) * 100)
          : 0
      };
    });

    console.log(`✅ [/webtoon-progress] 응답: ${result.length}개 웹툰`);
    if (result.length > 0) {
      console.log(`   샘플:`, result.slice(0, 3).map(r => `${r.title}: ${r.maxEpisodeViewed}화`));
    }

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('웹툰 진행도 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '웹툰 진행도 조회 중 오류가 발생했습니다.'
    });
  }
});

// GET: /api/users/webtoon-progress/:comicId - 특정 웹툰의 진행도 조회
router.get('/webtoon-progress/:comicId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { comicId } = req.params;

    // 해당 웹툰의 총 에피소드 수
    const comic = await prisma.comic.findUnique({
      where: { id: comicId },
      select: {
        id: true,
        title: true,
        _count: {
          select: {
            episodes: true
          }
        }
      }
    });

    if (!comic) {
      return res.status(404).json({
        success: false,
        message: '웹툰을 찾을 수 없습니다.'
      });
    }

    // 사용자가 본 에피소드 목록
    const viewedEpisodes = await prisma.view.findMany({
      where: {
        userId: userId,
        comicId: comicId
      },
      select: {
        episodeId: true,
        episode: {
          select: {
            episodeNumber: true
          }
        }
      },
      orderBy: {
        episode: {
          episodeNumber: 'asc'
        }
      }
    });

    const viewedEpisodeNumbers = viewedEpisodes.map(v => v.episode?.episodeNumber || 0);
    const maxEpisodeViewed = viewedEpisodeNumbers.length > 0 ? Math.max(...viewedEpisodeNumbers) : 0;

    res.json({
      success: true,
      data: {
        comicId: comic.id,
        title: comic.title,
        totalEpisodes: comic._count.episodes,
        viewedEpisodesCount: viewedEpisodes.length,
        viewedEpisodeNumbers: viewedEpisodeNumbers,
        maxEpisodeViewed: maxEpisodeViewed,
        progressPercentage: comic._count.episodes > 0
          ? Math.round((viewedEpisodes.length / comic._count.episodes) * 100)
          : 0
      }
    });

  } catch (error) {
    console.error('웹툰 진행도 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '웹툰 진행도 조회 중 오류가 발생했습니다.'
    });
  }
});

module.exports = router;