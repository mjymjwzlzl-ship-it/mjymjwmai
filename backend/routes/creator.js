const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { prisma } = require('../lib/prisma');
const { authenticate } = require('../middleware/auth');
const { optimizeUploadedImage, optimizeMultipleImages } = require('../utils/imageOptimizer');

const router = express.Router();

// 업로드 폴더 생성
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// multer 설정
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // 원본 파일명 유지, 중복 방지를 위해 타임스탬프만 앞에 추가
    const timestamp = Date.now();
    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8'); // 한글 파일명 처리
    cb(null, `${timestamp}_${originalName}`);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 20 * 1024 * 1024 // 20MB
  }
});

// 모든 creator 라우트에 인증 필요
router.use(authenticate);

// 헬퍼 함수: 웹툰명에서 안전한 폴더명 생성
function sanitizeFolderName(title) {
  // 파일명으로 사용 불가능한 문자 제거 (Windows 기준)
  return title.replace(/[<>:"/\\|?*]/g, '').trim();
}

// 헬퍼 함수: 웹툰 디렉토리 생성
function createWebtoonDirectory(title, rating) {
  const baseDir = path.join(__dirname, '../uploads/webtoons');
  const category = (rating === '19' || rating === 'ADULT') ? 'adult' : 'general';
  const safeFolderName = sanitizeFolderName(title);
  const webtoonDir = path.join(baseDir, category, safeFolderName);

  if (!fs.existsSync(webtoonDir)) {
    fs.mkdirSync(webtoonDir, { recursive: true });
  }

  return { webtoonDir, category, safeFolderName };
}

// 헬퍼 함수: 에피소드 디렉토리 생성
function createEpisodeDirectory(webtoonPath, episodeNumber) {
  const episodeDir = path.join(webtoonPath, `episode-${String(episodeNumber).padStart(3, '0')}`);

  if (!fs.existsSync(episodeDir)) {
    fs.mkdirSync(episodeDir, { recursive: true });
  }

  return episodeDir;
}

// 작가 프로필 조회 또는 생성
router.get('/profile', async (req, res) => {
  try {
    const userId = req.user.id;
    
    let author = await prisma.author.findUnique({
      where: { userId }
    });
    
    if (!author) {
      // 작가 프로필이 없으면 생성
      author = await prisma.author.create({
        data: {
          userId,
          nickname: req.user.nickname || req.user.username || `작가${userId.slice(-6)}`,
        }
      });
    }
    
    res.json({ success: true, author });
  } catch (error) {
    console.error('작가 프로필 조회 실패:', error);
    res.status(500).json({ success: false, error: '서버 오류가 발생했습니다.' });
  }
});

// 작가의 소설 목록 조회
router.get('/novels', async (req, res) => {
  try {
    const userId = req.user.id;
    
    // 작가 확인
    const author = await prisma.author.findUnique({
      where: { userId }
    });
    
    if (!author) {
      return res.json({ success: true, novels: [] });
    }
    
    const novels = await prisma.novel.findMany({
      where: { authorId: author.id },
      include: {
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
    
    res.json({ success: true, novels });
  } catch (error) {
    console.error('소설 목록 조회 실패:', error);
    res.status(500).json({ success: false, error: '서버 오류가 발생했습니다.' });
  }
});

// 소설 생성
router.post('/novels', async (req, res) => {
  try {
    const { title, description, genre, isAdult, thumbnail } = req.body;
    const userId = req.user.id;
    
    // 작가 프로필 확인 또는 생성
    let author = await prisma.author.findUnique({
      where: { userId }
    });
    
    if (!author) {
      author = await prisma.author.create({
        data: {
          userId,
          nickname: req.user.nickname || req.user.username || `작가${userId.slice(-6)}`,
        }
      });
    }
    
    const novel = await prisma.novel.create({
      data: {
        title,
        description,
        genre,
        isAdult: isAdult || false,
        thumbnail: thumbnail || null,
        authorId: author.id,
        status: 'ongoing'
      }
    });
    
    res.json({ success: true, novel });
  } catch (error) {
    console.error('소설 생성 실패:', error);
    res.status(500).json({ success: false, error: '서버 오류가 발생했습니다.' });
  }
});

// 소설 삭제
router.delete('/novels/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    // 작가 확인
    const author = await prisma.author.findUnique({
      where: { userId }
    });
    
    if (!author) {
      return res.status(403).json({ success: false, error: '권한이 없습니다.' });
    }
    
    // 소설 소유권 확인
    const novel = await prisma.novel.findUnique({
      where: { id }
    });
    
    if (!novel || novel.authorId !== author.id) {
      return res.status(403).json({ success: false, error: '권한이 없습니다.' });
    }
    
    await prisma.novel.delete({
      where: { id }
    });
    
    res.json({ success: true, message: '소설이 삭제되었습니다.' });
  } catch (error) {
    console.error('소설 삭제 실패:', error);
    res.status(500).json({ success: false, error: '서버 오류가 발생했습니다.' });
  }
});

// POST: 크리에이터 웹툰 등록
router.post('/comics', upload.single('thumbnail'), async (req, res) => {
  try {
    const {
      title,
      description,
      genre,
      tags,
      rating,
      status,
      locale,
      authorName,
      authorIntro,
      paidStartEpisode,
      episodeCoinPrice
    } = req.body;


    // 입력값 검증
    if (!title || !genre) {
      return res.status(400).json({ message: '제목과 장르는 필수입니다.' });
    }

    // 웹툰 폴더 생성 (rating에 따라 adult/general 분리)
    const { webtoonDir, category, safeFolderName } = createWebtoonDirectory(title, rating);

    // 썸네일 최적화 및 경로
    let thumbnailPath = null;
    if (req.file) {
      // 임시 업로드된 파일
      const tempFilePath = path.join(uploadsDir, req.file.filename);

      // 캐시 문제 해결을 위해 타임스탬프 추가
      const timestamp = Date.now();
      const ext = path.extname(req.file.filename);
      const thumbnailFileName = `thumbnail-${timestamp}${ext}`;
      const newFilePath = path.join(webtoonDir, thumbnailFileName);

      // 파일 이동
      fs.renameSync(tempFilePath, newFilePath);

      // WebP 최적화
      await optimizeUploadedImage(newFilePath, { maxWidth: 800, webpQuality: 85, createWebP: true });

      // WebP 파일이 생성되었으면 WebP 경로 사용
      const webpFileName = thumbnailFileName.replace(/\.(jpg|jpeg|png)$/i, '.webp');
      const webpPath = path.join(webtoonDir, webpFileName);
      if (fs.existsSync(webpPath)) {
        thumbnailPath = `/uploads/webtoons/${category}/${safeFolderName}/${webpFileName}`;
      } else {
        thumbnailPath = `/uploads/webtoons/${category}/${safeFolderName}/${thumbnailFileName}`;
      }
    }

    // 웹툰 생성
    const comic = await prisma.comic.create({
      data: {
        title,
        description: description || null,
        thumbnail: thumbnailPath,
        genre: genre, // 단일 문자열로 저장
        isOfficial: false,
        status: status?.toUpperCase() || 'ONGOING',
        locale: locale || 'ko', // 기본값: 한국어
        authorId: req.user.id,
        authorName: authorName || null,
        paidStartEpisode: parseInt(paidStartEpisode) || 0, // 유료 시작 회차 (0이면 모두 무료)
        episodeCoinPrice: parseInt(episodeCoinPrice) || 3, // 에피소드당 코인 가격
      }
    });

    res.status(201).json({ 
      message: '웹툰이 성공적으로 등록되었습니다.',
      id: comic.id,
      comic: comic
    });

  } catch (error) {
    res.status(500).json({ message: '웹툰 등록 중 오류가 발생했습니다.' });
  }
});

// GET: 내 웹툰 목록 조회
router.get('/comics', async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 1000 } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    // 전체 개수 조회
    const totalCount = await prisma.comic.count({
      where: { authorId: userId }
    });

    // 웹툰 목록 조회
    const comics = await prisma.comic.findMany({
      where: { authorId: userId },
      include: {
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
            comments: true,
            views: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: (pageNum - 1) * limitNum,
      take: limitNum
    });

    res.json({
      comics,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitNum)
      }
    });

  } catch (error) {
    res.status(500).json({ message: '웹툰 목록 조회 중 오류가 발생했습니다.' });
  }
});

// GET: 단일 웹툰 조회
router.get('/comics/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const comic = await prisma.comic.findFirst({
      where: {
        id,
        authorId: userId
      },
      include: {
        episodes: {
          select: {
            id: true,
            title: true,
            episodeNumber: true,
            thumbnail: true,
            images: true,
            createdAt: true,
            updatedAt: true
          },
          orderBy: { episodeNumber: 'asc' }
        }
      }
    });

    if (!comic) {
      return res.status(404).json({ message: '웹툰을 찾을 수 없거나 권한이 없습니다.' });
    }

    // 에피소드별 썸네일 정보 디버깅 및 images 필드 변환
    comic.episodes.forEach(ep => {
      
      // images 필드를 배열로 변환
      if (ep.images && typeof ep.images === 'string') {
        ep.images = ep.images.split(',').filter(img => img.trim());
      } else if (!ep.images) {
        ep.images = [];
      }
    });

    res.json(comic);
  } catch (error) {
    res.status(500).json({ message: '웹툰 조회 중 오류가 발생했습니다.' });
  }
});

// PUT: 내 웹툰 수정
router.put('/comics/:id', upload.single('thumbnail'), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const {
      title,
      description,
      genre,
      tags,
      rating,
      status,
      locale,
      authorName,
      authorIntro,
      paidStartEpisode,
      episodeCoinPrice
    } = req.body;


    // 소유권 확인
    const comic = await prisma.comic.findFirst({
      where: {
        id,
        authorId: userId
      }
    });

    if (!comic) {
      return res.status(404).json({ message: '웹툰을 찾을 수 없거나 권한이 없습니다.' });
    }

    // 업데이트 데이터 준비
    const updateData = {
      title,
      description: description || null,
      genre,
      rating: rating, // rating 필드 추가
      status: status?.toUpperCase() || 'ONGOING',
      locale: locale || comic.locale || 'ko', // locale 필드 추가 (기존값 유지)
      authorName: authorName || null,
      paidStartEpisode: paidStartEpisode !== undefined ? parseInt(paidStartEpisode) : comic.paidStartEpisode,
      episodeCoinPrice: episodeCoinPrice !== undefined ? parseInt(episodeCoinPrice) : comic.episodeCoinPrice,
      updatedAt: new Date()
    };


    // 새 썸네일이 업로드된 경우에만 썸네일 경로 업데이트
    if (req.file) {
      // 폴더 구조 생성
      const { webtoonDir, category, safeFolderName } = createWebtoonDirectory(
        title || comic.title,
        rating || comic.rating
      );

      const tempFilePath = path.join(uploadsDir, req.file.filename);

      // 캐시 문제 해결을 위해 타임스탬프 추가
      const timestamp = Date.now();
      const ext = path.extname(req.file.filename);
      const thumbnailFileName = `thumbnail-${timestamp}${ext}`;
      const newFilePath = path.join(webtoonDir, thumbnailFileName);

      // 파일 이동
      fs.renameSync(tempFilePath, newFilePath);

      // 이미지 최적화
      await optimizeUploadedImage(newFilePath, { maxWidth: 800, webpQuality: 85, createWebP: true });

      // WebP 파일 경로 설정
      const webpFileName = thumbnailFileName.replace(/\.(jpg|jpeg|png)$/i, '.webp');
      const webpPath = path.join(webtoonDir, webpFileName);

      if (fs.existsSync(webpPath)) {
        updateData.thumbnail = `/uploads/webtoons/${category}/${safeFolderName}/${webpFileName}`;

        // 기존 썸네일 파일 삭제 (선택적)
        if (comic.thumbnail && comic.thumbnail !== updateData.thumbnail) {
          const oldThumbnailPath = comic.thumbnail.startsWith('/')
            ? path.join(__dirname, '..', comic.thumbnail.slice(1))
            : path.join(__dirname, '..', comic.thumbnail);

          if (fs.existsSync(oldThumbnailPath)) {
            try {
              fs.unlinkSync(oldThumbnailPath);
              console.log('Old thumbnail deleted:', oldThumbnailPath);
            } catch (err) {
              console.error('Failed to delete old thumbnail:', err.message);
            }
          }
        }
      } else {
        updateData.thumbnail = `/uploads/webtoons/${category}/${safeFolderName}/${thumbnailFileName}`;
      }
    }

    // 웹툰 업데이트
    const updatedComic = await prisma.comic.update({
      where: { id },
      data: updateData
    });

    res.json({
      message: '웹툰이 수정되었습니다.',
      comic: updatedComic
    });

  } catch (error) {
    res.status(500).json({ message: '웹툰 수정 중 오류가 발생했습니다.', error: process.env.NODE_ENV === 'development' ? error.message : undefined });
  }
});

// POST: 에피소드 추가
router.post('/comics/:id/episodes', upload.fields([
  { name: 'thumbnail', maxCount: 1 },
  { name: 'images', maxCount: 50 }
]), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const { title, episodeNumber } = req.body;

    
    if (!req.user) {
      return res.status(401).json({ message: '인증된 사용자가 아닙니다.' });
    }

    // 소유권 확인
    const comic = await prisma.comic.findFirst({
      where: {
        id,
        authorId: userId
      }
    });

    if (!comic) {
      return res.status(404).json({ message: '웹툰을 찾을 수 없거나 권한이 없습니다.' });
    }

    const requestedEpisodeNumber = episodeNumber !== undefined ? parseInt(episodeNumber) : 1;
    
    // 중복 에피소드 번호 확인
    const existingEpisode = await prisma.episode.findFirst({
      where: {
        comicId: id,
        episodeNumber: requestedEpisodeNumber
      }
    });

    if (existingEpisode) {
      // 기존 에피소드들을 조회해서 다음 가능한 번호 제안
      const allEpisodes = await prisma.episode.findMany({
        where: { comicId: id },
        select: { episodeNumber: true },
        orderBy: { episodeNumber: 'asc' }
      });
      
      const existingNumbers = allEpisodes.map(ep => ep.episodeNumber);
      // 0화(프롤로그)가 없으면 0을 제안, 있으면 1부터 시작
      let suggestedNumber = existingNumbers.includes(0) ? 1 : 0;
      while (existingNumbers.includes(suggestedNumber)) {
        suggestedNumber++;
      }
      
      return res.status(409).json({ 
        message: `에피소드 번호 ${requestedEpisodeNumber}는 이미 존재합니다.`,
        suggestedEpisodeNumber: suggestedNumber,
        existingEpisodes: existingNumbers
      });
    }

    // 파일 업로드 확인 및 검증 - 디버그용 로그 제거됨

    // 필수 파일 검증 (썸네일과 이미지 중 하나는 있어야 함)
    const hasThumbnail = req.files?.thumbnail?.[0];
    const hasImages = req.files?.images && req.files.images.length > 0;
    
    if (!hasThumbnail && !hasImages) {
      return res.status(400).json({ 
        message: '썸네일 또는 에피소드 이미지 중 하나는 업로드해야 합니다.' 
      });
    }

    // 웹툰 폴더 구조 생성
    const { webtoonDir, category, safeFolderName } = createWebtoonDirectory(comic.title, comic.rating);
    const episodeDir = createEpisodeDirectory(webtoonDir, requestedEpisodeNumber);

    // 썸네일 파일 최적화 및 경로
    let thumbnailPath = null;
    if (hasThumbnail) {
      // 임시 업로드된 파일
      const tempFilePath = path.join(uploadsDir, req.files.thumbnail[0].filename);

      // 캐시 문제 해결을 위해 타임스탬프 추가
      const timestamp = Date.now();
      const ext = path.extname(req.files.thumbnail[0].filename);
      const thumbnailFileName = `thumbnail-${timestamp}${ext}`;
      const newFilePath = path.join(episodeDir, thumbnailFileName);

      // 파일 이동
      fs.renameSync(tempFilePath, newFilePath);

      // WebP 최적화
      await optimizeUploadedImage(newFilePath, { maxWidth: 800, webpQuality: 85, createWebP: true });

      // WebP 파일이 생성되었으면 WebP 경로 사용
      const webpFileName = thumbnailFileName.replace(/\.(jpg|jpeg|png)$/i, '.webp');
      const webpPath = path.join(episodeDir, webpFileName);
      if (fs.existsSync(webpPath)) {
        thumbnailPath = `/uploads/webtoons/${category}/${safeFolderName}/episode-${String(requestedEpisodeNumber).padStart(3, '0')}/${webpFileName}`;
      } else {
        thumbnailPath = `/uploads/webtoons/${category}/${safeFolderName}/episode-${String(requestedEpisodeNumber).padStart(3, '0')}/${thumbnailFileName}`;
      }
    }

    // 이미지 파일 최적화 및 경로들 (업로드된 순서대로)
    let imagePaths = [];
    if (hasImages) {
      imagePaths = [];
      for (let i = 0; i < req.files.images.length; i++) {
        const file = req.files.images[i];
        const tempFilePath = path.join(uploadsDir, file.filename);

        // 파일 번호를 3자리로 패딩 (001, 002, ...)
        const imageFileName = `${String(i + 1).padStart(3, '0')}${path.extname(file.filename)}`;
        const newFilePath = path.join(episodeDir, imageFileName);

        // 파일 이동
        fs.renameSync(tempFilePath, newFilePath);

        // WebP 최적화
        await optimizeUploadedImage(newFilePath, { maxWidth: 1200, webpQuality: 85, createWebP: true });

        // WebP 파일이 생성되었으면 WebP 경로 사용
        const webpFileName = imageFileName.replace(/\.(jpg|jpeg|png)$/i, '.webp');
        const webpPath = path.join(episodeDir, webpFileName);
        if (fs.existsSync(webpPath)) {
          imagePaths.push(`/uploads/webtoons/${category}/${safeFolderName}/episode-${String(requestedEpisodeNumber).padStart(3, '0')}/${webpFileName}`);
        } else {
          imagePaths.push(`/uploads/webtoons/${category}/${safeFolderName}/episode-${String(requestedEpisodeNumber).padStart(3, '0')}/${imageFileName}`);
        }
      }
    }
    
    // 파일 정보 로그 제거됨

    // 에피소드 생성
    const episode = await prisma.episode.create({
      data: {
        title,
        episodeNumber: requestedEpisodeNumber,
        thumbnail: thumbnailPath,
        images: imagePaths.join(','), // 콤마로 구분된 문자열로 저장
        comicId: id
      }
    });

    // 웹툰의 updatedAt을 현재 시간으로 업데이트 (오늘 업데이트 섹션에 표시되도록)
    await prisma.comic.update({
      where: { id },
      data: { updatedAt: new Date() }
    });

    res.status(201).json({
      message: '에피소드가 추가되었습니다.',
      episode
    });

  } catch (error) {
    res.status(500).json({ 
      message: '에피소드 추가 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// POST: 에피소드에 새 이미지 추가
router.post('/episodes/:id/add-images', upload.array('images', 20), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;


    // 파일이 없는 경우 체크
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: '업로드할 이미지가 없습니다.' });
    }

    // 에피소드 조회 및 권한 확인
    const episode = await prisma.episode.findFirst({
      where: { id },
      include: {
        comic: {
          select: {
            authorId: true
          }
        }
      }
    });

    if (!episode) {
      return res.status(404).json({ message: '에피소드를 찾을 수 없습니다.' });
    }

    if (episode.comic.authorId !== userId) {
      return res.status(403).json({ message: '에피소드 수정 권한이 없습니다.' });
    }

    // 새로 업로드된 이미지 최적화 및 경로들
    const imageFullPaths = req.files.map(file => path.join(uploadsDir, file.filename));
    await optimizeMultipleImages(imageFullPaths, { maxWidth: 1200, webpQuality: 85, createWebP: true });

    // WebP 파일이 있으면 WebP 경로 사용, 없으면 원본 사용
    const newImagePaths = req.files.map(file => {
      const webpFilename = file.filename.replace(/\.(jpg|jpeg|png)$/i, '.webp');
      const webpPath = path.join(uploadsDir, webpFilename);
      if (fs.existsSync(webpPath)) {
        return `/uploads/${webpFilename}`;
      } else {
        return `/uploads/${file.filename}`;
      }
    });

    res.json({
      message: '새 이미지가 성공적으로 업로드되었습니다.',
      newImages: newImagePaths,
      uploadedCount: newImagePaths.length
    });

  } catch (error) {
    res.status(500).json({ 
      message: '새 이미지 추가 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
});

// PUT: 에피소드 이미지 순서 변경
router.put('/episodes/:id/reorder', async (req, res) => {
  try {
    const { id } = req.params;
    const { images } = req.body;
    const userId = req.user.id;


    // 입력값 검증
    if (!images || !Array.isArray(images)) {
      return res.status(400).json({ message: '이미지 배열이 필요합니다.' });
    }

    // 에피소드 조회 및 권한 확인
    const episode = await prisma.episode.findFirst({
      where: { id },
      include: {
        comic: {
          select: {
            authorId: true
          }
        }
      }
    });

    if (!episode) {
      return res.status(404).json({ message: '에피소드를 찾을 수 없습니다.' });
    }

    if (episode.comic.authorId !== userId) {
      return res.status(403).json({ message: '에피소드 수정 권한이 없습니다.' });
    }

    // 이미지 순서 업데이트
    const updatedEpisode = await prisma.episode.update({
      where: { id },
      data: {
        images: images.join(','), // 콤마로 구분된 문자열로 저장
        updatedAt: new Date()
      }
    });


    res.json({
      message: '이미지 순서가 성공적으로 업데이트되었습니다.',
      episode: updatedEpisode
    });

  } catch (error) {
    res.status(500).json({ message: '이미지 순서 변경 중 오류가 발생했습니다.' });
  }
});

// GET: 디버깅용 - 모든 에피소드의 썸네일 상태 확인
router.get('/debug/episodes/:comicId', async (req, res) => {
  try {
    const { comicId } = req.params;
    
    const episodes = await prisma.episode.findMany({
      where: { comicId },
      select: {
        id: true,
        title: true,
        episodeNumber: true,
        thumbnail: true,
        createdAt: true,
        updatedAt: true,
        comic: {
          select: {
            title: true,
            thumbnail: true
          }
        }
      },
      orderBy: { episodeNumber: 'asc' }
    });

    episodes.forEach(ep => {
    });

    res.json({
      comicTitle: episodes[0]?.comic.title || '웹툰 없음',
      comicThumbnail: episodes[0]?.comic.thumbnail || null,
      episodes: episodes.map(ep => ({
        id: ep.id,
        episodeNumber: ep.episodeNumber,
        title: ep.title,
        thumbnail: ep.thumbnail,
        createdAt: ep.createdAt,
        updatedAt: ep.updatedAt
      }))
    });

  } catch (error) {
    res.status(500).json({ message: '디버깅 조회 중 오류가 발생했습니다.' });
  }
});

// PUT: 에피소드 썸네일 업데이트
router.put('/episodes/:id/thumbnail', upload.single('thumbnail'), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;


    // 에피소드 조회 및 권한 확인
    const episode = await prisma.episode.findFirst({
      where: { id },
      include: {
        comic: {
          select: {
            authorId: true
          }
        }
      }
    });

    if (!episode) {
      return res.status(404).json({ message: '에피소드를 찾을 수 없습니다.' });
    }

    if (episode.comic.authorId !== userId) {
      return res.status(403).json({ message: '에피소드 수정 권한이 없습니다.' });
    }

    // 썸네일 파일 최적화 및 경로
    let thumbnailPath = null;
    if (req.file) {
      const thumbnailFullPath = path.join(uploadsDir, req.file.filename);
      await optimizeUploadedImage(thumbnailFullPath, { maxWidth: 800, webpQuality: 85, createWebP: true });
      // WebP 파일이 생성되었으면 WebP 경로 사용
      const webpFilename = req.file.filename.replace(/\.(jpg|jpeg|png)$/i, '.webp');
      const webpPath = path.join(uploadsDir, webpFilename);
      if (fs.existsSync(webpPath)) {
        thumbnailPath = `/uploads/${webpFilename}`;
      } else {
        thumbnailPath = `/uploads/${req.file.filename}`;
      }
    }

    // 에피소드 썸네일 업데이트
    const updatedEpisode = await prisma.episode.update({
      where: { id },
      data: {
        thumbnail: thumbnailPath,
        updatedAt: new Date()
      }
    });

    // 에피소드 업데이트 완료

    // 업데이트 후 에피소드 상태 확인
    const verifyEpisode = await prisma.episode.findUnique({
      where: { id },
      select: { id: true, title: true, episodeNumber: true, thumbnail: true }
    });

    res.json({
      message: '에피소드 썸네일이 성공적으로 업데이트되었습니다.',
      episode: {
        id: updatedEpisode.id,
        thumbnail: updatedEpisode.thumbnail
      }
    });

  } catch (error) {
    res.status(500).json({ message: '썸네일 업데이트 중 오류가 발생했습니다.' });
  }
});

// PUT: 에피소드 전체 수정 (제목, 번호, 썸네일, 이미지)
router.put('/episodes/:id', upload.fields([
  { name: 'thumbnail', maxCount: 1 },
  { name: 'images', maxCount: 50 }
]), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, episodeNumber, imagesToDelete } = req.body;
    const userId = req.user.id;

    // 파일 정보 로그 제거됨

    // 에피소드 조회 및 권한 확인
    const episode = await prisma.episode.findFirst({
      where: { id },
      include: {
        comic: {
          select: {
            id: true,
            authorId: true,
            title: true
          }
        }
      }
    });

    if (!episode) {
      return res.status(404).json({ message: '에피소드를 찾을 수 없습니다.' });
    }

    if (episode.comic.authorId !== userId) {
      return res.status(403).json({ message: '에피소드 수정 권한이 없습니다.' });
    }

    // 에피소드 번호 중복 확인 (현재 에피소드 제외)
    if (episodeNumber && parseInt(episodeNumber) !== episode.episodeNumber) {
      const existingEpisode = await prisma.episode.findFirst({
        where: {
          comicId: episode.comic.id,
          episodeNumber: parseInt(episodeNumber),
          id: { not: id } // 현재 에피소드 제외
        }
      });

      if (existingEpisode) {
        // 기존 에피소드들을 조회해서 다음 가능한 번호 제안
        const allEpisodes = await prisma.episode.findMany({
          where: { comicId: episode.comic.id },
          select: { episodeNumber: true },
          orderBy: { episodeNumber: 'asc' }
        });
        
        const existingNumbers = allEpisodes.map(ep => ep.episodeNumber);
        // 0화(프롤로그)가 없으면 0을 제안, 있으면 1부터 시작
        let suggestedNumber = existingNumbers.includes(0) ? 1 : 0;
        while (existingNumbers.includes(suggestedNumber)) {
          suggestedNumber++;
        }
        
        return res.status(409).json({ 
          message: `에피소드 번호 ${episodeNumber}는 이미 존재합니다.`,
          suggestedEpisodeNumber: suggestedNumber,
          existingEpisodes: existingNumbers
        });
      }
    }

    // 업데이트할 데이터 준비
    const updateData = {};
    
    // 제목 업데이트
    if (title) {
      updateData.title = title;
    }
    
    // 에피소드 번호 업데이트
    if (episodeNumber) {
      updateData.episodeNumber = parseInt(episodeNumber);
    }

    // 새 썸네일 처리 (WebP 변환 포함)
    if (req.files?.thumbnail?.[0]) {
      const thumbnailFullPath = path.join(uploadsDir, req.files.thumbnail[0].filename);
      await optimizeUploadedImage(thumbnailFullPath, { maxWidth: 800, webpQuality: 85, createWebP: true });
      // WebP 파일이 생성되었으면 WebP 경로 사용
      const webpFilename = req.files.thumbnail[0].filename.replace(/\.(jpg|jpeg|png)$/i, '.webp');
      const webpPath = path.join(uploadsDir, webpFilename);
      if (fs.existsSync(webpPath)) {
        updateData.thumbnail = `/uploads/${webpFilename}`;
      } else {
        updateData.thumbnail = `/uploads/${req.files.thumbnail[0].filename}`;
      }
    }

    // 기존 이미지 처리
    let currentImages = episode.images ? episode.images.split(',').filter(img => img.trim()) : [];

    // 삭제할 이미지들 제거
    if (imagesToDelete) {
      const deleteList = typeof imagesToDelete === 'string' ? JSON.parse(imagesToDelete) : imagesToDelete;
      if (Array.isArray(deleteList) && deleteList.length > 0) {
        currentImages = currentImages.filter(img => !deleteList.includes(img));
      }
    }

    // 새 이미지들 추가 (WebP 변환 포함)
    if (req.files?.images && req.files.images.length > 0) {
      const imageFullPaths = req.files.images.map(file => path.join(uploadsDir, file.filename));
      await optimizeMultipleImages(imageFullPaths, { maxWidth: 1200, webpQuality: 85, createWebP: true });
      // WebP 파일이 있으면 WebP 경로 사용, 없으면 원본 사용
      const newImagePaths = req.files.images.map(file => {
        const webpFilename = file.filename.replace(/\.(jpg|jpeg|png)$/i, '.webp');
        const webpPath = path.join(uploadsDir, webpFilename);
        if (fs.existsSync(webpPath)) {
          return `/uploads/${webpFilename}`;
        } else {
          return `/uploads/${file.filename}`;
        }
      });
      currentImages = [...currentImages, ...newImagePaths];
    }

    // 이미지 배열 업데이트
    updateData.images = currentImages.join(',');
    updateData.updatedAt = new Date();


    // 에피소드 업데이트
    const updatedEpisode = await prisma.episode.update({
      where: { id },
      data: updateData
    });

    // 에피소드 업데이트 정보 로그 제거됨

    res.json({
      message: '에피소드가 성공적으로 수정되었습니다.',
      episode: {
        id: updatedEpisode.id,
        title: updatedEpisode.title,
        episodeNumber: updatedEpisode.episodeNumber,
        thumbnail: updatedEpisode.thumbnail,
        images: updatedEpisode.images ? updatedEpisode.images.split(',') : [],
        updatedAt: updatedEpisode.updatedAt
      }
    });

  } catch (error) {
    res.status(500).json({ 
      message: '에피소드 수정 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// DELETE: 에피소드 삭제
router.delete('/episodes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;


    // 에피소드 조회 및 권한 확인
    const episode = await prisma.episode.findFirst({
      where: { id },
      include: {
        comic: {
          select: {
            authorId: true,
            title: true
          }
        }
      }
    });

    if (!episode) {
      return res.status(404).json({ message: '에피소드를 찾을 수 없습니다.' });
    }

    if (episode.comic.authorId !== userId) {
      return res.status(403).json({ message: '에피소드 삭제 권한이 없습니다.' });
    }

    // 에피소드 삭제 정보 로그 제거됨

    // 에피소드 삭제
    await prisma.episode.delete({
      where: { id }
    });


    res.json({ 
      message: '에피소드가 삭제되었습니다.',
      deletedEpisode: {
        id: episode.id,
        title: episode.title,
        episodeNumber: episode.episodeNumber
      }
    });

  } catch (error) {
    res.status(500).json({ 
      message: '에피소드 삭제 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// DELETE: 내 웹툰 삭제
router.delete('/comics/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // 소유권 확인
    const comic = await prisma.comic.findFirst({
      where: {
        id,
        authorId: userId
      }
    });

    if (!comic) {
      return res.status(404).json({ message: '웹툰을 찾을 수 없거나 권한이 없습니다.' });
    }

    // 웹툰 삭제 (관련 에피소드, 댓글 등은 cascade로 삭제됨)
    await prisma.comic.delete({
      where: { id }
    });

    res.json({ message: '웹툰이 삭제되었습니다.' });

  } catch (error) {
    res.status(500).json({ message: '웹툰 삭제 중 오류가 발생했습니다.' });
  }
});


// GET: 작가 통계 조회
router.get('/statistics', async (req, res) => {
  try {
    const userId = req.user.id; // 올바른 사용자 ID 참조로 수정

    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const comics = await prisma.comic.findMany({
      where: { authorId: userId },
      include: {
        episodes: {
          select: { id: true }
        },
        _count: {
          select: { comments: true, likes: true },
        },
      },
    });

    const comicStatsPromises = comics.map(async (comic) => {
      const weeklyViews = await prisma.view.count({
        where: {
          comicId: comic.id,
          createdAt: { gte: oneWeekAgo },
        },
      });

      const monthlyViews = await prisma.view.count({
        where: {
          comicId: comic.id,
          createdAt: { gte: oneMonthAgo },
        },
      });

      return {
        id: comic.id,
        title: comic.title,
        thumbnail: comic.thumbnail,
        viewCount: comic.viewCount,
        likeCount: comic._count.likes,
        commentCount: comic._count.comments,
        episodeCount: comic.episodes.length,
        totalCoins: Math.floor(comic.viewCount * 0.02),
        lastUpdated: comic.updatedAt.toISOString(),
        weeklyViews,
        monthlyViews,
      };
    });

    const comicStats = await Promise.all(comicStatsPromises);

    const overallStats = comicStats.reduce(
      (acc, stats) => {
        acc.totalViews += stats.viewCount;
        acc.totalLikes += stats.likeCount;
        acc.totalComments += stats.commentCount;
        acc.totalEpisodes += stats.episodeCount;
        acc.totalCoins += stats.totalCoins;
        acc.thisWeekViews += stats.weeklyViews;
        acc.thisMonthViews += stats.monthlyViews;
        return acc;
      },
      {
        totalViews: 0,
        totalLikes: 0,
        totalComments: 0,
        totalComics: comics.length,
        totalEpisodes: 0,
        totalCoins: 0,
        thisWeekViews: 0,
        thisMonthViews: 0,
      }
    );

    res.json({ overallStats, comicStats });
  } catch (error) {
    res.status(500).json({ message: 'Internal Server Error' });
  }
});


// DEBUG: 특정 이메일 사용자의 정보와 작품 조회
router.get('/debug/user-data', async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) {
      return res.status(400).json({ message: 'Email query parameter is required.' });
    }

    // 현재 로그인한 사용자가 요청한 이메일의 주인인지 확인 (보안 강화)
    if (req.user.email !== email) {
        // 관리자일 경우에만 다른 사용자의 정보 조회 허용
        if (req.user.role !== 'ADMIN') {
            return res.status(403).json({ message: 'You are not authorized to view this data.' });
        }
    }

    const user = await prisma.user.findUnique({
      where: { email: email },
      select: { id: true, email: true, username: true, role: true }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found with that email.' });
    }

    const comics = await prisma.comic.findMany({
      where: { authorId: user.id },
      select: { id: true, title: true, authorId: true, viewCount: true, likeCount: true }
    });

    res.json({
      message: 'DEBUG DATA',
      user,
      comics,
      comicCount: comics.length,
    });

  } catch (error) {
    res.status(500).json({ message: 'Error in debug endpoint.', error: process.env.NODE_ENV === 'development' ? error.message : undefined });
  }
});

module.exports = router;