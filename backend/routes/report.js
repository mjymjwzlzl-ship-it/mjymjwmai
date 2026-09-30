const express = require('express');
const { prisma } = require('../lib/prisma');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

const path = require('path');
const fs = require('fs').promises;
const multer = require('multer');
const sharp = require('sharp');
const { REASONS } = require('../lib/report-reasons');

// 첨부 스크린샷: 공개 폴더(uploads)가 아니라 private 에 두고, 관리자 API 로만 연다
const REPORT_IMAGE_DIR = path.join(__dirname, '../private/report-images');
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => (/^image\/(jpeg|png|webp|gif)$/.test(file.mimetype) ? cb(null, true) : cb(new Error('이미지 파일만 첨부할 수 있습니다.'))),
});
const maybeUpload = (req, res, next) => upload.single('image')(req, res, (err) => (err ? res.status(400).json({ message: err.message || '첨부 파일을 올리지 못했습니다.' }) : next()));

// POST: 신고하기 (JSON 또는 multipart: image 1장)
// type: COMIC(작품) | EPISODE(회차) | COMMENT(댓글) | USER(사용자). 회차 신고는 작품도 함께 묶는다.
router.post('/submit', authenticate, maybeUpload, async (req, res) => {
  try {
    const { type, targetId, reason } = req.body;
    const description = String(req.body.description || '').trim().slice(0, 2000);
    const reporterId = req.user.id || req.user.userId;

    if (!type || !targetId || !reason) return res.status(400).json({ message: '필수 정보가 누락되었습니다.' });
    if (!REASONS[type]) return res.status(400).json({ message: '유효하지 않은 신고 유형입니다.' });
    if (!REASONS[type][reason]) return res.status(400).json({ message: '유효하지 않은 신고 사유입니다.' });

    const target = {};
    if (type === 'COMIC') {
      if (!(await prisma.comic.findUnique({ where: { id: targetId }, select: { id: true } }))) return res.status(404).json({ message: '작품을 찾을 수 없습니다.' });
      target.comicId = targetId;
    } else if (type === 'EPISODE') {
      const episode = await prisma.episode.findUnique({ where: { id: targetId }, select: { id: true, comicId: true } });
      if (!episode) return res.status(404).json({ message: '회차를 찾을 수 없습니다.' });
      Object.assign(target, { episodeId: episode.id, comicId: episode.comicId });
    } else if (type === 'COMMENT') {
      const comment = await prisma.comment.findUnique({ where: { id: targetId }, select: { id: true, userId: true, episodeId: true, comicId: true, episode: { select: { comicId: true } } } });
      if (!comment) return res.status(404).json({ message: '댓글을 찾을 수 없습니다.' });
      if (comment.userId === reporterId) return res.status(400).json({ message: '내 댓글은 신고할 수 없습니다.' });
      Object.assign(target, { commentId: comment.id, targetUserId: comment.userId, episodeId: comment.episodeId || undefined, comicId: comment.comicId || comment.episode?.comicId || undefined });
    } else if (type === 'POST') {
      const post = await prisma.post.findUnique({ where: { id: targetId }, select: { id: true, authorId: true, comicId: true, episodeId: true } });
      if (!post) return res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });
      if (post.authorId === reporterId) return res.status(400).json({ message: '내 글은 신고할 수 없습니다.' });
      Object.assign(target, { postId: post.id, targetUserId: post.authorId, comicId: post.comicId || undefined, episodeId: post.episodeId || undefined });
    } else if (type === 'POST_COMMENT') {
      const c = await prisma.postComment.findUnique({ where: { id: targetId }, select: { id: true, authorId: true, postId: true } });
      if (!c) return res.status(404).json({ message: '댓글을 찾을 수 없습니다.' });
      if (c.authorId === reporterId) return res.status(400).json({ message: '내 댓글은 신고할 수 없습니다.' });
      Object.assign(target, { postCommentId: c.id, postId: c.postId, targetUserId: c.authorId });
    } else {
      if (targetId === reporterId) return res.status(400).json({ message: '나 자신은 신고할 수 없습니다.' });
      target.targetUserId = targetId;
    }

    // 같은 대상·같은 사유로 처리 중인 신고가 있으면 한 번만
    const existingReport = await prisma.report.findFirst({
      where: {
        reporterId, type, reason, status: { in: ['PENDING', 'PROCESSING'] },
        ...(type === 'COMIC' && { comicId: targetId, episodeId: null }),
        ...(type === 'EPISODE' && { episodeId: targetId }),
        ...(type === 'COMMENT' && { commentId: targetId }),
        ...(type === 'USER' && { targetUserId: targetId, commentId: null, postId: null }),
        ...(type === 'POST' && { postId: targetId, postCommentId: null }),
        ...(type === 'POST_COMMENT' && { postCommentId: targetId }),
      },
    });
    if (existingReport) return res.status(400).json({ message: '이미 같은 사유로 신고해 처리 중이에요.' });

    const report = await prisma.report.create({ data: { type, reason, description, reporterId, ...target } });
    if (req.file) {
      await fs.mkdir(REPORT_IMAGE_DIR, { recursive: true });
      const name = `${report.id}.webp`;
      await sharp(req.file.buffer).rotate().resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 85 }).toFile(path.join(REPORT_IMAGE_DIR, name));
      await prisma.report.update({ where: { id: report.id }, data: { imageUrl: name } });
    }
    await prisma.reportHistory.create({ data: { reportId: report.id, fromStatus: null, toStatus: 'PENDING', memo: '신고 접수' } });

    res.json({ success: true, message: '신고가 접수되었습니다. 확인 후 조치할게요.', reportId: report.id });
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