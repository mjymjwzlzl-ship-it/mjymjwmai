const { getJwtSecret } = require('../lib/jwt-secret');
// 작품 응원하기 - 코인으로 원하는 만큼 응원, 응원 수치는 외전/시즌2 제작 우선순위에 반영
const express = require('express');
const jwt = require('jsonwebtoken');
const { prisma } = require('../lib/prisma');
const { expireEventCoins, consumeEventCoins } = require('../services/coin-wallet');

const router = express.Router();

const CHEER_TYPE = 'SUPPORT';
const descriptionFor = (comicId) => `작품응원|${comicId}`;

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: '로그인이 필요합니다.' });
  }

  jwt.verify(token, getJwtSecret(), (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, message: '유효하지 않은 토큰입니다.' });
    }
    req.user = user;
    next();
  });
};

// 작품 응원 현황 (총 응원 코인, 응원자 수, 명예의 전당 TOP 3)
router.get('/:comicId', async (req, res) => {
  try {
    const { comicId } = req.params;

    const cheers = await prisma.coinTransaction.findMany({
      where: {
        type: CHEER_TYPE,
        description: { startsWith: descriptionFor(comicId) },
      },
      include: {
        user: { select: { id: true, nickname: true, username: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalCoins = cheers.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
    const supporterTotals = new Map();

    for (const tx of cheers) {
      const key = tx.user?.id || tx.userId;
      const name = tx.user?.nickname || tx.user?.username || '익명의 응원단';
      const entry = supporterTotals.get(key) || { name, coins: 0 };
      entry.coins += Math.abs(tx.amount);
      supporterTotals.set(key, entry);
    }

    const hallOfFame = [...supporterTotals.values()]
      .sort((a, b) => b.coins - a.coins)
      .slice(0, 3);

    res.json({
      success: true,
      totalCoins,
      supporterCount: supporterTotals.size,
      hallOfFame,
    });
  } catch (error) {
    console.error('응원 현황 조회 실패:', error);
    res.status(500).json({ success: false, message: '응원 현황을 불러오지 못했습니다.' });
  }
});

// 작품 응원하기 (코인 차감)
router.post('/:comicId', authenticateToken, async (req, res) => {
  try {
    const { comicId } = req.params;
    const userId = req.user.userId || req.user.id;
    const amount = Math.floor(Number(req.body.amount));
    const message = String(req.body.message || '').slice(0, 100);

    if (!Number.isFinite(amount) || amount < 1) {
      return res.status(400).json({ success: false, message: '응원 코인은 1개 이상이어야 합니다.' });
    }

    const comic = await prisma.comic.findUnique({ where: { id: comicId } });
    if (!comic) {
      return res.status(404).json({ success: false, message: '작품을 찾을 수 없습니다.' });
    }

    await expireEventCoins(userId);
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { coinBalance: true },
      });

      if (!user || user.coinBalance < amount) {
        return { ok: false, balance: user?.coinBalance ?? 0 };
      }

      const updated = await tx.user.update({
        where: { id: userId },
        data: { coinBalance: { decrement: amount } },
      });
      await consumeEventCoins(tx, userId, amount);

      await tx.coinTransaction.create({
        data: {
          userId,
          amount: -amount,
          balance: updated.coinBalance,
          type: CHEER_TYPE,
          description: message
            ? `${descriptionFor(comicId)}|${message}`
            : descriptionFor(comicId),
        },
      });

      return { ok: true, balance: updated.coinBalance };
    });

    if (!result.ok) {
      return res.status(400).json({
        success: false,
        message: '코인이 부족합니다. 출석 체크로 코인을 모아보세요!',
        coinBalance: result.balance,
      });
    }

    res.json({
      success: true,
      message: `${comic.title}에 ${amount}코인을 응원했습니다!`,
      coinBalance: result.balance,
    });
  } catch (error) {
    console.error('작품 응원 실패:', error);
    res.status(500).json({ success: false, message: '응원 처리 중 오류가 발생했습니다.' });
  }
});

module.exports = router;
