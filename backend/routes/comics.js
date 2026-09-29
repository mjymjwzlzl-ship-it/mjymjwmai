const { generalComicWhere, guardComicParam, requireVerifiedAdultMode } = require('../services/adult-access');
const express = require('express');
const { prisma } = require('../lib/prisma');
const { optionalAuth } = require('../middleware/auth');
const { translateComics, translateComic } = require('../utils/translations');

const router = express.Router();
router.use(optionalAuth);
router.param('id', guardComicParam);

// GET: 웹툰 목록 조회 (공개)
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      genre = '',
      status = '',
      official = '',
      sort = 'latest',
      language = 'ko',  // UI translation language
      locale = 'ko'     // Database locale filter
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    // 필터 조건 구성
    const where = {};

    // soft-hide: 공개 목록에는 isPublished=true만 노출
    where.isPublished = true;

    // locale 필터링 추가
    where.locale = locale;

    // 일반 웹툰만 조회 (rating이 '19'가 아닌 것만)
    Object.assign(where, generalComicWhere());

    if (genre) {
      where.genre = { has: genre };
    }

    if (status) {
      where.status = status;
    }

    if (official === 'true') {
      where.isOfficial = true;
    } else if (official === 'false') {
      where.isOfficial = false;
    }

    // 정렬 조건
    let orderBy = {};
    switch (sort) {
      case 'popular':
        orderBy = { viewCount: 'desc' };
        break;
      case 'likes':
        orderBy = { likeCount: 'desc' };
        break;
      default:
        orderBy = { createdAt: 'desc' };
    }

    // 전체 개수 조회
    const totalCount = await prisma.comic.count({ where });

    // 웹툰 목록 조회
    const comics = await prisma.comic.findMany({
      where,
      select: {
        id: true,
        title: true,
        description: true,
        thumbnail: true,
        genre: true,
        isOfficial: true,
        status: true,
        rating: true,
        authorName: true,
        viewCount: true,
        likeCount: true,
        createdAt: true,
        author: {
          select: {
            id: true,
            username: true
          }
        },
        episodes: {
          select: {
            rating: true
          }
        },
        _count: {
          select: {
            episodes: true
          }
        }
      },
      orderBy,
      skip: (pageNum - 1) * limitNum,
      take: limitNum
    });
    
    // 썸네일 URL을 WebP로 변환 및 평균 평점 계산
    const comicsWithWebP = comics.map(comic => {
      // 에피소드들의 평균 평점 계산
      const avgRating = comic.episodes.length > 0
        ? comic.episodes.reduce((sum, ep) => sum + ep.rating, 0) / comic.episodes.length
        : 0;

      // episodes 필드를 제거하고 평균 평점만 반환
      const { episodes, ...comicData } = comic;

      return {
        ...comicData,
        thumbnail: comic.thumbnail ? comic.thumbnail.replace(/\.(jpg|jpeg|png)$/i, '.webp') : null,
        averageRating: parseFloat(avgRating.toFixed(1))
      };
    });

    // Apply translations if language is not Korean
    const translatedComics = translateComics(comicsWithWebP, language);

    res.json({
      comics: translatedComics,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitNum)
      }
    });

  } catch (error) {
    console.error('웹툰 목록 조회 오류:', error);
    res.status(500).json({ message: '웹툰 목록 조회 중 오류가 발생했습니다.' });
  }
});

// GET: 성인 웹툰 목록 조회
router.get('/adult', requireVerifiedAdultMode, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      genre = '',
      status = '',
      sort = 'latest',
      language = 'ko',  // UI translation language
      locale = 'ko'     // Database locale filter
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    // 필터 조건 구성 - rating='19'인 모든 웹툰 조회
    const where = {
      OR: [
        { rating: '19' },
        { rating: 'ADULT' }
      ],
      locale: locale,
      // soft-hide: 공개 목록에는 isPublished=true만 노출
      isPublished: true
    };

    if (genre) {
      where.genre = { has: genre };
    }

    if (status) {
      where.status = status;
    }

    // 정렬 조건
    let orderBy = {};
    switch (sort) {
      case 'popular':
        orderBy = { viewCount: 'desc' };
        break;
      case 'likes':
        orderBy = { likeCount: 'desc' };
        break;
      default:
        orderBy = { createdAt: 'desc' };
    }

    // 전체 개수 조회
    const totalCount = await prisma.comic.count({ where });

    // 웹툰 목록 조회
    const comics = await prisma.comic.findMany({
      where,
      select: {
        id: true,
        title: true,
        description: true,
        thumbnail: true,
        genre: true,
        isOfficial: true,
        rating: true,
        status: true,
        authorName: true,
        viewCount: true,
        likeCount: true,
        createdAt: true,
        author: {
          select: {
            id: true,
            username: true
          }
        },
        episodes: {
          select: {
            rating: true
          }
        },
        _count: {
          select: {
            episodes: true
          }
        }
      },
      orderBy,
      skip: (pageNum - 1) * limitNum,
      take: limitNum
    });
    
    // 썸네일 URL을 WebP로 변환 및 평균 평점 계산
    const comicsWithWebP = comics.map(comic => {
      // 에피소드들의 평균 평점 계산
      const avgRating = comic.episodes.length > 0
        ? comic.episodes.reduce((sum, ep) => sum + ep.rating, 0) / comic.episodes.length
        : 0;

      // episodes 필드를 제거하고 평균 평점만 반환
      const { episodes, ...comicData } = comic;

      return {
        ...comicData,
        thumbnail: comic.thumbnail ? comic.thumbnail.replace(/\.(jpg|jpeg|png)$/i, '.webp') : null,
        averageRating: parseFloat(avgRating.toFixed(1))
      };
    });

    // Apply translations if language is not Korean
    const translatedComics = translateComics(comicsWithWebP, language);

    res.json({
      comics: translatedComics,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitNum)
      }
    });

  } catch (error) {
    console.error('성인 웹툰 목록 조회 오류:', error);
    res.status(500).json({ message: '성인 웹툰 목록 조회 중 오류가 발생했습니다.' });
  }
});

// GET: 특정 웹툰의 에피소드 목록 (/:id보다 먼저 정의해야 함!)
router.get('/:id/episodes', async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    const totalCount = await prisma.episode.count({
      where: { comicId: id }
    });

    const episodes = await prisma.episode.findMany({
      where: { comicId: id },
      select: {
        id: true,
        title: true,
        episodeNumber: true,
        thumbnail: true,
        viewCount: true,
        createdAt: true,
        _count: {
          select: {
            comments: true
          }
        }
      },
      orderBy: { episodeNumber: 'desc' },
      skip: (pageNum - 1) * limitNum,
      take: limitNum
    });

    res.json({
      episodes,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitNum)
      }
    });

  } catch (error) {
    console.error('에피소드 목록 조회 오류:', error);
    res.status(500).json({ message: '에피소드 목록 조회 중 오류가 발생했습니다.' });
  }
});

// GET: 특정 웹툰 상세 조회
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    // 웹툰 조회
    const comic = await prisma.comic.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            avatar: true
          }
        },
        episodes: {
          select: {
            id: true,
            title: true,
            episodeNumber: true,
            viewCount: true,
            createdAt: true
          },
          orderBy: { episodeNumber: 'desc' }
        },
        _count: {
          select: {
            likes: true,
            comments: true
          }
        }
      }
    });

    if (!comic) {
      return res.status(404).json({ message: '웹툰을 찾을 수 없습니다.' });
    }

    // 사용자가 좋아요를 눌렀는지 확인
    let isLiked = false;
    if (userId) {
      const like = await prisma.like.findUnique({
        where: {
          userId_comicId: {
            userId,
            comicId: id
          }
        }
      });
      isLiked = !!like;
    }

    // 조회수 증가 (비동기로 처리)
    prisma.comic.update({
      where: { id },
      data: { viewCount: { increment: 1 } }
    }).catch(console.error);

    // 조회 기록 저장 (로그인한 경우)
    if (userId) {
      prisma.view.create({
        data: {
          userId,
          comicId: id
        }
      }).catch(console.error);
    }

    res.json({
      ...comic,
      isLiked
    });

  } catch (error) {
    console.error('웹툰 상세 조회 오류:', error);
    res.status(500).json({ message: '웹툰 조회 중 오류가 발생했습니다.' });
  }
});

module.exports = router;