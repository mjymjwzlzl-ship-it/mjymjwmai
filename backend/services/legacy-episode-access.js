// Adapter for the deployed pre-subscription schema. No migrations required.
const { prisma } = require('../lib/prisma');
const { optionalAuth } = require('../middleware/auth');
const { episodeContent } = require('./episode-policy');
const { rejectAdultRequest } = require('./adult-access');
const { isActivePurchase } = require('./purchase-access');

async function checkContentAccess({ userId, content, adultVerified }) {
  if (content.comic?.isPublished === false) return { allowed: false, reason: 'NOT_AVAILABLE' };
  if (content.contentRating === 'ADULT' && !adultVerified) return { allowed: false, reason: 'ADULT_VERIFICATION_REQUIRED' };
  if (content.isFree) return { allowed: true, reason: 'FREE' };
  if (!userId) return { allowed: false, reason: 'LOGIN_REQUIRED' };
  const purchase = await prisma.purchase.findUnique({ where: { userId_episodeId: { userId, episodeId: content.id } } });
  // 만료된 대여는 구매하지 않은 것으로 본다
  const active = isActivePurchase(purchase);
  return { allowed: active, reason: active ? 'PURCHASED' : (purchase ? 'RENTAL_EXPIRED' : 'PAYWALL') };
}

function guardEpisode({ purchasing = false } = {}) {
  return [optionalAuth, async (req, res, next) => {
    res.set('Cache-Control', 'private, no-store');
    try {
      if (req.headers.authorization && !req.user) return res.status(401).json({ code: 'INVALID_TOKEN', message: '다시 로그인해주세요.' });
      const episode = await prisma.episode.findUnique({ where: { id: req.params.episodeId }, include: { comic: true } });
      if (!episode || episode.comic.isPublished === false || (req.params.id && req.params.id !== episode.comicId)) {
        return res.status(404).json({ message: '회차를 찾을 수 없습니다.' });
      }
      const content = episodeContent(episode);
      if (content.contentRating === 'ADULT' && rejectAdultRequest(req, res)) return;
      const access = await checkContentAccess({ userId: req.user?.id, adultVerified: !!req.user?.adultVerified, content });
      if (!purchasing && req.params.id && !access.allowed) return res.status(req.user ? 403 : 401).json({
        code: access.reason, message: '열람 권한이 필요합니다.',
      });
      const json = res.json.bind(res);
      res.json = body => {
        res.set('Cache-Control', 'private, no-store');
        if (res.statusCode < 400) {
          const { episodeImageUrls } = require('./episode-media');
          if (body?.episode) body.episode.images = body.episode.canView === false ? [] : episodeImageUrls(episode, req.user?.id);
          if (Array.isArray(body?.images)) body.images = episodeImageUrls(episode, req.user?.id);
        }
        return json(body);
      };
      next();
    } catch (error) { next(error); }
  }];
}
module.exports = { checkContentAccess, guardEpisode };
