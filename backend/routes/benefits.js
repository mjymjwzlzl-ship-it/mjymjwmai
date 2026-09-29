// 지갑(유료/이벤트 코인) · 쿠폰함 · 선물함 API. 관리자 발송은 /api/admin/benefits/*
const express = require('express');
const crypto = require('crypto');
const { prisma } = require('../lib/prisma');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { walletSummary, grantEventCoins } = require('../services/coin-wallet');
const { TYPE_LABEL, issueCoupon, userCoupons, couponExpiry } = require('../services/coupons');

const router = express.Router();
const adminOnly = [authenticate, requireAdmin];
const DAY = 24 * 60 * 60 * 1000;
const uid = (req) => req.user.id;

// ── 지갑 ──
router.get('/wallet', authenticate, async (req, res) => {
  res.set('Cache-Control', 'private, no-store');
  res.json(await walletSummary(uid(req)));
});

// ── 쿠폰함 ──
router.get('/coupons/mine', authenticate, async (req, res) => {
  res.set('Cache-Control', 'private, no-store');
  const comicId = req.query.comicId ? String(req.query.comicId) : undefined;
  res.json({ coupons: await userCoupons(uid(req), { comicId, includeUsed: !comicId }) });
});

// 쿠폰 번호 등록
router.post('/coupons/redeem', authenticate, async (req, res) => {
  const code = String(req.body?.code || '').trim().toUpperCase();
  if (!code) return res.status(400).json({ message: '쿠폰 번호를 입력해 주세요.' });
  const coupon = await prisma.coupon.findUnique({ where: { code } });
  const now = new Date();
  if (!coupon || !coupon.isActive) return res.status(404).json({ message: '없는 쿠폰 번호예요. 번호를 다시 확인해 주세요.' });
  if (coupon.expiresAt && coupon.expiresAt <= now) return res.status(400).json({ message: '등록 기간이 지난 쿠폰이에요.' });
  const already = await prisma.userCoupon.findFirst({ where: { userId: uid(req), couponId: coupon.id, source: 'CODE' } });
  if (already) return res.status(409).json({ message: '이미 등록한 쿠폰이에요.' });
  if (coupon.maxRedemptions) {
    const used = await prisma.userCoupon.count({ where: { couponId: coupon.id, source: 'CODE' } });
    if (used >= coupon.maxRedemptions) return res.status(400).json({ message: '선착순 등록이 모두 끝난 쿠폰이에요.' });
  }
  await issueCoupon(prisma, { userId: uid(req), coupon, source: 'CODE' });
  res.json({ success: true, message: `'${coupon.name}' 쿠폰을 등록했어요.` });
});

// ── 선물함 ──
function giftView(gift, couponById, now = new Date()) {
  const coupon = gift.couponId ? couponById.get(gift.couponId) : null;
  const expired = !gift.claimedAt && gift.claimBefore && gift.claimBefore <= now;
  const daysLeft = gift.claimBefore ? Math.max(0, Math.ceil((gift.claimBefore - now) / DAY)) : null;
  return {
    id: gift.id,
    type: gift.type,
    title: gift.type === 'COIN' ? `이벤트 코인 ${gift.amount.toLocaleString()}개` : coupon ? coupon.name : '쿠폰',
    kindLabel: gift.type === 'COIN' ? '코인' : TYPE_LABEL[coupon?.type] || '쿠폰',
    detail: gift.type === 'COIN' ? (gift.coinValidDays ? `받은 날부터 ${gift.coinValidDays}일 동안 사용` : '기한 없이 사용') : null,
    reason: gift.reason,
    claimBefore: gift.claimBefore,
    daysLeft,
    status: gift.claimedAt ? 'CLAIMED' : expired ? 'EXPIRED' : 'READY',
    claimedAt: gift.claimedAt,
    createdAt: gift.createdAt,
  };
}

router.get('/gifts/count', authenticate, async (req, res) => {
  const now = new Date();
  res.set('Cache-Control', 'private, no-store');
  res.json({ ready: await prisma.gift.count({ where: { userId: uid(req), claimedAt: null, OR: [{ claimBefore: null }, { claimBefore: { gt: now } }] } }) });
});

router.get('/gifts', authenticate, async (req, res) => {
  const gifts = await prisma.gift.findMany({ where: { userId: uid(req) }, orderBy: { createdAt: 'desc' }, take: 100 });
  const coupons = await prisma.coupon.findMany({ where: { id: { in: gifts.map((g) => g.couponId).filter(Boolean) } } });
  const couponById = new Map(coupons.map((c) => [c.id, c]));
  res.set('Cache-Control', 'private, no-store');
  res.json({ gifts: gifts.map((gift) => giftView(gift, couponById)) });
});

async function claim(userId, giftId) {
  return prisma.$transaction(async (tx) => {
    const now = new Date();
    const gift = await tx.gift.findUnique({ where: { id: giftId } });
    if (!gift || gift.userId !== userId) return { error: '선물을 찾을 수 없어요.' };
    if (gift.claimedAt) return { error: '이미 받은 선물이에요.' };
    if (gift.claimBefore && gift.claimBefore <= now) return { error: '받을 수 있는 기간이 지났어요.' };
    // 동시에 두 번 눌러도 한 번만
    const locked = await tx.gift.updateMany({ where: { id: gift.id, claimedAt: null }, data: { claimedAt: now } });
    if (!locked.count) return { error: '이미 받은 선물이에요.' };
    if (gift.type === 'COIN') {
      await grantEventCoins(tx, { userId, amount: gift.amount, reason: gift.reason, source: 'GIFT', expiresAt: gift.coinValidDays ? new Date(now.getTime() + gift.coinValidDays * DAY) : null });
    } else {
      const coupon = await tx.coupon.findUnique({ where: { id: gift.couponId } });
      if (!coupon) throw new Error('COUPON_MISSING');
      await issueCoupon(tx, { userId, coupon, source: 'GIFT' });
    }
    return { gift };
  });
}

router.post('/gifts/:giftId/claim', authenticate, async (req, res) => {
  const result = await claim(uid(req), req.params.giftId);
  if (result.error) return res.status(400).json({ message: result.error });
  res.json({ success: true });
});

router.post('/gifts/claim-all', authenticate, async (req, res) => {
  const now = new Date();
  const ready = await prisma.gift.findMany({ where: { userId: uid(req), claimedAt: null, OR: [{ claimBefore: null }, { claimBefore: { gt: now } }] }, select: { id: true } });
  let claimed = 0;
  for (const gift of ready) if (!(await claim(uid(req), gift.id)).error) claimed += 1;
  res.json({ success: true, claimed });
});

// ── 관리자 ──
router.get('/admin/benefits/coupons', adminOnly, async (req, res) => {
  const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } });
  const counts = await prisma.userCoupon.groupBy({ by: ['couponId'], _count: { _all: true } });
  const countById = new Map(counts.map((row) => [row.couponId, row._count._all]));
  res.json({ coupons: coupons.map((c) => ({ ...c, issued: countById.get(c.id) || 0 })) });
});

router.post('/admin/benefits/coupons', adminOnly, async (req, res) => {
  const b = req.body || {};
  const type = String(b.type || '').toUpperCase();
  if (!['DISCOUNT', 'RENT_PASS', 'OWN_PASS'].includes(type)) return res.status(400).json({ message: '쿠폰 종류가 올바르지 않습니다.' });
  if (!String(b.name || '').trim()) return res.status(400).json({ message: '쿠폰 이름을 입력하세요.' });
  const value = type === 'DISCOUNT' ? Math.round(Number(b.value)) : 0;
  if (type === 'DISCOUNT' && !(value >= 1 && value <= 100)) return res.status(400).json({ message: '할인율은 1~100% 입니다.' });
  let code = b.code === true ? crypto.randomBytes(5).toString('hex').toUpperCase() : String(b.code || '').trim().toUpperCase() || null;
  if (code && !/^[A-Z0-9-]{4,32}$/.test(code)) return res.status(400).json({ message: '쿠폰 번호는 영문 대문자·숫자·- 4~32자입니다.' });
  if (b.comicId && !(await prisma.comic.findUnique({ where: { id: String(b.comicId) }, select: { id: true } }))) return res.status(400).json({ message: '작품을 찾을 수 없습니다.' });
  try {
    const coupon = await prisma.coupon.create({ data: {
      name: String(b.name).trim(), type, value, comicId: b.comicId ? String(b.comicId) : null, code,
      uses: Math.max(1, Number(b.uses) || 1), validDays: Number(b.validDays) > 0 ? Number(b.validDays) : null,
      expiresAt: b.expiresAt ? new Date(b.expiresAt) : null, maxRedemptions: Number(b.maxRedemptions) > 0 ? Number(b.maxRedemptions) : null,
    } });
    res.json({ coupon });
  } catch (error) {
    if (error.code === 'P2002') return res.status(409).json({ message: '이미 있는 쿠폰 번호입니다.' });
    throw error;
  }
});

router.put('/admin/benefits/coupons/:couponId', adminOnly, async (req, res) => {
  const data = {};
  if (typeof req.body?.isActive === 'boolean') data.isActive = req.body.isActive;
  const coupon = await prisma.coupon.update({ where: { id: req.params.couponId }, data });
  res.json({ coupon });
});

// 선물 보내기: target = 'ALL' | 이메일 목록
router.post('/admin/benefits/gifts', adminOnly, async (req, res) => {
  const b = req.body || {};
  const type = String(b.type || '').toUpperCase();
  const reason = String(b.reason || '').trim();
  if (!reason) return res.status(400).json({ message: '지급 사유를 입력하세요.' });
  if (type === 'COIN' && !(Number(b.amount) > 0)) return res.status(400).json({ message: '코인 수를 입력하세요.' });
  if (type === 'COUPON' && !(await prisma.coupon.findUnique({ where: { id: String(b.couponId || '') } }))) return res.status(400).json({ message: '쿠폰을 고르세요.' });
  if (!['COIN', 'COUPON'].includes(type)) return res.status(400).json({ message: '선물 종류가 올바르지 않습니다.' });
  let users;
  if (b.target === 'ALL') {
    users = await prisma.user.findMany({ where: { status: 'ACTIVE' }, select: { id: true } });
  } else {
    const emails = String(b.emails || '').split(/[\s,;]+/).map((e) => e.trim().toLowerCase()).filter(Boolean);
    if (!emails.length) return res.status(400).json({ message: '받을 회원 이메일을 입력하세요.' });
    users = await prisma.user.findMany({ where: { email: { in: emails } }, select: { id: true, email: true } });
    const found = new Set(users.map((u) => u.email.toLowerCase()));
    const missing = emails.filter((e) => !found.has(e));
    if (missing.length) return res.status(400).json({ message: `없는 회원: ${missing.join(', ')}` });
  }
  const claimDays = Number(b.claimDays) > 0 ? Number(b.claimDays) : null;
  const batchId = crypto.randomUUID();
  const base = {
    type, reason, batchId,
    amount: type === 'COIN' ? Math.round(Number(b.amount)) : 0,
    coinValidDays: type === 'COIN' && Number(b.coinValidDays) > 0 ? Number(b.coinValidDays) : null,
    couponId: type === 'COUPON' ? String(b.couponId) : null,
    claimBefore: claimDays ? new Date(Date.now() + claimDays * DAY) : null,
  };
  for (let i = 0; i < users.length; i += 200) {
    await prisma.gift.createMany({ data: users.slice(i, i + 200).map((u) => ({ ...base, userId: u.id })) });
  }
  res.json({ success: true, sent: users.length, batchId });
});

router.get('/admin/benefits/gifts', adminOnly, async (req, res) => {
  const rows = await prisma.gift.groupBy({ by: ['batchId', 'type', 'reason', 'amount', 'couponId'], _count: { _all: true }, _min: { createdAt: true } });
  const claimed = await prisma.gift.groupBy({ by: ['batchId'], where: { claimedAt: { not: null } }, _count: { _all: true } });
  const claimedById = new Map(claimed.map((r) => [r.batchId, r._count._all]));
  res.json({ batches: rows.map((r) => ({ batchId: r.batchId, type: r.type, reason: r.reason, amount: r.amount, couponId: r.couponId, sent: r._count._all, claimed: claimedById.get(r.batchId) || 0, createdAt: r._min.createdAt })).sort((a, b) => b.createdAt - a.createdAt) });
});

module.exports = router;
