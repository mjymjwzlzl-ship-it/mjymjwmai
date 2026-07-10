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
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'arata-jwt-secret-2024');
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
      authorAvatar: null,
      createdAt: comment.createdAt.toISOString(),
      likes: 0,
      isLiked: false,
      replies: []
    };

    res.json({ comment: formattedComment });
  } catch (error) {
    console.error('댓글 작성 오류:', error);
    res.status(500).json({ error: '댓글을 작성할 수 없습니다' });
  }
});

// 댓글 좋아요
router.post('/episodes/comments/:commentId/like', authenticate, async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.id;

    // 이미 좋아요를 눌렀는지 확인
    const existingLike = await prisma.commentLike.findUnique({
      where: {
        userId_commentId: {
          userId,
          commentId: commentId
        }
      }
    });

    if (existingLike) {
      // 좋아요 취소
      await prisma.commentLike.delete({
        where: { id: existingLike.id }
      });
      
      const count = await prisma.commentLike.count({
        where: { commentId: commentId }
      });
      
      res.json({ liked: false, likes: count });
    } else {
      // 좋아요 추가
      await prisma.commentLike.create({
        data: {
          userId,
          commentId: commentId
        }
      });
      
      const count = await prisma.commentLike.count({
        where: { commentId: commentId }
      });
      
      res.json({ liked: true, likes: count });
    }
  } catch (error) {
    console.error('댓글 좋아요 오류:', error);
    res.status(500).json({ error: '좋아요 처리 중 오류가 발생했습니다' });
  }
});

// 댓글 삭제
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