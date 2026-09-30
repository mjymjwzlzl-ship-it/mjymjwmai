// 관리자 운영: 결제 관리(코인 가격·결제·구매·대여·환불), 사용자 관리(회원·성인 인증·이용 제한), 통계, 대시보드 요약
// /api/admin/ops/...  (작품 가격 수정은 /api/admin/works/:id PATCH 를 [결제 관리 > 작품별 가격] 화면에서 쓴다)
const express = require('express');
const { prisma } = require('../lib/prisma');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { getCuration, setCuration } = require('../lib/curation');
const { DEFAULT_COIN_PACKAGES, getCoinPackages } = require('../lib/coin-packages');
const { contentTypeOf } = require('../lib/content-format');
const rankingsRouter = require('./rankings');

const router = express.Router();
router.use('/admin/ops', authenticate, requireAdmin);

const KST = 9 * 3600 * 1000;
const dayKey = (d) => new Date(new Date(d).getTime() + KST).toISOString().slice(0, 10);
const who = (u) => (u ? u.nickname || String(u.email || '').split('@')[0] : '-');
const since = (days) => new Date(Date.now() - Math.max(1, Math.min(365, Number(days) || 30)) * 86400000);
const adminOf = async (req) => prisma.user.findUnique({ where: { id: req.user.id || req.user.userId }, select: { id: true, nickname: true, email: true } });

// ── 코인 가격
router.get('/admin/ops/coin-packages', async (req, res) => {
  res.json({ packages: await getCoinPackages(), defaults: DEFAULT_COIN_PACKAGES, custom: !!(await getCuration('coin_packages', null)) });
});
router.put('/admin/ops/coin-packages', async (req, res) => {
  const list = Array.isArray(req.body?.packages) ? req.body.packages : [];
  const ids = new Set();
  const clean = [];
  for (const p of list) {
    const id = String(p.id || '').trim().replace(/[^a-z0-9_-]/gi, '').slice(0, 30);
    const coins = Number(p.coins); const price = Number(p.price); const bonus = Number(p.bonus || 0);
    if (!id || ids.has(id)) return res.status(400).json({ message: '패키지 ID는 영문·숫자로, 서로 달라야 합니다.' });
    if (!Number.isInteger(coins) || coins <= 0 || !Number.isInteger(price) || price < 100 || !Number.isInteger(bonus) || bonus < 0) return res.status(400).json({ message: `'${id}': 코인 수·가격(100원 이상)·보너스는 0 이상의 정수로 입력하세요.` });
    ids.add(id);
    clean.push({ id, coins, price, bonus, description: String(p.description || '').slice(0, 40), popular: !!p.popular, active: p.active !== false });
  }
  if (!clean.some((p) => p.active)) return res.status(400).json({ message: '판매 중인 패키지가 하나는 있어야 합니다.' });
  await setCuration('coin_packages', clean, req.user.id || req.user.userId);
  res.json({ packages: clean });
});

// ── 결제(코인 충전) 내역
router.get('/admin/ops/payments', async (req, res) => {
  const where = {};
  if (req.query.status) where.status = String(req.query.status).toUpperCase() === 'REFUND' ? { in: ['REFUNDED', 'CANCELLED'] } : String(req.query.status).toUpperCase();
  const q = String(req.query.q || '').trim();
  if (q) where.OR = [{ merchantUid: { contains: q } }, { user: { email: { contains: q } } }, { user: { nickname: { contains: q } } }];
  const rows = await prisma.payment.findMany({ where, include: { user: { select: { id: true, email: true, nickname: true } } }, orderBy: { createdAt: 'desc' }, take: 300 });
  const all = await prisma.payment.groupBy({ by: ['status'], _count: { _all: true }, _sum: { amount: true, refundAmount: true } });
  res.json({
    payments: rows.map((p) => ({ ...p, status: String(p.status).toUpperCase(), user: { id: p.user.id, name: who(p.user), email: p.user.email } })),
    summary: all.map((g) => ({ status: String(g.status).toUpperCase(), count: g._count._all, amount: g._sum.amount || 0, refund: g._sum.refundAmount || 0 })),
  });
});

// 환불 기록: PG(이니시스) 결제 취소는 상점관리자에서 먼저 하고, 여기서 상태·사유를 남기고 필요하면 충전 코인을 회수한다
router.post('/admin/ops/payments/:id/refund', async (req, res) => {
  const payment = await prisma.payment.findUnique({ where: { id: req.params.id } });
  if (!payment) return res.status(404).json({ message: '결제를 찾을 수 없습니다.' });
  if (['REFUNDED', 'CANCELLED'].includes(String(payment.status).toUpperCase())) return res.status(400).json({ message: '이미 환불·취소된 결제입니다.' });
  const amount = Number(req.body?.amount);
  const reason = String(req.body?.reason || '').trim();
  if (!Number.isInteger(amount) || amount <= 0 || amount > payment.amount) return res.status(400).json({ message: `환불 금액은 1원 ~ ${payment.amount.toLocaleString()}원 사이로 입력하세요.` });
  if (!reason) return res.status(400).json({ message: '환불 사유를 입력하세요.' });
  const coinsBack = req.body?.deductCoins ? Math.min(payment.coinAmount + (payment.bonusCoins || 0), Math.max(0, Math.round(Number(req.body?.coins) || 0))) : 0;
  const admin = await adminOf(req);
  await prisma.$transaction(async (tx) => {
    await tx.payment.update({ where: { id: payment.id }, data: { status: 'REFUNDED', refundAmount: amount, refundReason: `${reason} (처리: ${who(admin)})`, refundedAt: new Date() } });
    if (coinsBack > 0) {
      const user = await tx.user.findUnique({ where: { id: payment.userId }, select: { coinBalance: true } });
      const take = Math.min(coinsBack, user.coinBalance);
      if (take > 0) {
        const updated = await tx.user.update({ where: { id: payment.userId }, data: { coinBalance: { decrement: take } } });
        await tx.coinTransaction.create({ data: { userId: payment.userId, amount: -take, balance: updated.coinBalance, type: 'REFUND', description: `환불로 코인 회수 (${reason})`, paymentId: payment.id } });
      }
    }
  });
  res.json({ success: true });
});

// ── 구매·대여 내역 (회차)
router.get('/admin/ops/purchases', async (req, res) => {
  const where = {};
  if (req.query.type === 'OWN' || req.query.type === 'RENT') where.type = req.query.type;
  if (req.query.active === 'true') where.OR = [{ expiresAt: null }, { expiresAt: { gt: new Date() } }];
  if (req.query.active === 'false') where.expiresAt = { lte: new Date() };
  const q = String(req.query.q || '').trim();
  if (q) where.AND = [{ OR: [{ user: { email: { contains: q } } }, { user: { nickname: { contains: q } } }, { episode: { comic: { title: { contains: q } } } }] }];
  const rows = await prisma.purchase.findMany({ where, include: { user: { select: { id: true, email: true, nickname: true } }, episode: { select: { episodeNumber: true, title: true, comic: { select: { id: true, title: true } } } } }, orderBy: { createdAt: 'desc' }, take: 300 });
  const now = new Date();
  res.json({
    purchases: rows.map((p) => ({ id: p.id, type: p.type, coinPrice: p.coinPrice, createdAt: p.createdAt, expiresAt: p.expiresAt, active: !p.expiresAt || p.expiresAt > now, user: { id: p.user.id, name: who(p.user), email: p.user.email }, comic: p.episode?.comic || null, episodeNumber: p.episode?.episodeNumber, episodeTitle: p.episode?.title })),
  });
});

// ── 회원
router.get('/admin/ops/users', async (req, res) => {
  const where = {};
  const q = String(req.query.q || '').trim();
  if (q) where.OR = [{ email: { contains: q } }, { nickname: { contains: q } }, { username: { contains: q } }];
  if (req.query.adult === 'true') where.adultVerified = true;
  if (req.query.adult === 'false') where.adultVerified = false;
  if (['ACTIVE', 'SUSPENDED', 'BANNED'].includes(req.query.status)) where.status = req.query.status;
  if (req.query.role === 'CREATOR') where.role = 'CREATOR';
  const users = await prisma.user.findMany({
    where, orderBy: { createdAt: 'desc' }, take: 500,
    select: { id: true, email: true, nickname: true, username: true, role: true, status: true, adultVerified: true, adultVerifiedAt: true, adultVerificationMethod: true, birthYear: true, coinBalance: true, createdAt: true, _count: { select: { purchases: true, likes: true } } },
  });
  const paid = await prisma.payment.groupBy({ by: ['userId'], where: { userId: { in: users.map((u) => u.id) }, status: { in: ['COMPLETED', 'completed', 'PAID', 'paid'] } }, _sum: { amount: true } });
  const paidBy = new Map(paid.map((p) => [p.userId, p._sum.amount || 0]));
  const counts = await prisma.user.groupBy({ by: ['status'], _count: { _all: true } });
  res.json({
    users: users.map((u) => ({ ...u, name: who(u), purchases: u._count.purchases, likes: u._count.likes, paidAmount: paidBy.get(u.id) || 0, _count: undefined })),
    counts: Object.fromEntries(counts.map((c) => [c.status, c._count._all])),
    adultVerified: await prisma.user.count({ where: { adultVerified: true } }),
  });
});
router.get('/admin/ops/users/:id/status-logs', async (req, res) => {
  res.json({ logs: await prisma.userStatusLog.findMany({ where: { userId: req.params.id }, orderBy: { createdAt: 'desc' }, take: 50 }) });
});
router.patch('/admin/ops/users/:id/status', async (req, res) => {
  const status = req.body?.status;
  const reason = String(req.body?.reason || '').trim().slice(0, 500);
  if (!['ACTIVE', 'SUSPENDED', 'BANNED'].includes(status)) return res.status(400).json({ message: '상태가 올바르지 않습니다.' });
  const user = await prisma.user.findUnique({ where: { id: req.params.id }, select: { id: true, status: true, role: true } });
  if (!user) return res.status(404).json({ message: '회원을 찾을 수 없습니다.' });
  if (['ADMIN', 'CS_ADMIN'].includes(user.role)) return res.status(400).json({ message: '관리자 계정은 여기서 제한할 수 없습니다.' });
  if (status !== 'ACTIVE' && !reason) return res.status(400).json({ message: '이용 제한·차단 사유를 입력하세요.' });
  if (user.status === status) return res.status(400).json({ message: '이미 그 상태입니다.' });
  const admin = await adminOf(req);
  await prisma.user.update({ where: { id: user.id }, data: { status } });
  await prisma.userStatusLog.create({ data: { userId: user.id, fromStatus: user.status, toStatus: status, reason: reason || null, adminId: admin?.id, adminName: who(admin) } });
  res.json({ success: true });
});

// ── 통계
router.get('/admin/ops/stats', async (req, res) => {
  const from = since(req.query.days);
  const [comics, views, purchases, payments, likes, newUsers, ranking] = await Promise.all([
    prisma.comic.findMany({ select: { id: true, title: true, contentType: true, rating: true, viewCount: true, status: true, createdAt: true, _count: { select: { likes: true, episodes: true } } } }),
    prisma.view.findMany({ where: { createdAt: { gte: from } }, select: { comicId: true, episodeId: true, createdAt: true } }),
    prisma.purchase.findMany({ select: { type: true, coinPrice: true, createdAt: true, episode: { select: { comicId: true } } } }),
    prisma.payment.findMany({ where: { createdAt: { gte: from } }, select: { amount: true, status: true, createdAt: true, refundAmount: true } }),
    prisma.like.findMany({ where: { createdAt: { gte: from } }, select: { comicId: true, createdAt: true } }),
    prisma.user.findMany({ where: { createdAt: { gte: from } }, select: { createdAt: true } }),
    rankingsRouter.rankings(),
  ]);
  const done = (s) => ['COMPLETED', 'PAID'].includes(String(s).toUpperCase());
  // 일별
  const days = [];
  for (let t = from.getTime(); t <= Date.now() + 1000; t += 86400000) days.push(dayKey(t));
  const daily = Object.fromEntries([...new Set(days)].map((d) => [d, { date: d, views: 0, purchases: 0, coins: 0, payments: 0, newUsers: 0, likes: 0 }]));
  const bump = (d, k, n = 1) => { const row = daily[dayKey(d)]; if (row) row[k] += n; };
  views.forEach((v) => bump(v.createdAt, 'views'));
  purchases.filter((p) => p.createdAt >= from).forEach((p) => { bump(p.createdAt, 'purchases'); bump(p.createdAt, 'coins', p.coinPrice || 0); });
  payments.filter((p) => done(p.status)).forEach((p) => bump(p.createdAt, 'payments', p.amount || 0));
  newUsers.forEach((u) => bump(u.createdAt, 'newUsers'));
  likes.forEach((l) => bump(l.createdAt, 'likes'));
  // 작품별
  const periodViews = new Map(); views.forEach((v) => v.comicId && periodViews.set(v.comicId, (periodViews.get(v.comicId) || 0) + 1));
  const buy = new Map();
  purchases.forEach((p) => { const id = p.episode?.comicId; if (!id) return; const e = buy.get(id) || { own: 0, rent: 0, coins: 0, periodCoins: 0 }; e[p.type === 'RENT' ? 'rent' : 'own'] += 1; e.coins += p.coinPrice || 0; if (p.createdAt >= from) e.periodCoins += p.coinPrice || 0; buy.set(id, e); });
  const popRank = new Map(ranking.popular.map((x, i) => [x.id, i + 1]));
  const rtRank = new Map(ranking.realtime.map((x, i) => [x.id, i + 1]));
  const works = comics.map((c) => {
    const b = buy.get(c.id) || { own: 0, rent: 0, coins: 0, periodCoins: 0 };
    return { id: c.id, title: c.title, type: contentTypeOf(c), adult: ['19', 'ADULT', 'adult'].includes(String(c.rating)), status: c.status, views: c.viewCount || 0, periodViews: periodViews.get(c.id) || 0, likes: c._count.likes, episodes: c._count.episodes, own: b.own, rent: b.rent, purchases: b.own + b.rent, coins: b.coins, periodCoins: b.periodCoins, popularRank: popRank.get(c.id) || null, realtimeRank: rtRank.get(c.id) || null };
  });
  const sum = (arr, k) => arr.reduce((a, x) => a + (x[k] || 0), 0);
  res.json({
    from, days: Object.values(daily),
    totals: {
      works: comics.length, views: sum(works, 'views'), periodViews: views.length, likes: sum(works, 'likes'), periodLikes: likes.length,
      purchases: purchases.length, periodPurchases: purchases.filter((p) => p.createdAt >= from).length, coins: sum(purchases, 'coinPrice'), periodCoins: purchases.filter((p) => p.createdAt >= from).reduce((a, p) => a + (p.coinPrice || 0), 0),
      payments: payments.filter((p) => done(p.status)).reduce((a, p) => a + (p.amount || 0), 0), refunds: payments.reduce((a, p) => a + (p.refundAmount || 0), 0), newUsers: newUsers.length,
    },
    works,
  });
});
router.get('/admin/ops/stats/works/:id', async (req, res) => {
  const from = since(req.query.days);
  const comic = await prisma.comic.findUnique({ where: { id: req.params.id }, select: { id: true, title: true, episodes: { select: { id: true, episodeNumber: true, title: true, viewCount: true, _count: { select: { purchases: true } } }, orderBy: { episodeNumber: 'asc' } } } });
  if (!comic) return res.status(404).json({ message: '작품을 찾을 수 없습니다.' });
  const views = await prisma.view.findMany({ where: { comicId: comic.id, createdAt: { gte: from } }, select: { episodeId: true, createdAt: true } });
  const perEp = new Map(); views.forEach((v) => v.episodeId && perEp.set(v.episodeId, (perEp.get(v.episodeId) || 0) + 1));
  const trend = {}; for (let t = from.getTime(); t <= Date.now() + 1000; t += 86400000) trend[dayKey(t)] = 0;
  views.forEach((v) => { const k = dayKey(v.createdAt); if (k in trend) trend[k] += 1; });
  res.json({
    id: comic.id, title: comic.title,
    episodes: comic.episodes.map((e) => ({ id: e.id, episodeNumber: e.episodeNumber, title: e.title, views: e.viewCount || 0, periodViews: perEp.get(e.id) || 0, purchases: e._count.purchases })),
    trend: Object.entries(trend).map(([date, n]) => ({ date, views: n })),
  });
});

// ── 대시보드 요약
router.get('/admin/ops/dashboard', async (req, res) => {
  const today = new Date(new Date(Date.now() + KST).toISOString().slice(0, 10) + 'T00:00:00+09:00');
  const [works, scheduled, users, newUsers, views, purchases, pays, reports, hiatus] = await Promise.all([
    prisma.comic.count({ where: { isPublished: true } }),
    prisma.episode.count({ where: { createdAt: { gt: new Date() } } }),
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: today } } }),
    prisma.view.count({ where: { createdAt: { gte: today } } }),
    prisma.purchase.findMany({ where: { createdAt: { gte: today } }, select: { coinPrice: true } }),
    prisma.payment.findMany({ where: { createdAt: { gte: today } }, select: { amount: true, status: true } }),
    prisma.report.count({ where: { status: { in: ['PENDING', 'PROCESSING'] } } }),
    prisma.comic.count({ where: { status: 'HIATUS' } }),
  ]);
  const upToday = await prisma.episode.findMany({ where: { createdAt: { gte: today, lte: new Date() } }, select: { comicId: true }, distinct: ['comicId'] });
  res.json({
    works, scheduled, users, newUsers, views, hiatus, upToday: upToday.length, pendingReports: reports,
    purchases: purchases.length, coins: purchases.reduce((a, p) => a + (p.coinPrice || 0), 0),
    payments: pays.filter((p) => ['COMPLETED', 'PAID'].includes(String(p.status).toUpperCase())).reduce((a, p) => a + (p.amount || 0), 0),
  });
});

module.exports = router;
