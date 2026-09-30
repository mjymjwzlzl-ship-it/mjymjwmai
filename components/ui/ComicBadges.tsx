// 작품 썸네일 배지 공통 (서비스 전체 같은 기준, 관리자 [작품 관리] 설정과 연동)
// - UP     : 오늘(KST) 공개된 회차가 있는 작품. 예약 회차는 공개 시각이 지나야 붙는다
// - NEW    : 런칭일 포함 7일째 되는 날까지 (예: 9월 25일 런칭 → 10월 1일까지)
// - 휴재   : 연재 상태 HIATUS,  판매중지: SUSPENDED. 상태를 풀면 자동으로 사라진다
const KST_OFFSET = 9 * 60 * 60 * 1000;
const DAY = 24 * 60 * 60 * 1000;
const kstDayIndex = (value: string | number | Date) => Math.floor((new Date(value).getTime() + KST_OFFSET) / DAY);

export const isUpToday = (lastEpisodeAt?: string | Date | null) => {
  if (!lastEpisodeAt) return false;
  const time = new Date(lastEpisodeAt).getTime();
  return !Number.isNaN(time) && time <= Date.now() && kstDayIndex(time) === kstDayIndex(Date.now());
};
export const isNewLaunch = (createdAt?: string | Date | null) => {
  if (!createdAt) return false;
  const time = new Date(createdAt).getTime();
  if (Number.isNaN(time)) return false;
  const diff = kstDayIndex(Date.now()) - kstDayIndex(time);
  return diff >= 0 && diff <= 6;
};

export default function ComicBadges({
  lastEpisodeAt, createdAt, status, up, isNew, size = 'sm', className = '',
}: {
  lastEpisodeAt?: string | Date | null; createdAt?: string | Date | null; status?: string | null;
  /** 검수 미리보기(badgeTest)처럼 강제로 켤 때만 */
  up?: boolean; isNew?: boolean;
  size?: 'xs' | 'sm'; className?: string;
}) {
  const showUp = up ?? isUpToday(lastEpisodeAt);
  const showNew = isNew ?? isNewLaunch(createdAt);
  const hiatus = status === 'HIATUS';
  const suspended = status === 'SUSPENDED';
  if (!showUp && !showNew && !hiatus && !suspended) return null;
  const pad = size === 'xs' ? 'px-1 py-px text-[9px]' : 'px-1.5 py-0.5 text-[10px]';
  return (
    <span className={`inline-flex flex-wrap items-center gap-1 ${className}`}>
      {showUp && <span className={`rounded-sm bg-red-600 font-black text-white ${pad}`}>UP</span>}
      {showNew && <span className={`rounded-sm bg-[#00dc64] font-black text-black ${pad}`}>NEW</span>}
      {hiatus && <span className={`rounded-sm bg-amber-400 font-black text-black ${pad}`}>휴재</span>}
      {suspended && <span className={`rounded-sm bg-gray-800 font-black text-white ${pad}`}>판매중지</span>}
    </span>
  );
}
