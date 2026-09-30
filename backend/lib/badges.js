// [UP]/[NEW] 배지 기준 (사이트 components/ui/ComicBadges.tsx 와 같은 규칙, 한국 시간 날짜 기준)
// - UP : 오늘(KST) 공개된 회차가 있는 작품 (예약 회차는 공개 시각이 지나야)
// - NEW: 런칭일 포함 7일째 되는 날까지. 예) 9월 25일 런칭 → 10월 1일까지
const KST = 9 * 60 * 60 * 1000;
const DAY = 24 * 60 * 60 * 1000;
const kstDayIndex = (value) => Math.floor((new Date(value).getTime() + KST) / DAY);
const kstDay = (value) => new Date(new Date(value).getTime() + KST).toISOString().slice(0, 10);

function isUpToday(lastEpisodeAt, now = Date.now()) {
  if (!lastEpisodeAt) return false;
  const time = new Date(lastEpisodeAt).getTime();
  return time <= now && kstDayIndex(time) === kstDayIndex(now);
}
function isNewLaunch(createdAt, now = Date.now()) {
  if (!createdAt) return false;
  const diff = kstDayIndex(now) - kstDayIndex(createdAt);
  return diff >= 0 && diff <= 6;
}
// NEW 가 마지막으로 붙는 날 (YYYY-MM-DD, KST)
function newUntil(createdAt) {
  return createdAt ? new Date((kstDayIndex(createdAt) + 6) * DAY).toISOString().slice(0, 10) : null;
}

module.exports = { isUpToday, isNewLaunch, newUntil, kstDay };
