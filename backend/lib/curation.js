// 노출 관리 설정 읽기·쓰기 (HomeCuration). 사용자 화면에 "어떤 작품을 어디에" 보여 줄지만 담는다.
const { prisma } = require('./prisma');

const HOME_SECTIONS = [
  { key: 'recent', label: '최근에 본 작품' },
  { key: 'weekday', label: '요일별 연재 (자동 분류)' },
  { key: 'today', label: '오늘의 추천작' },
  { key: 'popular', label: '인기 작품' },
  { key: 'realtime', label: '실시간 랭킹' },
  { key: 'newPicks', label: '추천 신작' },
  { key: 'top', label: 'TOP 20 (웹툰·단행본·웹소설)' },
  { key: 'eventWorks', label: '이벤트 작품 (할인·무료)' },
  { key: 'events', label: '이벤트' },
];
// 예전 수동 목록 키(today_picks·new_picks·popular_pins)는 ranking-engine 이 처음 한 번 고정 순위로 옮긴다
const LIST_KEYS = ['today_picks', 'new_picks', 'popular_pins'];

async function getCuration(key, fallback) {
  const row = await prisma.homeCuration.findUnique({ where: { key } });
  if (!row) return fallback;
  try { return JSON.parse(row.value); } catch { return fallback; }
}
async function setCuration(key, value, updatedBy) {
  const json = JSON.stringify(value);
  await prisma.homeCuration.upsert({ where: { key }, create: { key, value: json, updatedBy }, update: { value: json, updatedBy } });
}
// 저장된 순서 + 새로 생긴 섹션은 뒤에 (노출 켜짐)
async function homeSections() {
  const saved = await getCuration('home_sections', null);
  const known = new Map(HOME_SECTIONS.map((s) => [s.key, s]));
  const list = Array.isArray(saved) ? saved.filter((s) => known.has(s.key)).map((s) => ({ key: s.key, visible: s.visible !== false })) : [];
  for (const s of HOME_SECTIONS) if (!list.some((x) => x.key === s.key)) list.push({ key: s.key, visible: true });
  return list.map((s) => ({ ...s, label: known.get(s.key).label }));
}

module.exports = { HOME_SECTIONS, LIST_KEYS, getCuration, setCuration, homeSections };
