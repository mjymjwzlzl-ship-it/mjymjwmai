// 캐릭터 화보관 공용 (사용자 API routes/gallery.js · 관리자 routes/admin-gallery.js)
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const sharp = require('sharp');
const { prisma } = require('./prisma');

const UPLOAD_ROOT = path.join(__dirname, '../uploads/photobooks');
const parseList = (v) => { if (Array.isArray(v)) return v; try { const a = JSON.parse(v || '[]'); return Array.isArray(a) ? a : []; } catch { return []; } };
const cleanTags = (input) => {
  const list = Array.isArray(input) ? input : String(input || '').split(/[,\n#]/);
  return [...new Set(list.map((t) => String(t || '').replace(/^#/, '').trim().slice(0, 20)).filter(Boolean))].slice(0, 15);
};
const isAdultRating = (r) => ['ADULT', '19', 'adult'].includes(String(r || ''));

// 작품별 캐릭터 (characters.json, 캐릭터 채팅과 같은 파일). 5분 캐시
const charCache = new Map();
async function charactersOf(comic) {
  if (!comic) return [];
  const hit = charCache.get(comic.id);
  if (hit && Date.now() - hit.at < 5 * 60 * 1000) return hit.list;
  const adult = ['ADULT', '19'].includes(comic.rating) || comic.genre === 'adult';
  const dirs = adult ? ['adult', 'general'] : ['general'];
  let list = [];
  for (const d of dirs) {
    try { const data = JSON.parse(await fs.readFile(path.join(__dirname, '../uploads/webtoons', d, comic.title, 'characters.json'), 'utf8')); list = (data.characters || []).map((c) => ({ id: String(c.id || c.name), name: c.name || String(c.id) })); break; } catch { /* 없음 */ }
  }
  charCache.set(comic.id, { at: Date.now(), list });
  return list;
}

// 작품 제목·유형·캐릭터 이름을 실제 작품 정보에서 채운다 (작품·캐릭터가 바뀌면 화보에도 자동 반영)
async function enrich(items) {
  const workIds = [...new Set(items.map((i) => i.workId).filter(Boolean))];
  const seriesIds = [...new Set(items.map((i) => i.seriesId).filter(Boolean))];
  const ownerIds = [...new Set(items.map((i) => i.ownerId).filter(Boolean))];
  const [comics, series, owners] = await Promise.all([
    workIds.length ? prisma.comic.findMany({ where: { id: { in: workIds } }, select: { id: true, title: true, contentType: true, rating: true, genre: true } }) : [],
    seriesIds.length ? prisma.photobookSeries.findMany({ where: { id: { in: seriesIds } }, select: { id: true, title: true } }) : [],
    ownerIds.length ? prisma.user.findMany({ where: { id: { in: ownerIds } }, select: { id: true, nickname: true, email: true } }) : [],
  ]);
  const comicById = new Map(comics.map((c) => [c.id, c]));
  const seriesById = new Map(series.map((s) => [s.id, s]));
  const ownerById = new Map(owners.map((u) => [u.id, u.nickname || String(u.email || '').split('@')[0]]));
  const chars = new Map();
  for (const c of comics) chars.set(c.id, await charactersOf(c));
  return items.map((i) => {
    const comic = i.workId ? comicById.get(i.workId) : null;
    const ch = comic && i.characterId ? (chars.get(comic.id) || []).find((c) => c.id === i.characterId) : null;
    const type = comic ? String(comic.contentType || 'WEBTOON').toUpperCase() : null;
    return {
      ...i,
      work: comic ? { id: comic.id, title: comic.title, contentType: type } : null,
      character: i.characterId || i.characterName ? { id: i.characterId || null, name: ch?.name || i.characterName || i.characterId, chatReady: !!ch } : null,
      series: i.seriesId ? seriesById.get(i.seriesId) || null : null,
      creator: i.ownerId ? ownerById.get(i.ownerId) || '회원' : 'ARATA 공식',
      tags: parseList(i.tags),
    };
  });
}

// 콘텐츠 유형 필터: WEBTOON·BOOK·NOVEL = 연결 작품 유형, CHAT = 채팅 가능한 캐릭터와 연결된 화보
function matchesType(item, type) {
  if (!type) return true;
  if (type === 'CHAT') return !!item.character?.chatReady;
  return item.work?.contentType === type;
}
const popularScore = (i) => (i.viewCount || 0) + (i.likeCount || 0) * 5 + (i.saveCount || 0) * 5;

// 이미지 저장: 사진은 webp 로, 파일 이름은 추측 불가 (유료 화보 원본 보호)
async function saveImages(itemId, files) {
  const dir = path.join(UPLOAD_ROOT, itemId);
  await fs.mkdir(dir, { recursive: true });
  const urls = [];
  for (const f of files) {
    const name = `${crypto.randomBytes(12).toString('hex')}.webp`;
    await sharp(f.buffer).rotate().resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 86 }).toFile(path.join(dir, name));
    urls.push(`/uploads/photobooks/${itemId}/${name}`);
  }
  return urls;
}

module.exports = { parseList, cleanTags, isAdultRating, charactersOf, enrich, matchesType, popularScore, saveImages };
