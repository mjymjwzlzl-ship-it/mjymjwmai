'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Building2, PenTool } from 'lucide-react';
import { api } from '@/lib/api';
import { getImageUrl } from '@/lib/utils';
import ComicBadges from '@/components/ui/ComicBadges';
import { contentTypeLabel } from '@/lib/comic-content-format';
import { localizeComicGenre, localizeComicTitle, resolveComicGenre } from '@/lib/comic-localization';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { useAdultModeStore } from '@/store/adultMode';

// 작가·스튜디오 상세: 작품 상세의 작가/스튜디오 이름을 누르면 온다. 참여 작품을 유형·정렬로 모아 본다.
// 데이터: GET /api/frontend/creators/:name (credits 에 이 이름이 있는 공개 작품, 역할 포함)
interface CreatorWork {
  id: string; title: string; thumbnail?: string | null; genre?: string; status?: string; contentType: 'webtoon' | 'book' | 'novel';
  isAdult?: boolean; roles: string[]; totalEpisodes: number; viewCount: number; createdAt: string; lastEpisodeAt?: string | null;
}
interface CreatorData {
  name: string; kind: 'creator' | 'studio'; roles: string[]; sort: 'latest' | 'popular';
  counts: { total: number; webtoon: number; book: number; novel: number }; works: CreatorWork[]; hiddenAdult: number;
}

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  ONGOING: { label: '연재중', className: 'bg-[#00dc64]/15 text-[#00a84c] dark:text-[#00dc64]' },
  HIATUS: { label: '휴재', className: 'bg-amber-400/20 text-amber-700 dark:text-amber-300' },
  COMPLETED: { label: '완결', className: 'bg-gray-200 text-gray-700 dark:bg-white/10 dark:text-gray-300' },
  SUSPENDED: { label: '판매중지', className: 'bg-red-600/15 text-red-600 dark:text-red-400' },
};
const TYPE_TABS = [['all', '전체'], ['webtoon', '웹툰'], ['book', '단행본'], ['novel', '웹소설']] as const;

export default function CreatorPage() {
  const params = useParams();
  const name = decodeURIComponent(String(params.name || ''));
  const { locale } = useLanguage();
  const adultEnabled = useAdultModeStore((state) => state.enabled);
  const [sort, setSort] = useState<'latest' | 'popular'>('latest');
  const [type, setType] = useState<(typeof TYPE_TABS)[number][0]>('all');
  const [data, setData] = useState<CreatorData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => { useAdultModeStore.getState().hydrate(); }, []);
  useEffect(() => {
    if (!name) return;
    setError('');
    api.get(`/frontend/creators/${encodeURIComponent(name)}`, { params: { sort } })
      .then(({ data: body }) => setData(body))
      .catch((e) => { setData(null); setError(e?.response?.status === 404 ? '작가 정보를 찾을 수 없어요.' : '작품 목록을 불러오지 못했어요.'); });
  }, [name, sort, adultEnabled]);

  const works = useMemo(() => (data?.works || []).filter((work) => type === 'all' || work.contentType === type), [data, type]);
  const isStudio = data?.kind === 'studio';

  return (
    <div className="min-h-screen bg-gray-50 pb-24 text-gray-950 transition-colors dark:bg-[#141414] dark:text-white">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <button type="button" onClick={() => history.back()} className="mb-3 inline-flex items-center gap-1 text-sm font-bold text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
          <ArrowLeft className="h-4 w-4" />뒤로
        </button>

        <section className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-[#1b1b1b]">
          <div className="flex items-center gap-4">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#00dc64]/15 text-[#00a84c] dark:text-[#00dc64]">
              {isStudio ? <Building2 className="h-8 w-8" /> : <PenTool className="h-8 w-8" />}
            </span>
            <div className="min-w-0">
              <p className="text-xs font-bold text-gray-500 dark:text-gray-400">{isStudio ? '스튜디오' : '작가'}</p>
              <h1 className="truncate text-2xl font-black">{name}</h1>
              {data && (
                <p className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                  {data.roles.filter((role) => role !== '작가').map((role) => (
                    <span key={role} className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-bold text-gray-600 dark:bg-white/10 dark:text-gray-300">{role}</span>
                  ))}
                  <span>참여 작품 {data.counts.total}개</span>
                </p>
              )}
            </div>
          </div>
        </section>

        {error && <p className="mt-6 rounded-xl border border-dashed border-gray-300 py-16 text-center text-sm text-gray-500 dark:border-gray-700">{error}</p>}
        {!data && !error && <div className="flex justify-center py-20"><div className="h-10 w-10 animate-spin rounded-full border-b-2 border-[#00dc64]" /></div>}

        {data && (
          <>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="콘텐츠 유형">
                {TYPE_TABS.filter(([key]) => key === 'all' || data.counts[key] > 0).map(([key, label]) => (
                  <button key={key} type="button" role="tab" aria-selected={type === key} onClick={() => setType(key)}
                    className={`rounded-full px-3.5 py-1.5 text-sm font-bold transition ${type === key ? 'bg-[#00dc64] text-black' : 'bg-white text-gray-600 hover:text-gray-900 dark:bg-white/5 dark:text-gray-300'}`}>
                    {label} <span className="opacity-60">{key === 'all' ? data.counts.total : data.counts[key]}</span>
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1 text-sm" role="group" aria-label="정렬">
                {([['latest', '최신순'], ['popular', '인기순']] as const).map(([key, label]) => (
                  <button key={key} type="button" aria-pressed={sort === key} onClick={() => setSort(key)}
                    className={`rounded px-2 py-1 font-bold ${sort === key ? 'text-[#00a84c] dark:text-[#00dc64]' : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>{label}</button>
                ))}
              </div>
            </div>

            {data.hiddenAdult > 0 && (
              <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                성인 작품 {data.hiddenAdult}개는 목록에서 제외했어요. 성인 인증 후 19 ON 상태에서 볼 수 있어요.
              </p>
            )}

            {works.length === 0 ? (
              <p className="mt-6 rounded-xl border border-dashed border-gray-300 py-16 text-center text-sm text-gray-500 dark:border-gray-700">보여 줄 작품이 없어요.</p>
            ) : (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {works.map((work) => {
                  const status = STATUS_LABEL[work.status || ''];
                  return (
                    <Link key={work.id} href={`/webtoons/${work.id}`} className="group">
                      <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-gray-200 dark:bg-gray-800">
                        <img src={getImageUrl(work.thumbnail || '', { width: 320 })} alt={work.title} loading="lazy" className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                        <span className="absolute left-1.5 top-1.5"><ComicBadges lastEpisodeAt={work.lastEpisodeAt} createdAt={work.createdAt} status={work.status} /></span>
                        {work.isAdult && <span className="absolute right-1.5 top-1.5 rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-black text-white">19</span>}
                      </div>
                      <p className="mt-1.5 line-clamp-2 text-sm font-bold">{localizeComicTitle(work, locale, work.title)}</p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400">
                        <span className="rounded bg-gray-100 px-1 py-px text-[10px] font-bold text-gray-600 dark:bg-white/10 dark:text-gray-300">{contentTypeLabel(work.contentType)}</span>
                        {status && <span className={`rounded px-1 py-px text-[10px] font-bold ${status.className}`}>{status.label}</span>}
                        <span>{localizeComicGenre(resolveComicGenre(work), locale, '')}</span>
                        <span>· {work.totalEpisodes}화</span>
                      </p>
                      {work.roles.some((role) => role !== '작가') && <p className="mt-0.5 text-[11px] text-gray-400">{work.roles.join('·')}</p>}
                    </Link>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
