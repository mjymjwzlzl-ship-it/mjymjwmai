const express = require('express');
const { prisma } = require('../lib/prisma');

const router = express.Router();

// 관리자 인증 미들웨어 (간단한 토큰 체크)
const { authenticate, requireAdmin } = require('../middleware/auth');
const adminAuth = [authenticate, requireAdmin];

// 모든 admin 라우트에 관리자 인증 필요
router.use(adminAuth);

// POST: 새 웹툰 등록
router.post('/comics', async (req, res) => {
  try {
    const {
      title,
      description,
      authorName,
      status,
      genres,
      thumbnail,
      episodes,
      paidStartEpisode,
      episodeCoinPrice
    } = req.body;

    // 입력값 검증
    if (!title || !authorName || !genres || genres.length === 0) {
      return res.status(400).json({ message: '필수 필드가 누락되었습니다.' });
    }

    // 트랜잭션으로 웹툰과 에피소드 생성
    const result = await prisma.$transaction(async (tx) => {
      // 웹툰 생성
      const comic = await tx.comic.create({
        data: {
          title,
          description: description || null,
          authorName,
          thumbnail: thumbnail || null,
          genre: genres,
          isOfficial: true, // 관리자가 등록하는 것은 정식연재
          status: status || 'ONGOING',
          authorId: req.user.id,
          paidStartEpisode: parseInt(paidStartEpisode) || 0,
          episodeCoinPrice: parseInt(episodeCoinPrice) || 3,
        }
      });

      // 에피소드 생성
      const createdEpisodes = [];
      if (episodes && episodes.length > 0) {
        for (const episodeData of episodes) {
          const episode = await tx.episode.create({
            data: {
              title: episodeData.title,
              episodeNumber: episodeData.episodeNumber,
              images: episodeData.images || [],
              comicId: comic.id,
            }
          });
          createdEpisodes.push(episode);
        }
      }

      return { comic, episodes: createdEpisodes };
    });

    res.status(201).json({ 
      message: '웹툰이 성공적으로 등록되었습니다.',
      comic: result.comic,
      episodes: result.episodes
    });

  } catch (error) {
    res.status(500).json({ message: '웹툰 등록 중 오류가 발생했습니다.' });
  }
});

// GET: 모든 웹툰 조회 (관리자용)
router.get('/comics', async (req, res) => {
  try {
    const { page = 1, limit = 50, rating, locale = 'ko' } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    // rating 파라미터에 따라 필터링
    let whereCondition = { locale: locale };

    if (rating === '19') {
      // 성인 웹툰만 조회 (ADULT 또는 19)
      whereCondition = {
        locale: locale,
        rating: { in: ['ADULT', '19'] }
      };
    } else if (rating === 'all' || !rating) {
      // rating이 'all'이거나 없으면 모든 웹툰 (locale 필터만)
      whereCondition = { locale: locale };
    } else {
      // 일반 웹툰만 조회 (성인 웹툰 제외 - ADULT와 19 모두 제외)
      whereCondition = {
        locale: locale,
        rating: { notIn: ['ADULT', '19'] }
      };
    }

    const comics = await prisma.comic.findMany({
      where: whereCondition,
      include: {
        author: {
          select: {
            id: true,
            username: true,
            email: true
          }
        },
        episodes: {
          select: {
            id: true,
            title: true,
            episodeNumber: true,
            viewCount: true
          },
          orderBy: { episodeNumber: 'desc' }
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
      skip: (pageNum - 1) * limitNum,
      take: limitNum
    });

    const totalCount = await prisma.comic.count({
      where: whereCondition
    });

    // 데이터 형식을 프론트엔드에 맞게 조정
    const formattedComics = comics.map(comic => ({
      id: comic.id,
      title: comic.title,
      authorName: comic.authorName || comic.author?.username || '알 수 없음',
      genre: comic.genre,
      thumbnail: comic.thumbnail,
      viewCount: comic.viewCount || 0,
      likeCount: comic.likeCount || 0,
      status: comic.status,
      rating: comic.rating,
      createdAt: comic.createdAt,
      updatedAt: comic.updatedAt,
      paidStartEpisode: comic.paidStartEpisode || 1,
      episodeCoinPrice: comic.episodeCoinPrice || 3,
      episodeCount: comic.episodes?.length || 0,
      purchaseCount: 0 // 추후 구매 통계 추가 시 업데이트
    }));

    res.json({
      success: true,
      comics: formattedComics,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitNum)
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, message: '웹툰 목록 조회 중 오류가 발생했습니다.' });
  }
});

// GET: 성인 웹툰만 조회 (관리자용)
router.get('/comics/adult', async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    // 성인 웹툰만 조회 (rating이 ADULT 또는 19)
    const comics = await prisma.comic.findMany({
      where: {
        rating: { in: ['ADULT', '19'] }
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            email: true
          }
        },
        episodes: {
          select: {
            id: true,
            title: true,
            episodeNumber: true,
            viewCount: true
          },
          orderBy: { episodeNumber: 'desc' }
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
      skip: (pageNum - 1) * limitNum,
      take: limitNum
    });

    const totalCount = await prisma.comic.count({
      where: {
        rating: "ADULT"
      }
    });

    res.json({
      success: true,
      data: comics,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitNum)
      }
    });

  } catch (error) {
    console.error('성인 웹툰 조회 에러:', error);
    res.status(500).json({ success: false, message: '성인 웹툰 목록 조회 중 오류가 발생했습니다.' });
  }
});

// PUT: 웹툰 정보 수정
router.put('/comics/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      authorName,
      status,
      genres,
      thumbnail
    } = req.body;

    const comic = await prisma.comic.update({
      where: { id },
      data: {
        title,
        description,
        authorName,
        status,
        genre: genres,
        thumbnail,
        updatedAt: new Date()
      }
    });

    res.json({
      message: '웹툰 정보가 수정되었습니다.',
      comic
    });

  } catch (error) {
    res.status(500).json({ message: '웹툰 수정 중 오류가 발생했습니다.' });
  }
});

// PUT: 웹툰 결제 설정 업데이트
router.put('/comics/:id/payment', async (req, res) => {
  try {
    const { id } = req.params;
    const { paidStartEpisode, episodeCoinPrice } = req.body;

    // 입력값 검증
    if (paidStartEpisode < 0 || episodeCoinPrice < 0) {
      return res.status(400).json({ 
        success: false, 
        message: '유효하지 않은 값입니다.' 
      });
    }

    // 웹툰 결제 설정 업데이트
    const updatedComic = await prisma.comic.update({
      where: { id },
      data: {
        paidStartEpisode: paidStartEpisode,
        episodeCoinPrice: episodeCoinPrice,
        updatedAt: new Date()
      },
      include: {
        episodes: {
          select: {
            id: true,
            episodeNumber: true,
            isFree: true,
            coinPrice: true
          }
        }
      }
    });

    // 에피소드별 무료/유료 설정 업데이트
    const episodeUpdates = updatedComic.episodes.map(episode => {
      const isFree = paidStartEpisode === 0 || episode.episodeNumber < paidStartEpisode;
      const coinPrice = isFree ? 0 : episodeCoinPrice;
      
      return prisma.episode.update({
        where: { id: episode.id },
        data: {
          isFree: isFree,
          coinPrice: coinPrice
        }
      });
    });

    await Promise.all(episodeUpdates);

    res.json({
      success: true,
      message: '결제 설정이 저장되었습니다.',
      data: {
        id: updatedComic.id,
        title: updatedComic.title,
        paidStartEpisode: updatedComic.paidStartEpisode,
        episodeCoinPrice: updatedComic.episodeCoinPrice,
        totalEpisodes: updatedComic.episodes.length
      }
    });

  } catch (error) {
    console.error('결제 설정 업데이트 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '결제 설정 저장 중 오류가 발생했습니다.' 
    });
  }
});

// DELETE: 웹툰 삭제
router.delete('/comics/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.comic.delete({
      where: { id }
    });

    res.json({ message: '웹툰이 삭제되었습니다.' });

  } catch (error) {
    res.status(500).json({ message: '웹툰 삭제 중 오류가 발생했습니다.' });
  }
});

// POST: 웹툰 승인 (자동으로 카테고리에 추가)
router.post('/comics/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const { category = 'new' } = req.body; // 기본값: 'new' 카테고리

    // 웹툰 정보 조회
    const comic = await prisma.comic.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        rating: true,
        locale: true
      }
    });

    if (!comic) {
      return res.status(404).json({
        success: false,
        message: '웹툰을 찾을 수 없습니다.'
      });
    }

    // 카테고리 매니저 사용하여 자동 추가
    const { addToCategory } = require('../utils/category-manager');
    const result = addToCategory(comic.id, comic.rating, comic.locale, category);

    if (result.success) {
      console.log(`✓ 웹툰 승인: ${comic.title} (${comic.id}) → ${result.file} 파일의 '${result.category}' 카테고리`);

      res.json({
        success: true,
        message: '웹툰이 승인되어 카테고리에 추가되었습니다.',
        comic: {
          id: comic.id,
          title: comic.title
        },
        categoryInfo: {
          file: result.file,
          category: result.category || category
        }
      });
    } else {
      console.error(`✗ 웹툰 승인 실패: ${comic.title} (${comic.id}) - ${result.message}`);

      res.status(500).json({
        success: false,
        message: result.message || '웹툰 승인 중 오류가 발생했습니다.',
        comic: {
          id: comic.id,
          title: comic.title
        }
      });
    }

  } catch (error) {
    console.error('웹툰 승인 오류:', error);
    res.status(500).json({
      success: false,
      message: '웹툰 승인 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

const fs = require('fs');
const path = require('path');

// 카테고리 설정 파일 경로
const CATEGORY_SETTINGS_FILE = path.join(__dirname, '../data/category-settings.json');
const ADULT_CATEGORY_SETTINGS_FILE = path.join(__dirname, '../data/adult-category-settings.json');
const ENGLISH_CATEGORY_SETTINGS_FILE = path.join(__dirname, '../data/english-category-settings.json');
const ENGLISH_ADULT_CATEGORY_SETTINGS_FILE = path.join(__dirname, '../data/english-adult-category-settings.json');

// 카테고리 설정 파일에서 읽기
const loadCategorySettings = () => {
  try {
    if (fs.existsSync(CATEGORY_SETTINGS_FILE)) {
      const data = fs.readFileSync(CATEGORY_SETTINGS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
  }
  
  // 기본값 반환
  return {
    all: [],
    popular: [],
    editors: [],
    new: [],
    waitfree: []
  };
};

// 성인 카테고리 설정 파일에서 읽기
const loadAdultCategorySettings = () => {
  try {
    if (fs.existsSync(ADULT_CATEGORY_SETTINGS_FILE)) {
      const data = fs.readFileSync(ADULT_CATEGORY_SETTINGS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
  }

  // 기본값 반환
  return {
    all: [],
    popular: [],
    editors: [],
    new: [],
    waitfree: []
  };
};

// 영어 카테고리 설정 파일에서 읽기
const loadEnglishCategorySettings = () => {
  try {
    if (fs.existsSync(ENGLISH_CATEGORY_SETTINGS_FILE)) {
      const data = fs.readFileSync(ENGLISH_CATEGORY_SETTINGS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
  }

  // 기본값 반환
  return {
    all: [],
    popular: [],
    editors: [],
    new: [],
    waitfree: []
  };
};

// 영어 성인 카테고리 설정 파일에서 읽기
const loadEnglishAdultCategorySettings = () => {
  try {
    if (fs.existsSync(ENGLISH_ADULT_CATEGORY_SETTINGS_FILE)) {
      const data = fs.readFileSync(ENGLISH_ADULT_CATEGORY_SETTINGS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
  }

  // 기본값 반환
  return {
    banner: [],
    realtime: [],
    daily: [],
    week: {},
    complete: [],
    latest: [],
    new: [],
    finished: []
  };
};

// 카테고리 설정 파일에 저장
const saveCategorySettings = (settings) => {
  try {
    // data 디렉토리가 없으면 생성
    const dataDir = path.dirname(CATEGORY_SETTINGS_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    fs.writeFileSync(CATEGORY_SETTINGS_FILE, JSON.stringify(settings, null, 2));
  } catch (error) {
  }
};

// 성인 카테고리 설정 파일에 저장
const saveAdultCategorySettings = (settings) => {
  try {
    // data 디렉토리가 없으면 생성
    const dataDir = path.dirname(ADULT_CATEGORY_SETTINGS_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    fs.writeFileSync(ADULT_CATEGORY_SETTINGS_FILE, JSON.stringify(settings, null, 2));
  } catch (error) {
  }
};

// 영어 카테고리 설정 파일에 저장
const saveEnglishCategorySettings = (settings) => {
  try {
    // data 디렉토리가 없으면 생성
    const dataDir = path.dirname(ENGLISH_CATEGORY_SETTINGS_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    fs.writeFileSync(ENGLISH_CATEGORY_SETTINGS_FILE, JSON.stringify(settings, null, 2));
  } catch (error) {
  }
};

// 영어 성인 카테고리 설정 파일에 저장
const saveEnglishAdultCategorySettings = (settings) => {
  try {
    // data 디렉토리가 없으면 생성
    const dataDir = path.dirname(ENGLISH_ADULT_CATEGORY_SETTINGS_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    fs.writeFileSync(ENGLISH_ADULT_CATEGORY_SETTINGS_FILE, JSON.stringify(settings, null, 2));
  } catch (error) {
  }
};

// 초기 카테고리 설정 로드
let categorySettings = loadCategorySettings();
let adultCategorySettings = loadAdultCategorySettings();
let englishCategorySettings = loadEnglishCategorySettings();
let englishAdultCategorySettings = loadEnglishAdultCategorySettings();

// GET: 카테고리 설정 조회
router.get('/categories', async (req, res) => {
  try {
    res.json({
      success: true,
      data: categorySettings
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '카테고리 설정 조회 중 오류가 발생했습니다.' });
  }
});

// POST: 카테고리 설정 저장
router.post('/categories', async (req, res) => {
  try {
    const { banner, realtime, daily, week, complete, latest, new: newRecs, finished } = req.body;
    
    categorySettings = {
      banner: banner || [],
      realtime: realtime || [],
      daily: daily || [],
      week: week || [],
      complete: complete || [],
      latest: latest || [],
      new: newRecs || [],
      finished: finished || []
    };
    
    // 파일에 저장
    saveCategorySettings(categorySettings);
    
    
    res.json({ 
      message: '카테고리 설정이 저장되었습니다.',
      categories: categorySettings
    });
  } catch (error) {
    res.status(500).json({ message: '카테고리 설정 저장 중 오류가 발생했습니다.' });
  }
});

// PUT: 특정 카테고리 업데이트
router.put('/categories/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const { webtoonIds } = req.body;
    
    if (!['banner', 'realtime', 'daily', 'week', 'complete', 'latest', 'new', 'finished'].includes(category)) {
      return res.status(400).json({ message: '유효하지 않은 카테고리입니다.' });
    }
    
    categorySettings[category] = webtoonIds || [];
    
    // 파일에 저장
    saveCategorySettings(categorySettings);
    
    
    res.json({ 
      message: `${category} 카테고리가 업데이트되었습니다.`,
      [category]: categorySettings[category]
    });
  } catch (error) {
    res.status(500).json({ message: '카테고리 업데이트 중 오류가 발생했습니다.' });
  }
});

// GET: 성인 카테고리 설정 조회
router.get('/categories/adult', async (req, res) => {
  try {
    res.json({
      success: true,
      data: adultCategorySettings
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '성인 카테고리 설정 조회 중 오류가 발생했습니다.' });
  }
});

// POST: 성인 카테고리 설정 저장
router.post('/categories/adult', async (req, res) => {
  try {
    const { banner, realtime, daily, week, complete, latest, new: newRecs, finished } = req.body;
    
    adultCategorySettings = {
      banner: banner || [],
      realtime: realtime || [],
      daily: daily || [],
      week: week || [],
      complete: complete || [],
      latest: latest || [],
      new: newRecs || [],
      finished: finished || []
    };
    
    // 파일에 저장
    saveAdultCategorySettings(adultCategorySettings);
    
    
    res.json({ 
      message: '성인 카테고리 설정이 저장되었습니다.',
      categories: adultCategorySettings
    });
  } catch (error) {
    res.status(500).json({ message: '성인 카테고리 설정 저장 중 오류가 발생했습니다.' });
  }
});

// PUT: 특정 성인 카테고리 업데이트
router.put('/categories/adult/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const { webtoonIds } = req.body;

    if (!['banner', 'realtime', 'daily', 'week', 'complete', 'latest', 'new', 'finished'].includes(category)) {
      return res.status(400).json({ message: '유효하지 않은 카테고리입니다.' });
    }

    adultCategorySettings[category] = webtoonIds || [];

    // 파일에 저장
    saveAdultCategorySettings(adultCategorySettings);


    res.json({
      message: `성인 ${category} 카테고리가 업데이트되었습니다.`,
      [category]: adultCategorySettings[category]
    });
  } catch (error) {
    res.status(500).json({ message: '성인 카테고리 업데이트 중 오류가 발생했습니다.' });
  }
});

// GET: 영어 카테고리 설정 조회
router.get('/categories/english', async (req, res) => {
  try {
    res.json({
      success: true,
      data: englishCategorySettings
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '영어 카테고리 설정 조회 중 오류가 발생했습니다.' });
  }
});

// POST: 영어 카테고리 설정 저장
router.post('/categories/english', async (req, res) => {
  try {
    const { banner, realtime, daily, week, complete, latest, new: newRecs, finished } = req.body;

    englishCategorySettings = {
      banner: banner || [],
      realtime: realtime || [],
      daily: daily || [],
      week: week || [],
      complete: complete || [],
      latest: latest || [],
      new: newRecs || [],
      finished: finished || []
    };

    // 파일에 저장
    saveEnglishCategorySettings(englishCategorySettings);


    res.json({
      message: '영어 카테고리 설정이 저장되었습니다.',
      categories: englishCategorySettings
    });
  } catch (error) {
    res.status(500).json({ message: '영어 카테고리 설정 저장 중 오류가 발생했습니다.' });
  }
});

// PUT: 특정 영어 카테고리 업데이트
router.put('/categories/english/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const { webtoonIds } = req.body;

    if (!['banner', 'realtime', 'daily', 'week', 'complete', 'latest', 'new', 'finished'].includes(category)) {
      return res.status(400).json({ message: '유효하지 않은 카테고리입니다.' });
    }

    englishCategorySettings[category] = webtoonIds || [];

    // 파일에 저장
    saveEnglishCategorySettings(englishCategorySettings);


    res.json({
      message: `영어 ${category} 카테고리가 업데이트되었습니다.`,
      [category]: englishCategorySettings[category]
    });
  } catch (error) {
    res.status(500).json({ message: '영어 카테고리 업데이트 중 오류가 발생했습니다.' });
  }
});

// GET: 영어 성인 카테고리 설정 조회
router.get('/categories/english-adult', async (req, res) => {
  try {
    res.json({
      success: true,
      data: englishAdultCategorySettings
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '영어 성인 카테고리 설정 조회 중 오류가 발생했습니다.' });
  }
});

// POST: 영어 성인 카테고리 설정 저장
router.post('/categories/english-adult', async (req, res) => {
  try {
    const { banner, realtime, daily, week, complete, latest, new: newRecs, finished } = req.body;

    englishAdultCategorySettings = {
      banner: banner || [],
      realtime: realtime || [],
      daily: daily || [],
      week: week || [],
      complete: complete || [],
      latest: latest || [],
      new: newRecs || [],
      finished: finished || []
    };

    // 파일에 저장
    saveEnglishAdultCategorySettings(englishAdultCategorySettings);


    res.json({
      message: '영어 성인 카테고리 설정이 저장되었습니다.',
      categories: englishAdultCategorySettings
    });
  } catch (error) {
    res.status(500).json({ message: '영어 성인 카테고리 설정 저장 중 오류가 발생했습니다.' });
  }
});

// PUT: 특정 영어 성인 카테고리 업데이트
router.put('/categories/english-adult/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const { webtoonIds } = req.body;

    if (!['banner', 'realtime', 'daily', 'week', 'complete', 'latest', 'new', 'finished'].includes(category)) {
      return res.status(400).json({ message: '유효하지 않은 카테고리입니다.' });
    }

    englishAdultCategorySettings[category] = webtoonIds || [];

    // 파일에 저장
    saveEnglishAdultCategorySettings(englishAdultCategorySettings);


    res.json({
      message: `영어 성인 ${category} 카테고리가 업데이트되었습니다.`,
      [category]: englishAdultCategorySettings[category]
    });
  } catch (error) {
    res.status(500).json({ message: '영어 성인 카테고리 업데이트 중 오류가 발생했습니다.' });
  }
});

// GET: 사용자 목록 조회 (프론트엔드 가입자)
router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    // 모든 사용자 조회 (테스트를 위해 임시로 필터 제거)
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        username: true,
        nickname: true,
        avatar: true,
        role: true,
        status: true,
        provider: true,
        coinBalance: true,
        adultVerified: true,
        adultVerifiedAt: true,
        birthYear: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            likes: true,
            comments: true,
            views: true,
            purchases: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: (pageNum - 1) * limitNum,
      take: limitNum
    });

    const totalCount = await prisma.user.count();

    res.json({
      success: true,
      data: users,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitNum)
      }
    });

  } catch (error) {
    console.error('사용자 목록 조회 에러:', error);
    res.status(500).json({ success: false, message: '사용자 목록 조회 중 오류가 발생했습니다.', error: error.message });
  }
});

// GET: 작가 목록 조회 (작가센터 가입자)
router.get('/authors', async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    // 웹툰을 작성한 사용자들 조회
    const authors = await prisma.user.findMany({
      where: {
        comics: {
          some: {}
        }
      },
      select: {
        id: true,
        email: true,
        username: true,
        avatar: true,
        role: true,
        status: true,
        provider: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            comics: true,
            likes: true,
            comments: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: (pageNum - 1) * limitNum,
      take: limitNum
    });

    const totalCount = await prisma.user.count({
      where: {
        comics: {
          some: {}
        }
      }
    });

    res.json({
      success: true,
      data: authors,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitNum)
      }
    });

  } catch (error) {
    console.error('작가 목록 조회 에러:', error);
    res.status(500).json({ success: false, message: '작가 목록 조회 중 오류가 발생했습니다.' });
  }
});

// 카테고리 설정을 다른 모듈에서 사용할 수 있도록 함수 export
const getCategorySettings = () => {
  // 항상 최신 파일 데이터를 읽어옴
  return loadCategorySettings();
};

const getAdultCategorySettings = () => {
  // 항상 최신 파일 데이터를 읽어옴
  return loadAdultCategorySettings();
};

const getEnglishCategorySettings = () => {
  // 항상 최신 파일 데이터를 읽어옴
  return loadEnglishCategorySettings();
};

const getEnglishAdultCategorySettings = () => {
  // 항상 최신 파일 데이터를 읽어옴
  return loadEnglishAdultCategorySettings();
};

// 특정 웹툰의 에피소드 수 조회
router.get('/comics/:comicId/episodes-count', async (req, res) => {
  try {
    const { comicId } = req.params;
    
    const count = await prisma.episode.count({
      where: { comicId: comicId }
    });
    
    res.json({
      success: true,
      count
    });
    
  } catch (error) {
    console.error('에피소드 수 조회 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '에피소드 수를 조회하는 중 오류가 발생했습니다.' 
    });
  }
});

// 관리자 소설 목록 조회
router.get('/novels', adminAuth, async (req, res) => {
  try {
    const novels = await prisma.novel.findMany({
      include: {
        author: {
          select: { nickname: true, id: true, user: { select: { username: true } } }
        },
        _count: {
          select: { 
            chapters: true,
            likes: true,
            comments: true
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    // 데이터 포맷팅
    const formattedNovels = novels.map(novel => ({
      id: novel.id,
      title: novel.title,
      author: novel.author?.nickname || novel.author?.user?.username || '작가',
      authorId: novel.authorId,
      genre: novel.genre,
      thumbnail: novel.thumbnail,
      description: novel.description,
      status: novel.status,
      chapterCount: novel._count.chapters || 0,
      viewCount: novel.viewCount || 0,
      likeCount: novel._count.likes || 0,
      commentCount: novel._count.comments || 0,
      createdAt: novel.createdAt,
      updatedAt: novel.updatedAt,
      isAdult: novel.isAdult || false,
      isFeatured: novel.isFeatured || false,
      isBlocked: novel.isBlocked || false
    }));

    res.json({ success: true, novels: formattedNovels });
  } catch (error) {
    console.error('소설 목록 조회 실패:', error);
    res.status(500).json({ success: false, error: '서버 오류가 발생했습니다.' });
  }
});

// 소설 추천 설정
router.put('/novels/:id/feature', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { featured } = req.body;

    const novel = await prisma.novel.update({
      where: { id },
      data: { isFeatured: featured }
    });

    res.json({ success: true, novel });
  } catch (error) {
    console.error('소설 추천 설정 실패:', error);
    res.status(500).json({ success: false, error: '서버 오류가 발생했습니다.' });
  }
});

// 소설 차단 설정
router.put('/novels/:id/block', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { blocked } = req.body;

    const novel = await prisma.novel.update({
      where: { id },
      data: { isBlocked: blocked }
    });

    res.json({ success: true, novel });
  } catch (error) {
    console.error('소설 차단 설정 실패:', error);
    res.status(500).json({ success: false, error: '서버 오류가 발생했습니다.' });
  }
});

// 소설 삭제
router.delete('/novels/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // 관련된 모든 데이터 삭제 (chapters, likes, comments 등)
    await prisma.$transaction([
      prisma.chapter.deleteMany({ where: { novelId: id } }),
      prisma.novelLike.deleteMany({ where: { novelId: id } }),
      prisma.novelComment.deleteMany({ where: { novelId: id } }),
      prisma.novel.delete({ where: { id } })
    ]);

    res.json({ success: true, message: '소설이 삭제되었습니다.' });
  } catch (error) {
    console.error('소설 삭제 실패:', error);
    res.status(500).json({ success: false, error: '서버 오류가 발생했습니다.' });
  }
});

// GET: 특정 사용자 상세 조회 (코인 정보 포함)
router.get('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        username: true,
        nickname: true,
        coinBalance: true,
        status: true,
        role: true,
        avatar: true,
        provider: true,
        adultVerified: true,
        birthYear: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            purchases: true,
            comments: true,
            likes: true
          }
        }
      }
    });
    
    if (!user) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }
    
    res.json(user);
    
  } catch (error) {
    console.error('사용자 조회 오류:', error);
    res.status(500).json({ message: '사용자 조회 중 오류가 발생했습니다.' });
  }
});

// GET: 특정 사용자의 결제 내역 조회
router.get('/users/:id/payments', async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 50 } = req.query;
    
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    
    // 사용자 존재 확인
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, username: true, nickname: true }
    });
    
    if (!user) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }
    
    // 결제 내역 조회
    const payments = await prisma.payment.findMany({
      where: { userId: id },
      include: {
        user: {
          select: {
            email: true,
            username: true,
            nickname: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: (pageNum - 1) * limitNum,
      take: limitNum
    });
    
    const totalCount = await prisma.payment.count({
      where: { userId: id }
    });
    
    res.json({
      payments,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitNum)
      }
    });
    
  } catch (error) {
    console.error('결제 내역 조회 오류:', error);
    res.status(500).json({ message: '결제 내역 조회 중 오류가 발생했습니다.' });
  }
});

// POST: 결제 환불 처리
router.post('/payments/:paymentId/refund', async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { reason } = req.body;
    
    if (!reason) {
      return res.status(400).json({ message: '환불 사유를 입력해주세요.' });
    }
    
    // 결제 정보 조회
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            coinBalance: true
          }
        }
      }
    });
    
    if (!payment) {
      return res.status(404).json({ message: '결제 정보를 찾을 수 없습니다.' });
    }
    
    if (payment.status !== 'COMPLETED') {
      return res.status(400).json({ message: '완료된 결제만 환불할 수 있습니다.' });
    }
    
    if (payment.status === 'REFUNDED') {
      return res.status(400).json({ message: '이미 환불된 결제입니다.' });
    }
    
    // 사용자의 코인이 충분한지 확인
    const totalCoins = payment.coinAmount + payment.bonusCoins;
    if (payment.user.coinBalance < totalCoins) {
      return res.status(400).json({ 
        message: `사용자의 코인이 부족하여 환불할 수 없습니다. (필요: ${totalCoins}, 보유: ${payment.user.coinBalance})` 
      });
    }
    
    // 트랜잭션으로 환불 처리
    const result = await prisma.$transaction(async (tx) => {
      // 결제 상태를 환불로 변경
      const updatedPayment = await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: 'REFUNDED',
          refundAmount: payment.amount,
          refundReason: reason,
          refundedAt: new Date()
        }
      });
      
      // 사용자 코인 차감
      const updatedUser = await tx.user.update({
        where: { id: payment.userId },
        data: {
          coinBalance: {
            decrement: totalCoins
          }
        }
      });
      
      // 코인 거래 내역 생성 (환불)
      const transaction = await tx.coinTransaction.create({
        data: {
          userId: payment.userId,
          type: 'REFUND',
          amount: -totalCoins,
          balance: updatedUser.coinBalance,
          description: `결제 환불: ${reason}`,
          paymentId: paymentId,
          status: 'COMPLETED'
        }
      });
      
      return { payment: updatedPayment, user: updatedUser, transaction };
    });
    
    console.log(`[관리자 환불] ${payment.user.email}: ${payment.merchantUid} - ${totalCoins}코인 차감, 사유: ${reason}`);
    
    // 실제 PG사 환불 처리 (이니시스 API 호출 필요)
    // TODO: 이니시스 환불 API 연동
    
    res.json({
      message: '환불이 완료되었습니다.',
      payment: result.payment,
      refundedCoins: totalCoins,
      remainingBalance: result.user.coinBalance
    });
    
  } catch (error) {
    console.error('환불 처리 오류:', error);
    res.status(500).json({ message: '환불 처리 중 오류가 발생했습니다.' });
  }
});

// GET: 특정 사용자의 코인 거래 내역 조회
router.get('/users/:id/transactions', async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 50 } = req.query;
    
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    
    // 사용자 존재 확인
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, coinBalance: true }
    });
    
    if (!user) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }
    
    // 거래 내역 조회
    const transactions = await prisma.coinTransaction.findMany({
      where: { userId: id },
      include: {
        payment: {
          select: {
            amount: true,
            payMethod: true,
            merchantUid: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: (pageNum - 1) * limitNum,
      take: limitNum
    });
    
    const totalCount = await prisma.coinTransaction.count({
      where: { userId: id }
    });
    
    res.json({
      transactions,
      currentBalance: user.coinBalance,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitNum)
      }
    });
    
  } catch (error) {
    console.error('거래 내역 조회 오류:', error);
    res.status(500).json({ message: '거래 내역 조회 중 오류가 발생했습니다.' });
  }
});

// POST: 관리자가 사용자 코인 조정 (지급/차감)
router.post('/users/:id/adjust-coins', async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, reason, type } = req.body;
    
    // 입력값 검증
    if (!amount || !reason || !type) {
      return res.status(400).json({ message: '필수 정보가 누락되었습니다.' });
    }
    
    if (!['REWARD', 'REFUND'].includes(type)) {
      return res.status(400).json({ message: '유효하지 않은 조정 타입입니다.' });
    }
    
    // 사용자 조회
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, coinBalance: true, email: true, username: true }
    });
    
    if (!user) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }
    
    // 차감인 경우 잔액 확인
    if (amount < 0 && Math.abs(amount) > user.coinBalance) {
      return res.status(400).json({ message: '사용자의 코인 잔액이 부족합니다.' });
    }
    
    // 트랜잭션으로 코인 조정 및 기록
    const result = await prisma.$transaction(async (tx) => {
      // 사용자 코인 잔액 업데이트
      const updatedUser = await tx.user.update({
        where: { id },
        data: {
          coinBalance: {
            increment: amount
          }
        }
      });
      
      // 거래 내역 생성
      const transaction = await tx.coinTransaction.create({
        data: {
          userId: id,
          type: type,
          amount: amount,
          balance: updatedUser.coinBalance,
          description: `[관리자 조정] ${reason}`,
          status: 'COMPLETED'
        }
      });
      
      return { user: updatedUser, transaction };
    });
    
    console.log(`[관리자 코인 조정] ${user.email}: ${amount}코인 ${type === 'REWARD' ? '지급' : '차감'} - ${reason}`);
    
    res.json({
      message: `코인 ${type === 'REWARD' ? '지급' : '차감'}이 완료되었습니다.`,
      user: {
        id: result.user.id,
        email: result.user.email,
        coinBalance: result.user.coinBalance
      },
      transaction: result.transaction
    });
    
  } catch (error) {
    console.error('코인 조정 오류:', error);
    res.status(500).json({ message: '코인 조정 중 오류가 발생했습니다.' });
  }
});

// 웹툰 결제 설정 업데이트
router.put('/comics/:comicId/payment-settings', async (req, res) => {
  try {
    const { comicId } = req.params;
    const { paidStartEpisode, episodeCoinPrice } = req.body;
    
    // 입력값 검증
    if (paidStartEpisode < 0 || episodeCoinPrice < 0) {
      return res.status(400).json({
        success: false,
        message: '유료 시작화와 코인 가격은 0 이상이어야 합니다.'
      });
    }
    
    if (episodeCoinPrice > 100) {
      return res.status(400).json({
        success: false,
        message: '에피소드당 코인 가격은 100코인을 초과할 수 없습니다.'
      });
    }
    
    // 웹툰 존재 확인
    const comic = await prisma.comic.findUnique({
      where: { id: comicId }
    });
    
    if (!comic) {
      return res.status(404).json({
        success: false,
        message: '웹툰을 찾을 수 없습니다.'
      });
    }
    
    // 총 에피소드 수 확인
    const totalEpisodes = await prisma.episode.count({
      where: { comicId: comicId }
    });
    
    if (paidStartEpisode > totalEpisodes) {
      return res.status(400).json({
        success: false,
        message: `유료 시작화는 총 에피소드 수(${totalEpisodes}화)를 초과할 수 없습니다.`
      });
    }
    
    // 결제 설정 업데이트
    const updatedComic = await prisma.comic.update({
      where: { id: comicId },
      data: {
        paidStartEpisode: parseInt(paidStartEpisode),
        episodeCoinPrice: parseInt(episodeCoinPrice)
      }
    });
    
    console.log(`웹툰 결제 설정 업데이트: ${comic.title} - 유료시작: ${paidStartEpisode}화, 가격: ${episodeCoinPrice}코인`);
    
    res.json({
      success: true,
      message: '결제 설정이 업데이트되었습니다.',
      comic: {
        id: updatedComic.id,
        title: updatedComic.title,
        paidStartEpisode: updatedComic.paidStartEpisode,
        episodeCoinPrice: updatedComic.episodeCoinPrice
      }
    });
    
  } catch (error) {
    console.error('결제 설정 업데이트 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '결제 설정을 업데이트하는 중 오류가 발생했습니다.' 
    });
  }
});

// GET: 신고 목록 조회 (관리자용)
router.get('/reports', async (req, res) => {
  try {
    const { page = 1, limit = 20, status, type } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (status) where.status = status;
    if (type) where.type = type;

    const reports = await prisma.report.findMany({
      where,
      include: {
        reporter: {
          select: { id: true, username: true, nickname: true, email: true }
        },
        comic: {
          select: { id: true, title: true }
        },
        episode: {
          select: { id: true, title: true, episodeNumber: true }
        },
        comment: {
          select: { id: true, content: true }
        },
        targetUser: {
          select: { id: true, username: true, nickname: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: parseInt(limit)
    });

    const total = await prisma.report.count({ where });

    res.json({
      success: true,
      reports,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('신고 목록 조회 오류:', error);
    res.status(500).json({ success: false, message: '신고 목록 조회 중 오류가 발생했습니다.' });
  }
});

// PUT: 신고 처리 (관리자용)
router.put('/reports/:id/process', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, resolution } = req.body;

    if (!['PROCESSING', 'RESOLVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: '유효하지 않은 상태입니다.' 
      });
    }

    const report = await prisma.report.update({
      where: { id },
      data: {
        status,
        resolution,
        resolvedAt: status === 'RESOLVED' || status === 'REJECTED' ? new Date() : null,
        resolvedBy: status === 'RESOLVED' || status === 'REJECTED' ? 'admin' : null
      }
    });

    res.json({
      success: true,
      message: '신고가 처리되었습니다.',
      report
    });
  } catch (error) {
    console.error('신고 처리 오류:', error);
    res.status(500).json({ success: false, message: '신고 처리 중 오류가 발생했습니다.' });
  }
});

// GET: 신고 통계 (관리자용)
router.get('/reports/stats', async (req, res) => {
  try {
    const totalReports = await prisma.report.count();
    const pendingReports = await prisma.report.count({ where: { status: 'PENDING' } });
    const processingReports = await prisma.report.count({ where: { status: 'PROCESSING' } });
    const resolvedReports = await prisma.report.count({ where: { status: 'RESOLVED' } });
    const rejectedReports = await prisma.report.count({ where: { status: 'REJECTED' } });

    // 유형별 통계
    const reportsByType = await prisma.report.groupBy({
      by: ['type'],
      _count: true
    });

    // 사유별 통계
    const reportsByReason = await prisma.report.groupBy({
      by: ['reason'],
      _count: true
    });

    res.json({
      success: true,
      stats: {
        total: totalReports,
        pending: pendingReports,
        processing: processingReports,
        resolved: resolvedReports,
        rejected: rejectedReports,
        byType: reportsByType,
        byReason: reportsByReason
      }
    });
  } catch (error) {
    console.error('신고 통계 조회 오류:', error);
    res.status(500).json({ success: false, message: '신고 통계 조회 중 오류가 발생했습니다.' });
  }
});

module.exports = router;
module.exports.getCategorySettings = getCategorySettings;
module.exports.getAdultCategorySettings = getAdultCategorySettings;
module.exports.getEnglishCategorySettings = getEnglishCategorySettings;
module.exports.getEnglishAdultCategorySettings = getEnglishAdultCategorySettings;