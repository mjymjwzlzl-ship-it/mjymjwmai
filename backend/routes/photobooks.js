// 화보(PHOTOBOOK) API — 제용 content-access.js 중 화보 부분만 (멤버십·구독은 아직 미공개라 제외)
//   GET  /api/content-items?contentType=PHOTOBOOK&adultMode=&workId=
//   GET  /api/content-items/:id?adultMode=
//   POST /api/contents/:id/unlock   { contentType: 'PHOTOBOOK' }  → 코인으로 영구 소장
// 잠긴 화보는 미리보기(previewCount)장만 주소를 내려준다. 유료 컷 파일명은 추측 불가한 이름으로 올린다.
const express = require('express');
const jwt = require('jsonwebtoken');
const { getJwtSecret } = require('../lib/jwt-secret');
const { prisma } = require('../lib/prisma');
const { expireEventCoins, consumeEventCoins } = require('../services/coin-wallet');

const router = express.Router();

function parseJsonArray(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function currentUser(req) {
  const token = (req.headers.authorization || '').split(' ')[1];
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, getJwtSecret());
    const userId = decoded.userId || decoded.id;
    if (!userId) return null;
    return prisma.user.findUnique({ where: { id: userId }, select: { id: true, adultVerified: true, coinBalance: true, status: true } });
  } catch {
    return null;
  }
}

async function accessFor(user, item) {
  if (item.contentRating === 'ADULT' && !user?.adultVerified) {
    return { allowed: false, reason: 'ADULT_VERIFICATION_REQUIRED' };
  }
  if (item.isFree || !item.coinPrice) return { allowed: true, reason: 'FREE' };
  if (!user) return { allowed: false, reason: 'LOGIN_REQUIRED', coinPrice: item.coinPrice };
  const purchase = await prisma.userContentPurchase.findUnique({
    where: { userId_contentId_contentType: { userId: user.id, contentId: item.id, contentType: 'PHOTOBOOK' } },
  });
  return purchase
    ? { allowed: true, reason: 'PURCHASED', purchasedAt: purchase.purchasedAt }
    : { allowed: false, reason: 'PURCHASE_REQUIRED', coinPrice: item.coinPrice };
}

// 공개 화보: 켜짐 + 상태 공개 + 전체 공개 + 공개일 지남 + 노출 종료 전
const released = (item) => { const now = new Date(); return item.isActive && (item.status || 'PUBLISHED') === 'PUBLISHED' && (item.visibility || 'PUBLIC') === 'PUBLIC' && (!item.releaseAt || item.releaseAt <= now) && (!item.endAt || item.endAt > now); };

function summary(item, access) {
  return {
    id: item.id,
    photobookId: item.photobookId,
    workId: item.workId,
    characterId: item.characterId,
    name: item.name,
    thumbnail: item.thumbnail,
    assetCount: item.assetCount,
    previewCount: item.previewCount,
    contentType: item.contentType,
    contentRating: item.contentRating,
    accessType: item.accessType,
    coinPrice: item.coinPrice,
    releaseAt: item.releaseAt,
    productTags: parseJsonArray(item.productTags),
    access,
  };
}

router.get('/content-items', async (req, res) => {
  try {
    const type = String(req.query.contentType || 'PHOTOBOOK').toUpperCase();
    if (type !== 'PHOTOBOOK') return res.status(400).json({ success: false, message: '지원하지 않는 콘텐츠 유형입니다.' });
    const adultMode = String(req.query.adultMode || 'false') === 'true';
    const user = await currentUser(req);
    if (adultMode && !user?.adultVerified) {
      return res.status(403).json({ success: false, code: 'ADULT_VERIFICATION_REQUIRED', message: '성인인증이 필요합니다.' });
    }
    const now = new Date();
    const items = await prisma.contentItem.findMany({
      where: {
        contentType: 'PHOTOBOOK',
        isActive: true,
        contentRating: adultMode ? 'ADULT' : 'GENERAL',
        ...(req.query.workId ? { workId: String(req.query.workId) } : {}),
        OR: [{ releaseAt: null }, { releaseAt: { lte: now } }],
      },
      orderBy: [{ releaseAt: 'desc' }, { createdAt: 'desc' }],
      take: 100,
    });
    const content = await Promise.all(items.map(async (item) => summary(item, await accessFor(user, item))));
    res.json({ success: true, content });
  } catch (error) {
    console.error('화보 목록 조회 실패:', error);
    res.status(500).json({ success: false, message: '화보 목록을 불러오지 못했습니다.' });
  }
});

router.get('/content-items/:id', async (req, res) => {
  try {
    const item = await prisma.contentItem.findUnique({ where: { id: req.params.id } });
    if (!item || item.contentType !== 'PHOTOBOOK' || !released(item)) {
      return res.status(404).json({ success: false, message: '화보를 찾을 수 없습니다.' });
    }
    if (item.contentRating === 'ADULT' && String(req.query.adultMode || 'false') !== 'true') {
      return res.status(404).json({ success: false, message: '화보를 찾을 수 없습니다.' });
    }
    const user = await currentUser(req);
    const access = await accessFor(user, item);
    if (access.reason === 'ADULT_VERIFICATION_REQUIRED') {
      return res.status(403).json({ success: false, code: access.reason, message: '성인인증이 필요한 화보입니다.' });
    }
    const allAssets = parseJsonArray(item.assets);
    const assets = access.allowed ? allAssets : allAssets.slice(0, Math.max(0, item.previewCount));
    res.json({ success: true, content: { ...summary(item, access), assetCount: item.assetCount || allAssets.length, assets } });
  } catch (error) {
    console.error('화보 상세 조회 실패:', error);
    res.status(500).json({ success: false, message: '화보를 불러오지 못했습니다.' });
  }
});

router.post('/contents/:id/unlock', async (req, res) => {
  try {
    const user = await currentUser(req);
    if (!user) return res.status(401).json({ success: false, message: '로그인이 필요합니다.' });
    const item = await prisma.contentItem.findUnique({ where: { id: req.params.id } });
    if (!item || item.contentType !== 'PHOTOBOOK' || !released(item)) {
      return res.status(404).json({ success: false, message: '화보를 찾을 수 없습니다.' });
    }
    const access = await accessFor(user, item);
    if (access.allowed) return res.json({ success: true, alreadyAccessible: true, access });
    if (access.reason === 'ADULT_VERIFICATION_REQUIRED') {
      return res.status(403).json({ success: false, code: access.reason, message: '성인인증이 필요한 화보입니다.' });
    }
    const price = Number(item.coinPrice) || 0;
    await expireEventCoins(user.id);
    const result = await prisma.$transaction(async (tx) => {
      const fresh = await tx.user.findUnique({ where: { id: user.id }, select: { coinBalance: true } });
      if ((fresh?.coinBalance || 0) < price) {
        const error = new Error('INSUFFICIENT_COINS');
        error.statusCode = 402;
        error.required = price;
        error.current = fresh?.coinBalance || 0;
        throw error;
      }
      const updated = await tx.user.update({ where: { id: user.id }, data: { coinBalance: { decrement: price } }, select: { coinBalance: true } });
      await consumeEventCoins(tx, user.id, price);
      const purchase = await tx.userContentPurchase.create({
        data: { userId: user.id, contentId: item.id, contentType: 'PHOTOBOOK', coinAmount: price },
      });
      await tx.coinTransaction.create({
        data: { userId: user.id, amount: -price, balance: updated.coinBalance, type: 'PURCHASE', description: `화보 소장: ${item.name}` },
      });
      return { purchase, coinBalance: updated.coinBalance };
    });
    res.json({ success: true, permanent: true, coinAmount: price, coinBalance: result.coinBalance, purchase: result.purchase });
  } catch (error) {
    if (error.statusCode === 402) {
      return res.status(402).json({ success: false, code: 'INSUFFICIENT_COINS', message: '코인이 부족합니다.', required: error.required, current: error.current });
    }
    if (error.code === 'P2002') return res.json({ success: true, alreadyAccessible: true });
    console.error('화보 구매 실패:', error);
    res.status(500).json({ success: false, message: '화보를 구매하지 못했습니다.' });
  }
});

module.exports = router;
module.exports.helpers = { accessFor, currentUser, parseJsonArray, released };
