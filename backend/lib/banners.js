// 배너 노출 기준: [배너 관리]에 등록되고 켜져 있고(isActive) 노출 기간 안이며 그 위치(placements)가 있는 배너만, 순서(order)대로.
// 연결된 작품이 숨김·성인이면 일반 홈에서 뺀다.
const { prisma } = require('./prisma');

// 노출 위치: 사용자 화면의 배너 영역
const PLACEMENTS = { HOME_MAIN: '홈 대배너', WEBTOON: '웹툰 페이지 배너', BOOK: '단행본 페이지 배너', NOVEL: '웹소설 페이지 배너', CHAT: '캐릭터 채팅 배너' };
const placementsOf = (b) => { try { const list = JSON.parse(b.placements || '[]'); if (Array.isArray(list) && list.length) return list.filter((p) => PLACEMENTS[p]); } catch {} return b.placement && PLACEMENTS[b.placement] ? [b.placement] : ['HOME_MAIN']; };

function bannerState(banner, now = new Date()) {
  if (!banner.isActive) return 'OFF';
  if (banner.startAt && banner.startAt > now) return 'SCHEDULED';
  if (banner.endAt && banner.endAt <= now) return 'ENDED';
  return 'LIVE';
}

// 위치별 노출 배너: 그 위치가 들어 있고 켜져 있고 기간 안인 배너만, 순서대로
async function bannersFor(placement, now = new Date()) {
  const rows = await prisma.banner.findMany({
    where: {
      isActive: true, placements: { contains: `"${placement}"` },
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

const homeMainBanners = (now) => bannersFor('HOME_MAIN', now);

module.exports = { PLACEMENTS, placementsOf, bannerState, bannersFor, homeMainBanners };
