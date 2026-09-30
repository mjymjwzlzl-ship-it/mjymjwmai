// 알림 생성: 사용자가 알림함/안 읽은 수를 볼 때 그 사람 몫만 만든다(1분에 한 번).
// 전체 회원에게 뿌리지 않아 회원이 늘어도 부담이 없고, 회차 등록 경로(관리자·작가센터·이관 스크립트)를 건드리지 않아도 된다.
const { prisma } = require('../lib/prisma');
const { describePromotion } = require('./promotions');

const SYNC_INTERVAL_MS = 60 * 1000;
const FIRST_LOOKBACK_MS = 7 * 24 * 60 * 60 * 1000; // 처음 켤 때 최근 7일 소식까지
const ENDING_SOON_MS = 24 * 60 * 60 * 1000;

async function getPreference(userId) {
  const existing = await prisma.notificationPreference.findUnique({ where: { userId } });
  if (existing) return existing;
  return prisma.notificationPreference.create({ data: { userId, syncedAt: new Date(Date.now() - FIRST_LOOKBACK_MS) } });
}

async function insertNew(userId, items) {
  if (!items.length) return 0;
  const keys = items.map((item) => item.dedupeKey);
  const existing = new Set((await prisma.notification.findMany({ where: { userId, dedupeKey: { in: keys } }, select: { dedupeKey: true } })).map((row) => row.dedupeKey));
  let created = 0;
  for (const item of items) {
    if (existing.has(item.dedupeKey)) continue;
    existing.add(item.dedupeKey);
    try {
      await prisma.notification.create({ data: { userId, ...item } });
      created += 1;
    } catch (error) {
      if (error.code !== 'P2002') throw error; // 동시에 두 번 불린 경우만 무시
    }
  }
  return created;
}

async function episodeUpdates(userId, since) {
  const likes = await prisma.like.findMany({ where: { userId, notify: true }, select: { comicId: true, createdAt: true } });
  if (!likes.length) return [];
  const likedAt = new Map(likes.map((like) => [like.comicId, like.createdAt]));
  const episodes = await prisma.episode.findMany({
    where: { comicId: { in: likes.map((like) => like.comicId) }, createdAt: { gt: since, lte: new Date() } },
    select: { id: true, episodeNumber: true, title: true, createdAt: true, comicId: true, comic: { select: { title: true, thumbnail: true, isPublished: true } } },
    orderBy: { episodeNumber: 'asc' },
  });
  // 찜하기 전에 올라온 회차는 제외, 작품별로 한 건(여러 화면 "N화 외 k개")
  const byComic = new Map();
  for (const episode of episodes) {
    if (episode.comic?.isPublished === false || episode.createdAt <= likedAt.get(episode.comicId)) continue;
    if (!byComic.has(episode.comicId)) byComic.set(episode.comicId, []);
    byComic.get(episode.comicId).push(episode);
  }
  return [...byComic.values()].map((list) => {
    const latest = list[list.length - 1];
    const extra = list.length > 1 ? ` 외 ${list.length - 1}개 회차` : '';
    return {
      type: 'UPDATE',
      title: `「${latest.comic.title}」 ${latest.episodeNumber}화${extra}가 올라왔어요`,
      body: latest.title && latest.title !== `${latest.episodeNumber}화` ? latest.title : null,
      link: `/webtoons/${latest.comicId}/episode/${latest.id}`,
      imageUrl: latest.comic.thumbnail,
      dedupeKey: `ep:${latest.id}`,
      createdAt: latest.createdAt,
    };
  });
}

// 찜(알림 ON)한 작품의 새 작품 공지: 휴재·연재 재개·완결·일정 변경·이벤트 안내 등. [작품 업데이트]로 모인다.
const NOTICE_LABEL = { HIATUS: '휴재 안내', RESUME: '연재 재개', SCHEDULE: '일정 변경', SUSPENDED: '판매중지', COMPLETE: '완결 안내', EVENT: '이벤트 안내', GENERAL: '작품 공지' };
async function noticeUpdates(userId, since) {
  const likes = await prisma.like.findMany({ where: { userId, notify: true }, select: { comicId: true, createdAt: true } });
  if (!likes.length) return [];
  const likedAt = new Map(likes.map((like) => [like.comicId, like.createdAt]));
  const notices = await prisma.comicNotice.findMany({
    where: { comicId: { in: likes.map((like) => like.comicId) }, createdAt: { gt: since, lte: new Date() } },
    orderBy: { createdAt: 'asc' },
  });
  if (!notices.length) return [];
  const comics = await prisma.comic.findMany({ where: { id: { in: [...new Set(notices.map((n) => n.comicId))] }, isPublished: true }, select: { id: true, title: true, thumbnail: true } });
  const comicById = new Map(comics.map((comic) => [comic.id, comic]));
  return notices
    .filter((notice) => comicById.has(notice.comicId) && notice.createdAt > likedAt.get(notice.comicId))
    .map((notice) => {
      const comic = comicById.get(notice.comicId);
      return {
        type: 'UPDATE',
        title: `「${comic.title}」 [${NOTICE_LABEL[notice.type] || '작품 공지'}] ${notice.title}`,
        body: String(notice.content || '').replace(/\s+/g, ' ').slice(0, 80) || null,
        link: `/webtoons/${comic.id}?notice=${notice.id}`,
        imageUrl: comic.thumbnail,
        dedupeKey: `notice:${notice.id}`,
        createdAt: notice.createdAt,
      };
    });
}

async function eventNews(now) {
  const events = await prisma.event.findMany({ where: { isActive: true, startAt: { lte: now } } });
  const items = [];
  for (const event of events) {
    const ended = event.endAt && event.endAt <= now;
    if (ended) continue;
    // 시작 소식: 시작한 지 7일 이내만
    if (now - event.startAt <= FIRST_LOOKBACK_MS) {
      items.push({ type: 'EVENT', title: `이벤트 시작 · ${event.title}`, body: event.summary, link: event.link, imageUrl: event.thumbnailUrl, dedupeKey: `event:${event.id}:start`, createdAt: event.startAt });
    }
    if (event.endAt && event.endAt - now <= ENDING_SOON_MS) {
      items.push({ type: 'EVENT', title: `종료 임박 · ${event.title}`, body: `${event.endAt.toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Seoul' })}에 끝나요`, link: event.link, imageUrl: event.thumbnailUrl, dedupeKey: `event:${event.id}:ending`, createdAt: now });
    }
  }
  return items;
}

async function promotionNews(now) {
  const promos = await prisma.comicPromotion.findMany({ where: { isActive: true, startAt: { lte: now }, endAt: { gt: now } } });
  if (!promos.length) return [];
  const comics = await prisma.comic.findMany({ where: { id: { in: promos.map((p) => p.comicId) }, isPublished: true }, select: { id: true, title: true, thumbnail: true, rating: true, genre: true } });
  const comicById = new Map(comics.map((comic) => [comic.id, comic]));
  const items = [];
  for (const promo of promos) {
    const comic = comicById.get(promo.comicId);
    // 성인 작품 프로모션은 알림으로 보내지 않는다
    if (!comic || ['19', 'ADULT', 'adult'].includes(String(comic.rating)) || String(comic.genre || '').includes('adult')) continue;
    const info = describePromotion(promo, now);
    items.push({ type: 'PROMOTION', title: `「${comic.title}」 ${info.label}`, body: `${info.remaining === '오늘 종료' ? '오늘' : promo.endAt.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric', timeZone: 'Asia/Seoul' })}까지`, link: `/webtoons/${comic.id}`, imageUrl: comic.thumbnail, dedupeKey: `promo:${promo.id}`, createdAt: promo.startAt > now - FIRST_LOOKBACK_MS ? promo.startAt : now });
  }
  return items;
}

const syncing = new Map();
async function syncNotifications(userId, { force = false } = {}) {
  const pref = await getPreference(userId);
  const now = new Date();
  if (!force && now - pref.syncedAt < SYNC_INTERVAL_MS) return pref;
  if (syncing.has(userId)) return syncing.get(userId);
  const job = (async () => {
    const items = [];
    if (pref.updates) items.push(...await episodeUpdates(userId, pref.syncedAt), ...await noticeUpdates(userId, pref.syncedAt));
    if (pref.events) items.push(...await eventNews(now));
    if (pref.promotions) items.push(...await promotionNews(now));
    await insertNew(userId, items);
    return prisma.notificationPreference.update({ where: { userId }, data: { syncedAt: now } });
  })().finally(() => syncing.delete(userId));
  syncing.set(userId, job);
  return job;
}

module.exports = { syncNotifications, getPreference };
