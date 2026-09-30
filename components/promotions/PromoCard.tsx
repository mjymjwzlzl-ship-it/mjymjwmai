import Link from 'next/link';
import { getImageUrl } from '@/lib/utils';
import ComicBadges from '@/components/ui/ComicBadges';

export interface PromoInfo { id: string; type: 'DISCOUNT' | 'FREE_EPISODES' | 'FREE_RENTAL'; label: string; remaining: string; endsToday: boolean; endAt: string }
export interface PromoComic { id: string; title: string; author?: string | null; thumbnail?: string | null; totalEpisodes: number; createdAt?: string; lastEpisodeAt?: string | null; status?: string; promotions: PromoInfo[] }
export type PromoTab = 'all' | 'discount' | 'free';
export const PROMO_TABS: { key: PromoTab; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'discount', label: '할인' },
  { key: 'free', label: '무료' },
];

const endText = (promo: PromoInfo) =>
  `${new Date(promo.endAt).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric', timeZone: 'Asia/Seoul' })}까지 · ${promo.remaining}`;

export default function PromoCard({ item }: { item: PromoComic }) {
  // 가장 빨리 끝나는 혜택 기준으로 남은 기간 표시
  const soonest = [...item.promotions].sort((a, b) => new Date(a.endAt).getTime() - new Date(b.endAt).getTime())[0];
  return (
    <Link href={`/webtoons/${item.id}`} className="group block min-w-0 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-gray-700 dark:bg-[#181818]">
      <div className="relative aspect-[3/4] overflow-hidden bg-gray-200 dark:bg-gray-800">
        {item.thumbnail ? (
          <img src={getImageUrl(item.thumbnail, { width: 360 })} alt={item.title} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
        ) : null}
        <div className="absolute left-1.5 top-1.5 flex flex-col items-start gap-1">
          <ComicBadges lastEpisodeAt={item.lastEpisodeAt} createdAt={item.createdAt} status={item.status} />
          {soonest?.endsToday && <span className="rounded-sm bg-black px-1.5 py-0.5 text-[11px] font-black text-yellow-300">오늘만</span>}
          {item.promotions.map((promo) => (
            <span key={promo.id} className={`rounded-sm px-1.5 py-0.5 text-[11px] font-black ${promo.type === 'DISCOUNT' ? 'bg-red-600 text-white' : 'bg-[#00dc64] text-black'}`}>
              {promo.label}
            </span>
          ))}
        </div>
      </div>
      <div className="p-2.5">
        <p className="line-clamp-1 text-sm font-black group-hover:text-[#00a84c] dark:group-hover:text-[#00dc64]">{item.title}</p>
        <p className="mt-0.5 line-clamp-1 text-xs text-gray-500 dark:text-gray-400">{[item.author, `${item.totalEpisodes}화`].filter(Boolean).join(' · ')}</p>
        {soonest && <p className={`mt-1 text-[11px] font-bold ${soonest.endsToday || soonest.remaining === 'D-1' ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>{endText(soonest)}</p>}
      </div>
    </Link>
  );
}
