// 작품 프로모션(할인·무료) 공통 계산. 열람 권한·가격·목록이 모두 이 파일을 쓴다.
// 가격·권한 계산이 동기 함수라서, 켜져 있는 프로모션을 메모리에 들고 30초마다(그리고 관리자 수정 직후) 다시 읽는다.
// 기간 판정은 호출 시각 기준이라 캐시가 늦어도 종료 시각이 지나면 바로 빠진다.
const { prisma } = require('../lib/prisma');

const TYPES = ['DISCOUNT', 'FREE_EPISODES', 'FREE_RENTAL'];
let byComic = new Map();
let timer = null;

async function refreshPromotions() {
  try {
    const rows = await prisma.comicPromotion.findMany({
      where: { isActive: true, endAt: { gt: new Date() } },
      orderBy: { startAt: 'asc' },
    });
    const next = new Map();
    for (const row of rows) {
      if (!next.has(row.comicId)) next.set(row.comicId, []);
      next.get(row.comicId).push(row);
    }
    byComic = next;
  } catch (error) {
    console.error('프로모션 캐시 갱신 실패:', error.message);
  }
}

function startPromotionCache() {
  if (timer) return;
  void refreshPromotions();
  timer = setInterval(refreshPromotions, 30 * 1000);
  timer.unref?.();
}

const isLive = (promo, now = new Date()) => promo.isActive && new Date(promo.startAt) <= now && new Date(promo.endAt) > now;

function activePromotions(comicId, now = new Date()) {
  return (byComic.get(String(comicId || '')) || []).filter((promo) => isLive(promo, now));
}

// 프로모션으로 무료가 되는 회차인가 (FREE_EPISODES: 1~value화)
function isPromoFreeEpisode(comicId, episodeNumber, now = new Date()) {
  return activePromotions(comicId, now).some((promo) => promo.type === 'FREE_EPISODES' && episodeNumber <= promo.value);
}

// 기본 가격에 프로모션 적용. base = { ownPrice, rentPrice, rentalDays, rentalEnabled }
function applyPromotionPrices(comicId, base, now = new Date()) {
  const promos = activePromotions(comicId, now);
  if (!promos.length) return { ...base, promotion: null };
  let { ownPrice, rentPrice, rentalEnabled } = base;
  const originalOwnPrice = ownPrice;
  const originalRentPrice = rentPrice;
  let applied = null;
  const discount = promos.filter((p) => p.type === 'DISCOUNT').sort((a, b) => b.value - a.value)[0];
  if (discount) {
    const rate = Math.min(Math.max(discount.value, 0), 100) / 100;
    // 할인해도 최소 1코인 (0 코인은 무료 대여/무료 회차 프로모션으로만)
    ownPrice = Math.max(1, Math.round(ownPrice * (1 - rate)));
    if (rentalEnabled) rentPrice = Math.max(1, Math.min(ownPrice - 1 > 0 ? ownPrice - 1 : 1, Math.round(rentPrice * (1 - rate))));
    if (rentalEnabled && rentPrice >= ownPrice) rentalEnabled = ownPrice > 1;
    applied = discount;
  }
  const freeRental = promos.find((p) => p.type === 'FREE_RENTAL');
  if (freeRental) {
    rentPrice = 0;
    rentalEnabled = true;
    applied = applied || freeRental;
  }
  return {
    ...base,
    ownPrice,
    rentPrice,
    rentalEnabled,
    originalOwnPrice: ownPrice !== originalOwnPrice ? originalOwnPrice : undefined,
    originalRentPrice: rentPrice !== originalRentPrice ? originalRentPrice : undefined,
    promotion: applied ? describePromotion(applied, now) : null,
  };
}

const KST = 9 * 60 * 60 * 1000;
const kstDay = (date) => new Date(new Date(date).getTime() + KST).toISOString().slice(0, 10);

// 목록 배지: "30% 할인", "3화 무료", "무료 대여" + 오늘 끝나면 "오늘만"
function describePromotion(promo, now = new Date()) {
  const label = promo.type === 'DISCOUNT' ? `${promo.value}% 할인` : promo.type === 'FREE_EPISODES' ? `${promo.value}화 무료` : '무료 대여';
  const endsToday = kstDay(promo.endAt) === kstDay(now);
  const msLeft = new Date(promo.endAt).getTime() - now.getTime();
  const daysLeft = Math.ceil(msLeft / (24 * 60 * 60 * 1000));
  return {
    id: promo.id,
    type: promo.type,
    value: promo.value,
    label,
    title: promo.title || null,
    endsToday,
    daysLeft,
    remaining: endsToday ? '오늘 종료' : `D-${daysLeft}`,
    startAt: promo.startAt,
    endAt: promo.endAt,
  };
}

module.exports = { TYPES, refreshPromotions, startPromotionCache, activePromotions, isPromoFreeEpisode, applyPromotionPrices, describePromotion, isLive };
