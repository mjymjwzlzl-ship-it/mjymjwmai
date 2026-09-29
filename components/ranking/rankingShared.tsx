import Link from 'next/link';
import { Eye, Heart, Star } from 'lucide-react';
import { getImageUrl } from '@/lib/utils';

export type RankingKind = 'popular' | 'realtime' | 'new' | 'webtoon' | 'book' | 'novel';
export interface RankingItem {
  id: string;
  rank: number;
  title: string;
  author?: string | null;
  thumbnail?: string | null;
  totalEpisodes: number;
  views: number;
  likes: number;
  rating: number;
  recentViews: number;
  launchedAt?: string;
  isNew?: boolean;
}
export interface RankingList { total: number; top: number; items: RankingItem[] }
export interface RankingResponse { realtimeHours: number; rankings: Partial<Record<RankingKind, RankingList>> }

export const RANKING_KINDS: RankingKind[] = ['popular', 'realtime', 'new', 'webtoon', 'book', 'novel'];

// 탭 이름: TOP N 은 등록 작품 수에 맞춘 값(서버가 20·50·100 중 결정)
export function rankingLabel(kind: RankingKind, list?: RankingList) {
  if (kind === 'popular') return '인기 작품';
  if (kind === 'realtime') return '실시간 랭킹';
  if (kind === 'new') return '신작';
  const name = kind === 'webtoon' ? '웹툰' : kind === 'book' ? '단행본' : '웹소설';
  return `TOP ${list && list.top > 20 ? list.top : 20} ${name}`;
}

export function rankingCriteria(kind: RankingKind, hours = 24) {
  switch (kind) {
    case 'popular':
      return '누적 조회수 · 찜 · 회차 평점을 합산한 순위예요.';
    case 'realtime':
      return `최근 ${hours}시간 동안 조회가 많았던 작품이에요. 매분 갱신됩니다.`;
    case 'new':
      return '최근 런칭한 작품 순서예요. 런칭 7일 이내 작품에는 NEW 가 붙어요.';
    case 'novel':
      return '웹소설은 준비 중이에요.';
    default:
      return '인기 작품과 같은 기준(누적 조회수 · 찜 · 평점)으로 매긴 순위예요.';
  }
}

export function RankingCard({ item, kind }: { item: RankingItem; kind: RankingKind }) {
  const top3 = item.rank <= 3;
  return (
    <Link href={`/webtoons/${item.id}`} className="group flex min-w-0 items-center gap-3 rounded-lg p-2 transition hover:bg-gray-50 dark:hover:bg-white/5">
      <span className={`w-7 shrink-0 text-center text-xl font-black italic ${top3 ? 'text-[#00a84c] dark:text-[#00dc64]' : 'text-gray-400'}`}>{item.rank}</span>
      <div className="h-[72px] w-[54px] shrink-0 overflow-hidden rounded-md bg-gray-200 dark:bg-gray-800">
        {item.thumbnail ? (
          <img src={getImageUrl(item.thumbnail, { width: 160 })} alt={item.title} loading="lazy" className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-1 text-sm font-black group-hover:text-[#00a84c] dark:group-hover:text-[#00dc64]">{item.title}</p>
        <p className="mt-0.5 line-clamp-1 text-xs text-gray-500 dark:text-gray-400">{[item.author, `${item.totalEpisodes}화`].filter(Boolean).join(' · ')}</p>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 text-[11px] font-bold text-gray-500 dark:text-gray-400">
          {kind === 'realtime' ? (
            <span className="text-red-500">최근 조회 {item.recentViews.toLocaleString()}</span>
          ) : kind === 'new' ? (
            <>
              {item.isNew && <span className="rounded-sm bg-[#00dc64] px-1.5 py-0.5 text-[10px] font-black text-black">NEW</span>}
              <span>{item.launchedAt ? new Date(item.launchedAt).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Asia/Seoul' }) : ''} 런칭</span>
            </>
          ) : (
            <>
              <span className="inline-flex items-center gap-0.5"><Eye className="h-3 w-3" />{item.views.toLocaleString()}</span>
              <span className="inline-flex items-center gap-0.5"><Heart className="h-3 w-3" />{item.likes.toLocaleString()}</span>
              {item.rating > 0 && <span className="inline-flex items-center gap-0.5"><Star className="h-3 w-3" />{item.rating.toFixed(1)}</span>}
            </>
          )}
        </p>
      </div>
    </Link>
  );
}

export function RankingEmpty({ kind }: { kind: RankingKind }) {
  return (
    <p className="rounded-lg border border-dashed border-gray-200 py-10 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
      {kind === 'novel' ? '웹소설은 준비 중이에요.' : kind === 'realtime' ? '최근 조회된 작품이 아직 없어요.' : '표시할 작품이 없어요.'}
    </p>
  );
}
