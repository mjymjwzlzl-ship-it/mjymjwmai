const { getJwtSecret } = require('../lib/jwt-secret');
const express = require('express');
const jwt = require('jsonwebtoken');
const { prisma } = require('../lib/prisma');

const router = express.Router();

// JWT 토큰 검증 미들웨어
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    console.log('❌ 토큰 없음 - 로그인 필요');
    return res.status(401).json({ message: '로그인이 필요합니다.' });
  }

  jwt.verify(token, getJwtSecret(), (err, user) => {
    if (err) {
      console.error('❌ 토큰 검증 실패:', err.message);
      return res.status(403).json({ message: '유효하지 않은 토큰입니다.' });
    }
    req.user = user;
    next();
  });
};

// 첫 결제 여부 확인
router.get('/first-time-check', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // 사용자의 결제 이력 확인
    const paymentHistory = await prisma.payment.findFirst({
      where: {
        userId: userId,
        status: 'completed'
      }
    });
    
    const isFirstTime = !paymentHistory;
    
    res.json({ 
      isFirstTime,
      message: isFirstTime ? '첫 구독 50% 할인 혜택을 받으실 수 있습니다!' : null
    });
  } catch (error) {
    console.error('첫 결제 확인 오류:', error);
    res.status(500).json({ message: '오류가 발생했습니다.' });
  }
});

// 코인 패키지 목록 조회 (첫 구독 할인 포함)
router.get('/coin-packages', authenticateToken, async (req, res) => {
  try {
    const { first_time_bonus } = req.query;
    const userId = req.user?.userId;
    
    let packages = [
      { id: 'basic', coins: 10, price: 1980, bonus: 0, description: '기본 패키지' },
      { id: 'standard', coins: 30, price: 5500, bonus: 3, description: '10% 보너스' },
      { id: 'premium', coins: 50, price: 8900, bonus: 5, description: '15% 할인', popular: true },
      { id: 'ultimate', coins: 100, price: 16900, bonus: 15, description: '20% 할인 + 15% 보너스' },
      { id: 'mega', coins: 300, price: 49900, bonus: 60, description: '25% 할인 + 20% 보너스' },
    ];
    
    // 첫 구독 할인 적용 여부 확인
    let isFirstTimeBonus = false;
    if (first_time_bonus === 'true' && userId) {
      const paymentHistory = await prisma.payment.findFirst({
        where: {
          userId: userId,
          status: 'completed'
        }
      });
      
      isFirstTimeBonus = !paymentHistory;
    }
    
    // 첫 구독 50% 할인 적용
    if (isFirstTimeBonus) {
      packages = packages.map(pkg => ({
        ...pkg,
        originalPrice: pkg.price,
        price: Math.floor(pkg.price * 0.5), // 50% 할인
        firstTimeBonus: true,
        description: `🎉 첫 구매 50% 할인 + ${pkg.description}`
      }));
    }
    
    res.json({ 
      packages,
      isFirstTimeBonus,
      message: isFirstTimeBonus ? '첫 구독 50% 할인이 적용되었습니다!' : null
    });
  } catch (error) {
    // 비로그인 상태에서도 기본 패키지 보여주기
    const packages = [
      { id: 'basic', coins: 10, price: 1980, bonus: 0, description: '기본 패키지' },
      { id: 'standard', coins: 30, price: 5500, bonus: 3, description: '10% 보너스' },
      { id: 'premium', coins: 50, price: 8900, bonus: 5, description: '15% 할인', popular: true },
      { id: 'ultimate', coins: 100, price: 16900, bonus: 15, description: '20% 할인 + 15% 보너스' },
      { id: 'mega', coins: 300, price: 49900, bonus: 60, description: '25% 할인 + 20% 보너스' },
    ];
    res.json({ packages });
  }
});

// 결제 준비 (주문번호 생성)
router.post('/prepare', authenticateToken, async (req, res) => {
  try {
    const { packageId, paymentMethod, firstTimeBonus } = req.body;
    const userId = req.user.userId;

    // 패키지 정보 확인
    const packages = {
      basic: { coins: 10, price: 1980, bonus: 0 },
      standard: { coins: 30, price: 5500, bonus: 3 },
      premium: { coins: 50, price: 8900, bonus: 5 },
      ultimate: { coins: 100, price: 16900, bonus: 15 },
      mega: { coins: 300, price: 49900, bonus: 60 },
    };

    const selectedPackage = packages[packageId];
    if (!selectedPackage) {
      return res.status(400).json({ message: '유효하지 않은 패키지입니다.' });
    }
    
    // 첫 구독 할인 적용 여부 확인
    let finalPrice = selectedPackage.price;
    let isFirstTimeDiscount = false;
    
    if (firstTimeBonus) {
      const paymentHistory = await prisma.payment.findFirst({
        where: {
          userId: userId,
          status: 'completed'
        }
      });
      
      if (!paymentHistory) {
        finalPrice = Math.floor(selectedPackage.price * 0.5); // 50% 할인
        isFirstTimeDiscount = true;
      }
    }

    // 사용자 정보 조회
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }

    // 고유한 주문번호 생성
    const merchantUid = `order_${Date.now()}_${userId.slice(-8)}`;
    const totalCoins = selectedPackage.coins + selectedPackage.bonus;

    // 결제 정보 저장
    const payment = await prisma.payment.create({
      data: {
        merchantUid: merchantUid,
        impUid: '', // 결제 완료 후 업데이트
        amount: finalPrice, // 할인된 가격 적용
        coinAmount: selectedPackage.coins,
        bonusCoins: selectedPackage.bonus,
        status: 'PENDING',
        payMethod: paymentMethod,
        buyerName: user.nickname || user.username,
        buyerEmail: user.email,
        userId: userId
      }
    });

    res.json({
      success: true,
      merchantUid: merchantUid,
      amount: finalPrice, // 할인된 가격 반환
      originalAmount: selectedPackage.price,
      isFirstTimeDiscount: isFirstTimeDiscount,
      coinAmount: totalCoins,
      buyerName: user.nickname || user.username,
      buyerEmail: user.email,
      packageInfo: selectedPackage
    });

  } catch (error) {
    console.error('결제 준비 오류:', error);
    res.status(500).json({ message: '결제 준비 중 오류가 발생했습니다.' });
  }
});

// 이니시스 결제 초기화 - 결제 서버로 리다이렉트
router.post('/init', authenticateToken, async (req, res) => {
  try {
    console.log('📋 결제 초기화 요청:', req.body);
    console.log('🔐 사용자 정보:', req.user);
    
    const { packageId, amount, coins, firstTimeBonus } = req.body;
    const userId = req.user?.userId || req.user?.id;
    
    if (!userId) {
      console.error('❌ 사용자 ID 없음:', req.user);
      return res.status(400).json({ message: '사용자 정보가 올바르지 않습니다.' });
    }

    // 사용자 정보 조회
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      console.error('❌ 사용자 없음 - ID:', userId);
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }
    
    console.log('✅ 사용자 찾음:', user.username, user.email);

    // 코인 패키지 정의
    const coinPackages = [
      { id: 'basic', coins: 10, price: 1980, bonus: 0 },
      { id: 'standard', coins: 30, price: 5500, bonus: 3 },
      { id: 'premium', coins: 50, price: 8900, bonus: 5 },
      { id: 'ultimate', coins: 100, price: 16900, bonus: 15 },
      { id: 'mega', coins: 300, price: 49900, bonus: 60 },
    ];

    // 패키지 정보 찾기
    const selectedPackage = coinPackages.find(p => p.id === packageId);
    const bonusCoins = selectedPackage ? selectedPackage.bonus : 0;

    // 고유한 주문번호 생성
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const merchantUid = `ARATA_${timestamp}_${userId.slice(-8)}`;
    
    // 결제 정보 사전 저장 (PENDING 상태)
    const payment = await prisma.payment.create({
      data: {
        merchantUid: merchantUid,
        impUid: `pending_${timestamp}_${randomStr}`, // 더 고유한 임시 값
        amount: amount,
        coinAmount: coins - bonusCoins, // 기본 코인 (보너스 제외)
        bonusCoins: bonusCoins, // 보너스 코인
        status: 'PENDING',
        payMethod: 'inicis', // 이니시스 결제
        buyerName: user.nickname || user.username,
        buyerEmail: user.email,
        userId: userId
      }
    });

    // 이니시스 결제 서버 URL 생성 (프로덕션 대응)
    const host = req.get('host') || 'localhost:8000';
    const protocol = req.protocol || 'http';
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://arata.co.kr'  // 프로덕션 URL
      : `${protocol}://${host}`;
    
    const inicisServerUrl = `${baseUrl}/api/inicis/pay?amount=${amount}&coins=${coins}&merchantUid=${merchantUid}&buyerName=${encodeURIComponent(user.nickname || user.username)}&buyerEmail=${encodeURIComponent(user.email)}`;

    console.log('📋 이니시스 결제 서버 URL 생성:', inicisServerUrl);

    res.json({
      success: true,
      paymentUrl: inicisServerUrl,
      merchantUid: merchantUid,
      message: '이니시스 결제 서버로 이동합니다.'
    });

  } catch (error) {
    console.error('❌ 이니시스 결제 초기화 오류:', error);
    console.error('❌ 에러 스택:', error.stack);
    console.error('❌ 에러 타입:', error.name);
    console.error('❌ 에러 메시지:', error.message);
    
    // Prisma 에러인 경우 더 자세한 정보 출력
    if (error.code === 'P2002') {
      return res.status(400).json({ message: '중복된 결제 요청입니다.' });
    }
    
    res.status(500).json({ 
      message: '결제 초기화 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined || '알 수 없는 오류'
    });
  }
});

// 이니시스 결제 URL 생성 함수
function generateInicisPaymentUrl(params) {
  const crypto = require('crypto');
  
  // 이니시스 필수 파라미터
  const paymentParams = {
    mid: process.env.INICIS_MID || 'INIpayTest', // 상점ID
    oid: params.merchantUid, // 주문번호
    price: params.amount, // 결제금액
    goodname: `ARATA 코인 충전`, // 상품명
    buyername: params.buyerName, // 구매자명
    buyeremail: params.buyerEmail, // 구매자 이메일
    buyertel: '01000000000', // 구매자 전화번호
    currency: 'WON', // 통화
    charset: 'UTF-8', // 인코딩
    paymethod: 'Card', // 결제수단
    returnUrl: params.returnUrl, // 결과 수신 URL
    closeUrl: params.closeUrl || params.returnUrl, // 결제창 닫기 URL
    timestamp: Date.now().toString() // 타임스탬프
  };

  // signature 생성 (보안을 위한 해시값)
  const signatureKey = process.env.INICIS_SIGN_KEY || 'SU5JcGF5VGVzdA==';
  const signatureData = `${paymentParams.oid}${paymentParams.price}${paymentParams.timestamp}`;
  paymentParams.signature = crypto
    .createHmac('sha256', signatureKey)
    .update(signatureData)
    .digest('hex');

  // URL 파라미터 생성
  const urlParams = new URLSearchParams(paymentParams);
  
  // 테스트 환경 또는 프로덕션 환경에 따른 URL
  const baseUrl = process.env.NODE_ENV === 'production' 
    ? 'https://stdpay.inicis.com/stdpay/pay.php'  // 운영
    : 'https://stgstdpay.inicis.com/stdpay/pay.php'; // 테스트

  return `${baseUrl}?${urlParams.toString()}`;
}

// 이니시스 결제 결과 검증 함수
function verifyInicisPayment(params) {
  const crypto = require('crypto');
  
  const {
    resultCode,
    resultMsg,
    mid,
    oid,
    price,
    tid,
    signature: receivedSignature
  } = params;

  // signature 검증
  const signatureKey = process.env.INICIS_SIGN_KEY || 'SU5JcGF5VGVzdA==';
  const signatureData = `${oid}${price}${tid}`;
  const expectedSignature = crypto
    .createHmac('sha256', signatureKey)
    .update(signatureData)
    .digest('hex');

  return {
    isValid: receivedSignature === expectedSignature,
    isSuccess: resultCode === '00',
    message: resultMsg,
    transactionId: tid
  };
}

// 이니시스 결제 완료 처리 (이니시스 서버에서 호출)
// 예전 결제 완료 API: 결제 검증 없이 코인을 지급할 수 있어 막는다 (실제 결제는 /inicis-return 에서 승인 확인 후 처리)
router.post('/inicis-complete', (req, res) => {
  res.status(410).json({ success: false, message: '더 이상 사용하지 않는 결제 경로입니다.' });
});

// INICIS 결제 결과 수신 → 서버가 INICIS 에 승인 요청을 보내 확인된 경우에만 코인 지급 (2026-09-29 보안 수정)
// 예전 코드는 폼으로 넘어온 resultCode 만 믿고 지급해, 누구나 주문번호로 코인을 받을 수 있었고 반복 지급도 됐다.
const INICIS_SIGN_KEY = process.env.INICIS_SIGN_KEY || 'SU5JTElURV9UUklQTEVERVNfS0VZU1RS'; // INIpayTest 공개 테스트 키
const frontendUrl = () => process.env.FRONTEND_URL || 'https://arata.co.kr';
const completeRedirect = (res, code, msg) =>
  res.redirect(`${frontendUrl()}/payment/complete?resultCode=${code}&resultMsg=${encodeURIComponent(msg || '')}`);
const sha256 = (text) => require('crypto').createHash('sha256').update(text).digest('hex');
const isInicisUrl = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && (url.hostname === 'inicis.com' || url.hostname.endsWith('.inicis.com'));
  } catch {
    return false;
  }
};

router.post('/inicis-return', async (req, res) => {
  const { resultCode, resultMsg, mid, orderNumber, oid, authToken, authUrl, netCancelUrl } = req.body || {};
  const merchantUid = orderNumber || oid;
  try {
    if (resultCode !== '0000') {
      if (merchantUid) {
        await prisma.payment.updateMany({ where: { merchantUid, status: 'PENDING' }, data: { status: 'FAILED', failReason: String(resultMsg || resultCode || '').slice(0, 200) } });
      }
      return completeRedirect(res, resultCode || '99', resultMsg || '결제가 취소되었거나 실패했습니다.');
    }
    const payment = merchantUid ? await prisma.payment.findFirst({ where: { merchantUid } }) : null;
    if (!payment) return completeRedirect(res, '99', '결제 정보를 찾을 수 없습니다.');
    if (payment.status === 'COMPLETED') return completeRedirect(res, '00', '이미 처리된 결제입니다.');
    if (payment.status !== 'PENDING') return completeRedirect(res, '99', '처리할 수 없는 결제 상태입니다.');
    if (!authToken || !isInicisUrl(authUrl)) return completeRedirect(res, '99', '결제 승인 정보가 올바르지 않습니다.');

    // INICIS 승인 요청 (표준결제 authUrl)
    const timestamp = Date.now();
    const form = new URLSearchParams({
      mid: mid || process.env.INICIS_MID || 'INIpayTest',
      authToken,
      timestamp: String(timestamp),
      signature: sha256(`authToken=${authToken}&timestamp=${timestamp}`),
      verification: sha256(`authToken=${authToken}&signKey=${INICIS_SIGN_KEY}&timestamp=${timestamp}`),
      charset: 'UTF-8',
      format: 'JSON',
    });
    let approval;
    try {
      const response = await fetch(authUrl, { method: 'POST', body: form, headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, signal: AbortSignal.timeout(15000) });
      approval = await response.json();
    } catch (error) {
      console.error('INICIS 승인 요청 실패:', error.message);
      return completeRedirect(res, '99', '결제 승인 확인에 실패했습니다. 잠시 후 다시 시도해 주세요.');
    }
    const approvedAmount = Number(approval?.TotPrice);
    const approvedOid = approval?.MOID;
    if (approval?.resultCode !== '0000' || approvedOid !== merchantUid || approvedAmount !== Number(payment.amount)) {
      console.error('INICIS 승인 불일치:', { resultCode: approval?.resultCode, approvedOid, approvedAmount, expected: payment.amount });
      // 승인은 됐는데 금액·주문이 다르면 망취소
      if (approval?.resultCode === '0000' && isInicisUrl(netCancelUrl)) {
        fetch(netCancelUrl, { method: 'POST', body: form, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }).catch(() => {});
      }
      await prisma.payment.updateMany({ where: { id: payment.id, status: 'PENDING' }, data: { status: 'FAILED', failReason: `승인 불일치 ${approval?.resultCode || ''}`.slice(0, 200) } });
      return completeRedirect(res, '99', approval?.resultMsg || '결제 승인에 실패했습니다.');
    }

    // 한 번만 지급: PENDING → COMPLETED 로 바뀐 경우에만 코인 적립
    await prisma.$transaction(async (tx) => {
      const claimed = await tx.payment.updateMany({
        where: { id: payment.id, status: 'PENDING' },
        data: { status: 'COMPLETED', completedAt: new Date(), impUid: approval.tid || payment.impUid, pgTid: approval.tid || null },
      });
      if (claimed.count !== 1) return;
      const totalCoins = payment.coinAmount + (payment.bonusCoins || 0);
      const user = await tx.user.update({ where: { id: payment.userId }, data: { coinBalance: { increment: totalCoins } }, select: { coinBalance: true } });
      await tx.coinTransaction.create({
        data: { userId: payment.userId, amount: totalCoins, balance: user.coinBalance, type: 'CHARGE', description: `코인 충전 (${totalCoins}코인)`, paymentId: payment.id },
      });
    });
    return completeRedirect(res, '00', '결제가 완료되었습니다.');
  } catch (error) {
    console.error('INICIS 결제 콜백 처리 오류:', error);
    return completeRedirect(res, '99', '결제 처리 중 오류가 발생했습니다.');
  }
});

router.post('/complete', authenticateToken, async (req, res) => {
  try {
    const { imp_uid, merchant_uid } = req.body;
    const userId = req.user.userId;

    console.log('결제 완료 처리 시작:', { imp_uid, merchant_uid, userId });

    // 결제 정보 조회
    const payment = await prisma.payment.findFirst({
      where: {
        merchantUid: merchant_uid,
        userId: userId
      }
    });

    if (!payment) {
      return res.status(404).json({ message: '결제 정보를 찾을 수 없습니다.' });
    }

    // 실제 상태를 알려준다 (코인 지급은 /inicis-return 에서 INICIS 승인 확인 후에만)
    if (payment.status === 'COMPLETED' || payment.status === 'PAID') {
      return res.json({ success: true, message: '결제가 완료되었습니다.', coinAmount: payment.coinAmount + (payment.bonusCoins || 0) });
    }
    res.status(409).json({
      success: false,
      status: payment.status,
      message: payment.status === 'FAILED' ? '결제가 완료되지 않았습니다.' : '결제 확인 중입니다. 잠시 후 코인 내역을 확인해 주세요.'
    });

  } catch (error) {
    console.error('결제 완료 처리 오류:', error);
    res.status(500).json({ message: '결제 처리 중 오류가 발생했습니다.' });
  }
});

// 결제 실패 처리
router.post('/fail', authenticateToken, async (req, res) => {
  try {
    const { merchant_uid, error_msg } = req.body;
    const userId = req.user.userId;

    await prisma.payment.updateMany({
      where: {
        merchantUid: merchant_uid,
        userId: userId
      },
      data: {
        status: 'FAILED',
        failReason: error_msg
      }
    });

    res.json({ success: true, message: '결제 실패 처리되었습니다.' });

  } catch (error) {
    console.error('결제 실패 처리 오류:', error);
    res.status(500).json({ message: '결제 실패 처리 중 오류가 발생했습니다.' });
  }
});

// 코인 사용 내역 조회 (충전 + 사용 모두 포함)
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId;
    
    // 코인 거래 내역 조회 (충전, 사용 모두)
    const transactions = await prisma.coinTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        payment: {
          select: {
            amount: true,
            payMethod: true
          }
        }
      }
    });

    // 현재 코인 잔액 조회
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { coinBalance: true }
    });

    res.json({
      success: true,
      currentBalance: user?.coinBalance || 0,
      transactions
    });
  } catch (error) {
    console.error('거래 내역 조회 실패:', error);
    res.status(500).json({ message: '거래 내역 조회 중 오류가 발생했습니다.' });
  }
});

// 코인 거래 내역 조회
router.get('/coin-transactions', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const transactions = await prisma.coinTransaction.findMany({
      where: {
        userId: userId
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip: offset,
      take: limit,
      include: {
        payment: {
          select: {
            merchantUid: true,
            payMethod: true
          }
        }
      }
    });

    const total = await prisma.coinTransaction.count({
      where: {
        userId: userId
      }
    });

    res.json({
      transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('코인 거래 내역 조회 오류:', error);
    res.status(500).json({ message: '코인 거래 내역 조회 중 오류가 발생했습니다.' });
  }
});

module.exports = router;