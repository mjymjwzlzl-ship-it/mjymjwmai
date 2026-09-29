// 코인 지갑: 유료 코인 / 이벤트 코인 구분.
// - User.coinBalance = 보유 코인 합계 (기존 코드·결제·환불은 그대로 이 값을 쓴다)
// - 이벤트 코인 = EventCoinGrant.remaining 합계, 유료 코인 = 합계 - 이벤트 코인
// - 쓸 때: 기존처럼 coinBalance 를 줄이고, consumeEventCoins 로 이벤트 코인부터(만료 빠른 순) 차감 기록
// - 만료: expireEventCoins 가 남은 이벤트 코인을 합계에서 빼고 거래 내역(EXPIRE)을 남긴다
const { prisma } = require('../lib/prisma');

const DAY = 24 * 60 * 60 * 1000;

async function expireEventCoins(userId, db = prisma) {
  const now = new Date();
  const expired = await db.eventCoinGrant.findMany({ where: { userId, remaining: { gt: 0 }, expiresAt: { lte: now } } });
  if (!expired.length) return 0;
  const run = async (tx) => {
    let total = 0;
    for (const grant of expired) {
      const user = await tx.user.findUnique({ where: { id: userId }, select: { coinBalance: true } });
      const take = Math.min(grant.remaining, Math.max(user?.coinBalance || 0, 0));
      await tx.eventCoinGrant.update({ where: { id: grant.id }, data: { remaining: 0 } });
      if (take > 0) {
        const updated = await tx.user.update({ where: { id: userId }, data: { coinBalance: { decrement: take } }, select: { coinBalance: true } });
        await tx.coinTransaction.create({ data: { userId, amount: -take, balance: updated.coinBalance, type: 'EXPIRE', description: `이벤트 코인 소멸: ${grant.reason}` } });
        total += take;
      }
    }
    return total;
  };
  return db === prisma ? prisma.$transaction(run) : run(db);
}

// 이벤트 코인 지급 (합계 증가 + 지급 건 + 거래 내역). tx 안에서 부른다.
async function grantEventCoins(tx, { userId, amount, reason, source = 'EVENT', expiresAt = null }) {
  if (!(amount > 0)) return null;
  const grant = await tx.eventCoinGrant.create({ data: { userId, amount, remaining: amount, reason, source, expiresAt } });
  const updated = await tx.user.update({ where: { id: userId }, data: { coinBalance: { increment: amount } }, select: { coinBalance: true } });
  await tx.coinTransaction.create({ data: { userId, amount, balance: updated.coinBalance, type: 'REWARD', description: `${reason}${expiresAt ? ` (이벤트 코인, ${expiresAt.toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' })}까지)` : ' (이벤트 코인)'}` } });
  return { grant, coinBalance: updated.coinBalance };
}

// 코인을 쓸 때 이벤트 코인부터 차감 (coinBalance 차감은 호출하는 쪽이 이미 한다). tx 안에서 부른다.
async function consumeEventCoins(tx, userId, amount) {
  if (!(amount > 0)) return 0;
  const now = new Date();
  const grants = await tx.eventCoinGrant.findMany({
    where: { userId, remaining: { gt: 0 }, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
    orderBy: [{ expiresAt: 'asc' }, { createdAt: 'asc' }],
  });
  // SQLite 는 NULL 을 먼저 정렬하므로 기한 있는 것부터 쓰도록 다시 정렬
  grants.sort((a, b) => (a.expiresAt ? a.expiresAt.getTime() : Infinity) - (b.expiresAt ? b.expiresAt.getTime() : Infinity) || a.createdAt - b.createdAt);
  let left = amount;
  for (const grant of grants) {
    if (left <= 0) break;
    const take = Math.min(grant.remaining, left);
    await tx.eventCoinGrant.update({ where: { id: grant.id }, data: { remaining: grant.remaining - take } });
    left -= take;
  }
  return amount - left;
}

async function walletSummary(userId) {
  await expireEventCoins(userId);
  const [user, grants] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { coinBalance: true } }),
    prisma.eventCoinGrant.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 100 }),
  ]);
  const total = Math.max(user?.coinBalance || 0, 0);
  const active = grants.filter((grant) => grant.remaining > 0);
  // 환불·관리자 차감 등으로 합계가 이벤트 코인보다 작아진 경우 이벤트 코인을 합계에 맞춰 보여준다
  const eventCoins = Math.min(active.reduce((sum, grant) => sum + grant.remaining, 0), total);
  const now = Date.now();
  const expiring = active.filter((grant) => grant.expiresAt).sort((a, b) => a.expiresAt - b.expiresAt);
  return {
    total,
    paid: total - eventCoins,
    event: eventCoins,
    nextExpiry: expiring[0] ? { amount: expiring[0].remaining, expiresAt: expiring[0].expiresAt, daysLeft: Math.max(0, Math.ceil((expiring[0].expiresAt - now) / DAY)) } : null,
    grants: grants.map((grant) => ({
      id: grant.id,
      reason: grant.reason,
      source: grant.source,
      amount: grant.amount,
      remaining: grant.remaining,
      createdAt: grant.createdAt,
      expiresAt: grant.expiresAt,
      status: grant.remaining > 0 ? 'ACTIVE' : grant.expiresAt && grant.expiresAt <= new Date() ? 'EXPIRED' : 'USED',
      daysLeft: grant.expiresAt ? Math.max(0, Math.ceil((grant.expiresAt - now) / DAY)) : null,
    })),
  };
}

module.exports = { expireEventCoins, grantEventCoins, consumeEventCoins, walletSummary };
