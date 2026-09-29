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

// 선택적 인증 미들웨어
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    req.user = null;
    return next();
  }
  
  jwt.verify(token, getJwtSecret(), (err, user) => {
    if (err) {
      req.user = null;
    } else {
      req.user = user;
    }
    next();
  });
};

// POST: 테트리스 점수 저장
router.post('/tetris/score', authenticateToken, async (req, res) => {
  try {
    const { score, level, lines } = req.body;
    const userId = req.user.userId;
    
    // 플랫폼 감지 (User-Agent로 판단)
    const userAgent = req.headers['user-agent'] || '';
    const isMobile = /Mobile|Android|iPhone|iPad|iPod|Windows Phone|webOS/i.test(userAgent);
    const platform = isMobile ? 'mobile' : 'web';

    // 점수 저장
    const gameScore = await prisma.gameScore.create({
      data: {
        userId,
        game: 'tetris',
        score,
        level,
        lines,
        platform, // 플랫폼 정보 저장
      }
    });

    // 사용자의 최고 점수 업데이트 확인
    const highScore = await prisma.gameScore.findFirst({
      where: {
        userId,
        game: 'tetris'
      },
      orderBy: {
        score: 'desc'
      }
    });

    res.json({
      message: '점수가 저장되었습니다.',
      score: gameScore,
      isNewHighScore: highScore.id === gameScore.id
    });

  } catch (error) {
    console.error('점수 저장 오류:', error);
    res.status(500).json({ message: '점수 저장 중 오류가 발생했습니다.' });
  }
});

// GET: 테트리스 주간 랭킹
router.get('/tetris/ranking/weekly', async (req, res) => {
  try {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    // 플랫폼 파라미터 받기 (web, mobile, all)
    const { platform = 'all' } = req.query;

    const whereCondition = {
      game: 'tetris',
      createdAt: {
        gte: oneWeekAgo
      }
    };
    
    // 플랫폼별 필터링
    if (platform !== 'all') {
      whereCondition.platform = platform;
    }

    const rankings = await prisma.gameScore.findMany({
      where: whereCondition,
      orderBy: {
        score: 'desc'
      },
      take: 50,
      include: {
        user: {
          select: {
            username: true,
            nickname: true
          }
        }
      }
    });

    const formattedRankings = rankings.map((score, index) => ({
      id: score.id,
      rank: index + 1,
      username: score.user.nickname || score.user.username,
      score: score.score,
      level: score.level,
      lines: score.lines,
      createdAt: score.createdAt
    }));

    res.json({ rankings: formattedRankings });

  } catch (error) {
    console.error('주간 랭킹 조회 오류:', error);
    res.status(500).json({ message: '주간 랭킹 조회 중 오류가 발생했습니다.' });
  }
});

// GET: 테트리스 역대 랭킹
router.get('/tetris/ranking/alltime', async (req, res) => {
  try {
    const rankings = await prisma.gameScore.findMany({
      where: {
        game: 'tetris'
      },
      orderBy: {
        score: 'desc'
      },
      take: 100,
      include: {
        user: {
          select: {
            username: true,
            nickname: true
          }
        }
      }
    });

    const formattedRankings = rankings.map((score, index) => ({
      id: score.id,
      rank: index + 1,
      username: score.user.nickname || score.user.username,
      score: score.score,
      level: score.level,
      lines: score.lines,
      createdAt: score.createdAt
    }));

    res.json({ rankings: formattedRankings });

  } catch (error) {
    console.error('역대 랭킹 조회 오류:', error);
    res.status(500).json({ message: '역대 랭킹 조회 중 오류가 발생했습니다.' });
  }
});

// GET: 내 최고 점수
router.get('/tetris/my-best', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const bestScore = await prisma.gameScore.findFirst({
      where: {
        userId,
        game: 'tetris'
      },
      orderBy: {
        score: 'desc'
      }
    });

    if (!bestScore) {
      return res.json({ bestScore: null });
    }

    res.json({
      bestScore: {
        id: bestScore.id,
        score: bestScore.score,
        level: bestScore.level,
        lines: bestScore.lines,
        createdAt: bestScore.createdAt
      }
    });

  } catch (error) {
    console.error('최고 점수 조회 오류:', error);
    res.status(500).json({ message: '최고 점수 조회 중 오류가 발생했습니다.' });
  }
});

// GET: 테트리스 최고 점수 (공개)
router.get('/tetris/highscore', async (req, res) => {
  try {
    const highScore = await prisma.gameScore.findFirst({
      where: {
        game: 'tetris'
      },
      orderBy: {
        score: 'desc'
      }
    });

    res.json({
      highScore: highScore ? highScore.score : 0
    });

  } catch (error) {
    console.error('최고 점수 조회 오류:', error);
    res.status(500).json({ message: '최고 점수 조회 중 오류가 발생했습니다.' });
  }
});

// GET: 게임 통계
router.get('/tetris/stats', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [todayGames, totalGames, avgScore, maxLevel] = await Promise.all([
      // 오늘 플레이 수
      prisma.gameScore.count({
        where: {
          game: 'tetris',
          createdAt: {
            gte: today
          }
        }
      }),
      // 전체 플레이 수
      prisma.gameScore.count({
        where: {
          game: 'tetris'
        }
      }),
      // 평균 점수
      prisma.gameScore.aggregate({
        where: {
          game: 'tetris'
        },
        _avg: {
          score: true
        }
      }),
      // 최고 레벨
      prisma.gameScore.aggregate({
        where: {
          game: 'tetris'
        },
        _max: {
          level: true
        }
      })
    ]);

    res.json({
      todayGames,
      totalGames,
      avgScore: Math.round(avgScore._avg.score || 0),
      maxLevel: maxLevel._max.level || 0
    });

  } catch (error) {
    console.error('게임 통계 조회 오류:', error);
    res.status(500).json({ message: '게임 통계 조회 중 오류가 발생했습니다.' });
  }
});

// ========== SNAKE GAME APIs ==========

// POST: 뱀 게임 점수 저장
router.post('/snake/score', authenticateToken, async (req, res) => {
  try {
    const { score, level, length } = req.body;
    const userId = req.user.userId;

    const gameScore = await prisma.gameScore.create({
      data: {
        userId,
        game: 'snake',
        score,
        level,
        data: JSON.stringify({ length })
      }
    });

    const highScore = await prisma.gameScore.findFirst({
      where: {
        userId,
        game: 'snake'
      },
      orderBy: {
        score: 'desc'
      }
    });

    res.json({
      message: '점수가 저장되었습니다.',
      score: gameScore,
      isNewHighScore: highScore.id === gameScore.id
    });

  } catch (error) {
    console.error('점수 저장 오류:', error);
    res.status(500).json({ message: '점수 저장 중 오류가 발생했습니다.' });
  }
});

// GET: 뱀 게임 주간 랭킹
router.get('/snake/ranking/weekly', async (req, res) => {
  try {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const rankings = await prisma.gameScore.findMany({
      where: {
        game: 'snake',
        createdAt: {
          gte: oneWeekAgo
        }
      },
      orderBy: {
        score: 'desc'
      },
      take: 50,
      include: {
        user: {
          select: {
            username: true,
            nickname: true
          }
        }
      }
    });

    const formattedRankings = rankings.map((score, index) => {
      const data = score.data ? JSON.parse(score.data) : {};
      return {
        id: score.id,
        rank: index + 1,
        username: score.user.nickname || score.user.username,
        score: score.score,
        level: score.level,
        length: data.length || 0,
        createdAt: score.createdAt
      };
    });

    res.json({ rankings: formattedRankings });

  } catch (error) {
    console.error('주간 랭킹 조회 오류:', error);
    res.status(500).json({ message: '주간 랭킹 조회 중 오류가 발생했습니다.' });
  }
});

// GET: 뱀 게임 역대 랭킹
router.get('/snake/ranking/alltime', async (req, res) => {
  try {
    const rankings = await prisma.gameScore.findMany({
      where: {
        game: 'snake'
      },
      orderBy: {
        score: 'desc'
      },
      take: 100,
      include: {
        user: {
          select: {
            username: true,
            nickname: true
          }
        }
      }
    });

    const formattedRankings = rankings.map((score, index) => {
      const data = score.data ? JSON.parse(score.data) : {};
      return {
        id: score.id,
        rank: index + 1,
        username: score.user.nickname || score.user.username,
        score: score.score,
        level: score.level,
        length: data.length || 0,
        createdAt: score.createdAt
      };
    });

    res.json({ rankings: formattedRankings });

  } catch (error) {
    console.error('역대 랭킹 조회 오류:', error);
    res.status(500).json({ message: '역대 랭킹 조회 중 오류가 발생했습니다.' });
  }
});

// GET: 뱀 게임 내 최고 점수
router.get('/snake/my-best', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const bestScore = await prisma.gameScore.findFirst({
      where: {
        userId,
        game: 'snake'
      },
      orderBy: {
        score: 'desc'
      }
    });

    if (!bestScore) {
      return res.json({ bestScore: null });
    }

    const data = bestScore.data ? JSON.parse(bestScore.data) : {};

    res.json({
      bestScore: {
        id: bestScore.id,
        score: bestScore.score,
        level: bestScore.level,
        length: data.length || 0,
        createdAt: bestScore.createdAt
      }
    });

  } catch (error) {
    console.error('최고 점수 조회 오류:', error);
    res.status(500).json({ message: '최고 점수 조회 중 오류가 발생했습니다.' });
  }
});

// GET: 뱀 게임 최고 점수 (공개)
router.get('/snake/highscore', async (req, res) => {
  try {
    const highScore = await prisma.gameScore.findFirst({
      where: {
        game: 'snake'
      },
      orderBy: {
        score: 'desc'
      }
    });

    res.json({
      highScore: highScore ? highScore.score : 0
    });

  } catch (error) {
    console.error('최고 점수 조회 오류:', error);
    res.status(500).json({ message: '최고 점수 조회 중 오류가 발생했습니다.' });
  }
});

// ========== 2048 GAME APIs ==========

// POST: 2048 게임 점수 저장
router.post('/2048/score', authenticateToken, async (req, res) => {
  try {
    const { score, maxTile, moves } = req.body;
    const userId = req.user.userId;

    const gameScore = await prisma.gameScore.create({
      data: {
        userId,
        game: '2048',
        score,
        data: JSON.stringify({ maxTile, moves })
      }
    });

    const highScore = await prisma.gameScore.findFirst({
      where: {
        userId,
        game: '2048'
      },
      orderBy: {
        score: 'desc'
      }
    });

    res.json({
      message: '점수가 저장되었습니다.',
      score: gameScore,
      isNewHighScore: highScore.id === gameScore.id
    });

  } catch (error) {
    console.error('점수 저장 오류:', error);
    res.status(500).json({ message: '점수 저장 중 오류가 발생했습니다.' });
  }
});

// GET: 2048 게임 주간 랭킹
router.get('/2048/ranking/weekly', async (req, res) => {
  try {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const rankings = await prisma.gameScore.findMany({
      where: {
        game: '2048',
        createdAt: {
          gte: oneWeekAgo
        }
      },
      orderBy: {
        score: 'desc'
      },
      take: 50,
      include: {
        user: {
          select: {
            username: true,
            nickname: true
          }
        }
      }
    });

    const formattedRankings = rankings.map((score, index) => {
      const data = score.data ? JSON.parse(score.data) : {};
      return {
        id: score.id,
        rank: index + 1,
        username: score.user.nickname || score.user.username,
        score: score.score,
        maxTile: data.maxTile || 0,
        moves: data.moves || 0,
        createdAt: score.createdAt
      };
    });

    res.json({ rankings: formattedRankings });

  } catch (error) {
    console.error('주간 랭킹 조회 오류:', error);
    res.status(500).json({ message: '주간 랭킹 조회 중 오류가 발생했습니다.' });
  }
});

// GET: 2048 게임 역대 랭킹
router.get('/2048/ranking/alltime', async (req, res) => {
  try {
    const rankings = await prisma.gameScore.findMany({
      where: {
        game: '2048'
      },
      orderBy: {
        score: 'desc'
      },
      take: 100,
      include: {
        user: {
          select: {
            username: true,
            nickname: true
          }
        }
      }
    });

    const formattedRankings = rankings.map((score, index) => {
      const data = score.data ? JSON.parse(score.data) : {};
      return {
        id: score.id,
        rank: index + 1,
        username: score.user.nickname || score.user.username,
        score: score.score,
        maxTile: data.maxTile || 0,
        moves: data.moves || 0,
        createdAt: score.createdAt
      };
    });

    res.json({ rankings: formattedRankings });

  } catch (error) {
    console.error('역대 랭킹 조회 오류:', error);
    res.status(500).json({ message: '역대 랭킹 조회 중 오류가 발생했습니다.' });
  }
});

// GET: 2048 게임 내 최고 점수
router.get('/2048/my-best', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const bestScore = await prisma.gameScore.findFirst({
      where: {
        userId,
        game: '2048'
      },
      orderBy: {
        score: 'desc'
      }
    });

    if (!bestScore) {
      return res.json({ bestScore: null });
    }

    const data = bestScore.data ? JSON.parse(bestScore.data) : {};

    res.json({
      bestScore: {
        id: bestScore.id,
        score: bestScore.score,
        maxTile: data.maxTile || 0,
        moves: data.moves || 0,
        createdAt: bestScore.createdAt
      }
    });

  } catch (error) {
    console.error('최고 점수 조회 오류:', error);
    res.status(500).json({ message: '최고 점수 조회 중 오류가 발생했습니다.' });
  }
});

// GET: 2048 게임 최고 점수 (공개)
router.get('/2048/highscore', async (req, res) => {
  try {
    const highScore = await prisma.gameScore.findFirst({
      where: {
        game: '2048'
      },
      orderBy: {
        score: 'desc'
      }
    });

    res.json({
      highScore: highScore ? highScore.score : 0
    });

  } catch (error) {
    console.error('최고 점수 조회 오류:', error);
    res.status(500).json({ message: '최고 점수 조회 중 오류가 발생했습니다.' });
  }
});

// ========== MEMORY GAME APIs ==========

// POST: 메모리 게임 점수 저장
router.post('/memory/score', authenticateToken, async (req, res) => {
  try {
    const { score, difficulty, moves, time, pairs } = req.body;
    const userId = req.user.userId;

    const gameScore = await prisma.gameScore.create({
      data: {
        userId,
        game: 'memory',
        score,
        data: JSON.stringify({ difficulty, moves, time, pairs })
      }
    });

    const highScore = await prisma.gameScore.findFirst({
      where: {
        userId,
        game: 'memory'
      },
      orderBy: {
        score: 'desc'
      }
    });

    res.json({
      message: '점수가 저장되었습니다.',
      score: gameScore,
      isNewHighScore: highScore.id === gameScore.id
    });

  } catch (error) {
    console.error('점수 저장 오류:', error);
    res.status(500).json({ message: '점수 저장 중 오류가 발생했습니다.' });
  }
});

// GET: 메모리 게임 주간 랭킹
router.get('/memory/ranking/weekly', async (req, res) => {
  try {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const rankings = await prisma.gameScore.findMany({
      where: {
        game: 'memory',
        createdAt: {
          gte: oneWeekAgo
        }
      },
      orderBy: {
        score: 'desc'
      },
      take: 50,
      include: {
        user: {
          select: {
            username: true,
            nickname: true
          }
        }
      }
    });

    const formattedRankings = rankings.map((score, index) => {
      const data = score.data ? JSON.parse(score.data) : {};
      return {
        id: score.id,
        rank: index + 1,
        username: score.user.nickname || score.user.username,
        score: score.score,
        difficulty: data.difficulty || '보통',
        moves: data.moves || 0,
        time: data.time || 0,
        pairs: data.pairs || 0,
        createdAt: score.createdAt
      };
    });

    res.json({ rankings: formattedRankings });

  } catch (error) {
    console.error('주간 랭킹 조회 오류:', error);
    res.status(500).json({ message: '주간 랭킹 조회 중 오류가 발생했습니다.' });
  }
});

// GET: 메모리 게임 역대 랭킹
router.get('/memory/ranking/alltime', async (req, res) => {
  try {
    const rankings = await prisma.gameScore.findMany({
      where: {
        game: 'memory'
      },
      orderBy: {
        score: 'desc'
      },
      take: 100,
      include: {
        user: {
          select: {
            username: true,
            nickname: true
          }
        }
      }
    });

    const formattedRankings = rankings.map((score, index) => {
      const data = score.data ? JSON.parse(score.data) : {};
      return {
        id: score.id,
        rank: index + 1,
        username: score.user.nickname || score.user.username,
        score: score.score,
        difficulty: data.difficulty || '보통',
        moves: data.moves || 0,
        time: data.time || 0,
        pairs: data.pairs || 0,
        createdAt: score.createdAt
      };
    });

    res.json({ rankings: formattedRankings });

  } catch (error) {
    console.error('역대 랭킹 조회 오류:', error);
    res.status(500).json({ message: '역대 랭킹 조회 중 오류가 발생했습니다.' });
  }
});

// GET: 메모리 게임 내 최고 점수
router.get('/memory/my-best', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const bestScore = await prisma.gameScore.findFirst({
      where: {
        userId,
        game: 'memory'
      },
      orderBy: {
        score: 'desc'
      }
    });

    if (!bestScore) {
      return res.json({ bestScore: null });
    }

    const data = bestScore.data ? JSON.parse(bestScore.data) : {};

    res.json({
      bestScore: {
        id: bestScore.id,
        score: bestScore.score,
        difficulty: data.difficulty || '보통',
        moves: data.moves || 0,
        time: data.time || 0,
        pairs: data.pairs || 0,
        createdAt: bestScore.createdAt
      }
    });

  } catch (error) {
    console.error('최고 점수 조회 오류:', error);
    res.status(500).json({ message: '최고 점수 조회 중 오류가 발생했습니다.' });
  }
});

// GET: 메모리 게임 최고 점수 (공개)
router.get('/memory/highscore', async (req, res) => {
  try {
    const highScore = await prisma.gameScore.findFirst({
      where: {
        game: 'memory'
      },
      orderBy: {
        score: 'desc'
      }
    });

    res.json({
      highScore: highScore ? highScore.score : 0
    });

  } catch (error) {
    console.error('최고 점수 조회 오류:', error);
    res.status(500).json({ message: '최고 점수 조회 중 오류가 발생했습니다.' });
  }
});

// ========== FLAPPY BIRD GAME APIs ==========

// POST: 플래피 버드 점수 저장
router.post('/flappy/score', authenticateToken, async (req, res) => {
  try {
    const { score } = req.body;
    const userId = req.user.userId;

    const gameScore = await prisma.gameScore.create({
      data: {
        userId,
        game: 'flappy',
        score
      }
    });

    const highScore = await prisma.gameScore.findFirst({
      where: {
        userId,
        game: 'flappy'
      },
      orderBy: {
        score: 'desc'
      }
    });

    res.json({
      message: '점수가 저장되었습니다.',
      score: gameScore,
      isNewHighScore: highScore.id === gameScore.id
    });

  } catch (error) {
    console.error('점수 저장 오류:', error);
    res.status(500).json({ message: '점수 저장 중 오류가 발생했습니다.' });
  }
});

// GET: 플래피 버드 최고 점수
router.get('/flappy/highscore', async (req, res) => {
  try {
    const highScore = await prisma.gameScore.findFirst({
      where: {
        game: 'flappy'
      },
      orderBy: {
        score: 'desc'
      }
    });

    res.json({
      highScore: highScore ? highScore.score : 0
    });

  } catch (error) {
    console.error('최고 점수 조회 오류:', error);
    res.status(500).json({ message: '최고 점수 조회 중 오류가 발생했습니다.' });
  }
});

// ========== BREAKOUT GAME APIs ==========

// POST: 벽돌깨기 점수 저장
router.post('/breakout/score', authenticateToken, async (req, res) => {
  try {
    const { score, level } = req.body;
    const userId = req.user.userId;

    const gameScore = await prisma.gameScore.create({
      data: {
        userId,
        game: 'breakout',
        score,
        level
      }
    });

    res.json({
      message: '점수가 저장되었습니다.',
      score: gameScore
    });

  } catch (error) {
    console.error('점수 저장 오류:', error);
    res.status(500).json({ message: '점수 저장 중 오류가 발생했습니다.' });
  }
});

// GET: 벽돌깨기 최고 점수
router.get('/breakout/highscore', async (req, res) => {
  try {
    const highScore = await prisma.gameScore.findFirst({
      where: {
        game: 'breakout'
      },
      orderBy: {
        score: 'desc'
      }
    });

    res.json({
      highScore: highScore ? highScore.score : 0
    });

  } catch (error) {
    console.error('최고 점수 조회 오류:', error);
    res.status(500).json({ message: '최고 점수 조회 중 오류가 발생했습니다.' });
  }
});

// ========== PONG GAME APIs ==========

// POST: 퐁 점수 저장
router.post('/pong/score', authenticateToken, async (req, res) => {
  try {
    const { score, difficulty, winner, rally } = req.body;
    const userId = req.user.userId;

    const gameScore = await prisma.gameScore.create({
      data: {
        userId,
        game: 'pong',
        score,
        data: JSON.stringify({ difficulty, winner, rally })
      }
    });

    res.json({
      message: '점수가 저장되었습니다.',
      score: gameScore
    });

  } catch (error) {
    console.error('점수 저장 오류:', error);
    res.status(500).json({ message: '점수 저장 중 오류가 발생했습니다.' });
  }
});

// GET: 퐁 최고 점수
router.get('/pong/highscore', optionalAuth, async (req, res) => {
  try {
    const userId = req.user?.userId;
    
    let userHighScore = 0;
    if (userId) {
      const userBest = await prisma.gameScore.findFirst({
        where: {
          userId,
          game: 'pong'
        },
        orderBy: {
          score: 'desc'
        }
      });
      userHighScore = userBest?.score || 0;
    }

    const globalHighScore = await prisma.gameScore.findFirst({
      where: {
        game: 'pong'
      },
      orderBy: {
        score: 'desc'
      }
    });

    res.json({
      highScore: userHighScore,
      globalHighScore: globalHighScore?.score || 0
    });

  } catch (error) {
    console.error('최고 점수 조회 오류:', error);
    res.status(500).json({ message: '최고 점수 조회 중 오류가 발생했습니다.' });
  }
});

// GET: 탁구 랭킹
router.get('/pong/leaderboard', async (req, res) => {
  try {
    const { period = 'all' } = req.query;
    
    let whereClause = { game: 'pong' };
    
    if (period === 'weekly') {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      whereClause.createdAt = { gte: oneWeekAgo };
    }

    const leaderboard = await prisma.gameScore.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            username: true,
            nickname: true
          }
        }
      },
      orderBy: {
        score: 'desc'
      },
      take: 10
    });

    res.json(leaderboard.map((entry, index) => ({
      rank: index + 1,
      username: entry.user.nickname || entry.user.username,
      score: entry.score,
      rally: entry.metadata?.rally || 0,
      createdAt: entry.createdAt
    })));
  } catch (error) {
    console.error('탁구 랭킹 조회 실패:', error);
    res.status(500).json({ message: '랭킹 조회에 실패했습니다.' });
  }
});

// ========== PACMAN GAME APIs ==========

// POST: 팩맨 점수 저장
router.post('/pacman/score', authenticateToken, async (req, res) => {
  try {
    const { score, level } = req.body;
    const userId = req.user.userId;

    const gameScore = await prisma.gameScore.create({
      data: {
        userId,
        game: 'pacman',
        score,
        metadata: { level }
      }
    });

    // 최고 점수 확인
    const highScore = await prisma.gameScore.findFirst({
      where: {
        userId,
        game: 'pacman'
      },
      orderBy: {
        score: 'desc'
      }
    });

    res.json({ 
      success: true, 
      scoreId: gameScore.id,
      isNewHighScore: highScore?.id === gameScore.id
    });
  } catch (error) {
    console.error('팩맨 점수 저장 실패:', error);
    res.status(500).json({ message: '점수 저장에 실패했습니다.' });
  }
});

// GET: 팩맨 최고 점수
router.get('/pacman/highscore', optionalAuth, async (req, res) => {
  try {
    const userId = req.user?.userId;
    
    // 개인 최고 점수
    let userHighScore = 0;
    if (userId) {
      const userBest = await prisma.gameScore.findFirst({
        where: {
          userId,
          game: 'pacman'
        },
        orderBy: {
          score: 'desc'
        }
      });
      userHighScore = userBest?.score || 0;
    }

    // 전체 최고 점수
    const globalHighScore = await prisma.gameScore.findFirst({
      where: {
        game: 'pacman'
      },
      orderBy: {
        score: 'desc'
      }
    });

    res.json({ 
      highScore: userHighScore,
      globalHighScore: globalHighScore?.score || 0
    });
  } catch (error) {
    console.error('팩맨 최고 점수 조회 실패:', error);
    res.status(500).json({ message: '최고 점수 조회에 실패했습니다.' });
  }
});

// GET: 팩맨 랭킹
router.get('/pacman/leaderboard', async (req, res) => {
  try {
    const { period = 'all' } = req.query;
    
    let whereClause = { game: 'pacman' };
    
    if (period === 'weekly') {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      whereClause.createdAt = { gte: oneWeekAgo };
    }

    const leaderboard = await prisma.gameScore.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            username: true,
            nickname: true
          }
        }
      },
      orderBy: {
        score: 'desc'
      },
      take: 10
    });

    res.json(leaderboard.map((entry, index) => ({
      rank: index + 1,
      username: entry.user.nickname || entry.user.username,
      score: entry.score,
      level: entry.metadata?.level || 1,
      createdAt: entry.createdAt
    })));
  } catch (error) {
    console.error('팩맨 랭킹 조회 실패:', error);
    res.status(500).json({ message: '랭킹 조회에 실패했습니다.' });
  }
});

// ========== SUDOKU GAME APIs ==========

// POST: 스도쿠 점수 저장
router.post('/sudoku/score', authenticateToken, async (req, res) => {
  try {
    const { score, time, difficulty, hints } = req.body;
    const userId = req.user.userId;

    const gameScore = await prisma.gameScore.create({
      data: {
        userId,
        game: 'sudoku',
        score,
        data: JSON.stringify({ time, difficulty, hints })
      }
    });

    res.json({
      message: '점수가 저장되었습니다.',
      score: gameScore
    });

  } catch (error) {
    console.error('점수 저장 오류:', error);
    res.status(500).json({ message: '점수 저장 중 오류가 발생했습니다.' });
  }
});

// GET: 스도쿠 최고 점수
router.get('/sudoku/highscore', async (req, res) => {
  try {
    const highScore = await prisma.gameScore.findFirst({
      where: {
        game: 'sudoku'
      },
      orderBy: {
        score: 'desc'
      }
    });

    res.json({
      highScore: highScore ? highScore.score : 0
    });

  } catch (error) {
    console.error('최고 점수 조회 오류:', error);
    res.status(500).json({ message: '최고 점수 조회 중 오류가 발생했습니다.' });
  }
});

// GET: 스도쿠 랭킹
router.get('/sudoku/leaderboard', async (req, res) => {
  try {
    const { period = 'all' } = req.query;
    
    let whereClause = { game: 'sudoku' };
    
    if (period === 'weekly') {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      whereClause.createdAt = { gte: oneWeekAgo };
    }

    const leaderboard = await prisma.gameScore.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            username: true,
            nickname: true
          }
        }
      },
      orderBy: {
        score: 'desc'
      },
      take: 10
    });

    res.json(leaderboard.map((entry, index) => ({
      rank: index + 1,
      username: entry.user.nickname || entry.user.username,
      score: entry.score,
      createdAt: entry.createdAt
    })));
  } catch (error) {
    console.error('스도쿠 랭킹 조회 실패:', error);
    res.status(500).json({ message: '랭킹 조회에 실패했습니다.' });
  }
});

// GET: 벽돌깨기 랭킹
router.get('/breakout/leaderboard', async (req, res) => {
  try {
    const { period = 'all' } = req.query;
    
    let whereClause = { game: 'breakout' };
    
    if (period === 'weekly') {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      whereClause.createdAt = { gte: oneWeekAgo };
    }

    const leaderboard = await prisma.gameScore.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            username: true,
            nickname: true
          }
        }
      },
      orderBy: {
        score: 'desc'
      },
      take: 10
    });

    res.json(leaderboard.map((entry, index) => ({
      rank: index + 1,
      username: entry.user.nickname || entry.user.username,
      score: entry.score,
      level: entry.metadata?.level || 1,
      createdAt: entry.createdAt
    })));
  } catch (error) {
    console.error('벽돌깨기 랭킹 조회 실패:', error);
    res.status(500).json({ message: '랭킹 조회에 실패했습니다.' });
  }
});

// GET: 일반 게임 랭킹 엔드포인트 (모든 게임 공통)
router.get('/:game/leaderboard', async (req, res) => {
  try {
    const { game } = req.params;
    const { period = 'all' } = req.query;
    
    // 지원되는 게임 목록
    const supportedGames = ['tetris', 'snake', '2048', 'memory', 'pong', 'flappy', 'breakout', 'pacman', 'sudoku'];
    
    if (!supportedGames.includes(game)) {
      return res.status(400).json({ message: '지원하지 않는 게임입니다.' });
    }
    
    let whereClause = { game };
    
    if (period === 'weekly') {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      whereClause.createdAt = { gte: oneWeekAgo };
    }

    const leaderboard = await prisma.gameScore.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            username: true,
            nickname: true
          }
        }
      },
      orderBy: {
        score: 'desc'
      },
      take: 10
    });

    res.json(leaderboard.map((entry, index) => ({
      rank: index + 1,
      username: entry.user.nickname || entry.user.username,
      score: entry.score,
      level: entry.metadata?.level || entry.level,
      createdAt: entry.createdAt
    })));
  } catch (error) {
    console.error(`${req.params.game} 랭킹 조회 실패:`, error);
    res.status(500).json({ message: '랭킹 조회에 실패했습니다.' });
  }
});

// POST: 다른 게임들 점수 저장 (snake, 2048, pacman 등)
router.post('/:game/score', authenticateToken, async (req, res) => {
  try {
    const { game } = req.params;
    const { score, level, ...additionalData } = req.body;
    const userId = req.user.userId;
    
    // 플랫폼 감지
    const userAgent = req.headers['user-agent'] || '';
    const isMobile = /Mobile|Android|iPhone|iPad|iPod|Windows Phone|webOS/i.test(userAgent);
    const platform = isMobile ? 'mobile' : 'web';

    const gameScore = await prisma.gameScore.create({
      data: {
        userId,
        game,
        score,
        level,
        platform,
        data: additionalData ? JSON.stringify(additionalData) : null
      }
    });

    res.json({
      message: '점수가 저장되었습니다.',
      score: gameScore
    });

  } catch (error) {
    console.error('점수 저장 오류:', error);
    res.status(500).json({ message: '점수 저장 중 오류가 발생했습니다.' });
  }
});

// GET: 게임별 랭킹
router.get('/:game/leaderboard', async (req, res) => {
  try {
    const { game } = req.params;
    const { period = 'all', platform = 'all' } = req.query;

    const whereCondition = { game };
    if (period === 'weekly') {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      whereCondition.createdAt = { gte: oneWeekAgo };
    } else if (period === 'monthly') {
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      whereCondition.createdAt = { gte: oneMonthAgo };
    }
    
    // 플랫폼별 필터링
    if (platform !== 'all') {
      whereCondition.platform = platform;
    }

    const rankings = await prisma.gameScore.findMany({
      where: whereCondition,
      orderBy: {
        score: 'desc'
      },
      take: 50,
      include: {
        user: {
          select: {
            username: true,
            nickname: true
          }
        }
      }
    });

    const formattedRankings = rankings.map((score, index) => ({
      id: score.id,
      rank: index + 1,
      username: score.user.nickname || score.user.username,
      score: score.score,
      level: score.level,
      createdAt: score.createdAt
    }));

    res.json(formattedRankings);

  } catch (error) {
    console.error('랭킹 조회 오류:', error);
    res.status(500).json({ message: '랭킹 조회 중 오류가 발생했습니다.' });
  }
});

module.exports = router;