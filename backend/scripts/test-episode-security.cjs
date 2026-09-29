const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const jwt = require('jsonwebtoken');
const secret = 'test-only-episode-media-secret-not-for-production';
function load(file, deps) {
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
    module, exports: module.exports, require: name => {
      if (!(name in deps)) throw Error('Unexpected dependency ' + name);
      return deps[name];
    }, URL, console, process: { env: {} },
  }, { filename: file });
  return module.exports;
}
const adult = load('services/adult-access.js', { '../lib/prisma': { prisma: {} } });
const policy = load('services/episode-policy.js', { './adult-access': adult });
const image = '/uploads/webtoons/adult/test/2/01.webp';
const paid = { id: 'paid', episodeNumber: 2, isFree: true, images: JSON.stringify([image]),
  comic: { paidStartEpisode: 2, episodeCoinPrice: 3, rating: 'ADULT' } };
function fixture({ episodes = [paid], user = null, allowed = false, failure = false } = {}) {
  const service = load('services/episode-media.js', {
    jsonwebtoken: jwt, '../lib/jwt-secret': { getJwtSecret: () => secret },
    './episode-policy': policy,
    './trusted-adult': { trustedAdult: user => user?.adultVerified === true && user?.adultVerificationMethod === 'pass' },
    '../lib/prisma': { prisma: {
      episode: { findMany: async () => { if (failure) throw Error('offline'); return episodes; } },
      user: { findUnique: async () => user },
    } },
    './entitlements': { checkContentAccess: async ({ userId, content }) => ({
      allowed: content.isFree && content.contentRating !== 'ADULT' || !!userId && allowed,
    }) },
    './legacy-episode-access': { checkContentAccess: async ({ userId, content }) => ({
      allowed: content.isFree && content.contentRating !== 'ADULT' || !!userId && allowed,
    }) },
  });
  const request = async (url) => {
    const parsed = new URL(url, 'https://api.arata.co.kr');
    const res = { statusCode: 200, locals: {}, headers: {}, set(k, v) { this.headers[k] = v; return this; },
      status(code) { this.statusCode = code; return this; }, end() { return this; } };
    let next = false;
    await service.guardEpisodeMedia({ path: parsed.pathname.replace(/^\/uploads/, ''),
      query: Object.fromEntries(parsed.searchParams) }, res, () => { next = true; });
    return { ...res, next };
  };
  return { service, request };
}
test('legacy comic pricing overrides stale episode isFree default', () => {
  assert.equal(policy.episodeContent(paid).isFree, false);
  assert.equal(policy.episodeContent({ ...paid, episodeNumber: 1 }).isFree, true);
  assert.equal(policy.episodeContent({ ...paid, episodeNumber: 1, accessType: 'COIN' }).isFree, false);
});
test('all adult rating representations and contentRating are recognized', () => {
  for (const rating of ['19', '19+', 'ADULT', 'adult']) assert.equal(adult.isAdultComic({ rating }), true);
  assert.equal(adult.isAdultComic({ rating: 'all', contentRating: 'ADULT' }), true);
});
test('raw paid and adult-free images are denied', async () => {
  assert.equal((await fixture().request(image)).statusCode, 403);
  assert.equal((await fixture({ episodes: [{ ...paid, episodeNumber: 1 }] }).request(image)).statusCode, 403);
});
test('valid paid ticket requires an active currently entitled user', async () => {
  const good = fixture({ user: { id: 'u', status: 'ACTIVE', adultVerified: true, adultVerificationMethod: 'pass' }, allowed: true });
  const url = good.service.episodeImageUrls(paid, 'u')[0];
  const result = await good.request(url);
  assert.equal(result.next, true);
  assert.equal(result.headers['Cache-Control'], 'private, no-store');
  assert.equal((await fixture().request(url)).statusCode, 403);
  assert.equal((await fixture({ user: { id: 'u', status: 'SUSPENDED' }, allowed: true }).request(url)).statusCode, 403);
});
test('episode media capabilities expire within five minutes', () => {
  const f = fixture({ user: { id: 'u', status: 'ACTIVE', adultVerified: true, adultVerificationMethod: 'pass' }, allowed: true });
  const url = new URL(f.service.episodeImageUrls(paid, 'u')[0], 'https://api.arata.co.kr');
  const claim = jwt.verify(url.searchParams.get('mediaTicket'), secret);
  assert.ok(claim.exp - claim.iat <= 300);
});
test('tampered, expired, wrong-purpose, and wrong-path tickets fail closed', async () => {
  const { request, service } = fixture();
  const ticket = { purpose: 'episode-media', path: service.mediaKey(image), episodeId: 'paid', userId: 'u' };
  for (const value of [
    jwt.sign({ ...ticket, purpose: 'login' }, secret),
    jwt.sign({ ...ticket, path: '/uploads/other' }, secret),
    jwt.sign(ticket, secret, { expiresIn: -1 }),
    jwt.sign(ticket, secret + 'wrong'),
  ]) assert.equal((await request(image + '?mediaTicket=' + value)).statusCode, 403);
});
test('unknown files remain public; database failures do not', async () => {
  assert.equal((await fixture({ episodes: [] }).request('/uploads/cover.webp')).next, true);
  assert.equal((await fixture({ failure: true }).request(image)).statusCode, 503);
});
test('free general images remain available without signing', async () => {
  const ep = { ...paid, episodeNumber: 1, comic: { ...paid.comic, rating: 'all' } };
  assert.equal((await fixture({ episodes: [ep] }).request(image)).next, true);
});
test('encoding and image variants cannot bypass raw image protection', async () => {
  const f = fixture();
  assert.equal((await f.request(image.replace('01.webp', '%30%31.jpg'))).statusCode, 403);
  assert.equal(f.service.mediaKey('/uploads/%252e%252e/secret'), undefined);
  assert.equal(f.service.uploadPath('/uploads/%00bad'), null);
});
test('legacy episode API has no unsigned body field in denied responses', () => {
  const source = fs.readFileSync(path.join(__dirname, '../routes/episodes.js'), 'utf8');
  assert.match(source, /\.\.\.episode,\s+images: \[\]/);
  assert.match(source, /episodeInfo\.images = episodeImageUrls|router\.get\('\/:episodeId', \.\.\.guardEpisode\(\)/);
  assert.doesNotMatch(source, /episodeNumber <= 1/);
});
test('alternate frontend delivery checks access before returning signed images', () => {
  const source = fs.readFileSync(path.join(__dirname, '../routes/frontend.js'), 'utf8');
  assert.match(source, /if \(!access.allowed\)|\.\.\.guardEpisode\(\)/);
  assert.match(source, /images: episodeImageUrls\(accessEpisode|\.\.\.guardEpisode\(\)/);
});
