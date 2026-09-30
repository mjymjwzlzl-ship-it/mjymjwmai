// 연재 상태가 바뀔 때 [작품 공지]를 자동으로 남긴다 (관리자 [연재 상태]·[작품 관리] 공용)
// 휴재 → [중요] 휴재 안내, 휴재에서 연재중 → 연재 재개 안내, 판매중지 → [중요] 판매중지 안내.
// 판매중지·휴재를 풀면 이전 [중요] 고정을 해제한다(사이트 배지는 상태값으로 계산되므로 자동으로 사라진다).
const { prisma } = require('../lib/prisma');
const kstDate = (value) => new Date(value).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Seoul' });

// 상태 변경 시 자동 공지 내용
function autoNotice(prev, next, { resumeAt, message }) {
  const extra = message ? `\n\n${message}` : '';
  if (next === 'HIATUS' && prev !== 'HIATUS') {
    return { type: 'HIATUS', title: '휴재 안내', content: `작품이 잠시 휴재합니다. ${resumeAt ? `연재 재개 예정일은 ${kstDate(resumeAt)}입니다.` : '연재 재개 일정이 정해지면 다시 안내해 드릴게요.'} 지금까지 공개된 회차는 그대로 볼 수 있어요.${extra}` };
  }
  if (next === 'ONGOING' && prev === 'HIATUS') {
    return { type: 'RESUME', title: '연재 재개 안내', content: `휴재를 마치고 연재를 다시 시작합니다. 기다려 주셔서 감사합니다.${extra}` };
  }
  if (next === 'SUSPENDED' && prev !== 'SUSPENDED') {
    return { type: 'SUSPENDED', title: '판매중지 안내', content: `이 작품은 판매가 중지되어 유료 회차를 새로 대여·소장할 수 없습니다. 이미 소장한 회차와 대여 기간이 남은 회차, 무료 회차는 계속 볼 수 있어요.${extra}` };
  }
  return null;
}


async function applyStatusNotice(comicId, prev, next, { resumeAt, message } = {}) {
  if (!next || prev === next) return null;
  // 상태가 바뀌면 지난 휴재·판매중지 고정 해제
  await prisma.comicNotice.updateMany({ where: { comicId, isPinned: true, type: { in: ['HIATUS', 'SUSPENDED'] } }, data: { isPinned: false } });
  const auto = autoNotice(prev, next, { resumeAt, message });
  if (!auto) return null;
  return prisma.comicNotice.create({ data: { comicId, ...auto, isPinned: auto.type !== 'RESUME' } });
}

module.exports = { autoNotice, applyStatusNotice };
