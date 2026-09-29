const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');

const prisma = new PrismaClient();

// 게시글 목록 조회
router.get('/posts', async (req, res) => {
  try {
    const { category, type, search, page = 1, limit = 20 } = req.query;
    
    const where = {};
    
    if (category && category !== 'all') {
      where.category = category;
    }
    
    if (type === 'adult') {
      where.isAdult = true;
    } else if (type === 'general') {
      where.isAdult = false;
    }
    
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { content: { contains: search } }
      ];
    }

    const posts = await prisma.post.findMany({
      where,
      include: {
        author: {
          select: { nickname: true, id: true }
        },
        _count: {
          select: { 
            comments: true
          }
        },
        likes: {
          select: {
            isUpvote: true
          }
        }
      },
      skip: (page - 1) * limit,
      take: parseInt(limit),
      orderBy: [
        { isPinned: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    // 데이터 포맷팅
    const formattedPosts = posts.map(post => {
      // 추천/비추천 계산
      const upvotes = post.likes ? post.likes.filter(like => like.isUpvote === true).length : 0;
      const downvotes = post.likes ? post.likes.filter(like => like.isUpvote === false).length : 0;
      
      return {
        id: post.id,
        title: post.title,
        content: post.content,
        author: post.author?.nickname || '익명',
        authorId: post.authorId,
        category: post.category,
        viewCount: post.viewCount || 0,
        likeCount: upvotes - downvotes,  // 추천수 - 비추천수
        upvotes: upvotes,
        downvotes: downvotes,
        commentCount: post._count.comments || 0,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
        isPinned: post.isPinned || false,
        isAdult: post.isAdult || false
      };
    });

    res.json({ posts: formattedPosts });
  } catch (error) {
    console.error('게시글 목록 조회 실패:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 게시글 상세 조회
router.get('/posts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const post = await prisma.post.findUnique({
      where: { id },
      include: {
        author: {
          select: { nickname: true, id: true }
        },
        comments: {
          include: {
            author: {
              select: { nickname: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        },
        _count: {
          select: { 
            comments: true
          }
        },
        likes: {
          select: {
            isUpvote: true
          }
        }
      }
    });

    if (!post) {
      return res.status(404).json({ error: '게시글을 찾을 수 없습니다.' });
    }

    // 조회수 증가 (skipViewIncrement 파라미터가 없을 때만)
    const skipViewIncrement = req.query.skipViewIncrement === 'true';
    if (!skipViewIncrement) {
      await prisma.post.update({
        where: { id },
        data: { viewCount: { increment: 1 } }
      });
    }

    res.json({ post });
  } catch (error) {
    console.error('게시글 상세 조회 실패:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 게시글 작성
router.post('/posts', authenticate, async (req, res) => {
  try {
    const { title, content, category, isAdult } = req.body;
    const userId = req.user.id;

    const post = await prisma.post.create({
      data: {
        title,
        content,
        category: category || 'general',
        isAdult: isAdult || false,
        authorId: userId
      },
      include: {
        author: {
          select: { nickname: true }
        }
      }
    });

    res.json({ post });
  } catch (error) {
    console.error('게시글 작성 실패:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 게시글 수정
router.put('/posts/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, category } = req.body;
    const userId = req.user.id;

    // 작성자 확인
    const post = await prisma.post.findUnique({
      where: { id },
      select: { authorId: true }
    });

    if (!post) {
      return res.status(404).json({ error: '게시글을 찾을 수 없습니다.' });
    }

    if (post.authorId !== userId) {
      return res.status(403).json({ error: '작성자만 수정할 수 있습니다.' });
    }

    const updatedPost = await prisma.post.update({
      where: { id },
      data: {
        title,
        content,
        category,
        updatedAt: new Date()
      }
    });

    res.json({ post: updatedPost });
  } catch (error) {
    console.error('게시글 수정 실패:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 게시글 삭제
router.delete('/posts/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // 작성자 확인
    const post = await prisma.post.findUnique({
      where: { id },
      select: { authorId: true }
    });

    if (!post) {
      return res.status(404).json({ error: '게시글을 찾을 수 없습니다.' });
    }

    if (post.authorId !== userId) {
      // 관리자 확인
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true }
      });

      if (user?.role !== 'ADMIN') {
        return res.status(403).json({ error: '작성자만 삭제할 수 있습니다.' });
      }
    }

    await prisma.post.delete({
      where: { id }
    });

    res.json({ message: '게시글이 삭제되었습니다.' });
  } catch (error) {
    console.error('게시글 삭제 실패:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 댓글 작성
router.post('/posts/:postId/comments', authenticate, async (req, res) => {
  try {
    const { postId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    const comment = await prisma.postComment.create({
      data: {
        content,
        postId,
        authorId: userId
      },
      include: {
        author: {
          select: { nickname: true }
        }
      }
    });

    res.json({ comment });
  } catch (error) {
    console.error('댓글 작성 실패:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 추천/비추천
router.post('/posts/:postId/vote', authenticate, async (req, res) => {
  try {
    const { postId } = req.params;
    const { isUpvote } = req.body; // true: 추천, false: 비추천
    const userId = req.user.id;

    // 기존 투표 확인
    const existingVote = await prisma.postLike.findUnique({
      where: {
        userId_postId: {
          userId,
          postId
        }
      }
    });

    if (existingVote) {
      if (existingVote.isUpvote === isUpvote) {
        // 같은 투표 다시 클릭 = 취소
        await prisma.postLike.delete({
          where: {
            userId_postId: {
              postId,
              userId
            }
          }
        });
        
        // 게시글 카운트 업데이트
        await prisma.post.update({
          where: { id: postId },
          data: {
            [isUpvote ? 'upvotes' : 'downvotes']: { decrement: 1 }
          }
        });
        
        res.json({ 
          voted: false, 
          isUpvote: null,
          message: isUpvote ? '추천을 취소했습니다.' : '비추천을 취소했습니다.' 
        });
      } else {
        // 반대 투표로 변경
        await prisma.postLike.update({
          where: {
            userId_postId: {
              postId,
              userId
            }
          },
          data: { isUpvote }
        });
        
        // 게시글 카운트 업데이트 (이전 투표 취소 + 새 투표)
        await prisma.post.update({
          where: { id: postId },
          data: {
            [existingVote.isUpvote ? 'upvotes' : 'downvotes']: { decrement: 1 },
            [isUpvote ? 'upvotes' : 'downvotes']: { increment: 1 }
          }
        });
        
        res.json({ 
          voted: true, 
          isUpvote,
          message: isUpvote ? '추천했습니다.' : '비추천했습니다.' 
        });
      }
    } else {
      // 새로운 투표
      await prisma.postLike.create({
        data: {
          postId,
          userId,
          isUpvote
        }
      });
      
      // 게시글 카운트 업데이트
      await prisma.post.update({
        where: { id: postId },
        data: {
          [isUpvote ? 'upvotes' : 'downvotes']: { increment: 1 }
        }
      });
      
      res.json({ 
        voted: true, 
        isUpvote,
        message: isUpvote ? '추천했습니다.' : '비추천했습니다.' 
      });
    }
  } catch (error) {
    console.error('투표 처리 실패:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 호환성을 위한 기존 좋아요 엔드포인트 (추천으로 처리)
router.post('/posts/:postId/like', authenticate, async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.id;

    // 기존 투표 확인
    const existingVote = await prisma.postLike.findUnique({
      where: {
        userId_postId: {
          userId,
          postId
        }
      }
    });

    if (existingVote && existingVote.isUpvote === true) {
      // 이미 추천한 경우 취소
      await prisma.postLike.delete({
        where: {
          userId_postId: {
            postId,
            userId
          }
        }
      });
      
      await prisma.post.update({
        where: { id: postId },
        data: { upvotes: { decrement: 1 } }
      });
      
      res.json({ liked: false, message: '추천을 취소했습니다.' });
    } else {
      if (existingVote) {
        // 비추천에서 추천으로 변경
        await prisma.postLike.update({
          where: {
            userId_postId: {
              postId,
              userId
            }
          },
          data: { isUpvote: true }
        });
        
        await prisma.post.update({
          where: { id: postId },
          data: {
            downvotes: { decrement: 1 },
            upvotes: { increment: 1 }
          }
        });
      } else {
        // 새로운 추천
        await prisma.postLike.create({
          data: {
            postId,
            userId,
            isUpvote: true
          }
        });
        
        await prisma.post.update({
          where: { id: postId },
          data: { upvotes: { increment: 1 } }
        });
      }
      
      res.json({ liked: true, message: '추천했습니다.' });
    }
  } catch (error) {
    console.error('좋아요 처리 실패:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

module.exports = router;