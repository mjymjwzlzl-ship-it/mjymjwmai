const { guardEpisode } = require('../services/legacy-episode-access');
const { optionalAuth } = require('../middleware/auth');
const { guardComicParam, requireVerifiedAdultMode, generalComicWhere } = require('../services/adult-access');
const { getJwtSecret } = require('../lib/jwt-secret');
const express = require('express');
const { prisma } = require('../lib/prisma');
const fs = require('fs').promises;
const path = require('path');
const jwt = require('jsonwebtoken');

const router = express.Router();
router.use(optionalAuth);
router.param('id', guardComicParam);

// 카테고리 설정 파일 경로
const CATEGORY_SETTINGS_PATH = path.join(__dirname, '..', 'data', 'category-settings.json');

// 카테고리 설정 불러오기
async function loadCategorySettings() {
  try {
    const data = await fs.readFile(CATEGORY_SETTINGS_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.log('카테고리 설정 파일이 없습니다. 기본값 사용');
    return {
      banner: [],
      realtime: [],
      daily: [],
      week: [],
      complete: [],
      latest: [],
      new: [],
      finished: []
    };
  }
}

// GET /api/frontend/home - 홈페이지 데이터
router.get('/home', async (req, res) => {
  try {
    // 프론트엔드에서 전달한 locale 파라미터 (기본값: 'ko')
    const locale = req.query.locale || 'ko';

    // 카테고리 설정 로드
    const categorySettings = await loadCategorySettings();

    // week가 스케줄 객체인 경우 배열로 평탄화
    if (categorySettings.week && typeof categorySettings.week === 'object' && !Array.isArray(categorySettings.week)) {
      const weekIds = [];
      for (const day of ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']) {
        if (Array.isArray(categorySettings.week[day])) {
          weekIds.push(...categorySettings.week[day]);
        }
      }
      categorySettings.week = [...new Set(weekIds)]; // 중복 제거
    }

    // 배너 데이터 (데이터베이스에서 직접 가져오기 - 일반 웹툰만)
    const banners = await prisma.banner.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
      include: {
        webtoon: {
          select: {
            id: true,
            title: true,
            thumbnail: true,
            genre: true,
            authorName: true,
            rating: true,
            locale: true,
            status: true  // status 필드 추가
          }
        }
      }
    });

    // 일반 웹툰 배너만 필터링 (성인 제외, 숨김 상태 제외)
    const generalBanners = banners.filter(banner =>
      banner.webtoon &&
      banner.webtoon.locale === locale &&
      banner.webtoon.status !== 'HIDDEN' &&  // 숨김 상태 제외
      banner.webtoon.rating !== 'ADULT' &&
      banner.webtoon.rating !== '19' &&
      banner.webtoon.genre !== 'adult'
    );

    // 카테고리별 웹툰 ID로 실제 웹툰 데이터 가져오기
    const getCategoryComics = async (comicIds, excludeAdult = true) => {
      if (!comicIds || comicIds.length === 0) return [];

      const whereClause = {
        id: { in: comicIds },
        locale: locale,  // locale 필터링 추가
        isPublished: true,  // soft-hide: 공개 목록 노출작만
        ...generalComicWhere(),
      status: { not: 'HIDDEN' }  // 숨김 상태 제외
      };

      // 일반 카테고리에서는 성인 웹툰 제외
      if (excludeAdult) {
        whereClause.NOT = {
          OR: [
            { rating: '19' },
            { rating: 'adult' },
            { rating: 'ADULT' },
            { genre: { contains: 'adult' } }
          ]
        };
      }

      const comics = await prisma.comic.findMany({
        where: whereClause,
        include: {
          _count: {
            select: { episodes: true }
          }
        }
      });

      // 원래 순서대로 정렬
      return comicIds.map(id => comics.find(c => c.id === id)).filter(Boolean);
    };

    // 각 카테고리별 웹툰 가져오기
    const [
      dailyComics,
      weekComics,
      completeComics,
      latestComics,
      newComics
    ] = await Promise.all([
      getCategoryComics(categorySettings.daily),
      getCategoryComics(categorySettings.week),
      getCategoryComics(categorySettings.complete),
      getCategoryComics(categorySettings.latest),
      getCategoryComics(categorySettings.new)
    ]);

    // 실시간 탑텐: 조회수 기준 상위 10개 (성인 웹툰 제외)
    const realtimeComics = await prisma.comic.findMany({
      where: {
        locale: locale,
        isPublished: true,  // soft-hide: 공개 목록 노출작만
        status: { not: 'HIDDEN' },  // 숨김 상태 제외
        NOT: {
          OR: [
            { rating: '19' },
            { rating: 'adult' },
            { rating: 'ADULT' },
            { genre: { contains: 'adult' } }
          ]
        }
      },
      include: {
        _count: {
          select: { episodes: true }
        }
      },
      orderBy: { viewCount: 'desc' },
      take: 10
    });

    // 모든 웹툰 가져오기 (폴백용) - 성인 웹툰 제외, locale 필터링 추가
    const allComics = await prisma.comic.findMany({
      where: {
        locale: locale,  // locale 필터링 추가
        isPublished: true,  // soft-hide: 공개 목록 노출작만
        status: { not: 'HIDDEN' },  // 숨김 상태 제외
        NOT: {
          OR: [
            { rating: '19' },
            { rating: 'adult' },
            { rating: 'ADULT' },
            { genre: { contains: 'adult' } }
          ]
        }
      },
      include: {
        _count: {
          select: { episodes: true }
        }
      },
      orderBy: { createdAt: 'desc' }
      // take 제한 제거 - 모든 웹툰 가져오기
    });

    res.json({
      success: true,
      data: {
        banners: generalBanners.map(banner => ({
          id: banner.id,
          title: banner.webtoon?.title || banner.title,  // 웹툰 제목 우선 사용
          subtitle: banner.subtitle,
          description: banner.description,
          imageUrl: banner.imageUrl,
          link: banner.ctaLink,
          webtoonId: banner.webtoon?.id,
          webtoon: banner.webtoon
        })),
        categories: {
          realtime: realtimeComics,
          daily: dailyComics.length > 0 ? dailyComics : allComics.filter(c => c.status === 'ONGOING').slice(0, 10),
          week: weekComics.length > 0 ? weekComics : allComics.slice(0, 10),
          complete: completeComics.length > 0 ? completeComics : allComics.filter(c => c.status === 'COMPLETED'),
          latest: latestComics.length > 0 ? latestComics : allComics.slice(0, 10),
          new: newComics.length > 0 ? newComics : allComics.filter(c => c.status === 'ONGOING').slice(0, 10),
          completed: completeComics.length > 0 ? completeComics : allComics.filter(c => c.status === 'COMPLETED')
        },
        allComics
      }
    });
  } catch (error) {
    console.error('홈페이지 데이터 조회 오류:', error);
    res.status(500).json({ 
      success: false,
      message: '데이터를 불러오는데 실패했습니다.' 
    });
  }
});

// GET /api/frontend/comics/popular - 인기 웹툰 (조회수 기준)
router.get('/comics/popular', async (req, res) => {
  try {
    const { limit = 20, excludeAdult = 'true', locale = 'ko' } = req.query;
    const shouldExcludeAdult = excludeAdult === 'true' || excludeAdult === true;

    const whereClause = {
      locale: locale,
      isPublished: true,
      ...generalComicWhere(),
      status: { not: 'HIDDEN' }
    };

    // 성인 웹툰 제외 옵션
    if (shouldExcludeAdult) {
      whereClause.NOT = {
        OR: [
          { rating: '19' },
          { rating: 'adult' },
          { rating: 'ADULT' },
          { genre: { contains: 'adult' } }
        ]
      };
    }

    const comics = await prisma.comic.findMany({
      where: whereClause,
      include: {
        author: {
          select: {
            id: true,
            username: true
          }
        },
        episodes: {
          select: {
            id: true,
            episodeNumber: true,
            rating: true
          },
          orderBy: { episodeNumber: 'asc' }
        },
        _count: {
          select: {
            episodes: true,
            likes: true,
            comments: true,
            views: true
          }
        }
      },
      orderBy: { viewCount: 'desc' },
      take: parseInt(limit)
    });

    const formattedComics = comics.map(comic => {
      // 에피소드 평균 별점 계산 (10점 → 5점 변환)
      const episodesWithRating = comic.episodes.filter(ep => ep.rating > 0);
      const averageRating = episodesWithRating.length > 0
        ? episodesWithRating.reduce((sum, ep) => sum + ep.rating, 0) / episodesWithRating.length / 2
        : 0;

      const paidStart = comic.paidStartEpisode !== undefined ? comic.paidStartEpisode : 1;
      const totalEps = comic.episodes?.length || 0;
      const freeEpisodes = paidStart === 0 ? totalEps : Math.min(paidStart - 1, totalEps);
      const coinPrice = paidStart === 0 ? 0 : (comic.episodeCoinPrice || 3);

      return {
        id: comic.id,
        title: comic.title,
        author: comic.authorName || comic.author?.username || '작가',
        genre: comic.genre,
        thumbnailUrl: comic.thumbnail ? comic.thumbnail.replace(/\.(jpg|jpeg|png)$/i, '.webp') : "/api/placeholder/300/400",
        viewCount: comic.viewCount || 0,
        commentCount: comic._count?.comments || 0,
        rating: Math.round(averageRating * 10) / 10,
        ageRating: comic.rating,
        totalEpisodes: totalEps,
        updatedAt: comic.updatedAt ? new Date(comic.updatedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        isOfficial: comic.isOfficial || false,
        freeEpisodes: freeEpisodes,
        coinPrice: coinPrice
      };
    });

    res.json({
      comics: formattedComics,
      total: formattedComics.length
    });

  } catch (error) {
    console.error('인기 웹툰 조회 오류:', error);
    res.status(500).json({ message: '인기 웹툰 조회 중 오류가 발생했습니다.' });
  }
});

// GET: 모든 카테고리 목록 조회 (이 라우트를 먼저 정의해야 함)
router.get('/categories/list', (req, res) => {
  const isAdult = req.query.adult === 'true';
  let categories = [
    { name: '로맨스', slug: 'romance' },
    { name: '액션', slug: 'action' },
    { name: '판타지', slug: 'fantasy' },
    { name: '코미디', slug: 'comedy' },
    { name: '드라마', slug: 'drama' },
    { name: '스릴러', slug: 'thriller' },
    { name: '일상', slug: 'slice-of-life' },
    // 필요한 경우 더 많은 일반 카테고리 추가
  ];

  if (isAdult) {
    categories.push({ name: '성인', slug: 'adult' });
  }
  res.json(categories);
});

// GET: 카테고리별 웹툰 조회 (프론트엔드용)
router.get('/categories/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const { limit = 10, locale = 'ko' } = req.query;  // locale 파라미터 추가
    
    // 관리자가 설정한 카테고리 정보 가져오기 (일반 + 성인 모두)
    let categorySettings = { all: [], popular: [], editors: [], new: [], waitfree: [], banner: [], realtime: [], daily: [], week: [], complete: [], latest: [], finished: [] };
    let adultCategorySettings = { all: [], popular: [], editors: [], new: [], waitfree: [], banner: [], realtime: [], daily: [], week: [], complete: [], latest: [], finished: [] };
    try {
      const { getCategorySettings, getAdultCategorySettings } = require('./admin');
      categorySettings = getCategorySettings();
      adultCategorySettings = getAdultCategorySettings();
    } catch (error) {
    }
    
    // 요청된 카테고리가 일반인지 성인인지 구분하여 처리
    let targetCategoryIds = [];
    let targetComicIds = [];
    
    // 일반 카테고리에서만 검색 (성인 웹툰 제외)
    const generalCategoryIds = categorySettings[category] || [];
    
    if (generalCategoryIds.length === 0) {
      // 승인된 일반 웹툰이 없으면 빈 결과 반환
      return res.json({
        comics: [],
        total: 0
      });
    }
    
    targetComicIds = generalCategoryIds;
    
    const allComics = await prisma.comic.findMany({
      where: {
        id: {
          in: targetComicIds
        },
        locale: locale,  // locale 필터링 추가
        isPublished: true,  // soft-hide: 공개 목록 노출작만
        status: { not: 'HIDDEN' },  // 숨김 상태 제외
        // 추가 필터: genre가 'adult'인 웹툰 제외
        NOT: {
          genre: 'adult'
        }
      },
      include: {
        author: {
          select: {
            id: true,
            username: true
          }
        },
        episodes: {
          select: {
            id: true,
            title: true,
            episodeNumber: true,
            isFree: true,
            coinPrice: true
          },
          orderBy: { episodeNumber: 'asc' }
        },
        _count: {
          select: {
            likes: true,
            comments: true,
            views: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // 관리자가 설정한 순서대로 웹툰 정렬
    let filteredComics = [];
    if (targetComicIds.length > 0) {
      filteredComics = targetComicIds
        .map(id => allComics.find(comic => comic.id.toString() === id.toString()))
        .filter(Boolean);
    }
    
    const comics = filteredComics.map(comic => {
      // paidStartEpisode를 기준으로 무료 에피소드 수 계산
      console.log(`[Frontend API] Comic: ${comic.title}, paidStartEpisode: ${comic.paidStartEpisode}, episodeCoinPrice: ${comic.episodeCoinPrice}`);
      const paidStart = comic.paidStartEpisode !== undefined ? comic.paidStartEpisode : 1;
      const totalEps = comic.episodes?.length || 0;
      const freeEpisodes = paidStart === 0 ? totalEps : Math.min(paidStart - 1, totalEps);
      const coinPrice = paidStart === 0 ? 0 : (comic.episodeCoinPrice || 3);
      
      return {
        id: comic.id,
        title: comic.title,
        author: comic.authorName || comic.author?.username || '작가',
        genre: comic.genre,
        thumbnailUrl: comic.thumbnail ? comic.thumbnail.replace(/\.(jpg|jpeg|png)$/i, '.webp') : "/api/placeholder/300/400",
        viewCount: comic.viewCount || 0,
        commentCount: comic._count?.comments || 0,
        rating: 0, // TODO: 에피소드 평균 별점으로 계산 필요 (comic.rating은 연령 등급)
        totalEpisodes: totalEps,
        updatedAt: comic.updatedAt ? new Date(comic.updatedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        isOfficial: comic.isOfficial || false,
        recentComments: [], // 임시로 빈 배열
        freeEpisodes: freeEpisodes,
        coinPrice: coinPrice
      };
    });

    res.set('Content-Type', 'application/json; charset=utf-8');
    res.json({
      comics: comics.slice(0, parseInt(limit)),
      total: comics.length
    });

  } catch (error) {
    res.status(500).json({ message: '웹툰 조회 중 오류가 발생했습니다.' });
  }
});

// GET: 모든 웹툰 조회 (프론트엔드용)
router.get('/comics', async (req, res) => {
  try {
    const { limit = 50, genre, locale = 'ko' } = req.query;  // locale 파라미터 추가
    
    // 관리자가 승인한 웹툰만 조회 (일반 + 성인)
    let categorySettings = { all: [], popular: [], editors: [], new: [], waitfree: [], banner: [], realtime: [], daily: [], week: [], complete: [], latest: [], finished: [] };
    let adultCategorySettings = { all: [], popular: [], editors: [], new: [], waitfree: [], banner: [], realtime: [], daily: [], week: [], complete: [], latest: [], finished: [] };
    try {
      const { getCategorySettings, getAdultCategorySettings } = require('./admin');
      categorySettings = getCategorySettings();
      adultCategorySettings = getAdultCategorySettings();
    } catch (error) {
    }
    
    // 모든 카테고리에서 승인된 웹툰 ID 수집 (all 배열에 의존하지 않음)
    const generalIds = ['all','popular','editors','new','waitfree','banner','realtime','daily','week','complete','latest','finished'].flatMap(key => {
      const value = categorySettings[key];
      return Array.isArray(value) ? value : value && typeof value === 'object' ? Object.values(value).flat() : [];
    }).filter(value => typeof value === 'string');
    
    const adultIds = [
      ...(adultCategorySettings.all || []),
      ...(adultCategorySettings.popular || []),
      ...(adultCategorySettings.editors || []),
      ...(adultCategorySettings.new || []),
      ...(adultCategorySettings.waitfree || []),
      ...(adultCategorySettings.banner || []),
      ...(adultCategorySettings.realtime || []),
      ...(adultCategorySettings.daily || []),
      ...(adultCategorySettings.week || []),
      ...(adultCategorySettings.complete || []),
      ...(adultCategorySettings.latest || []),
      ...(adultCategorySettings.finished || [])
    ];
    
    // 중복 제거
    const allApprovedIds = [...new Set([...generalIds, ...adultIds])];
    
    if (allApprovedIds.length === 0) {
      // 승인된 웹툰이 없으면 빈 결과 반환
      return res.json({
        comics: [],
        total: 0
      });
    }
    
    const whereClause = {
      ...generalComicWhere(),
      id: {
        in: allApprovedIds
      },
      locale: locale,  // locale 필터링 추가
      isPublished: true,  // soft-hide: 공개 목록 노출작만
      status: { not: 'HIDDEN' }  // 숨김 상태 제외
    };

    // 장르 필터 추가
    if (genre && genre !== 'all') {
      whereClause.genre = genre;
    }
    
    const comics = await prisma.comic.findMany({
      where: whereClause,
      include: {
        author: {
          select: {
            id: true,
            username: true
          }
        },
        episodes: {
          select: {
            id: true,
            title: true,
            episodeNumber: true,
            thumbnail: true,
            createdAt: true,
            viewCount: true,
            isFree: true,
            coinPrice: true
          },
          orderBy: { episodeNumber: 'asc' }
        },
        _count: {
          select: {
            likes: true,
            comments: true,
            views: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit)
    });

    const formattedComics = comics.map(comic => {
      // paidStartEpisode를 기준으로 무료 에피소드 수 계산
      const paidStart = comic.paidStartEpisode !== undefined ? comic.paidStartEpisode : 1;
      const totalEps = comic.episodes?.length || 0;
      const freeEpisodes = paidStart === 0 ? totalEps : Math.min(paidStart - 1, totalEps);
      const coinPrice = paidStart === 0 ? 0 : (comic.episodeCoinPrice || 3);
      
      return {
        id: comic.id,
        title: comic.title,
        author: comic.authorName || comic.author?.username || '작가',
        genre: comic.genre,
        thumbnailUrl: comic.thumbnail ? comic.thumbnail.replace(/\.(jpg|jpeg|png)$/i, '.webp') : "/api/placeholder/300/400",
        viewCount: comic.viewCount || 0,
        commentCount: comic._count?.comments || 0,
        rating: 0, // TODO: 에피소드 평균 별점으로 계산 필요 (comic.rating은 연령 등급) // 평점 (별점)
        ageRating: comic.rating, // 연령 등급 정보 ("19", "all" 등)
        totalEpisodes: totalEps,
        updatedAt: comic.updatedAt ? new Date(comic.updatedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        isOfficial: comic.isOfficial || false,
        recentComments: [],
        freeEpisodes: freeEpisodes,
        coinPrice: coinPrice
      };
    });

    res.json({
      comics: formattedComics,
      total: formattedComics.length
    });

  } catch (error) {
    res.status(500).json({ message: '웹툰 목록 조회 중 오류가 발생했습니다.' });
  }
});

// GET: 특정 웹툰 상세 조회 (에피소드 제외)
router.get('/comics/:id/info', async (req, res) => {
  // 모바일 최적화를 위한 강화된 캐시 헤더 설정
  res.set({
    'Cache-Control': 'public, max-age=3600, stale-while-revalidate=7200', // 1시간 캐싱, 2시간 stale
    'X-Content-Type-Options': 'nosniff',
    'Vary': 'Accept-Encoding'
  });
  
  try {
    const { id } = req.params;
    
    const comic = await prisma.comic.findUnique({
      where: { id: id },
      include: {
        author: {
          select: {
            id: true,
            username: true
          }
        },
        _count: {
          select: {
            likes: true,
            comments: true,
            views: true,
            episodes: true // 에피소드 수만 카운트
          }
        }
      }
    });

    if (!comic) {
      return res.status(404).json({ message: '웹툰을 찾을 수 없습니다.' });
    }

    const formattedComic = {
      id: comic.id,
      title: comic.title,
      author: comic.authorName || comic.author?.username || '작가',
      genre: comic.genre,
      description: comic.description || '',
      thumbnailUrl: comic.thumbnail ? comic.thumbnail.replace(/\.(jpg|jpeg|png)$/i, '.webp') : "/api/placeholder/300/400",
      viewCount: comic.viewCount || 0,
      commentCount: comic._count?.comments || 0,
      rating: 0, // Comic 모델에는 평점 필드가 없음 (rating은 연령등급)
      totalEpisodes: comic._count?.episodes || 0,
      updatedAt: comic.updatedAt ? new Date(comic.updatedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      isOfficial: comic.isOfficial || false,
      paidStartEpisode: comic.paidStartEpisode !== undefined ? comic.paidStartEpisode : 1,
      episodeCoinPrice: comic.episodeCoinPrice !== undefined ? comic.episodeCoinPrice : 3,
      ageRating: comic.rating // 연령 등급
    };

    res.json(formattedComic);

  } catch (error) {
    res.status(500).json({ message: '웹툰 정보 조회 중 오류가 발생했습니다.', error: error.message });
  }
});

// GET: 특정 웹툰의 최신 에피소드 조회 (별도 API) - 모바일 최적화
router.get('/comics/:id/recent-episodes', async (req, res) => {
  // 모바일 최적화를 위한 강화된 캐시 헤더 설정
  res.set({
    'Cache-Control': 'public, max-age=1800, stale-while-revalidate=3600', // 30분 캐싱, 1시간 stale
    'X-Content-Type-Options': 'nosniff',
    'Vary': 'Accept-Encoding'
  });
  
  try {
    const { id } = req.params;
    // 모바일 기기에서는 적은 수의 에피소드만 로드
    const userAgent = req.headers['user-agent'] || '';
    const isMobile = /mobile|android|iphone|ipad|ipod/i.test(userAgent);
    const defaultLimit = isMobile ? 4 : 6;
    const { limit = defaultLimit } = req.query;
    
    const comic = await prisma.comic.findUnique({
      where: { id },
      select: {
        paidStartEpisode: true,
        episodeCoinPrice: true,
        thumbnail: true
      }
    });

    if (!comic) {
      return res.status(404).json({ message: '웹툰을 찾을 수 없습니다.' });
    }

    const episodes = await prisma.episode.findMany({
      where: { comicId: id },
      select: {
        id: true,
        title: true,
        episodeNumber: true,
        thumbnail: true,
        createdAt: true,
        viewCount: true
      },
      orderBy: { episodeNumber: 'desc' },
      take: parseInt(limit)
    });

    const formattedEpisodes = episodes.map(ep => {
      const isFree = comic.paidStartEpisode === 0 || ep.episodeNumber < comic.paidStartEpisode;
      const coinPrice = isFree ? 0 : (comic.episodeCoinPrice || 3);
      
      return {
        id: ep.id,
        title: ep.title,
        episodeNumber: ep.episodeNumber,
        thumbnailUrl: ep.thumbnail ? (ep.thumbnail.startsWith('/') ? ep.thumbnail : `/${ep.thumbnail}`) : null,
        hasEpisodeThumbnail: !!ep.thumbnail,
        comicThumbnailUrl: comic.thumbnail ? (comic.thumbnail.startsWith('/') ? comic.thumbnail : `/${comic.thumbnail}`) : null,
        createdAt: ep.createdAt,
        isFree: isFree,
        coinPrice: coinPrice
      };
    });

    res.json({ episodes: formattedEpisodes.reverse() });

  } catch (error) {
    res.status(500).json({ message: '에피소드 조회 중 오류가 발생했습니다.', error: error.message });
  }
});

// POST: 에피소드 조회수 증가
router.post('/episodes/:episodeId/view', async (req, res) => {
  try {
    const { episodeId } = req.params;
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    let userId = null;
    if (token) {
      try {
        const decoded = jwt.verify(token, getJwtSecret());
        userId = decoded.userId;
      } catch (err) {
        // 토큰이 유효하지 않아도 조회수는 기록
      }
    }

    // 조회 기록 생성
    await prisma.view.create({
      data: {
        episodeId: episodeId,
        userId: userId,
        ipAddress: req.ip
      }
    });

    // 에피소드 조회수 증가
    await prisma.episode.update({
      where: { id: episodeId },
      data: {
        viewCount: {
          increment: 1
        }
      }
    });

    // 웹툰 전체 조회수도 증가
    const episode = await prisma.episode.findUnique({
      where: { id: episodeId },
      select: { comicId: true }
    });

    if (episode) {
      await prisma.comic.update({
        where: { id: episode.comicId },
        data: {
          viewCount: {
            increment: 1
          }
        }
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('조회수 기록 오류:', error);
    res.status(500).json({ message: '조회수 기록 중 오류가 발생했습니다.' });
  }
});

// GET: 특정 웹툰 상세 조회 (기존 API - 하위 호환성 유지)
router.get('/comics/:id', async (req, res) => {
  // 캐시 헤더 설정 (5분 캐싱)
  res.set('Cache-Control', 'public, max-age=300');
  
  try {
    const { id } = req.params;
    
    const comic = await prisma.comic.findUnique({
      where: { id: id },
      include: {
        author: {
          select: {
            id: true,
            username: true
          }
        },
        episodes: {
          select: {
            id: true,
            title: true,
            episodeNumber: true,
            thumbnail: true,
            createdAt: true,
            viewCount: true,
            isFree: true,
            coinPrice: true,
            rating: true // 별점 계산을 위해 필요
          },
          orderBy: { episodeNumber: 'asc' } // 모든 에피소드 가져오기
        },
        _count: {
          select: {
            likes: true,
            comments: true,
            views: true
          }
        }
      }
    });

    if (!comic) {
      return res.status(404).json({ message: '웹툰을 찾을 수 없습니다.' });
    }

    // 에피소드별 썸네일 정보 로깅
    comic.episodes.forEach(ep => {
    });

    // 에피소드들의 평균 별점 계산 (Episode.rating)
    // DB에 10점 만점으로 저장되어 있으므로 2로 나누어 5점 만점으로 변환
    const episodesWithRating = comic.episodes?.filter(ep => ep.rating && ep.rating > 0) || [];
    const averageRating = episodesWithRating.length > 0
      ? episodesWithRating.reduce((sum, ep) => sum + ep.rating, 0) / episodesWithRating.length / 2
      : 0;

    // voice.mp4 URL 결정 (메인 썸네일용)
    let voiceVideoUrl = null;
    const isAdult = comic.rating === '19' || comic.rating === 'ADULT';

    if (isAdult && comic.title) {
      if (comic.title === '가정교사') {
        voiceVideoUrl = `/uploads/webtoons/adult/${comic.title}/1화_음성/voice.mp4`;
      } else if (comic.title === '개자식') {
        voiceVideoUrl = `/uploads/webtoons/adult/${comic.title}/voice.mp4`;
      } else if (comic.title === '거유 왁싱샵 실장님들') {
        voiceVideoUrl = `/uploads/webtoons/adult/${comic.title}/voice.mp4`;
      } else if (comic.title === '신도시 미시들의 비밀 동아리') {
        voiceVideoUrl = `/uploads/webtoons/adult/신도시 미시 (NEW)/voice.mp4`;
      } else if (comic.title === '엘리베이터에 갇힌 두 남녀') {
        voiceVideoUrl = `/uploads/webtoons/adult/${comic.title}/voice.mp4`;
      } else if (comic.title === '군도') {
        voiceVideoUrl = `/uploads/webtoons/adult/${comic.title}/voice.mp4`;
      }
    }

    const formattedComic = {
      id: comic.id,
      title: comic.title,
      author: comic.authorName || comic.author?.username || '작가',
      genre: comic.genre,
      description: comic.description || '',
      thumbnailUrl: comic.thumbnail ? comic.thumbnail.replace(/\.(jpg|jpeg|png)$/i, '.webp') : "/api/placeholder/300/400",
      viewCount: comic.viewCount || 0,
      commentCount: comic._count?.comments || 0,
      rating: parseFloat(averageRating.toFixed(1)), // 에피소드 평균 별점 (0~5.0)
      totalEpisodes: comic.episodes?.length || 0, // 실제 에피소드 수
      updatedAt: comic.updatedAt ? new Date(comic.updatedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      isOfficial: comic.isOfficial || false,
      paidStartEpisode: comic.paidStartEpisode !== undefined ? comic.paidStartEpisode : 1,
      episodeCoinPrice: comic.episodeCoinPrice !== undefined ? comic.episodeCoinPrice : 3,
      ageRating: comic.rating, // 연령 등급 추가
      voiceVideoUrl: voiceVideoUrl, // voice.mp4 URL 추가
      episodes: comic.episodes.map(ep => {
        // 웹툰의 paidStartEpisode 설정에 따라 무료/유료 결정
        const isFree = comic.paidStartEpisode === 0 || ep.episodeNumber < comic.paidStartEpisode;
        const coinPrice = isFree ? 0 : (comic.episodeCoinPrice || 3);
        
        return {
          id: ep.id,
          title: ep.title,
          episodeNumber: ep.episodeNumber,
          thumbnailUrl: ep.thumbnail ? (ep.thumbnail.startsWith('/') ? ep.thumbnail : `/${ep.thumbnail}`) : null, // 슬래시 확인 후 추가
          hasEpisodeThumbnail: !!ep.thumbnail, // 에피소드 전용 썸네일 존재 여부
          comicThumbnailUrl: comic.thumbnail ? (comic.thumbnail.startsWith('/') ? comic.thumbnail : `/${comic.thumbnail}`) : null, // 슬래시 확인
          createdAt: ep.createdAt,
          isFree: isFree,
          coinPrice: coinPrice
        };
      })
    };

    res.json(formattedComic);

  } catch (error) {
    res.status(500).json({ message: '웹툰 상세 조회 중 오류가 발생했습니다.', error: error.message });
  }
});

// GET: 특정 웹툰의 에피소드 목록 조회
router.get('/comics/:id/episodes', async (req, res) => {
  try {
    const { id } = req.params;

    // 먼저 이 웹툰이 승인되었는지 확인 (일반 + 성인)
    let categorySettings = { all: [], popular: [], editors: [], new: [], waitfree: [], banner: [], realtime: [], daily: [], week: [], complete: [], latest: [], finished: [] };
    let adultCategorySettings = { all: [], popular: [], editors: [], new: [], waitfree: [], banner: [], realtime: [], daily: [], week: [], complete: [], latest: [], finished: [] };
    try {
      const { getCategorySettings, getAdultCategorySettings } = require('./admin');
      categorySettings = getCategorySettings();
      adultCategorySettings = getAdultCategorySettings();
    } catch (error) {
    }
    
    // 모든 카테고리에서 승인된 웹툰 ID 수집
    // week는 객체일 수 있으므로 평탄화 필요
    let weekIds = [];
    if (categorySettings.week) {
      if (Array.isArray(categorySettings.week)) {
        weekIds = categorySettings.week;
      } else if (typeof categorySettings.week === 'object') {
        weekIds = Object.values(categorySettings.week).flat();
      }
    }

    const generalIds = [
      ...(categorySettings.all || []),
      ...(categorySettings.popular || []),
      ...(categorySettings.editors || []),
      ...(categorySettings.new || []),
      ...(categorySettings.waitfree || []),
      ...(categorySettings.banner || []),
      ...(categorySettings.realtime || []),
      ...(categorySettings.daily || []),
      ...weekIds,
      ...(categorySettings.complete || []),
      ...(categorySettings.latest || []),
      ...(categorySettings.finished || [])
    ];
    
    const adultIds = [
      ...(adultCategorySettings.all || []),
      ...(adultCategorySettings.popular || []),
      ...(adultCategorySettings.editors || []),
      ...(adultCategorySettings.new || []),
      ...(adultCategorySettings.waitfree || []),
      ...(adultCategorySettings.banner || []),
      ...(adultCategorySettings.realtime || []),
      ...(adultCategorySettings.daily || []),
      ...(adultCategorySettings.week || []),
      ...(adultCategorySettings.complete || []),
      ...(adultCategorySettings.latest || []),
      ...(adultCategorySettings.finished || [])
    ];
    
    // 중복 제거
    const allApprovedIds = [...new Set([...generalIds, ...adultIds])];
    
    if (!allApprovedIds.includes(id)) {
      return res.status(404).json({ message: '웹툰을 찾을 수 없습니다.' });
    }
    
    // 웹툰 정보 가져오기 (썸네일 + 타이틀)
    const comic = await prisma.comic.findUnique({
      where: { id },
      select: {
        thumbnail: true,
        title: true,
        rating: true // 성인 여부 확인
      }
    });

    const episodes = await prisma.episode.findMany({
      where: { comicId: id },
      orderBy: { episodeNumber: 'asc' },
      select: {
        id: true,
        title: true,
        episodeNumber: true,
        thumbnail: true,
        createdAt: true,
        isFree: true,
        coinPrice: true
      }
    });

    // 웹툰의 paidStartEpisode 설정 가져오기
    const comicSettings = await prisma.comic.findUnique({
      where: { id },
      select: {
        paidStartEpisode: true,
        episodeCoinPrice: true
      }
    });

    // voice.mp4 URL 결정
    let voiceVideoUrl = null;
    const isAdult = comic?.rating === '19' || comic?.rating === 'ADULT';

    if (isAdult && comic?.title) {
      // 성인 웹툰 중 voice.mp4가 있는 웹툰만 URL 추가
      if (comic.title === '가정교사') {
        voiceVideoUrl = `/uploads/webtoons/adult/${comic.title}/1화_음성/voice.mp4`;
      } else if (comic.title === '개자식') {
        voiceVideoUrl = `/uploads/webtoons/adult/${comic.title}/voice.mp4`;
      } else if (comic.title === '거유 왁싱샵 실장님들') {
        voiceVideoUrl = `/uploads/webtoons/adult/${comic.title}/voice.mp4`;
      } else if (comic.title === '신도시 미시들의 비밀 동아리') {
        voiceVideoUrl = `/uploads/webtoons/adult/신도시 미시 (NEW)/voice.mp4`;
      } else if (comic.title === '엘리베이터에 갇힌 두 남녀') {
        voiceVideoUrl = `/uploads/webtoons/adult/${comic.title}/voice.mp4`;
      }
    }

    const formattedEpisodes = episodes.map(ep => {
      // DB의 에피소드별 설정 사용
      const isFree = ep.isFree !== undefined ? ep.isFree : (comicSettings.paidStartEpisode === 0 || ep.episodeNumber < comicSettings.paidStartEpisode);
      const coinPrice = ep.coinPrice !== undefined ? ep.coinPrice : (isFree ? 0 : (comicSettings.episodeCoinPrice || 3));

      return {
        id: ep.id,
        title: ep.title,
        episodeNumber: ep.episodeNumber,
        thumbnailUrl: ep.thumbnail || comic?.thumbnail || "/api/placeholder/300/400", // CDN URL 그대로 사용
        hasEpisodeThumbnail: !!ep.thumbnail, // 에피소드 전용 썸네일 존재 여부
        comicThumbnailUrl: comic?.thumbnail || "/api/placeholder/300/400", // 대표 썸네일 (CDN URL)
        createdAt: ep.createdAt,
        isFree: isFree,
        coinPrice: coinPrice,
        isLocked: false,
        voiceVideoUrl: voiceVideoUrl // voice.mp4 URL 추가
      };
    });

    res.json({
      episodes: formattedEpisodes,
      total: formattedEpisodes.length
    });

  } catch (error) {
    console.error('에피소드 조회 오류:', error);
    res.status(500).json({ message: '에피소드 목록 조회 중 오류가 발생했습니다.' });
  }
});

// GET: 특정 에피소드 상세 조회
router.get('/comics/:id/episodes/:episodeId', ...guardEpisode(), async (req, res) => {
  try {
    const { id, episodeId } = req.params;

    // 먼저 이 웹툰이 승인되었는지 확인 (일반 + 성인)
    let categorySettings = { all: [], popular: [], editors: [], new: [], waitfree: [], banner: [], realtime: [], daily: [], week: [], complete: [], latest: [], finished: [] };
    let adultCategorySettings = { all: [], popular: [], editors: [], new: [], waitfree: [], banner: [], realtime: [], daily: [], week: [], complete: [], latest: [], finished: [] };
    try {
      const { getCategorySettings, getAdultCategorySettings } = require('./admin');
      categorySettings = getCategorySettings();
      adultCategorySettings = getAdultCategorySettings();
    } catch (error) {
    }
    
    // week가 스케줄 객체인 경우 배열로 평탄화
    let generalWeekIds = [];
    if (categorySettings.week && typeof categorySettings.week === 'object' && !Array.isArray(categorySettings.week)) {
      for (const day of ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']) {
        if (Array.isArray(categorySettings.week[day])) {
          generalWeekIds.push(...categorySettings.week[day]);
        }
      }
    } else if (Array.isArray(categorySettings.week)) {
      generalWeekIds = categorySettings.week;
    }

    // 모든 카테고리에서 승인된 웹툰 ID 수집
    const generalIds = [
      ...(categorySettings.all || []),
      ...(categorySettings.popular || []),
      ...(categorySettings.editors || []),
      ...(categorySettings.new || []),
      ...(categorySettings.waitfree || []),
      ...(categorySettings.banner || []),
      ...(categorySettings.realtime || []),
      ...(categorySettings.daily || []),
      ...generalWeekIds,
      ...(categorySettings.complete || []),
      ...(categorySettings.latest || []),
      ...(categorySettings.finished || [])
    ];

    // adult week도 스케줄 객체인 경우 배열로 평탄화
    let adultWeekIds = [];
    if (adultCategorySettings.week && typeof adultCategorySettings.week === 'object' && !Array.isArray(adultCategorySettings.week)) {
      for (const day of ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']) {
        if (Array.isArray(adultCategorySettings.week[day])) {
          adultWeekIds.push(...adultCategorySettings.week[day]);
        }
      }
    } else if (Array.isArray(adultCategorySettings.week)) {
      adultWeekIds = adultCategorySettings.week;
    }

    const adultIds = [
      ...(adultCategorySettings.all || []),
      ...(adultCategorySettings.popular || []),
      ...(adultCategorySettings.editors || []),
      ...(adultCategorySettings.new || []),
      ...(adultCategorySettings.waitfree || []),
      ...(adultCategorySettings.banner || []),
      ...(adultCategorySettings.realtime || []),
      ...(adultCategorySettings.daily || []),
      ...adultWeekIds,
      ...(adultCategorySettings.complete || []),
      ...(adultCategorySettings.latest || []),
      ...(adultCategorySettings.finished || [])
    ];

    // 중복 제거
    const allApprovedIds = [...new Set([...generalIds, ...adultIds])];

    if (!allApprovedIds.includes(id)) {
      return res.status(404).json({ message: '웹툰을 찾을 수 없습니다.' });
    }

    const episode = await prisma.episode.findFirst({
      where: {
        id: episodeId,
        comicId: id
      },
      include: {
        comic: {
          select: {
            title: true,
            author: {
              select: { username: true }
            },
            authorName: true
          }
        }
      }
    });

    if (!episode) {
      return res.status(404).json({ message: '에피소드를 찾을 수 없습니다.' });
    }

    // 에피소드 이미지들을 가져오기
    let images = [];
    if (episode.images) {
      try {
        // JSON 형식으로 저장된 경우 먼저 시도
        const parsedImages = JSON.parse(episode.images);
        if (Array.isArray(parsedImages)) {
          images = parsedImages.map(img => {
            const trimmed = img.trim();
            // 확장자가 없으면 .webp 추가
            if (!trimmed.match(/\.(jpg|jpeg|png|webp)$/i)) {
              return trimmed + '.webp';
            }
            // jpg/png를 webp로 변환
            return trimmed.replace(/\.(jpg|jpeg|png)$/i, '.webp');
          });
        }
      } catch (e) {
        // JSON 파싱 실패시 콤마 구분 문자열로 처리
        images = episode.images.split(',').map(img => {
          const trimmed = img.trim();
          // 확장자가 없으면 .webp 추가
          if (!trimmed.match(/\.(jpg|jpeg|png|webp)$/i)) {
            return trimmed + '.webp';
          }
          // jpg/png를 webp로 변환
          return trimmed.replace(/\.(jpg|jpeg|png)$/i, '.webp');
        });
      }
    }

    const formattedEpisode = {
      id: episode.id,
      title: episode.title,
      episodeNumber: episode.episodeNumber,
      images: images,
      createdAt: episode.createdAt,
      webtoonTitle: episode.comic.title,
      author: episode.comic.authorName || episode.comic.author?.username || '작가'
    };

    res.json(formattedEpisode);

  } catch (error) {
    console.error('에피소드 조회 오류:', error);
    res.status(500).json({ message: '에피소드 조회 중 오류가 발생했습니다.' });
  }
});

// GET /api/frontend/adult-home - 성인 홈페이지 데이터
router.get('/adult-home', requireVerifiedAdultMode, async (req, res) => {
  try {
    // 프론트엔드에서 전달한 locale 파라미터 (기본값: 'ko')
    const locale = req.query.locale || 'ko';

    // 성인 카테고리 설정 로드
    const ADULT_CATEGORY_SETTINGS_PATH = path.join(__dirname, '..', 'data', 'adult-category-settings.json');
    let categorySettings = {
      banner: [],
      realtime: [],
      daily: [],
      week: [],
      complete: [],
      latest: [],
      new: [],
      finished: []
    };

    try {
      const data = await fs.readFile(ADULT_CATEGORY_SETTINGS_PATH, 'utf-8');
      categorySettings = JSON.parse(data);
    } catch (error) {
      console.log('성인 카테고리 설정 파일이 없습니다. 기본값 사용');
    }

    // 배너 데이터 (데이터베이스에서 직접 가져오기 - 성인 웹툰만)
    const banners = await prisma.banner.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
      include: {
        webtoon: {
          select: {
            id: true,
            title: true,
            thumbnail: true,
            genre: true,
            authorName: true,
            rating: true,
            locale: true
          }
        }
      }
    });

    // 성인 웹툰 배너만 필터링
    const adultBanners = banners.filter(banner =>
      banner.webtoon &&
      banner.webtoon.locale === locale &&
      (banner.webtoon.rating === 'ADULT' ||
       banner.webtoon.rating === '19' ||
       banner.webtoon.genre === 'adult')
    );

    // 카테고리별 웹툰 ID로 실제 웹툰 데이터 가져오기 (성인 웹툰만)
    const getCategoryComics = async (comicIds) => {
      if (!comicIds || comicIds.length === 0) return [];

      const whereClause = {
        id: { in: comicIds },
        locale: locale,
        isPublished: true,  // soft-hide: 공개 목록 노출작만
        OR: [
          { rating: '19' },
          { rating: 'adult' },
          { rating: 'ADULT' },
          { genre: 'adult' }
        ]
      };

      const comics = await prisma.comic.findMany({
        where: whereClause,
        include: {
          _count: {
            select: { episodes: true }
          }
        }
      });

      // 원래 순서대로 정렬
      return comicIds.map(id => comics.find(c => c.id === id)).filter(Boolean);
    };

    // 각 카테고리별 웹툰 가져오기
    const [
      dailyComics,
      weekComics,
      completeComics,
      latestComics,
      newComics
    ] = await Promise.all([
      getCategoryComics(categorySettings.daily),
      getCategoryComics(categorySettings.week),
      getCategoryComics(categorySettings.complete),
      getCategoryComics(categorySettings.latest),
      getCategoryComics(categorySettings.new)
    ]);

    // 실시간 탑텐: 조회수 기준 상위 10개 (성인 웹툰만)
    const realtimeComics = await prisma.comic.findMany({
      where: {
        locale: locale,
        isPublished: true,  // soft-hide: 공개 목록 노출작만
        OR: [
          { rating: '19' },
          { rating: 'adult' },
          { rating: 'ADULT' },
          { genre: 'adult' }
        ]
      },
      include: {
        _count: {
          select: { episodes: true }
        }
      },
      orderBy: { viewCount: 'desc' },
      take: 10
    });

    // 모든 성인 웹툰 가져오기 (폴백용)
    const allComics = await prisma.comic.findMany({
      where: {
        locale: locale,
        isPublished: true,  // soft-hide: 공개 목록 노출작만
        OR: [
          { rating: '19' },
          { rating: 'adult' },
          { rating: 'ADULT' },
          { genre: 'adult' }
        ]
      },
      include: {
        _count: {
          select: { episodes: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    res.json({
      success: true,
      data: {
        banners: adultBanners.map(banner => ({
          id: banner.id,
          title: banner.webtoon?.title || banner.title,  // 웹툰 제목 우선 사용
          subtitle: banner.subtitle,
          description: banner.description,
          imageUrl: banner.imageUrl,
          link: banner.ctaLink,
          webtoonId: banner.webtoon?.id,
          webtoon: banner.webtoon
        })),
        categories: {
          realtime: realtimeComics,
          daily: dailyComics.length > 0 ? dailyComics : allComics.filter(c => c.status === 'ONGOING').slice(0, 10),
          week: weekComics.length > 0 ? weekComics : allComics.slice(0, 10),
          complete: completeComics.length > 0 ? completeComics : allComics.filter(c => c.status === 'COMPLETED'),
          latest: latestComics.length > 0 ? latestComics : allComics.slice(0, 10),
          new: newComics.length > 0 ? newComics : allComics.filter(c => c.status === 'ONGOING').slice(0, 10),
          completed: completeComics.length > 0 ? completeComics : allComics.filter(c => c.status === 'COMPLETED')
        },
        allComics
      }
    });
  } catch (error) {
    console.error('성인 홈페이지 데이터 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '데이터를 불러오는데 실패했습니다.'
    });
  }
});

// GET: 성인 카테고리별 웹툰 조회 (성인 웹툰 전용)
router.get('/categories/adult/:category', requireVerifiedAdultMode, async (req, res) => {
  try {
    const { category } = req.params;
    const { limit = 10, locale = 'ko' } = req.query;  // locale 파라미터 추가
    
    // 관리자가 설정한 성인 카테고리 정보 가져오기
    let adultCategorySettings = { all: [], popular: [], editors: [], new: [], waitfree: [], banner: [], realtime: [], daily: [], week: [], complete: [], latest: [], finished: [] };
    try {
      const { getAdultCategorySettings } = require('./admin');
      adultCategorySettings = getAdultCategorySettings();
    } catch (error) {
    }
    
    // 성인 카테고리에서만 검색 (일반 웹툰 제외)
    const adultCategoryIds = adultCategorySettings[category] || [];
    
    if (adultCategoryIds.length === 0) {
      // 승인된 성인 웹툰이 없으면 빈 결과 반환
      return res.json({
        comics: [],
        total: 0
      });
    }
    
    const allComics = await prisma.comic.findMany({
      where: {
        id: {
          in: adultCategoryIds
        },
        locale: locale,  // locale 필터링 추가
        isPublished: true,  // soft-hide: 공개 목록 노출작만
        // 추가 필터: rating이 19 또는 ADULT인 웹툰만 포함
        OR: [
          { rating: '19' },
          { rating: 'ADULT' },
          { genre: 'adult' }
        ]
      },
      include: {
        author: {
          select: {
            id: true,
            username: true
          }
        },
        episodes: {
          select: {
            id: true,
            title: true,
            episodeNumber: true,
            isFree: true,
            coinPrice: true
          },
          orderBy: { episodeNumber: 'asc' }
        },
        _count: {
          select: {
            likes: true,
            comments: true,
            views: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // 관리자가 설정한 순서대로 웹툰 정렬
    let filteredComics = [];
    if (adultCategoryIds.length > 0) {
      filteredComics = adultCategoryIds
        .map(id => allComics.find(comic => comic.id.toString() === id.toString()))
        .filter(Boolean);
    }
    
    const comics = filteredComics.map(comic => {
      // paidStartEpisode를 기준으로 무료 에피소드 수 계산
      console.log(`[Frontend API] Comic: ${comic.title}, paidStartEpisode: ${comic.paidStartEpisode}, episodeCoinPrice: ${comic.episodeCoinPrice}`);
      const paidStart = comic.paidStartEpisode !== undefined ? comic.paidStartEpisode : 1;
      const totalEps = comic.episodes?.length || 0;
      const freeEpisodes = paidStart === 0 ? totalEps : Math.min(paidStart - 1, totalEps);
      const coinPrice = paidStart === 0 ? 0 : (comic.episodeCoinPrice || 3);
      
      return {
        id: comic.id,
        title: comic.title,
        author: comic.authorName || comic.author?.username || '작가',
        genre: comic.genre,
        thumbnailUrl: comic.thumbnail ? comic.thumbnail.replace(/\.(jpg|jpeg|png)$/i, '.webp') : "/api/placeholder/300/400",
        viewCount: comic.viewCount || 0,
        commentCount: comic._count?.comments || 0,
        rating: 0, // TODO: 에피소드 평균 별점으로 계산 필요 (comic.rating은 연령 등급)
        totalEpisodes: totalEps,
        updatedAt: comic.updatedAt ? new Date(comic.updatedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        isOfficial: comic.isOfficial || false,
        recentComments: [], // 임시로 빈 배열
        freeEpisodes: freeEpisodes,
        coinPrice: coinPrice
      };
    });

    res.set('Content-Type', 'application/json; charset=utf-8');
    res.json({
      comics: comics.slice(0, parseInt(limit)),
      total: comics.length
    });

  } catch (error) {
    res.status(500).json({ message: '성인 웹툰 조회 중 오류가 발생했습니다.' });
  }
});

// GET: 에피소드 위치 확인 API (간단한 정보만 반환)
router.get('/comics/:id/episode-position/:episodeId', async (req, res) => {
  // 캐시 헤더 설정 (10분 캐싱)
  res.set('Cache-Control', 'public, max-age=600');

  try {
    const { id, episodeId } = req.params;

    // 에피소드 번호만 가져오기 (최소 쿼리)
    const episodes = await prisma.episode.findMany({
      where: { comicId: id },
      select: {
        id: true,
        episodeNumber: true
      },
      orderBy: { episodeNumber: 'asc' }
    });

    const currentIndex = episodes.findIndex(ep => ep.id.toString() === episodeId.toString());

    if (currentIndex === -1) {
      return res.status(404).json({ message: '에피소드를 찾을 수 없습니다.' });
    }

    res.json({
      isFirst: currentIndex === 0,
      isLast: currentIndex === episodes.length - 1,
      prevId: currentIndex > 0 ? episodes[currentIndex - 1].id : null,
      nextId: currentIndex < episodes.length - 1 ? episodes[currentIndex + 1].id : null,
      currentPosition: currentIndex + 1,
      totalEpisodes: episodes.length
    });

  } catch (error) {
    res.status(500).json({ message: '에피소드 위치 확인 중 오류가 발생했습니다.' });
  }
});

// GET: 비슷한 작품 추천 API (투믹스 스타일)
router.get('/comics/:id/similar', async (req, res) => {
  // 캐시 헤더 설정 (30분 캐싱)
  res.set('Cache-Control', 'public, max-age=1800');

  try {
    const { id } = req.params;
    const { limit = 6 } = req.query;

    // 현재 웹툰 정보 가져오기
    const currentComic = await prisma.comic.findUnique({
      where: { id },
      select: {
        genre: true,
        locale: true,
        rating: true
      }
    });

    if (!currentComic) {
      return res.status(404).json({ message: '웹툰을 찾을 수 없습니다.' });
    }

    // 등급 필터링 로직 개선
    // - GENERAL 웹툰: GENERAL만 추천
    // - 성인 웹툰 (19, ADULT): 성인 웹툰만 추천
    const isAdultContent = currentComic.rating === '19' || currentComic.rating === 'ADULT';

    // 같은 장르의 다른 인기 웹툰 추천 (현재 웹툰 제외)
    const similarComics = await prisma.comic.findMany({
      where: {
        id: { not: id },
        genre: currentComic.genre,
        locale: currentComic.locale,
        isPublished: true, // soft-hide: 공개 목록 노출작만
        isOfficial: true, // 승인된 웹툰만 표시
        // 등급별 필터링
        ...(isAdultContent ? {
          // 성인 웹툰인 경우: 19 또는 ADULT만
          rating: { in: ['19', 'ADULT'] }
        } : {
          // 일반 웹툰인 경우: GENERAL만
          rating: 'GENERAL'
        })
      },
      include: {
        _count: {
          select: {
            episodes: true,
            views: true
          }
        }
      },
      orderBy: [
        { viewCount: 'desc' },
        { createdAt: 'desc' }
      ],
      take: parseInt(limit)
    });

    const formattedComics = similarComics.map(comic => ({
      id: comic.id,
      title: comic.title,
      author: comic.authorName || '작가',
      genre: comic.genre,
      thumbnailUrl: comic.thumbnail ? comic.thumbnail.replace(/\.(jpg|jpeg|png)$/i, '.webp') : "/api/placeholder/300/400",
      viewCount: comic.viewCount || 0,
      rating: 0, // Comic 모델에는 평점 필드가 없음 (rating은 연령등급)
      totalEpisodes: comic._count?.episodes || 0,
      isOfficial: comic.isOfficial || false,
      paidStartEpisode: comic.paidStartEpisode,
      episodeCoinPrice: comic.episodeCoinPrice
    }));

    res.json({
      comics: formattedComics,
      total: formattedComics.length
    });

  } catch (error) {
    console.error('비슷한 작품 추천 오류:', error);
    res.status(500).json({ message: '추천 작품 조회 중 오류가 발생했습니다.' });
  }
});

module.exports = router;