const express = require('express');
const router = express.Router();
const { prisma } = require('../lib/prisma');
const jwt = require('jsonwebtoken');

// JWT 인증 미들웨어
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: '인증이 필요합니다.' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) {
      return res.status(403).json({ message: '유효하지 않은 토큰입니다.' });
    }
    req.user = user;
    next();
  });
};

// 출석 보상 계산 함수 (매일 1코인 + 7일 연속 시 10코인 보너스)
const getRewardForDay = (consecutiveDays) => {
  // 매일 기본 1코인
  let reward = 1;

  // 7일 연속 출석 시 보너스 10코인 추가
  if (consecutiveDays % 7 === 0) {
    reward += 10;
  }

  return reward;
};

// 출석 체크
router.post('/check', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // 오늘 이미 출석했는지 확인
    const existingAttendance = await prisma.attendance.findUnique({
      where: {
        userId_date: {
          userId,
          date: today
        }
      }
    });

    if (existingAttendance) {
      return res.status(400).json({
        message: '이미 오늘 출석하셨습니다.',
        attendance: existingAttendance
      });
    }

    // 어제 출석 기록 확인
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const yesterdayAttendance = await prisma.attendance.findUnique({
      where: {
        userId_date: {
          userId,
          date: yesterdayStr
        }
      }
    });

    // 연속 출석 일수 계산
    const consecutiveDays = yesterdayAttendance ? yesterdayAttendance.consecutiveDays + 1 : 1;

    // 보상 계산
    const reward = getRewardForDay(consecutiveDays);

    // 출석 기록 생성 및 코인 지급
    const attendance = await prisma.$transaction(async (tx) => {
      // 출석 기록 생성
      const newAttendance = await tx.attendance.create({
        data: {
          userId,
          date: today,
          consecutiveDays,
          reward
        }
      });

      // 사용자 코인 증가
      await tx.user.update({
        where: { id: userId },
        data: {
          coinBalance: {
            increment: reward
          }
        }
      });

      // 코인 거래 내역 생성
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { coinBalance: true }
      });

      await tx.coinTransaction.create({
        data: {
          userId,
          amount: reward,
          balance: user.coinBalance,
          type: 'REWARD',
          description: `출석체크 보상 (${consecutiveDays}일차)`
        }
      });

      return newAttendance;
    });

    res.json({
      success: true,
      message: `출석 완료! ${reward}코인을 받으셨습니다.`,
      attendance,
      consecutiveDays,
      reward
    });

  } catch (error) {
    console.error('출석 체크 오류:', error);
    res.status(500).json({
      message: '출석 체크 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// 출석 현황 조회 (이번 달)
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1; // 0-indexed

    // 이번 달 첫날과 마지막 날
    const firstDay = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0);
    const lastDayStr = lastDay.toISOString().split('T')[0];

    // 이번 달 출석 기록 조회
    const attendances = await prisma.attendance.findMany({
      where: {
        userId,
        date: {
          gte: firstDay,
          lte: lastDayStr
        }
      },
      orderBy: {
        date: 'asc'
      }
    });

    // 오늘 출석 여부
    const todayStr = today.toISOString().split('T')[0];
    const todayAttendance = attendances.find(a => a.date === todayStr);

    // 현재 연속 출석 일수
    let currentStreak = 0;
    if (todayAttendance) {
      currentStreak = todayAttendance.consecutiveDays;
    } else {
      // 오늘 출석 안 했으면 어제 기록 확인
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      const yesterdayAttendance = await prisma.attendance.findUnique({
        where: {
          userId_date: {
            userId,
            date: yesterdayStr
          }
        }
      });

      if (yesterdayAttendance) {
        currentStreak = yesterdayAttendance.consecutiveDays;
      }
    }

    // 다음 출석 보상
    const nextDayNumber = todayAttendance ? currentStreak + 1 : currentStreak + 1;
    const nextReward = getRewardForDay(nextDayNumber);

    // 총 획득 코인 (이번 달)
    const totalCoins = attendances.reduce((sum, a) => sum + a.reward, 0);

    res.json({
      year,
      month,
      attendances,
      checkedToday: !!todayAttendance,
      currentStreak,
      nextReward,
      totalCoins,
      totalDays: attendances.length
    });

  } catch (error) {
    console.error('출석 현황 조회 오류:', error);
    res.status(500).json({
      message: '출석 현황 조회 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// 보상 테이블 조회
router.get('/rewards', (req, res) => {
  const rewards = [
    { day: 1, reward: 1 },
    { day: 2, reward: 1 },
    { day: 3, reward: 1 },
    { day: 4, reward: 1 },
    { day: 5, reward: 1 },
    { day: 6, reward: 1 },
    { day: 7, reward: 11, bonus: 10 }, // 7일차: 기본 1코인 + 보너스 10코인
  ];

  res.json({
    rewards,
    totalWeeklyReward: 17 // 6 + 11 = 17코인
  });
});

module.exports = router;
