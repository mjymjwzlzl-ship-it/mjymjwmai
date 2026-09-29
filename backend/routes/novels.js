const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');

const prisma = new PrismaClient();

// 소설 목록 조회
router.get('/', async (req, res) => {
  try {
    const { category, type, search, page = 1, limit = 20 } = req.query;
    
    const where = {};
    
    if (category && category !== 'all') {
      where.genre = category;
    }
    
    if (type === 'adult') {
      where.isAdult = true;
    } else if (type === 'general') {
      where.isAdult = false;
    }
    
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { author: { contains: search } }
      ];
    }

    const novels = await prisma.novel.findMany({
      where,
      include: {
        author: {
          select: { nickname: true, id: true }
        },
        _count: {
          select: { 
            chapters: true,
            likes: true,
            comments: true
          }
        }
      },
      skip: (page - 1) * limit,
      take: parseInt(limit),
      orderBy: { updatedAt: 'desc' }
    });

    // 데이터 포맷팅
    const formattedNovels = novels.map(novel => ({
      id: novel.id,
      title: novel.title,
      author: novel.author?.nickname || novel.authorName || '작가',
      genre: novel.genre,
      thumbnail: novel.thumbnail,
      description: novel.description,
      viewCount: novel.viewCount || 0,
      likeCount: novel._count.likes || 0,
      commentCount: novel._count.comments || 0,
      chapterCount: novel._count.chapters || 0,
      status: novel.status,
      updatedAt: novel.updatedAt,
      createdAt: novel.createdAt,
      isAdult: novel.isAdult || false
    }));

    res.json({ novels: formattedNovels });
  } catch (error) {
    console.error('소설 목록 조회 실패:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 소설 상세 조회
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const novel = await prisma.novel.findUnique({
      where: { id },
      include: {
        author: {
          select: { nickname: true, id: true }
        },
        chapters: {
          orderBy: { chapterNumber: 'asc' },
          select: {
            id: true,
            title: true,
            chapterNumber: true,
            createdAt: true,
            isFree: true,
            coinPrice: true
          }
        },
        _count: {
          select: { 
            chapters: true,
            likes: true,
            comments: true
          }
        }
      }
    });

    if (!novel) {
      return res.status(404).json({ error: '소설을 찾을 수 없습니다.' });
    }

    // 조회수 증가
    await prisma.novel.update({
      where: { id },
      data: { viewCount: { increment: 1 } }
    });

    res.json({ novel });
  } catch (error) {
    console.error('소설 상세 조회 실패:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 소설 생성 (작가용)
router.post('/', authenticate, async (req, res) => {
  try {
    const { title, description, genre, thumbnail, isAdult } = req.body;
    const userId = req.user.id;

    // 작가 확인
    const author = await prisma.author.findUnique({
      where: { userId }
    });

    if (!author) {
      return res.status(403).json({ error: '작가만 소설을 작성할 수 있습니다.' });
    }

    const novel = await prisma.novel.create({
      data: {
        title,
        description,
        genre,
        thumbnail,
        isAdult: isAdult || false,
        authorId: author.id,
        status: 'ongoing'
      }
    });

    res.json({ novel });
  } catch (error) {
    console.error('소설 생성 실패:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 챕터 추가
router.post('/:novelId/chapters', authenticate, async (req, res) => {
  try {
    const { novelId } = req.params;
    const { title, content, chapterNumber, isFree, coinPrice } = req.body;
    const userId = req.user.id;

    // 소설 및 작가 확인
    const novel = await prisma.novel.findUnique({
      where: { id: novelId },
      include: { author: true }
    });

    if (!novel) {
      return res.status(404).json({ error: '소설을 찾을 수 없습니다.' });
    }

    if (novel.author.userId !== userId) {
      return res.status(403).json({ error: '작가만 챕터를 추가할 수 있습니다.' });
    }

    const chapter = await prisma.chapter.create({
      data: {
        title,
        content,
        chapterNumber,
        isFree: isFree || false,
        coinPrice: coinPrice || 0,
        novelId
      }
    });

    // 소설 업데이트 시간 갱신
    await prisma.novel.update({
      where: { id: novelId },
      data: { updatedAt: new Date() }
    });

    res.json({ chapter });
  } catch (error) {
    console.error('챕터 추가 실패:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

module.exports = router;