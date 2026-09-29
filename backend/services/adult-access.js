const { prisma } = require('../lib/prisma');

const ADULT_RATINGS = ['19', '19+', 'ADULT', 'adult'];

function adultComicWhere() {
  return {
    OR: [
      { rating: { in: ADULT_RATINGS } },
      { genre: { contains: 'adult' } },
    ],
  };
}

function generalComicWhere() {
  return { NOT: adultComicWhere() };
}

function isAdultComic(comic) {
  if (!comic) return false;
  const ratings = [comic.rating, comic.contentRating].map(value => String(value || '').toUpperCase());
  const genre = String(comic.genre || '').toLowerCase();
  return ratings.some(rating => ['19', '19+', 'ADULT'].includes(rating)) || genre.includes('adult');
}

function isAdultModeRequest(req) {
  const value = req.query?.adultMode ?? req.query?.adult;
  return value === true || value === 1 || value === '1' || String(value).toLowerCase() === 'true';
}

function rejectAdultRequest(req, res, { hideWithoutMode = true } = {}) {
  if (!isAdultModeRequest(req)) {
    return res.status(hideWithoutMode ? 404 : 403).json({
      code: 'ADULT_MODE_REQUIRED',
      message: '성인 모드에서만 접근할 수 있습니다.',
    });
  }
  if (!req.user) {
    return res.status(401).json({
      code: 'LOGIN_REQUIRED',
      message: '로그인이 필요합니다.',
    });
  }
  if (!req.user.adultVerified) {
    return res.status(403).json({
      code: 'ADULT_VERIFICATION_REQUIRED',
      message: '성인 인증이 필요합니다.',
    });
  }
  return null;
}

function requireVerifiedAdultMode(req, res, next) {
  const rejected = rejectAdultRequest(req, res, { hideWithoutMode: false });
  if (!rejected) {
    res.set('Cache-Control', 'private, no-store');
    res.set('Vary', 'Authorization');
    next();
  }
}

async function guardComicParam(req, res, next, comicId) {
  try {
    const comic = await prisma.comic.findUnique({
      where: { id: comicId },
      select: { id: true, rating: true, genre: true },
    });
    if (!comic) return next();

    req.requestedComic = comic;
    req.requestedComicIsAdult = isAdultComic(comic);
    if (!req.requestedComicIsAdult) return next();

    const rejected = rejectAdultRequest(req, res);
    if (!rejected) {
      res.set('Cache-Control', 'private, no-store');
      res.set('Vary', 'Authorization');
      next();
    }
  } catch (error) {
    next(error);
  }
}

module.exports = {
  ADULT_RATINGS,
  adultComicWhere,
  generalComicWhere,
  guardComicParam,
  isAdultComic,
  isAdultModeRequest,
  rejectAdultRequest,
  requireVerifiedAdultMode,
};
