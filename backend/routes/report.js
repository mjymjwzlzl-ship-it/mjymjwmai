const express = require('express');
const { prisma } = require('../lib/prisma');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// 신고 사유 목록
const REPORT_REASONS = {
  INAPPROPRIATE: '부적절한 콘텐츠',
  COPYRIGHT: '저작권 침해',
  SPAM: '스팸/광고',
  VIOLENCE: '폭력적인 콘텐츠',
  ADULT: '성인물 노출',
  HATE: '혐오 발언',
  PRIVACY: '개인정보 노출',
  ILLEGAL: '불법 콘텐츠',
  OTHER: '기타'
};

// POST: 신고하기
router.post('/submit', authenticate, async (req, res) => {
  try {
    const { type, targetId, reason, description } = req.body;
    const reporterId = req.user.id || req.user.userId;

    // 유효성 검사
    if (!type || !targetId || !reason) {
      return res.status(400).json({ message: '필수 정보가 누락되었습니다.' });
    }

    if (!['COMIC', 'EPISODE', 'COMMENT', 'USER'].includes(type)) {
      return res.status(400).json({ message: '유효하지 않은 신고 유형입니다.' });
    }

    if (!Object.keys(REPORT_REASONS).includes(reason)) {
      return res.status(400).json({ message: '유효하지 않은 신고 사유입니다.' });
    }

    // 중복 신고 확인
    const existingReport = await prisma.report.findFirst({
      where: {
        reporterId,
        type,
        ...(type === 'COMIC' && { comicId: targetId }),
        ...(type === 'EPISODE' && { episodeId: targetId }),
        ...(type === 'COMMENT' && { commentId: targetId }),
        ...(type === 'USER' && { targetUserId: targetId }),
        status: { in: ['PENDING', 'PROCESSING'] }
      }
    });

    if (existingReport) {
      return res.status(400).json({ message: '이미 신고한 콘텐츠입니다.' });
    }

    // 신고 생성
    const reportData = {
      type,
      reason,
      description: description || '',
      reporterId,
      ...(type === 'COMIC' && { comicId: targetId }),
      ...(type === 'EPISODE' && { episodeId: targetId }),
      ...(type === 'COMMENT' && { commentId: targetId }),
      ...(type === 'USER' && { targetUserId: targetId })
    };

    const report = await prisma.report.create({
      data: reportData
    });

    res.json({
      success: true,
      message: '신고가 접수되었습니다. 검토 후 조치하겠습니다.',
      reportId: report.id
    });

  } catch (error) {
    console.error('신고 처리 오류:', error);
    res.status(500).json({ message: '신고 처리 중 오류가 발생했습니다.' });
  }
});

// GET: 내 신고 내역 조회
router.get('/my-reports', authenticate, async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const reports = await prisma.report.findMany({
      where: { reporterId: userId },
      include: {
        comic: { select: { title: true } },
        episode: { select: { title: true } },
        comment: { select: { content: true } },
        targetUser: { select: { username: true, nickname: true } }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: parseInt(limit)
    });

    const total = await prisma.report.count({
      where: { reporterId: userId }
    });

    const formattedReports = reports.map(report => ({
      id: report.id,
      type: report.type,
      reason: REPORT_REASONS[report.reason] || report.reason,
      description: report.description,
      status: report.status,
      resolution: report.resolution,
      targetName: 
        report.comic?.title ||
        report.episode?.title ||
        report.comment?.content?.substring(0, 50) ||
        report.targetUser?.nickname ||
        report.targetUser?.username ||
        '알 수 없음',
      createdAt: report.createdAt,
      resolvedAt: report.resolvedAt
    }));

    res.json({
      reports: formattedReports,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('신고 내역 조회 오류:', error);
    res.status(500).json({ message: '신고 내역 조회 중 오류가 발생했습니다.' });
  }
});

// POST: 사용자 차단
router.post('/block-user', authenticate, async (req, res) => {
  try {
    const { userId, reason } = req.body;
    const blockerId = req.user.id || req.user.userId;

    if (!userId) {
      return res.status(400).json({ message: '차단할 사용자 ID가 필요합니다.' });
    }

    if (userId === blockerId) {
      return res.status(400).json({ message: '자기 자신을 차단할 수 없습니다.' });
    }

    // 이미 차단했는지 확인
    const existingBlock = await prisma.blockedUser.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId,
          blockedId: userId
        }
      }
    });

    if (existingBlock) {
      return res.status(400).json({ message: '이미 차단한 사용자입니다.' });
    }

    // 차단 생성
    await prisma.blockedUser.create({
      data: {
        blockerId,
        blockedId: userId,
        reason: reason || '사용자 요청'
      }
    });

    res.json({
      success: true,
      message: '사용자를 차단했습니다.'
    });

  } catch (error) {
    console.error('사용자 차단 오류:', error);
    res.status(500).json({ message: '사용자 차단 중 오류가 발생했습니다.' });
  }
});

// DELETE: 사용자 차단 해제
router.delete('/unblock-user/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    const blockerId = req.user.id || req.user.userId;

    const blockedUser = await prisma.blockedUser.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId,
          blockedId: userId
        }
      }
    });

    if (!blockedUser) {
      return res.status(404).json({ message: '차단한 사용자가 아닙니다.' });
    }

    await prisma.blockedUser.delete({
      where: { id: blockedUser.id }
    });

    res.json({
      success: true,
      message: '차단을 해제했습니다.'
    });

  } catch (error) {
    console.error('차단 해제 오류:', error);
    res.status(500).json({ message: '차단 해제 중 오류가 발생했습니다.' });
  }
});

// GET: 차단한 사용자 목록
router.get('/blocked-users', authenticate, async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;

    const blockedUsers = await prisma.blockedUser.findMany({
      where: { blockerId: userId },
      include: {
        blocked: {
          select: {
            id: true,
            username: true,
            nickname: true,
            avatar: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const formattedUsers = blockedUsers.map(block => ({
      id: block.blocked.id,
      username: block.blocked.username,
      nickname: block.blocked.nickname,
      avatar: block.blocked.avatar,
      reason: block.reason,
      blockedAt: block.createdAt
    }));

    res.json({ blockedUsers: formattedUsers });

  } catch (error) {
    console.error('차단 목록 조회 오류:', error);
    res.status(500).json({ message: '차단 목록 조회 중 오류가 발생했습니다.' });
  }
});

module.exports = router;