const express = require('express');
const router = express.Router();
const { prisma } = require('../lib/prisma');
const { authenticate, requireAdmin } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const sharp = require('sharp');

// 배너 이미지 업로드 설정
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/banners');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
    } catch (error) {
      console.error('Upload directory creation error:', error);
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    // 임시로 원본 확장자 유지 (나중에 WebP로 변환)
    cb(null, 'banner-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('이미지 파일만 업로드 가능합니다.'));
    }
  }
});

// WebP 변환 미들웨어
const convertToWebP = async (req, res, next) => {
  if (!req.file) {
    return next();
  }
  
  try {
    const inputPath = req.file.path;
    const webpFilename = req.file.filename.replace(/\.(jpg|jpeg|png|gif)$/i, '.webp');
    const outputPath = path.join(path.dirname(inputPath), webpFilename);
    
    // 이미 WebP인 경우 스킵
    if (inputPath.endsWith('.webp')) {
      // 크기만 조정 - 종횡비 유지하며 크롭
      await sharp(inputPath)
        .resize(1200, 600, {
          fit: 'cover',  // 종횡비 유지하며 영역을 채우도록 크롭
          position: 'attention'  // 스마트 크롭 (중요한 부분 중심으로)
        })
        .webp({ quality: 85 })
        .toFile(outputPath + '.tmp');
      
      await fs.unlink(inputPath);
      await fs.rename(outputPath + '.tmp', inputPath);
      return next();
    }
    
    // WebP로 변환 및 최적화 - 종횡비 유지하며 크롭
    await sharp(inputPath)
      .resize(1200, 600, {
        fit: 'cover',  // 종횡비 유지하며 영역을 채우도록 크롭
        position: 'attention'  // 스마트 크롭 (중요한 부분 중심으로)
      })
      .webp({ 
        quality: 85,
        effort: 4
      })
      .toFile(outputPath);
    
    // 원본 파일 삭제
    await fs.unlink(inputPath);
    
    // req.file 정보 업데이트
    req.file.filename = webpFilename;
    req.file.path = outputPath;
    
    next();
  } catch (error) {
    console.error('WebP 변환 실패:', error);
    next(); // 에러 시에도 계속 진행
  }
};

// 배너 목록 조회 (공개 API)
router.get('/', async (req, res) => {
  try {
    const { type } = req.query;
    
    const where = {
      isActive: true
    };
    
    if (type === 'adult') {
      where.type = 'adult';
    } else if (type === 'general') {
      where.type = { not: 'adult' };
    }
    
    const banners = await prisma.banner.findMany({
      where,
      orderBy: [
        { order: 'asc' },
        { createdAt: 'desc' }
      ]
    });
    
    // 이미지 URL은 상대 경로 그대로 반환
    const bannersWithUrls = banners.map(banner => ({
      ...banner,
      imageUrl: banner.imageUrl.startsWith('/') 
        ? banner.imageUrl 
        : `/uploads/banners/${path.basename(banner.imageUrl)}`
    }));
    
    res.json({
      success: true,
      banners: bannersWithUrls
    });
  } catch (error) {
    console.error('배너 목록 조회 실패:', error);
    res.status(500).json({
      success: false,
      message: '배너 목록을 불러오는데 실패했습니다.'
    });
  }
});

// 관리자용 배너 목록 조회 (모든 배너)
router.get('/admin', authenticate, requireAdmin, async (req, res) => {
  try {
    const banners = await prisma.banner.findMany({
      orderBy: [
        { order: 'asc' },
        { createdAt: 'desc' }
      ]
    });
    
    const bannersWithUrls = banners.map(banner => ({
      ...banner,
      imageUrl: banner.imageUrl.startsWith('/') 
        ? banner.imageUrl 
        : `/uploads/banners/${path.basename(banner.imageUrl)}`
    }));
    
    res.json({
      success: true,
      banners: bannersWithUrls
    });
  } catch (error) {
    console.error('관리자 배너 목록 조회 실패:', error);
    res.status(500).json({
      success: false,
      message: '배너 목록을 불러오는데 실패했습니다.'
    });
  }
});

// 배너 추가
router.post('/', authenticate, requireAdmin, upload.single('image'), convertToWebP, async (req, res) => {
  try {
    const { 
      title, 
      subtitle, 
      description, 
      ctaText, 
      ctaLink, 
      type = 'event',
      order = 0,
      isActive = true,
      webtoonId
    } = req.body;
    
    let imageUrl = '';
    if (req.file) {
      imageUrl = `/uploads/banners/${req.file.filename}`;
    } else if (req.body.imageUrl) {
      imageUrl = req.body.imageUrl;
    }
    
    const banner = await prisma.banner.create({
      data: {
        title,
        subtitle,
        description,
        imageUrl,
        ctaText,
        ctaLink,
        type,
        order: parseInt(order),
        isActive: isActive === 'true' || isActive === true,
        webtoonId: webtoonId || null
      }
    });
    
    res.json({
      success: true,
      message: '배너가 추가되었습니다.',
      banner
    });
  } catch (error) {
    console.error('배너 추가 실패:', error);
    res.status(500).json({
      success: false,
      message: '배너 추가에 실패했습니다.'
    });
  }
});

// 배너 수정
router.put('/:id', authenticate, requireAdmin, upload.single('image'), convertToWebP, async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      title, 
      subtitle, 
      description, 
      ctaText, 
      ctaLink, 
      type,
      order,
      isActive,
      webtoonId
    } = req.body;
    
    const updateData = {};
    
    if (title !== undefined) updateData.title = title;
    if (subtitle !== undefined) updateData.subtitle = subtitle;
    if (description !== undefined) updateData.description = description;
    if (ctaText !== undefined) updateData.ctaText = ctaText;
    if (ctaLink !== undefined) updateData.ctaLink = ctaLink;
    if (type !== undefined) updateData.type = type;
    if (order !== undefined) updateData.order = parseInt(order);
    if (isActive !== undefined) updateData.isActive = isActive === 'true' || isActive === true;
    if (webtoonId !== undefined) updateData.webtoonId = webtoonId || null;
    
    if (req.file) {
      updateData.imageUrl = `/uploads/banners/${req.file.filename}`;
    } else if (req.body.imageUrl) {
      updateData.imageUrl = req.body.imageUrl;
    }
    
    const banner = await prisma.banner.update({
      where: { id },
      data: updateData
    });
    
    res.json({
      success: true,
      message: '배너가 수정되었습니다.',
      banner
    });
  } catch (error) {
    console.error('배너 수정 실패:', error);
    res.status(500).json({
      success: false,
      message: '배너 수정에 실패했습니다.'
    });
  }
});

// 배너 삭제
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const banner = await prisma.banner.findUnique({
      where: { id }
    });
    
    if (!banner) {
      return res.status(404).json({
        success: false,
        message: '배너를 찾을 수 없습니다.'
      });
    }
    
    // 이미지 파일 삭제 (로컬 파일인 경우)
    if (banner.imageUrl && !banner.imageUrl.startsWith('http')) {
      const imagePath = path.join(__dirname, '..', banner.imageUrl);
      try {
        await fs.unlink(imagePath);
      } catch (error) {
        console.error('이미지 파일 삭제 실패:', error);
      }
    }
    
    await prisma.banner.delete({
      where: { id }
    });
    
    res.json({
      success: true,
      message: '배너가 삭제되었습니다.'
    });
  } catch (error) {
    console.error('배너 삭제 실패:', error);
    res.status(500).json({
      success: false,
      message: '배너 삭제에 실패했습니다.'
    });
  }
});

// 배너 순서 변경
router.post('/reorder', authenticate, requireAdmin, async (req, res) => {
  try {
    const { banners } = req.body; // [{ id, order }, ...]
    
    const updatePromises = banners.map(({ id, order }) => 
      prisma.banner.update({
        where: { id },
        data: { order }
      })
    );
    
    await Promise.all(updatePromises);
    
    res.json({
      success: true,
      message: '배너 순서가 변경되었습니다.'
    });
  } catch (error) {
    console.error('배너 순서 변경 실패:', error);
    res.status(500).json({
      success: false,
      message: '배너 순서 변경에 실패했습니다.'
    });
  }
});

module.exports = router;