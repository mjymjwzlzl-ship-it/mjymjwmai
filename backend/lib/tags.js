// 작품 태그(Comic.tags, JSON 배열 문자열) 읽기·정리
function parseTags(value) {
  if (Array.isArray(value)) return value;
  try { const list = JSON.parse(value || '[]'); return Array.isArray(list) ? list : []; } catch { return []; }
}
// 관리자 입력 정리: 앞뒤 공백·# 제거, 20자, 중복 제거, 최대 20개
function normalizeTags(input) {
  const list = Array.isArray(input) ? input : String(input || '').split(/[,\n]/);
  const seen = new Set();
  const out = [];
  for (const raw of list) {
    const tag = String(raw || '').replace(/^#/, '').trim().slice(0, 20);
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    out.push(tag);
    if (out.length >= 20) break;
  }
  return out;
}
module.exports = { parseTags, normalizeTags };
