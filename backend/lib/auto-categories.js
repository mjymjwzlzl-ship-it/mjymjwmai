// 홈·목록 카테고리 자동 분류: 작품 관리에 입력한 정보만 기준 (관리자 수동 카테고리 목록은 쓰지 않는다)
// - 요일(week_mon…sun): 연재 요일(updateDays)에 그 요일이 있는 연재중·휴재 작품
// - 매일(daily): 7요일 모두 연재 / 요일 전체(week): 요일이 하나라도 있는 연재중·휴재 작품
// - 완결(complete·completed): 연재 상태 = 완결
// - 신작(new): 런칭(createdAt) 7일 이내 (NEW 배지와 같은 기준, KST)
// - 최신 업데이트(latest): 공개된 회차가 있는 작품을 마지막 공개 순으로 (오늘 공개 = UP 배지)
const { isNewLaunch } = require('./badges');

const WEEK = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const daysOf = (comic) => { try { const d = JSON.parse(comic.updateDays || '[]'); return Array.isArray(d) ? d.filter((x) => WEEK.includes(x)) : []; } catch { return []; } };
const time = (v) => (v ? new Date(v).getTime() : 0);

function autoCategories(comics) {
  const serial = comics.filter((c) => c.status === 'ONGOING' || c.status === 'HIATUS');
  const byUpdate = (a, b) => time(b.lastEpisodeAt) - time(a.lastEpisodeAt) || time(b.createdAt) - time(a.createdAt);
  const out = {};
  for (const day of WEEK) out[`week_${day}`] = serial.filter((c) => daysOf(c).includes(day)).sort(byUpdate);
  out.week = serial.filter((c) => daysOf(c).length > 0).sort(byUpdate);
  out.daily = serial.filter((c) => daysOf(c).length === 7).sort(byUpdate);
  out.complete = comics.filter((c) => c.status === 'COMPLETED').sort(byUpdate);
  out.completed = out.complete;
  out.new = comics.filter((c) => isNewLaunch(c.createdAt)).sort((a, b) => time(b.createdAt) - time(a.createdAt));
  out.latest = comics.filter((c) => c.lastEpisodeAt).sort(byUpdate);
  return out;
}

module.exports = { autoCategories, daysOf, WEEK };
