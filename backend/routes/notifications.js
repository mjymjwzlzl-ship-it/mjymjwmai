// 알림함 API (/api/notifications). 모두 로그인 필요.
const express = require('express');
const { prisma } = require('../lib/prisma');
const { authenticate } = require('../middleware/auth');
const { syncNotifications, getPreference } = require('../services/notifications');

const router = express.Router();
router.use(authenticate);
const uid = (req) => req.user.id || req.user.userId;
// 탭: update = 작품 업데이트, event = 이벤트·혜택(이벤트 + 할인/무료), community = 커뮤니티(내 글 댓글·내 댓글 답글)
const typeWhere = (type) => (type === 'update' ? { type: 'UPDATE' } : type === 'event' ? { type: { in: ['EVENT', 'PROMOTION'] } } : type === 'community' ? { type: 'COMMUNITY' } : {});

router.get('/unread-count', async (req, res) => {
  try {
    await syncNotifications(uid(req));
    res.set('Cache-Control', 'private, no-store');
    res.json({ unread: await prisma.notification.count({ where: { userId: uid(req), isRead: false } }) });
  } catch (error) {
    console.error('알림 수 오류:', error);
    res.status(500).json({ message: '알림을 불러오지 못했습니다.' });
  }
});

router.get('/', async (req, res) => {
  try {
    const userId = uid(req);
    await syncNotifications(userId);
    const type = String(req.query.type || 'all');
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const [items, unread, unreadUpdate, unreadEvent, unreadCommunity] = await Promise.all([
      prisma.notification.findMany({ where: { userId, ...typeWhere(type) }, orderBy: { createdAt: 'desc' }, take: limit }),
      prisma.notification.count({ where: { userId, isRead: false } }),
      prisma.notification.count({ where: { userId, isRead: false, ...typeWhere('update') } }),
      prisma.notification.count({ where: { userId, isRead: false, ...typeWhere('event') } }),
      prisma.notification.count({ where: { userId, isRead: false, ...typeWhere('community') } }),
    ]);
    res.set('Cache-Control', 'private, no-store');
    res.json({ notifications: items, unread, unreadByType: { update: unreadUpdate, event: unreadEvent, community: unreadCommunity } });
  } catch (error) {
    console.error('알림 목록 오류:', error);
    res.status(500).json({ message: '알림을 불러오지 못했습니다.' });
  }
});

router.post('/read-all', async (req, res) => {
  const result = await prisma.notification.updateMany({ where: { userId: uid(req), isRead: false, ...typeWhere(String(req.query.type || 'all')) }, data: { isRead: true } });
  res.json({ success: true, updated: result.count });
});

router.post('/:notificationId/read', async (req, res) => {
  const result = await prisma.notification.updateMany({ where: { id: req.params.notificationId, userId: uid(req) }, data: { isRead: true } });
  res.json({ success: result.count > 0 });
});

router.get('/settings', async (req, res) => {
  const userId = uid(req);
  const pref = await getPreference(userId);
  const likes = await prisma.like.findMany({ where: { userId }, select: { comicId: true, notify: true, comic: { select: { title: true, thumbnail: true } } }, orderBy: { createdAt: 'desc' } });
  res.json({
    updates: pref.updates,
    events: pref.events,
    promotions: pref.promotions,
    community: pref.community,
    comics: likes.filter((like) => like.comic).map((like) => ({ comicId: like.comicId, title: like.comic.title, thumbnail: like.comic.thumbnail, notify: like.notify })),
  });
});

router.put('/settings', async (req, res) => {
  const userId = uid(req);
  const current = await getPreference(userId);
  const data = {};
  for (const key of ['updates', 'events', 'promotions', 'community']) if (typeof req.body?.[key] === 'boolean') data[key] = req.body[key];
  // 작품 업데이트를 다시 켤 때, 꺼 둔 동안의 회차 소식이 한꺼번에 쏟아지지 않게 기준 시각을 지금으로
  if (data.updates === true && !current.updates) data.syncedAt = new Date();
  const pref = await prisma.notificationPreference.update({ where: { userId }, data });
  res.json({ updates: pref.updates, events: pref.events, promotions: pref.promotions, community: pref.community });
});

router.put('/comics/:comicId', async (req, res) => {
  const result = await prisma.like.updateMany({ where: { userId: uid(req), comicId: req.params.comicId }, data: { notify: req.body?.notify !== false } });
  if (!result.count) return res.status(404).json({ message: '찜한 작품이 아닙니다.' });
  res.json({ success: true, notify: req.body?.notify !== false });
});

module.exports = router;
