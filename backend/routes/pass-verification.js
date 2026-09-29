const express = require('express');
const jwt = require('jsonwebtoken');
const { createPassService, PassVerificationError } = require('../services/pass-verification');
const { trustedAdult } = require('../services/trusted-adult');

function rateLimit(limit, windowMs) {
  const buckets = new Map();
  return (req, res, next) => {
    const now = Date.now();
    for (const [key, entry] of buckets) if (entry.until <= now) buckets.delete(key);
    const key = req.passUser.id;
    const entry = buckets.get(key) || { count: 0, until: now + windowMs };
    if (entry.count >= limit || (!buckets.has(key) && buckets.size >= 10000)) {
      res.set('Retry-After', String(Math.ceil((entry.until - now) / 1000)));
      return res.status(429).json({ message: '인증 요청이 많습니다. 잠시 후 다시 시도해주세요.' });
    }
    entry.count++;
    buckets.set(key, entry);
    next();
  };
}

function createPassRouter({ prisma, env = process.env, service = createPassService({ env }) }) {
  const router = express.Router();
  router.use((_req, res, next) => { res.set('Cache-Control', 'private, no-store'); next(); });
  router.use(async (req, res, next) => {
    if (!env.JWT_SECRET || env.JWT_SECRET.length < 32) {
      return res.status(503).json({ message: '본인인증 설정을 준비 중입니다.' });
    }
    let userId;
    try {
      const header = req.headers.authorization || '';
      if (!header.startsWith('Bearer ')) throw new Error('Missing login');
      const decoded = jwt.verify(header.slice(7), env.JWT_SECRET, { algorithms: ['HS256'] });
      if (typeof decoded.userId !== 'string') throw new Error('Invalid login');
      userId = decoded.userId;
    } catch {
      return res.status(401).json({ message: '로그인 후 본인인증을 진행해주세요.' });
    }
    try {
      const user = await prisma.user.findUnique({ where: { id: userId },
        select: { id: true, status: true, adultVerified: true, adultVerificationMethod: true } });
      if (!user || user.status !== 'ACTIVE') return res.status(401).json({ message: '로그인이 필요합니다.' });
      req.passUser = user;
      next();
    } catch { res.status(500).json({ message: '사용자 정보를 확인하지 못했습니다.' }); }
  });

  router.get('/config', (req, res) => {
    res.json({ configured: service.getConfig().configured, adultVerified: trustedAdult(req.passUser) });
  });

  function failure(res, error) {
    if (error instanceof PassVerificationError) {
      return res.status(error.status).json({ code: error.code, message: error.message });
    }
    return res.status(500).json({ message: '본인인증을 처리하지 못했습니다. 다시 시도해주세요.' });
  }

  router.post('/prepare', rateLimit(5, 600_000), (req, res) => {
    try { res.json(service.prepare(req.passUser.id)); } catch (error) { failure(res, error); }
  });
  router.post('/confirm', rateLimit(15, 60_000), async (req, res) => {
    try {
      const data = await service.confirm(req.passUser.id, req.body);
      // Server-verified data only. Never spread req.body into a user update.
      const result = await prisma.user.updateMany({ where: { id: req.passUser.id, status: 'ACTIVE' }, data });
      if (result.count !== 1) return res.status(401).json({ message: '로그인이 필요합니다.' });
      res.json({ success: true, userId: req.passUser.id, adultVerified: true,
        adultVerifiedAt: data.adultVerifiedAt, adultVerificationMethod: data.adultVerificationMethod });
    } catch (error) { failure(res, error); }
  });
  return router;
}

module.exports = { createPassRouter };
