// 에이쳇 관리자 센터용 아라따 API (/api/admin/achat/...). 에이쳇 회원·젬(=아라따 코인)·결제는 아라따 계정 공통이라 여기서 읽고 쓴다.
// - summary: 가입·결제·젬 충전(유료)·사용·무료 지급 일별 집계, ARPPU
// - coins: 젬(코인) 거래 내역 (유료 CHARGE / 무료 REWARD·ADMIN_GRANT·EVENT / 사용 PURCHASE / 회수 ADMIN_REVOKE·REFUND)
// - users/:id/coins: 관리자 젬 지급·회수 (사유 필수, 거래 내역에 남김)
const express = require('express');
const { prisma } = require('../lib/prisma');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use('/admin/achat', authenticate, requireAdmin);

const KST = 9 * 3600 * 1000;
const dayKey = (d) => new Date(new Date(d).getTime() + KST).toISOString().slice(0, 10);
const todayStart = () => new Date(`${dayKey(Date.now())}T00:00:00+09:00`);
const done = (s) => ['COMPLETED', 'PAID'].includes(String(s).toUpperCase());
const PAID_TYPES = ['CHARGE'];
const FREE_TYPES = ['REWARD', 'ADMIN_GRANT', 'EVENT', 'BONUS'];
const kindOf = (t) => (PAID_TYPES.includes(t) ? 'paid' : FREE_TYPES.includes(t) ? 'free' : t === 'PURCHASE' ? 'use' : 'other');

router.get('/admin/achat/summary', async (req, res) => {
  const days = Math.max(1, Math.min(365, Number(req.query.days) || 30));
  const from = new Date(Date.now() - days * 86400000);
  const [users, newUsers, payments, coins] = await Promise.all([
    prisma.user.count(),
    prisma.user.findMany({ where: { createdAt: { gte: from } }, select: { createdAt: true } }),
    prisma.payment.findMany({ where: { createdAt: { gte: from } }, select: { amount: true, status: true, userId: true, createdAt: true, refundAmount: true } }),
    prisma.coinTransaction.findMany({ where: { createdAt: { gte: from } }, select: { amount: true, type: true, createdAt: true } }),
  ]);
  const daily = {};
  for (let t = from.getTime(); t <= Date.now() + 1000; t += 86400000) daily[dayKey(t)] = { date: dayKey(t), signups: 0, payments: 0, payers: new Set(), paidCoins: 0, freeCoins: 0, usedCoins: 0 };
  const row = (d) => daily[dayKey(d)];
  newUsers.forEach((u) => { const r = row(u.createdAt); if (r) r.signups += 1; });
  const ok = payments.filter((p) => done(p.status));
  ok.forEach((p) => { const r = row(p.createdAt); if (r) { r.payments += p.amount || 0; r.payers.add(p.userId); } });
  coins.forEach((c) => { const r = row(c.createdAt); if (!r) return; const k = kindOf(c.type); if (k === 'paid') r.paidCoins += c.amount; else if (k === 'free') r.freeCoins += c.amount; else if (k === 'use') r.usedCoins += -c.amount; });
  const list = Object.values(daily).map((r) => ({ ...r, payers: r.payers.size }));
  const today = list[list.length - 1] || {};
  const payers = new Set(ok.map((p) => p.userId)).size;
  const revenue = ok.reduce((a, p) => a + (p.amount || 0), 0);
  // 상품별(금액별) 매출
  const byAmount = {};
  ok.forEach((p) => { byAmount[p.amount] = byAmount[p.amount] || { amount: p.amount, count: 0, total: 0 }; byAmount[p.amount].count += 1; byAmount[p.amount].total += p.amount || 0; });
  res.json({
    days, users, today,
    totals: { signups: newUsers.length, revenue, refunds: payments.reduce((a, p) => a + (p.refundAmount || 0), 0), payers, arppu: payers ? Math.round(revenue / payers) : 0, paidCoins: list.reduce((a, r) => a + r.paidCoins, 0), freeCoins: list.reduce((a, r) => a + r.freeCoins, 0), usedCoins: list.reduce((a, r) => a + r.usedCoins, 0) },
    daily: list,
    products: Object.values(byAmount).sort((a, b) => b.total - a.total),
    todaySignups: await prisma.user.count({ where: { createdAt: { gte: todayStart() } } }),
  });
});

router.get('/admin/achat/coins', async (req, res) => {
  const where = {};
  if (req.query.userId) where.userId = String(req.query.userId);
  const kind = String(req.query.kind || '');
  if (kind === 'paid') where.type = { in: PAID_TYPES };
  if (kind === 'free') where.type = { in: FREE_TYPES };
  if (kind === 'use') where.type = 'PURCHASE';
  if (kind === 'revoke') where.type = { in: ['ADMIN_REVOKE', 'REFUND'] };
  const q = String(req.query.q || '').trim();
  if (q) where.user = { OR: [{ email: { contains: q } }, { nickname: { contains: q } }] };
  const rows = await prisma.coinTransaction.findMany({ where, orderBy: { createdAt: 'desc' }, take: 300, include: { user: { select: { id: true, email: true, nickname: true } } } });
  res.json({ transactions: rows.map((r) => ({ ...r, kind: kindOf(r.type) })) });
});

router.post('/admin/achat/users/:id/coins', async (req, res) => {
  const amount = Math.trunc(Number(req.body?.amount));
  const reason = String(req.body?.reason || '').trim().slice(0, 200);
  if (!amount || Math.abs(amount) > 1000000) return res.status(400).json({ message: '지급(+)·회수(-) 수량을 입력하세요.' });
  if (!reason) return res.status(400).json({ message: '사유를 입력하세요.' });
  const admin = await prisma.user.findUnique({ where: { id: req.user.id || req.user.userId }, select: { email: true, nickname: true } });
  try {
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: req.params.id }, select: { coinBalance: true } });
      if (!user) throw Object.assign(new Error('회원을 찾을 수 없습니다.'), { status: 404 });
      if (amount < 0 && user.coinBalance + amount < 0) throw Object.assign(new Error(`보유 젬(${user.coinBalance})보다 많이 회수할 수 없습니다.`), { status: 400 });
      const updated = await tx.user.update({ where: { id: req.params.id }, data: { coinBalance: { increment: amount } } });
      await tx.coinTransaction.create({ data: { userId: req.params.id, amount, balance: updated.coinBalance, type: amount > 0 ? 'ADMIN_GRANT' : 'ADMIN_REVOKE', description: `[에이쳇 관리자 ${admin?.nickname || admin?.email || ''}] ${reason}` } });
      return updated.coinBalance;
    });
    res.json({ balance: result });
  } catch (e) {
    res.status(e.status || 500).json({ message: e.status ? e.message : '처리하지 못했습니다.' });
  }
});

module.exports = router;
