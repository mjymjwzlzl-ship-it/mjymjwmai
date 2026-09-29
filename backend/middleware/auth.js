const { trustedAdult } = require('../services/trusted-adult');
const jwt = require('jsonwebtoken');
const { prisma } = require('../lib/prisma');
const { getJwtSecret } = require('../lib/jwt-secret');

const USER_SELECT = {
  id: true,
  email: true,
  username: true,
  role: true,
  status: true,
  adultVerified: true,
  adultVerificationMethod: true,
};

function jwtSecret() {
  return getJwtSecret();
}

function isDevelopmentDemoToken(token) {
  return false; // Never accept demo credentials on the deployed server.
  return ['true', 'demo-token', 'admin-authenticated'].includes(token);
}

async function resolveDemoUser(token) {
  const role = token === 'admin-authenticated' ? 'ADMIN' : 'USER';
  return prisma.user.findFirst({
    where: { role, status: 'ACTIVE' },
    select: USER_SELECT,
  });
}

async function resolveJwtUser(token) {
  const decoded = jwt.verify(token, jwtSecret());
  if (!decoded?.userId) return null;
  return prisma.user.findUnique({
    where: { id: decoded.userId },
    select: USER_SELECT,
  });
}

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ code: 'LOGIN_REQUIRED', message: '인증 토큰이 필요합니다.' });
    }

    const token = authHeader.slice(7).trim();
    const user = isDevelopmentDemoToken(token)
      ? await resolveDemoUser(token)
      : await resolveJwtUser(token);

    if (!user) {
      return res.status(401).json({ code: 'INVALID_TOKEN', message: '사용자를 찾을 수 없습니다.' });
    }
    if (user.status !== 'ACTIVE') {
      return res.status(401).json({ code: 'INACTIVE_ACCOUNT', message: '비활성화된 계정입니다.' });
    }

    user.adultVerified = trustedAdult(user);
    req.user = user;
    return next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ code: 'INVALID_TOKEN', message: '유효하지 않은 토큰입니다.' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ code: 'TOKEN_EXPIRED', message: '토큰이 만료되었습니다.' });
    }
    console.error('Authentication error:', error);
    return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
};

const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ code: 'LOGIN_REQUIRED', message: '인증이 필요합니다.' });
  }
  if (!['ADMIN', 'CS_ADMIN'].includes(req.user.role)) {
    return res.status(403).json({ code: 'ADMIN_REQUIRED', message: '관리자 권한이 필요합니다.' });
  }
  return next();
};

const optionalAuth = async (req, _res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      req.user = null;
      return next();
    }

    const token = authHeader.slice(7).trim();
    const user = isDevelopmentDemoToken(token)
      ? await resolveDemoUser(token)
      : await resolveJwtUser(token);
    if (user) user.adultVerified = trustedAdult(user);
    req.user = user?.status === 'ACTIVE' ? user : null;
    return next();
  } catch (_error) {
    req.user = null;
    return next();
  }
};

module.exports = { authenticate, requireAdmin, optionalAuth };
