require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const { getJwtSecret } = require('../lib/jwt-secret');
const { parseEpisodeImages } = require('../services/episode-policy');
const { uploadPath, episodeImageUrls } = require('../services/episode-media');

const prisma = new PrismaClient();
const API_ORIGIN = process.env.QA_API_ORIGIN || 'https://api.arata.co.kr';
const WEB_ORIGIN = process.env.QA_WEB_ORIGIN || 'https://arata.co.kr';
const CDN_ORIGIN = process.env.QA_CDN_ORIGIN || 'https://cdn.arata.co.kr';

async function status(url, options = {}) {
  const response = await fetch(url, { redirect: 'manual', ...options });
  await response.body?.cancel();
  return {
    status: response.status,
    cacheControl: response.headers.get('cache-control'),
    location: response.headers.get('location'),
  };
}

async function run() {
  const episode = await prisma.episode.findFirst({
    where: {
      OR: [
        { comic: { rating: { in: ['19', '19+', 'ADULT', 'adult'] } } },
        { comic: { genre: { contains: 'adult' } } },
      ],
    },
    include: { comic: true },
    orderBy: { createdAt: 'asc' },
  });
  if (!episode) throw new Error('No adult episode exists for QA');

  const firstImage = parseEpisodeImages(episode.images)[0];
  const pathname = uploadPath(firstImage);
  if (!pathname) throw new Error('Adult episode does not use a supported protected upload path');

  const encodedPath = pathname.split('/').map(encodeURIComponent).join('/');
  const issuedUrl = new URL(episodeImageUrls(episode, null)[0], API_ORIGIN);
  const issuedClaim = jwt.decode(issuedUrl.searchParams.get('mediaTicket'));
  const ticketTtlSeconds = issuedClaim?.exp - issuedClaim?.iat;
  const query = `adultMode=true&qa=${Date.now()}`;
  const rawCdnImage = await status(`${CDN_ORIGIN}${encodedPath}?qa=${Date.now()}`, { headers: { Range: 'bytes=0-0' } });
  const rawCdnRedirectTarget = rawCdnImage.location?.startsWith(`${API_ORIGIN}/uploads/`)
    ? await status(rawCdnImage.location, { headers: { Range: 'bytes=0-0' } })
    : null;
  const legacyAdultUser = await prisma.user.findFirst({
    where: { status: 'ACTIVE', adultVerified: true, NOT: { adultVerificationMethod: 'pass' } },
    select: { id: true },
  });
  const legacyAdultToken = legacyAdultUser
    ? jwt.sign({ userId: legacyAdultUser.id }, getJwtSecret(), { expiresIn: '2m', algorithm: 'HS256' })
    : null;
  const checks = {
    directEpisodeWithoutMode: await status(`${API_ORIGIN}/api/episodes/${encodeURIComponent(episode.id)}?qa=${Date.now()}`),
    directEpisodeWithoutLogin: await status(`${API_ORIGIN}/api/episodes/${encodeURIComponent(episode.id)}?${query}`),
    rawApiImage: await status(`${API_ORIGIN}${encodedPath}?qa=${Date.now()}`, { headers: { Range: 'bytes=0-0' } }),
    invalidMediaTicket: await status(`${API_ORIGIN}${encodedPath}?mediaTicket=invalid`, { headers: { Range: 'bytes=0-0' } }),
    rawCdnImage,
    rawCdnRedirectTarget,
    legacyAdultFlagCannotBypass: legacyAdultToken
      ? await status(`${API_ORIGIN}/api/episodes/${encodeURIComponent(episode.id)}?${query}`, {
          headers: { Authorization: `Bearer ${legacyAdultToken}` },
        })
      : null,
    sharedPage: await status(`${WEB_ORIGIN}/webtoons/${encodeURIComponent(episode.comicId)}/episode/${encodeURIComponent(episode.id)}?qa=${Date.now()}`),
  };

  const passVerifiedUsers = await prisma.user.count({
    where: { status: 'ACTIVE', adultVerified: true, adultVerificationMethod: 'pass' },
  });
  const pass = {
    directEpisodeWithoutMode: checks.directEpisodeWithoutMode.status === 404,
    directEpisodeWithoutLogin: checks.directEpisodeWithoutLogin.status === 401,
    rawApiImage: [401, 403, 404].includes(checks.rawApiImage.status),
    invalidMediaTicket: [401, 403, 404].includes(checks.invalidMediaTicket.status),
    rawCdnImage: [401, 403, 404].includes(checks.rawCdnImage.status) ||
      ([301, 302, 307, 308].includes(checks.rawCdnImage.status) &&
        [401, 403, 404].includes(checks.rawCdnRedirectTarget?.status)),
    protectedResponsesNotCacheable: [
      checks.directEpisodeWithoutLogin,
      checks.rawApiImage,
      checks.invalidMediaTicket,
    ].every(item => /(?:private|no-store)/i.test(item.cacheControl || '')),
    sharedPageDoesNotRedirectToMedia: !String(checks.sharedPage.location || '').includes('/uploads/'),
    legacyAdultFlagCannotBypass: !legacyAdultUser || checks.legacyAdultFlagCannotBypass?.status === 403,
    ticketExpiresWithinFiveMinutes: Number.isFinite(ticketTtlSeconds) && ticketTtlSeconds <= 300,
  };

  const publicChecks = Object.fromEntries(Object.entries(checks).map(([name, value]) => [name,
    value ? { status: value.status, cacheControl: value.cacheControl } : null]));

  console.log(JSON.stringify({
    success: Object.values(pass).every(Boolean),
    sample: { adultEpisodeFound: true, protectedImageFound: true, passVerifiedUsers, ticketTtlSeconds },
    checks: publicChecks,
    pass,
  }, null, 2));
  if (!Object.values(pass).every(Boolean)) process.exitCode = 1;
}

run().catch((error) => {
  console.error(JSON.stringify({ success: false, error: error.message }));
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
