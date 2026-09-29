// 쿠폰·이용권: 발급(선물 받기·쿠폰 번호 등록), 사용 가능 목록, 회차 구매 시 적용
const { prisma } = require('../lib/prisma');

const DAY = 24 * 60 * 60 * 1000;
const TYPE_LABEL = { DISCOUNT: '할인 쿠폰', RENT_PASS: '무료 대여 이용권', OWN_PASS: '무료 소장 이용권' };

function couponExpiry(coupon, from = new Date()) {
  const candidates = [];
  if (coupon.validDays) candidates.push(new Date(from.getTime() + coupon.validDays * DAY));
  if (coupon.expiresAt) candidates.push(new Date(coupon.expiresAt));
  return candidates.length ? new Date(Math.min(...candidates.map((d) => d.getTime()))) : null;
}

// 한 사람에게 쿠폰 발급. tx 안에서 부를 수 있다.
async function issueCoupon(db, { userId, coupon, source = 'GIFT' }) {
  return db.userCoupon.create({ data: { userId, couponId: coupon.id, remainingUses: coupon.uses || 1, expiresAt: couponExpiry(coupon), source } });
}

function describe(coupon, comicTitle) {
  const scope = coupon.comicId ? `「${comicTitle || '지정 작품'}」 전용` : '모든 작품';
  const benefit = coupon.type === 'DISCOUNT' ? `유료 회차 대여·소장 ${coupon.value}% 할인` : coupon.type === 'RENT_PASS' ? '유료 회차 1개 무료 대여' : '유료 회차 1개 무료 소장';
  return { typeLabel: TYPE_LABEL[coupon.type] || '쿠폰', scope, benefit, condition: `${scope} · 1회 사용에 1장`, };
}

async function userCoupons(userId, { comicId, includeUsed = false } = {}) {
  const now = new Date();
  const rows = await prisma.userCoupon.findMany({ where: { userId, ...(includeUsed ? {} : { remainingUses: { gt: 0 } }) }, orderBy: { createdAt: 'desc' }, take: 200 });
  const coupons = await prisma.coupon.findMany({ where: { id: { in: [...new Set(rows.map((r) => r.couponId))] } } });
  const couponById = new Map(coupons.map((c) => [c.id, c]));
  const comics = await prisma.comic.findMany({ where: { id: { in: coupons.map((c) => c.comicId).filter(Boolean) } }, select: { id: true, title: true } });
  const titleById = new Map(comics.map((c) => [c.id, c.title]));
  return rows
    .map((row) => {
      const coupon = couponById.get(row.couponId);
      if (!coupon) return null;
      const expired = row.expiresAt && row.expiresAt <= now;
      const daysLeft = row.expiresAt ? Math.max(0, Math.ceil((row.expiresAt - now) / DAY)) : null;
      return {
        id: row.id,
        name: coupon.name,
        type: coupon.type,
        value: coupon.value,
        comicId: coupon.comicId,
        comicTitle: coupon.comicId ? titleById.get(coupon.comicId) || null : null,
        remainingUses: row.remainingUses,
        expiresAt: row.expiresAt,
        daysLeft,
        expiringSoon: !expired && daysLeft !== null && daysLeft <= 3,
        status: row.remainingUses <= 0 ? 'USED' : expired ? 'EXPIRED' : 'AVAILABLE',
        source: row.source,
        createdAt: row.createdAt,
        ...describe(coupon, titleById.get(coupon.comicId)),
      };
    })
    .filter(Boolean)
    .filter((c) => !comicId || (c.status === 'AVAILABLE' && (!c.comicId || c.comicId === comicId)));
}

// 회차 구매에 쿠폰 적용: 가격·모드 계산만 (차감은 useCoupon)
async function resolveCouponForPurchase({ userId, userCouponId, comicId }) {
  const row = await prisma.userCoupon.findUnique({ where: { id: userCouponId } });
  if (!row || row.userId !== userId) return { error: '쿠폰을 찾을 수 없습니다.' };
  if (row.remainingUses <= 0) return { error: '이미 사용한 쿠폰입니다.' };
  if (row.expiresAt && row.expiresAt <= new Date()) return { error: '기간이 지난 쿠폰입니다.' };
  const coupon = await prisma.coupon.findUnique({ where: { id: row.couponId } });
  if (!coupon) return { error: '쿠폰을 찾을 수 없습니다.' };
  if (coupon.comicId && coupon.comicId !== comicId) return { error: '이 작품에는 쓸 수 없는 쿠폰입니다.' };
  return { row, coupon };
}

function applyCoupon(coupon, { mode, price }) {
  if (coupon.type === 'RENT_PASS') return { mode: 'RENT', price: 0 };
  if (coupon.type === 'OWN_PASS') return { mode: 'OWN', price: 0 };
  return { mode, price: Math.max(0, Math.round(price * (100 - Math.min(Math.max(coupon.value, 0), 100)) / 100)) };
}

async function useCoupon(tx, userCouponId) {
  const row = await tx.userCoupon.findUnique({ where: { id: userCouponId } });
  const result = await tx.userCoupon.updateMany({
    where: { id: userCouponId, remainingUses: { gt: 0 } },
    data: { remainingUses: { decrement: 1 }, ...(row && row.remainingUses <= 1 ? { usedAt: new Date() } : {}) },
  });
  if (!result.count) throw Object.assign(new Error('COUPON_USED'), { couponUsed: true });
}

module.exports = { TYPE_LABEL, couponExpiry, issueCoupon, userCoupons, resolveCouponForPurchase, applyCoupon, useCoupon };
