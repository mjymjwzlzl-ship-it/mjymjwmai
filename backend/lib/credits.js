// 작품 참여자(글·그림·스튜디오 등): Comic.credits = JSON [{ role, name }]
// 비어 있으면 authorName("그리매, 그래")을 쉼표 등으로 나눠 [작가]로 본다(스튜디오·팀 이름은 [스튜디오]).
const ROLES = ['글', '그림', '글·그림', '원작', '각색', '작가', '스튜디오'];
const STUDIO_RE = /(스튜디오|studio|team|팀$|컴퍼니|company|엔터|웍스|works|프로덕션|production)/i;
const UNLINKED = new Set(['', '미상', '알 수 없음', '작가', '-', 'ARATA']);

function splitAuthorName(authorName) {
  return String(authorName || '')
    .split(/\s*[,，·&/]\s*/)
    .map((name) => name.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

function parseCredits(comic) {
  let list = [];
  try { list = JSON.parse(comic?.credits || '[]'); } catch { list = []; }
  if (Array.isArray(list)) {
    list = list
      .map((c) => ({ role: ROLES.includes(String(c?.role || '').trim()) ? String(c.role).trim() : '작가', name: String(c?.name || '').replace(/\s+/g, ' ').trim().slice(0, 40) }))
      .filter((c) => c.name);
  } else list = [];
  if (list.length) return list;
  return splitAuthorName(comic?.authorName).map((name) => ({ role: STUDIO_RE.test(name) ? '스튜디오' : '작가', name }));
}

// 관리자 저장: 역할·이름 정리, 같은 역할·이름 중복 제거, 최대 10명
function normalizeCredits(input) {
  const seen = new Set();
  const out = [];
  for (const c of Array.isArray(input) ? input : []) {
    const name = String(c?.name || '').replace(/\s+/g, ' ').trim().slice(0, 40);
    const role = ROLES.includes(String(c?.role || '').trim()) ? String(c.role).trim() : '작가';
    if (!name || seen.has(`${role}|${name}`)) continue;
    seen.add(`${role}|${name}`);
    out.push({ role, name });
    if (out.length >= 10) break;
  }
  return out;
}

const isLinkableName = (name) => !UNLINKED.has(String(name || '').trim());

module.exports = { ROLES, parseCredits, normalizeCredits, splitAuthorName, isLinkableName };
