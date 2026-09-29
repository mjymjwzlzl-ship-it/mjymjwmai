const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const AUDIENCE = 'arata-pass-verification';
const ISSUER = 'arata';
const SESSION_SECONDS = 600;

class PassVerificationError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

function getConfig(env = process.env) {
  let origin = '';
  try {
    const url = new URL(env.FRONTEND_URL || 'http://localhost:4000');
    if (url.protocol === 'https:' || (env.NODE_ENV !== 'production' &&
      url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))) {
      origin = url.origin;
    }
  } catch {}
  return {
    configured: Boolean(origin && env.PORTONE_STORE_ID && env.PORTONE_IDENTITY_CHANNEL_KEY &&
      env.PORTONE_API_SECRET && env.JWT_SECRET?.length >= 32),
    storeId: env.PORTONE_STORE_ID || '',
    channelKey: env.PORTONE_IDENTITY_CHANNEL_KEY || '',
    redirectUrl: origin ? `${origin}/auth/pass-return` : '',
  };
}

function requireConfig(env) {
  const config = getConfig(env);
  if (!config.configured) {
    throw new PassVerificationError('PASS_NOT_CONFIGURED', 'PASS 본인인증 연동을 준비 중입니다.', 503);
  }
  return config;
}

// Preserve ARATA's existing full-age-19 policy; calculate the date in Korea.
function isAdultBirthDate(birthDate, now = new Date()) {
  if (typeof birthDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return false;
  const birth = new Date(`${birthDate}T00:00:00Z`);
  if (!Number.isFinite(birth.getTime()) || birth.toISOString().slice(0, 10) !== birthDate) return false;
  const korea = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const today = korea.toISOString().slice(0, 10);
  const age = Number(today.slice(0, 4)) - Number(birthDate.slice(0, 4)) -
    (today.slice(5) < birthDate.slice(5) ? 1 : 0);
  return age >= 19 && age <= 120;
}

function createPassService({ env = process.env, fetchImpl = global.fetch, now = () => new Date() } = {}) {
  function prepare(userId) {
    const config = requireConfig(env);
    const identityVerificationId = `arata-pass-${crypto.randomUUID()}`;
    const issuedAt = Math.floor(now().getTime() / 1000);
    const verificationToken = jwt.sign({
      identityVerificationId, iat: issuedAt, exp: issuedAt + SESSION_SECONDS,
    }, env.JWT_SECRET, { algorithm: 'HS256', subject: userId, issuer: ISSUER, audience: AUDIENCE });
    return { ...config, identityVerificationId, verificationToken };
  }

  async function confirm(userId, input = {}) {
    const config = requireConfig(env);
    const { identityVerificationId, verificationToken } = input;
    if (typeof identityVerificationId !== 'string' ||
      !/^arata-pass-[a-f0-9-]{36}$/.test(identityVerificationId) ||
      typeof verificationToken !== 'string' || verificationToken.length > 2048) {
      throw new PassVerificationError('INVALID_PASS_REQUEST', '인증 요청 정보가 올바르지 않습니다.');
    }
    let session;
    try {
      session = jwt.verify(verificationToken, env.JWT_SECRET, {
        algorithms: ['HS256'], subject: userId, issuer: ISSUER, audience: AUDIENCE,
        clockTimestamp: Math.floor(now().getTime() / 1000),
      });
      if (session.identityVerificationId !== identityVerificationId) throw new Error('ID mismatch');
    } catch {
      throw new PassVerificationError('PASS_SESSION_EXPIRED', '인증 요청이 만료되었거나 일치하지 않습니다. 다시 시작해주세요.', 403);
    }

    let identity;
    try {
      const url = new URL(`https://api.portone.io/identity-verifications/${encodeURIComponent(identityVerificationId)}`);
      url.searchParams.set('storeId', config.storeId);
      const response = await fetchImpl(url, {
        headers: { Authorization: `PortOne ${env.PORTONE_API_SECRET}`, Accept: 'application/json' },
        signal: AbortSignal.timeout(12_000),
      });
      if (!response.ok) throw new Error('Provider lookup failed');
      identity = await response.json();
    } catch {
      // Do not return/log the provider response: it contains sensitive identity information.
      throw new PassVerificationError('PASS_LOOKUP_FAILED', '인증 결과를 확인하지 못했습니다. 잠시 후 다시 확인해주세요.', 502);
    }

    if (identity?.status !== 'VERIFIED') {
      throw new PassVerificationError('PASS_NOT_VERIFIED', '휴대폰 본인인증이 완료되지 않았습니다.', 409);
    }
    if (identity.id !== identityVerificationId || identity.channel?.key !== config.channelKey ||
      identity.channel?.type !== 'LIVE' || (identity.storeId && identity.storeId !== config.storeId)) {
      throw new PassVerificationError('PASS_RESULT_MISMATCH', '본인인증 결과를 확인할 수 없습니다.', 403);
    }
    const verifiedAt = new Date(identity.verifiedAt);
    if (!Number.isFinite(verifiedAt.getTime()) || verifiedAt.getTime() < session.iat * 1000 - 30_000 ||
      verifiedAt.getTime() > now().getTime() + 30_000) {
      throw new PassVerificationError('PASS_RESULT_EXPIRED', '인증 결과가 만료되었습니다. 다시 인증해주세요.', 403);
    }
    const birthDate = identity.verifiedCustomer?.birthDate;
    if (!isAdultBirthDate(birthDate, now())) {
      throw new PassVerificationError('ADULT_AGE_REQUIRED', '인증된 생년월일 기준 만 19세 이상만 이용할 수 있습니다.', 403);
    }
    return { adultVerified: true, adultVerifiedAt: verifiedAt,
      adultVerificationMethod: 'pass', birthDate, birthYear: Number(birthDate.slice(0, 4)) };
  }

  return { getConfig: () => getConfig(env), prepare, confirm };
}

module.exports = { createPassService, getConfig, isAdultBirthDate, PassVerificationError };
