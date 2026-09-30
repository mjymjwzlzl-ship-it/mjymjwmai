// [UP] / [NEW] 배지 공통 (서비스 전체 같은 기준)
// - UP : 한국 시간 오늘 공개된 회차가 있는 작품 (예약 공개는 공개 시각이 지나야)
// - NEW: 런칭(작품 등록일) 후 7일 이내
const KST_OFFSET = 9 * 60 * 60 * 1000;
const kstDay = (value: string | number | Date) => new Date(new Date(value).getTime() + KST_OFFSET).toISOString().slice(0, 10);

export const isUpToday = (lastEpisodeAt?: string | Date | null) => {
  if (!lastEpisodeAt) return false;
  const time = new Date(lastEpisodeAt).getTime();
  return !Number.isNaN(time) && time <= Date.now() && kstDay(time) === kstDay(Date.now());
};
export const isNewLaunch = (createdAt?: string | Date | null) => {
  if (!createdAt) return false;
  const time = new Date(createdAt).getTime();
  return !Number.isNaN(time) && Date.now() - time <= 7 * 24 * 60 * 60 * 1000;
};

export default function ComicBadges({ lastEpisodeAt, createdAt, size = 'sm', className = '' }: { lastEpisodeAt?: string | Date | null; createdAt?: string | Date | null; size?: 'xs' | 'sm'; className?: string }) {
  const up = isUpToday(lastEpisodeAt);
  const isNew = isNewLaunch(createdAt);
  if (!up && !isNew) return null;
  const pad = size === 'xs' ? 'px-1 py-px text-[9px]' : 'px-1.5 py-0.5 text-[10px]';
  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      {up && <span className={`rounded-sm bg-red-600 font-black text-white ${pad}`}>UP</span>}
      {isNew && <span className={`rounded-sm bg-[#00dc64] font-black text-black ${pad}`}>NEW</span>}
    </span>
  );
}
