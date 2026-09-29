const jwt = require('jsonwebtoken');
const { prisma } = require('../lib/prisma');
const { getJwtSecret } = require('../lib/jwt-secret');
const { checkContentAccess } = require('./legacy-episode-access');
const { episodeContent, parseEpisodeImages } = require('./episode-policy');
const { trustedAdult } = require('./trusted-adult');

function uploadPath(value) {
  try {
    let pathname = new URL(value, 'https://api.arata.co.kr').pathname;
    for (let i = 0; i < 2; i++) pathname = decodeURIComponent(pathname);
    pathname = pathname.normalize('NFC');
    if (!pathname.startsWith('/uploads/') || /[\\\0]/.test(pathname) || pathname.split('/').includes('..')) return null;
    return pathname;
  } catch { return null; }
}

function mediaKey(value) {
  return uploadPath(value)?.replace(/\.(jpe?g|png|webp)$/i, '');
}

// Short-lived, path-bound capabilities, never the user's login token.
function episodeImageUrls(episode, userId) {
  return parseEpisodeImages(episode.images).map(image => {
    const pathname = uploadPath(image);
    if (!pathname) throw new Error('Unsupported episode media storage path');
    const ticket = jwt.sign({ purpose: 'episode-media', episodeId: episode.id,
      userId: userId || null, path: mediaKey(pathname) }, getJwtSecret(), { expiresIn: '5m', algorithm: 'HS256' });
    const origin = process.env.NODE_ENV === 'production' ? 'https://api.arata.co.kr' : '';
    return origin + pathname.split('/').map(encodeURIComponent).join('/') + '?mediaTicket=' + encodeURIComponent(ticket);
  });
}

async function guardEpisodeMedia(req, res, next) {
  res.set('Cache-Control', 'private, no-store');
  try {
    const pathname = uploadPath('/uploads' + req.path);
    if (!pathname) return res.status(400).end();
    const key = mediaKey(pathname);
    let claim;
    if (typeof req.query.mediaTicket === 'string') {
      try {
        claim = jwt.verify(req.query.mediaTicket, getJwtSecret(), { algorithms: ['HS256'] });
      } catch { return res.status(403).end(); }
      if (claim.purpose !== 'episode-media' || claim.path !== key || typeof claim.episodeId !== 'string') return res.status(403).end();
    }
    // Check the current DB for every protected request: revocations and price
    // changes take effect immediately. Raw links are not a bypass.
    const leaf = key.split('/').pop();
    const candidates = await prisma.episode.findMany({
      where: { OR: [leaf, encodeURIComponent(leaf), encodeURIComponent(encodeURIComponent(leaf)),
        JSON.stringify(leaf).slice(1, -1)].map(value => ({ images: { contains: value } })) },
      include: { comic: true },
    });
    const episodes = candidates.filter(ep => parseEpisodeImages(ep.images).some(image => mediaKey(image) === key));
    if (claim && !episodes.some(ep => ep.id === claim.episodeId)) return res.status(404).end();
    if (!episodes.length) {
      if (claim) return res.status(404).end();
      return next(); // Not episode media (e.g. a cover).
    }
    let user = null;
    if (claim?.userId) user = await prisma.user.findUnique({ where: { id: claim.userId } });
    if (user?.status !== 'ACTIVE') user = null;
    // Shared assets must satisfy every owning episode's restrictions.
    for (const episode of episodes) {
      const content = episodeContent(episode);
      if (!claim && (!content.isFree || content.contentRating === 'ADULT')) return res.status(403).end();
      const access = await checkContentAccess({ userId: user?.id || null,
        adultVerified: trustedAdult(user), content });
      if (!access.allowed) return res.status(403).end();
    }
    res.locals.protectedEpisodeMedia = true;
    return next();
  } catch (error) {
    console.error('Episode media authorization failed:', error.name);
    return res.status(503).end(); // Never fail open on a database outage.
  }
}

module.exports = { uploadPath, mediaKey, episodeImageUrls, guardEpisodeMedia };
