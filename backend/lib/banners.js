// 홈 대배너 노출 기준: [배너 관리]에 등록되고 켜져 있고(isActive) 노출 기간 안인 HOME_MAIN 배너만, 순서(order)대로.
// 연결된 작품이 숨김·성인이면 일반 홈에서 뺀다.
const { prisma } = require('./prisma');

const PLACEMENTS = { HOME_MAIN: '메인 홈 > 대배너' };

function bannerState(banner, now = new Date()) {
  if (!banner.isActive) return 'OFF';
  if (banner.startAt && banner.startAt > now) return 'SCHEDULED';
  if (banner.endAt && banner.endAt <= now) return 'ENDED';
  return 'LIVE';
}

async function homeMainBanners(now = new Date()) {
  const rows = await prisma.banner.findMany({
    where: {
      placement: 'HOME_MAIN', isActive: true,
      AND: [{ OR: [{ startAt: null }, { startAt: { lte: now } }] }, { OR: [{ endAt: null }, { endAt: { gt: now } }] }],
    },
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    include: { webtoon: { select: { id: true, title: true, rating: true, genre: true, status: true, isPublished: true } } },
  });
  return rows
    .filter((b) => !b.webtoon || (b.webtoon.isPublished !== false && b.webtoon.status !== 'HIDDEN' && !['19', 'ADULT', 'adult'].includes(String(b.webtoon.rating)) && b.webtoon.genre !== 'adult'))
    .filter((b) => b.imageUrl)
    .map((b) => ({
      id: b.id, title: b.title, subtitle: b.subtitle || '', description: b.description || '', imageUrl: b.imageUrl,
      link: b.ctaLink || (b.webtoonId ? `/webtoons/${b.webtoonId}` : ''), ctaText: b.ctaText || '', showText: b.showText, webtoonId: b.webtoonId,
    }))
    .filter((b) => b.link);
}

module.exports = { PLACEMENTS, bannerState, homeMainBanners };
