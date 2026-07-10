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

  jwt.verify(token, process.env.JWT_SECRET || 'default-secret-key', (err, user) => {
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

// GET: /api/users/library/reading - 최근 본 웹툰 목록 (Purchase + View 병합)
router.get('/library/reading', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Purchase 기록 조회
    const purchaseHistory = await prisma.purchase.findMany({
      where: {
        userId,
        episode: {
          comic: {
            id: { not: undefined }
          }
        }
      },
      select: {
        episodeId: true,
        episode: {
          select: {
            episodeNumber: true,
            comic: {
              select: {
                id: true,
                title: true,
                authorName: true,
                thumbnail: true,
                genre: true,
                rating: true,
                _count: {
                  select: {
                    episodes: true
                  }
                }
              }
            }
          }
        },
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // View 기록 조회
    const viewHistory = await prisma.view.findMany({
      where: {
        userId,
        episode: {
          comic: {
            id: { not: undefined }
          }
        }
      },
      select: {
        episodeId: true,
        episode: {
          select: {
            episodeNumber: true,
            comic: {
              select: {
                id: true,
                title: true,
                authorName: true,
                thumbnail: true,
                genre: true,
                rating: true,
                _count: {
                  select: {
                    episodes: true
                  }
                }
              }
            }
          }
        },
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`[Library Reading] ${userId} - Purchase: ${purchaseHistory.length}, View: ${viewHistory.length}`);

    // Purchase와 View 병합하여 웹툰별로 그룹화
    const comicMap = new Map();

    // Purchase 처리
    purchaseHistory.forEach(record => {
      if (!record.episode?.comic) return;

      const comicId = record.episode.comic.id;
      if (!comicMap.has(comicId)) {
        comicMap.set(comicId, {
          id: `read_${comicId}_${Date.now()}`,
          comicId: comicId,
          comic: record.episode.comic,
          lastReadEpisodeId: record.episodeId,
          lastReadEpisodeNumber: record.episode.episodeNumber,
          totalEpisodes: record.episode.comic._count.episodes,
          lastReadAt: record.createdAt
        });
      } else {
        const existing = comicMap.get(comicId);
        if (new Date(record.createdAt) > new Date(existing.lastReadAt)) {
          existing.lastReadAt = record.createdAt;
        }
        if (record.episode.episodeNumber > existing.lastReadEpisodeNumber) {
          existing.lastReadEpisodeNumber = record.episode.episodeNumber;
          existing.lastReadEpisodeId = record.episodeId;
        }
      }
    });

    // View 처리
    viewHistory.forEach(record => {
      if (!record.episode?.comic) return;

      const comicId = record.episode.comic.id;
      if (!comicMap.has(comicId)) {
        comicMap.set(comicId, {
          id: `read_${comicId}_${Date.now()}`,
          comicId: comicId,
          comic: record.episode.comic,
          lastReadEpisodeId: record.episodeId,
          lastReadEpisodeNumber: record.episode.episodeNumber,
          totalEpisodes: record.episode.comic._count.episodes,
          lastReadAt: record.createdAt
        });
      } else {
        const existing = comicMap.get(comicId);
        if (new Date(record.createdAt) > new Date(existing.lastReadAt)) {
          existing.lastReadAt = record.createdAt;
        }
        if (record.episode.episodeNumber > existing.lastReadEpisodeNumber) {
          existing.lastReadEpisodeNumber = record.episode.episodeNumber;
          existing.lastReadEpisodeId = record.episodeId;
        }
      }
    });

    // 각 웹툰의 진행률 계산 (최적화: 한 번에 모든 view 가져오기)
    const comicIds = Array.from(comicMap.keys());

    // 모든 웹툰의 view를 한 번에 가져오기
    const allViews = await prisma.view.findMany({
      where: {
        userId: userId,
        comicId: { in: comicIds },
        episodeId: { not: null }
      },
      select: {
        comicId: true,
        episodeId: true
      },
      distinct: ['comicId', 'episodeId']
    });

    // comicId별로 본 에피소드 수 계산
    const viewCountMap = new Map();
    allViews.forEach(view => {
      const count = viewCountMap.get(view.comicId) || 0;
      viewCountMap.set(view.comicId, count + 1);
    });

    // 각 웹툰에 진행률 추가
    const webtoonsWithProgress = Array.from(comicMap.values()).map(webtoon => {
      const viewedCount = viewCountMap.get(webtoon.comicId) || 0;
      const progress = webtoon.totalEpisodes > 0 ? Math.round((viewedCount / webtoon.totalEpisodes) * 100) : 0;

      return {
        ...webtoon,
        viewedEpisodes: viewedCount,
        progress: progress
      };
    });

    const webtoons = webtoonsWithProgress
      .sort((a, b) => new Date(b.lastReadAt).getTime() - new Date(a.lastReadAt).getTime())
      .slice(0, 50); // 최대 50개까지만

    console.log(`[Library Reading] ${userId} - Total webtoons: ${webtoons.length}`);

    res.json({ webtoons });
  } catch (error) {
    console.error('읽은 웹툰 목록 조회 오류:', error);
    res.status(500).json({ message: '읽은 웹툰 목록 조회 중 오류가 발생했습니다.' });
  }
});

// GET: /api/users/library/liked - 좋아요한 웹툰 목록
router.get('/library/liked', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const likedComics = await prisma.like.findMany({
      where: { userId },
      select: {
        id: true,
        comicId: true,
        comic: {
          select: {
            id: true,
            title: true,
            authorName: true,
            thumbnail: true,
            genre: true,
            rating: true
          }
        },
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 50 // 최대 50개까지
    });

    const webtoons = likedComics.map(like => ({
      id: like.id,
      comicId: like.comicId,
      comic: like.comic,
      createdAt: like.createdAt
    }));

    res.json({ webtoons });
  } catch (error) {
    console.error('좋아요한 웹툰 목록 조회 오류:', error);
    res.status(500).json({ message: '좋아요한 웹툰 목록 조회 중 오류가 발생했습니다.' });
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