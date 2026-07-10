'use client';

import { useState } from 'react';
import { ArrowRight, Clock3, Crown, Heart, Search } from 'lucide-react';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { localizedPromoAsset } from '@/lib/promo-assets';

const categories = [
  { value: '전체', labelKey: 'category.all' },
  { value: '판타지', labelKey: 'category.fantasy' },
  { value: '무협', labelKey: 'category.martial' },
  { value: '로맨스', labelKey: 'category.romance' },
  { value: '현대물', labelKey: 'category.modern' },
  { value: '라이트노벨', labelKey: 'category.lightNovel' },
  { value: 'BL', labelKey: 'BL' },
  { value: 'GL', labelKey: 'GL' },
];

const novels = [
  {
    title: '재벌집 막내아들 [독점]',
    description: '재벌가 비서에서 막내아들로 회귀하다! 미래의 기억을 이용해 손안그룹을 집어삼키려는 운현우의 복수극.',
    image: 'https://images.unsplash.com/photo-1470115636492-6d2b56f9146d?q=80&w=700&auto=format&fit=crop',
    time: '12:00',
    likes: 540,
    tags: ['현대판타지', '회귀', '복수', '재벌'],
  },
  {
    title: '전지적 독자 시점',
    description: '10년 동안 연재된 소설의 결말을 아는 유일한 독자. 멸망한 세상에서 소설의 내용을 이용해 살아남아라!',
    image: 'https://images.unsplash.com/photo-1448375240586-882707db888b?q=80&w=700&auto=format&fit=crop',
    time: '11:45',
    likes: 1200,
    tags: ['판타지', '성좌', '아포칼립스'],
  },
  {
    title: '나 혼자만 레벨업',
    description: '인류 최약병기 E급 헌터 성진우. 죽음의 위기에서 얻은 기이한 능력으로 혼자서만 레벨업을 시작한다.',
    image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=700&auto=format&fit=crop',
    time: '11:30',
    likes: 2400,
    tags: ['헌터', '성장', '먼치킨'],
  },
  {
    title: '달빛 조각사',
    description: '가난에서 벗어나기 위해 게임을 시작했다. 노가다로 다져진 근성과 조각술로 전설의 직업을 얻게 되는데...',
    image: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?q=80&w=700&auto=format&fit=crop',
    time: '11:00',
    likes: 340,
    tags: ['게임판타지', '노가다', '전설'],
  },
  {
    title: '화산귀환',
    description: '대화산파 13대 제자 청명. 천마의 목을 치고 백 년 뒤의 아이로 환생했다. 망해버린 화산파를 다시 일으켜 세워라!',
    image: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=700&auto=format&fit=crop',
    time: '10:55',
    likes: 3100,
    tags: ['무협', '환생', '개그'],
  },
];

export default function NovelPage() {
  const { locale, t } = useLanguage();
  const [activeCategory, setActiveCategory] = useState('전체');
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = novels.filter((novel) => {
    const categoryOk = activeCategory === '전체' || novel.tags.includes(activeCategory);
    const searchOk = !searchQuery || novel.title.includes(searchQuery) || novel.description.includes(searchQuery);
    return categoryOk && searchOk;
  });

  return (
    <div className="min-h-screen bg-gray-50 transition-colors dark:bg-[#141414]">
      <div className="mx-auto max-w-7xl px-4 py-6">
        <a
          href="/register"
          className="mb-6 block overflow-hidden rounded-xl border border-[#00dc64]/20 bg-[#f0fff6] shadow-sm transition hover:shadow-lg dark:border-[#00dc64]/25 dark:bg-[#112018]"
        >
          <img
            src={localizedPromoAsset(locale, 'arata-novel-founder-banner.webp')}
            alt=""
            className="block w-full"
            loading="eager"
          />
        </a>

        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-800 dark:bg-[#1b1b1b]">
          <div className="hidden">
            <h1 className="text-2xl font-black text-gray-950 dark:text-white">{t('novel.popular')}</h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{t('novel.popularSub')}</p>
          </div>

          <div className="border-b border-gray-200 bg-gray-100 p-4 dark:border-gray-800 dark:bg-[#202020]">
            <div className="relative mb-3">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={t('novel.searchPlaceholder')}
                className="h-11 w-full rounded-lg border border-gray-200 bg-white pl-11 pr-4 text-sm outline-none focus:border-[#00dc64] dark:border-gray-700 dark:bg-[#151515] dark:text-white"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {categories.map((category) => (
                <button
                  key={category.value}
                  onClick={() => setActiveCategory(category.value)}
                  className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-black transition ${
                    activeCategory === category.value
                      ? 'bg-[#00dc64] text-black'
                      : 'border border-gray-200 bg-white text-gray-600 hover:text-[#00a84c] dark:border-gray-700 dark:bg-[#151515] dark:text-gray-400'
                  }`}
                >
                  {t(category.labelKey)}
                </button>
              ))}
            </div>
          </div>

          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {filtered.map((novel) => (
              <article key={novel.title} className="flex gap-4 p-4">
                <div className="relative h-[118px] w-[220px] shrink-0 overflow-hidden rounded-md bg-gray-200 max-sm:h-[96px] max-sm:w-[132px]">
                  <img src={novel.image} alt={novel.title} className="h-full w-full object-cover" />
                  <button className="absolute right-2 top-2 rounded-full bg-black/35 p-1.5 text-white">
                    <Heart className="h-4 w-4" />
                  </button>
                </div>
                <div className="min-w-0 flex-1 py-1">
                  <h2 className="line-clamp-1 text-lg font-black text-gray-950 dark:text-white">{novel.title}</h2>
                  <p className="mt-1 line-clamp-2 text-sm text-gray-600 dark:text-gray-400">{novel.description}</p>
                  <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                    <span className="inline-flex items-center gap-1 text-red-500">
                      <Clock3 className="h-3.5 w-3.5" />
                      {novel.time}
                    </span>
                    <span>♡ {novel.likes}</span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {novel.tags.map((tag) => (
                      <span key={tag} className="rounded border border-gray-200 px-2 py-1 text-xs text-gray-500 dark:border-gray-700">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="flex justify-center gap-2 p-7">
            {[1, 2, 3].map((page) => (
              <button key={page} className={`h-8 w-8 rounded-md text-sm font-black ${page === 1 ? 'border border-[#00dc64] text-[#00a84c]' : 'border border-gray-200 text-gray-500'}`}>
                {page}
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
