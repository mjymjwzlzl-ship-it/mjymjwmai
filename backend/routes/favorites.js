const { getJwtSecret } = require('../lib/jwt-secret');
const express = require('express');
const router = express.Router();
const { prisma } = require('../lib/prisma');
const jwt = require('jsonwebtoken');

// JWT 토큰에서 사용자 ID 추출
function getUserIdFromToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;

  const token = authHeader.split(' ')[1];
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, getJwtSecret());
    return decoded.userId;
  } catch (error) {
    console.error('JWT 검증 실패:', error);
    return null;
  }
}

// 찜 목록 조회
router.get('/', async (req, res) => {
  try {
    const userId = getUserIdFromToken(req);

    if (!userId) {
      return res.status(401).json({ error: '로그인이 필요합니다' });
    }

    // 사용자의 찜 목록 가져오기 (Like 모델 사용)
    const likes = await prisma.like.findMany({
      where: { userId },
      include: {
        comic: {
          select: {
            id: true,
            title: true,
            thumbnail: true,
            authorName: true,
            genre: true,
            rating: true,
            status: true,
            _count: {
              select: { episodes: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // 응답 포맷 변환
    const favorites = likes.map(like => ({
      id: like.comic.id,
      title: like.comic.title,
      thumbnailUrl: like.comic.thumbnail,
      author: like.comic.authorName || '작가',
      genre: like.comic.genre,
      rating: like.comic.rating,
      status: like.comic.status,
      latestEpisode: like.comic._count.episodes,
      addedAt: like.createdAt
    }));

    res.json({ favorites });
  } catch (error) {
    console.error('찜 목록 조회 실패:', error);
    res.status(500).json({ error: '찜 목록을 가져올 수 없습니다' });
  }
});

// 찜 추가/토글
router.post('/:webtoonId', async (req, res) => {
  try {
    const userId = getUserIdFromToken(req);
    const { webtoonId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: '로그인이 필요합니다' });
    }

    // 이미 찜한 웹툰인지 확인
    const existingLike = await prisma.like.findFirst({
      where: {
        userId,
        comicId: webtoonId
      }
    });

    if (existingLike) {
      // 이미 찜한 경우 - 삭제 처리 (토글)
      await prisma.like.delete({
        where: { id: existingLike.id }
      });

      // 찜을 풀면 Like 가 지워지므로 작품 알림(구독)도 함께 해제된다
      res.json({ success: true, message: '찜 목록에서 제거되었습니다', action: 'removed', notify: false });
    } else {
      // 찜 추가
      await prisma.like.create({
        data: {
          userId,
          comicId: webtoonId
        }
      });

      // 찜하면 작품 알림(새 회차·작품 공지) ON 으로 구독
      res.json({ success: true, message: '찜 목록에 추가되었습니다', action: 'added', notify: true });
    }
  } catch (error) {
    console.error('찜 추가 실패:', error);
    res.status(500).json({ error: '찜 추가에 실패했습니다' });
  }
});

// 찜 삭제
router.delete('/:webtoonId', async (req, res) => {
  try {
    const userId = getUserIdFromToken(req);
    const { webtoonId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: '로그인이 필요합니다' });
    }

    const existingLike = await prisma.like.findFirst({
      where: {
        userId,
        comicId: webtoonId
      }
    });

    if (!existingLike) {
      return res.status(404).json({ error: '찜 목록에서 찾을 수 없습니다' });
    }

    await prisma.like.delete({
      where: { id: existingLike.id }
    });

    res.json({ success: true, message: '찜 목록에서 제거되었습니다' });
  } catch (error) {
    console.error('찜 삭제 실패:', error);
    res.status(500).json({ error: '찜 삭제에 실패했습니다' });
  }
});

// 찜 여부 확인
router.get('/check/:webtoonId', async (req, res) => {
  try {
    const userId = getUserIdFromToken(req);
    const { webtoonId } = req.params;

    if (!userId) {
      return res.json({ isFavorite: false });
    }

    const existingLike = await prisma.like.findFirst({
      where: {
        userId,
        comicId: webtoonId
      }
    });

    res.json({ isFavorite: !!existingLike, notify: !!existingLike?.notify });
  } catch (error) {
    console.error('찜 확인 실패:', error);
    res.json({ isFavorite: false });
  }
});

module.exports = router;