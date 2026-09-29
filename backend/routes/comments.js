const { getJwtSecret } = require('../lib/jwt-secret');
const express = require('express');
const { prisma } = require('../lib/prisma');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// 에피소드의 댓글 조회
router.get('/episodes/:episodeId/comments', async (req, res) => {
  try {
    const { episodeId } = req.params;
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    let userId = null;
    if (token) {
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, getJwtSecret());
        userId = decoded.userId;
      } catch (err) {
        // 토큰이 유효하지 않아도 댓글은 볼 수 있음
      }
    }

    // 댓글 조회
    const comments = await prisma.comment.findMany({
      where: { 
        episodeId: episodeId,
        parentId: null // 최상위 댓글만
      },
      include: {
        user: {
          select: {
            id: true,
            nickname: true,
            email: true
          }
        },
        commentLikes: userId ? {
          where: { userId }
        } : false,
        replies: {
          include: {
            user: {
              select: {
                id: true,
                nickname: true,
                email: true
              }
            },
            commentLikes: userId ? {
              where: { userId }
            } : false,
            _count: {
              select: { commentLikes: true }
            }
          },
          orderBy: { createdAt: 'asc' }
        },
        _count: {
          select: { commentLikes: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // 데이터 포맷팅
    const formattedComments = comments.map(comment => ({
      id: comment.id.toString(),
      content: comment.content,
      author: comment.user.nickname || comment.user.email.split('@')[0],
      authorId: comment.user.id,
      authorAvatar: null,
      createdAt: comment.createdAt.toISOString(),
      likes: comment._count.commentLikes,
      isLiked: userId && comment.commentLikes ? comment.commentLikes.length > 0 : false,
      isMyComment: userId === comment.user.id,
      replies: comment.replies.map(reply => ({
        id: reply.id.toString(),
        content: reply.content,
        author: reply.user.nickname || reply.user.email.split('@')[0],
        authorId: reply.user.id,
        authorAvatar: null,
        createdAt: reply.createdAt.toISOString(),
        likes: reply._count?.commentLikes || 0,
        isLiked: userId && reply.commentLikes ? reply.commentLikes.length > 0 : false,
        isMyComment: userId === reply.user.id
      }))
    }));

    res.json({ comments: formattedComments });
  } catch (error) {
    console.error('댓글 조회 오류:', error);
    res.status(500).json({ error: '댓글을 불러올 수 없습니다' });
  }
});

// 댓글 작성
router.post('/episodes/:episodeId/comments', authenticate, async (req, res) => {
  try {
    const { episodeId } = req.params;
    const { content, parentId } = req.body;
    const userId = req.user.id || req.user.userId;

    const comment = await prisma.comment.create({
      data: {
        content,
        episodeId: episodeId,
        userId,
        parentId: parentId || null
      },
      include: {
        user: {
          select: {
            id: true,
            nickname: true,
            email: true
          }
        }
      }
    });

    const formattedComment = {
      id: comment.id.toString(),
      content: comment.content,
      author: comment.user.nickname || comment.user.email.split('@')[0],
      authorId: comment.user.id,
      authorAvatar: null,
      createdAt: comment.createdAt.toISOString(),
      likes: 0,
      isLiked: false,
      isMyComment: true,
      replies: []
    };

    res.json({ success: true, comment: formattedComment });
  } catch (error) {
    console.error('댓글 작성 오류:', error);
    res.status(500).json({ error: '댓글을 작성할 수 없습니다' });
  }
});

// 댓글 좋아요
// 댓글 좋아요 토글. 화면은 /api/comments/:id/like 를 부른다(옛 경로도 유지).
// 본인 댓글에는 좋아요 불가 — 베스트 댓글이 좋아요 순이라 자기 추천을 막는다.
async function toggleCommentLike(req, res) {
  try {
    const { commentId } = req.params;
    const userId = req.user.id || req.user.userId;

    const comment = await prisma.comment.findUnique({ where: { id: commentId }, select: { userId: true } });
    if (!comment) {
      return res.status(404).json({ error: '댓글을 찾을 수 없습니다' });
    }
    if (comment.userId === userId) {
      return res.status(400).json({ error: '내 댓글에는 좋아요를 누를 수 없습니다', code: 'OWN_COMMENT' });
    }

    const existingLike = await prisma.commentLike.findUnique({
      where: { userId_commentId: { userId, commentId } }
    });
    if (existingLike) {
      await prisma.commentLike.delete({ where: { id: existingLike.id } });
    } else {
      await prisma.commentLike.create({ data: { userId, commentId } });
    }
    const count = await prisma.commentLike.count({ where: { commentId } });
    await prisma.comment.update({ where: { id: commentId }, data: { likes: count } });
    res.json({ success: true, liked: !existingLike, likes: count });
  } catch (error) {
    console.error('댓글 좋아요 오류:', error);
    res.status(500).json({ error: '좋아요 처리 중 오류가 발생했습니다' });
  }
}
router.post('/comments/:commentId/like', authenticate, toggleCommentLike);
router.post('/episodes/comments/:commentId/like', authenticate, toggleCommentLike);

// 작품 전체 댓글 (모든 회차의 최상위 댓글을 모아서). sort=best(좋아요순)|latest
router.get('/comic-comments/:comicId', async (req, res) => {
  try {
    const { comicId } = req.params;
    const sort = req.query.sort === 'latest' ? 'latest' : 'best';
    const take = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 50);
    const skip = Math.max(parseInt(req.query.offset, 10) || 0, 0);
    const where = { parentId: null, episode: { comicId } };

    const [total, comments] = await Promise.all([
      prisma.comment.count({ where }),
      prisma.comment.findMany({
        where,
        include: {
          user: { select: { id: true, nickname: true, email: true } },
          episode: { select: { id: true, episodeNumber: true } },
          _count: { select: { commentLikes: true, replies: true } }
        },
        orderBy: sort === 'best' ? [{ likes: 'desc' }, { createdAt: 'desc' }] : [{ createdAt: 'desc' }],
        skip,
        take
      })
    ]);

    res.json({
      total,
      comments: comments.map((comment) => ({
        id: comment.id,
        content: comment.content,
        author: comment.user.nickname || comment.user.email.split('@')[0],
        createdAt: comment.createdAt.toISOString(),
        likes: comment._count.commentLikes,
        replyCount: comment._count.replies,
        episodeId: comment.episode?.id || null,
        episodeNumber: comment.episode?.episodeNumber ?? null
      }))
    });
  } catch (error) {
    console.error('작품 전체 댓글 조회 오류:', error);
    res.status(500).json({ error: '댓글을 불러올 수 없습니다' });
  }
});

// 댓글 삭제
// 마이페이지 [댓글 내역]: 내가 쓴 댓글 (작품·회차 정보 포함, 최신순)
router.get('/comments/mine', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 50);
    const page = Math.max(Number(req.query.page) || 1, 1);
    const where = { userId };
    const [total, rows] = await Promise.all([
      prisma.comment.count({ where }),
      prisma.comment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true, content: true, likes: true, createdAt: true, updatedAt: true, parentId: true,
          _count: { select: { replies: true } },
          comic: { select: { id: true, title: true, thumbnail: true } },
          episode: { select: { id: true, episodeNumber: true, title: true, comic: { select: { id: true, title: true, thumbnail: true } } } },
        },
      }),
    ]);
    const comments = rows.map((row) => {
      const comic = row.episode?.comic || row.comic;
      return {
        id: row.id,
        content: row.content,
        likes: row.likes,
        replies: row._count.replies,
        isReply: Boolean(row.parentId),
        createdAt: row.createdAt,
        edited: row.updatedAt.getTime() - row.createdAt.getTime() > 1000,
        comic: comic ? { id: comic.id, title: comic.title, thumbnail: comic.thumbnail } : null,
        episode: row.episode ? { id: row.episode.id, episodeNumber: row.episode.episodeNumber, title: row.episode.title } : null,
      };
    });
    res.set('Cache-Control', 'private, no-store');
    res.json({ comments, total, page, totalPages: Math.max(1, Math.ceil(total / limit)) });
  } catch (error) {
    console.error('내 댓글 조회 오류:', error);
    res.status(500).json({ error: '댓글 내역을 불러오지 못했습니다' });
  }
});

// 댓글 수정 (본인만)
router.put('/comments/:commentId', authenticate, async (req, res) => {
  try {
    const content = String(req.body?.content || '').trim();
    if (!content) return res.status(400).json({ error: '내용을 입력해 주세요' });
    if (content.length > 1000) return res.status(400).json({ error: '댓글은 1000자까지 쓸 수 있어요' });
    const comment = await prisma.comment.findUnique({ where: { id: req.params.commentId }, select: { userId: true } });
    if (!comment) return res.status(404).json({ error: '댓글을 찾을 수 없습니다' });
    if (comment.userId !== req.user.id) return res.status(403).json({ error: '본인의 댓글만 수정할 수 있습니다' });
    const updated = await prisma.comment.update({ where: { id: req.params.commentId }, data: { content }, select: { id: true, content: true, updatedAt: true } });
    res.json({ success: true, comment: updated });
  } catch (error) {
    console.error('댓글 수정 오류:', error);
    res.status(500).json({ error: '댓글 수정 중 오류가 발생했습니다' });
  }
});

router.delete('/comments/:commentId', authenticate, async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.id;

    // 댓글 확인
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      select: { userId: true }
    });

    if (!comment) {
      return res.status(404).json({ error: '댓글을 찾을 수 없습니다' });
    }

    // 본인 댓글인지 확인
    if (comment.userId !== userId) {
      return res.status(403).json({ error: '본인의 댓글만 삭제할 수 있습니다' });
    }

    // 댓글 삭제 (대댓글도 함께 삭제됨 - cascade)
    await prisma.comment.delete({
      where: { id: commentId }
    });

    res.json({ success: true, message: '댓글이 삭제되었습니다' });
  } catch (error) {
    console.error('댓글 삭제 오류:', error);
    res.status(500).json({ error: '댓글 삭제 중 오류가 발생했습니다' });
  }
});

// 에피소드 평점 조회
router.get('/episodes/:episodeId/rating', async (req, res) => {
  try {
    const { episodeId } = req.params;
    
    const ratings = await prisma.rating.findMany({
      where: { episodeId: episodeId }
    });
    
    const totalRatings = ratings.length;
    const averageRating = totalRatings > 0 
      ? ratings.reduce((sum, r) => sum + r.score, 0) / totalRatings 
      : 0;
    
    res.json({
      averageRating,
      totalRatings
    });
  } catch (error) {
    console.error('평점 조회 오류:', error);
    res.status(500).json({ error: '평점을 불러올 수 없습니다' });
  }
});

module.exports = router;