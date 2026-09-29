const { getJwtSecret } = require('../lib/jwt-secret');
const express = require('express');
const { prisma } = require('../lib/prisma');
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

// GET: 에피소드의 평균 평점 조회
router.get('/episodes/:episodeId/rating', async (req, res) => {
  try {
    const { episodeId } = req.params;

    // 평균 평점 계산
    const ratings = await prisma.rating.findMany({
      where: { episodeId },
      select: { score: true }
    });

    if (ratings.length === 0) {
      return res.json({
        averageRating: 0,
        totalRatings: 0
      });
    }

    const totalScore = ratings.reduce((sum, r) => sum + r.score, 0);
    const averageRating = totalScore / ratings.length;

    res.json({
      averageRating: parseFloat(averageRating.toFixed(1)),
      totalRatings: ratings.length
    });

  } catch (error) {
    console.error('평점 조회 오류:', error);
    res.status(500).json({ message: '평점 조회 중 오류가 발생했습니다.' });
  }
});

// GET: 사용자의 평점 조회
router.get('/episodes/:episodeId/user-rating', authenticateToken, async (req, res) => {
  try {
    const { episodeId } = req.params;
    const userId = req.user.userId;

    const rating = await prisma.rating.findUnique({
      where: {
        userId_episodeId: {
          userId,
          episodeId
        }
      },
      select: { score: true }
    });

    if (!rating) {
      return res.json({ rating: null });
    }

    res.json({ rating: rating.score });

  } catch (error) {
    console.error('사용자 평점 조회 오류:', error);
    res.status(500).json({ message: '사용자 평점 조회 중 오류가 발생했습니다.' });
  }
});

// POST: 평점 등록/수정
router.post('/episodes/:episodeId/rating', authenticateToken, async (req, res) => {
  try {
    const { episodeId } = req.params;
    const { score } = req.body;
    const userId = req.user.userId;

    // 유효성 검사
    if (!score || score < 0.5 || score > 10) {
      return res.status(400).json({ message: '올바른 평점을 입력해주세요. (0.5 ~ 10)' });
    }

    // 에피소드 존재 확인
    const episode = await prisma.episode.findUnique({
      where: { id: episodeId }
    });

    if (!episode) {
      return res.status(404).json({ message: '에피소드를 찾을 수 없습니다.' });
    }

    // 평점 생성 또는 업데이트
    const rating = await prisma.rating.upsert({
      where: {
        userId_episodeId: {
          userId,
          episodeId
        }
      },
      update: {
        score,
        updatedAt: new Date()
      },
      create: {
        userId,
        episodeId,
        score
      }
    });

    // 평균 평점 재계산
    const ratings = await prisma.rating.findMany({
      where: { episodeId },
      select: { score: true }
    });

    const totalScore = ratings.reduce((sum, r) => sum + r.score, 0);
    const averageRating = totalScore / ratings.length;

    // Episode 모델의 rating 필드 업데이트
    await prisma.episode.update({
      where: { id: episodeId },
      data: { rating: parseFloat(averageRating.toFixed(1)) }
    });

    res.json({
      message: '평점이 등록되었습니다.',
      rating: rating.score,
      averageRating: parseFloat(averageRating.toFixed(1)),
      totalRatings: ratings.length
    });

  } catch (error) {
    console.error('평점 등록 오류:', error);
    res.status(500).json({ message: '평점 등록 중 오류가 발생했습니다.' });
  }
});

// DELETE: 평점 삭제
router.delete('/episodes/:episodeId/rating', authenticateToken, async (req, res) => {
  try {
    const { episodeId } = req.params;
    const userId = req.user.userId;

    const rating = await prisma.rating.findUnique({
      where: {
        userId_episodeId: {
          userId,
          episodeId
        }
      }
    });

    if (!rating) {
      return res.status(404).json({ message: '평점을 찾을 수 없습니다.' });
    }

    await prisma.rating.delete({
      where: {
        userId_episodeId: {
          userId,
          episodeId
        }
      }
    });

    // 평균 평점 재계산 (삭제 후)
    const remainingRatings = await prisma.rating.findMany({
      where: { episodeId },
      select: { score: true }
    });

    let newAverageRating = 0;
    if (remainingRatings.length > 0) {
      const totalScore = remainingRatings.reduce((sum, r) => sum + r.score, 0);
      newAverageRating = parseFloat((totalScore / remainingRatings.length).toFixed(1));
    }

    // Episode 모델의 rating 필드 업데이트
    await prisma.episode.update({
      where: { id: episodeId },
      data: { rating: newAverageRating }
    });

    res.json({ message: '평점이 삭제되었습니다.' });

  } catch (error) {
    console.error('평점 삭제 오류:', error);
    res.status(500).json({ message: '평점 삭제 중 오류가 발생했습니다.' });
  }
});

// GET: 베스트 댓글 (좋아요 많은 순 상위 3개)
router.get('/episodes/:episodeId/best-comments', async (req, res) => {
  try {
    const { episodeId } = req.params;
    const bestComments = await prisma.comment.findMany({
      where: { episodeId, parentId: null },
      include: { user: { select: { username: true, nickname: true, avatar: true } } },
      orderBy: [{ likes: 'desc' }, { createdAt: 'desc' }],
      take: 3
    });
    res.json(bestComments.map(comment => ({
      id: comment.id,
      content: comment.content,
      author: comment.user.nickname || comment.user.username,
      authorAvatar: comment.user.avatar,
      likes: comment.likes,
      createdAt: comment.createdAt
    })));
  } catch (error) {
    console.error('베스트 댓글 조회 오류:', error);
    res.status(500).json({ message: '베스트 댓글 조회 중 오류가 발생했습니다.' });
  }
});

// ── 작품 평점 (작품당 1회, 0.5 ~ 10 저장 / 화면은 5점 만점) ──
async function comicRatingSummary(comicId) {
  const agg = await prisma.comicRating.aggregate({
    where: { comicId },
    _avg: { score: true },
    _count: { _all: true }
  });
  return {
    averageRating: parseFloat((agg._avg.score || 0).toFixed(1)),
    totalRatings: agg._count._all
  };
}

// GET: 작품 평균 평점
router.get('/comic-ratings/:comicId', async (req, res) => {
  try {
    res.json(await comicRatingSummary(req.params.comicId));
  } catch (error) {
    console.error('작품 평점 조회 오류:', error);
    res.status(500).json({ message: '평점 조회 중 오류가 발생했습니다.' });
  }
});

// GET: 내 작품 평점
router.get('/comic-ratings/:comicId/me', authenticateToken, async (req, res) => {
  try {
    const rating = await prisma.comicRating.findUnique({
      where: { userId_comicId: { userId: req.user.userId, comicId: req.params.comicId } },
      select: { score: true }
    });
    res.json({ rating: rating ? rating.score : null });
  } catch (error) {
    console.error('작품 사용자 평점 조회 오류:', error);
    res.status(500).json({ message: '사용자 평점 조회 중 오류가 발생했습니다.' });
  }
});

// POST: 작품 평점 등록/수정
router.post('/comic-ratings/:comicId', authenticateToken, async (req, res) => {
  try {
    const { comicId } = req.params;
    const score = Number(req.body?.score);
    const userId = req.user.userId;

    if (!Number.isFinite(score) || score < 0.5 || score > 10) {
      return res.status(400).json({ message: '올바른 평점을 입력해주세요. (0.5 ~ 10)' });
    }

    const comic = await prisma.comic.findUnique({ where: { id: comicId }, select: { id: true } });
    if (!comic) {
      return res.status(404).json({ message: '작품을 찾을 수 없습니다.' });
    }

    const rating = await prisma.comicRating.upsert({
      where: { userId_comicId: { userId, comicId } },
      update: { score },
      create: { userId, comicId, score }
    });

    res.json({ message: '평점이 등록되었습니다.', rating: rating.score, ...(await comicRatingSummary(comicId)) });
  } catch (error) {
    console.error('작품 평점 등록 오류:', error);
    res.status(500).json({ message: '평점 등록 중 오류가 발생했습니다.' });
  }
});

module.exports = router;
