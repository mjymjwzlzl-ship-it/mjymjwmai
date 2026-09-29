'use client';

import { useEffect, useState } from 'react';
import { Clock3, Heart, Search } from 'lucide-react';
import { useLanguage, type Locale } from '@/components/providers/LanguageProvider';

type LocalizedText = Record<Locale, string>;
const localized = (ko: string, en: string, ja: string, fr: string): LocalizedText => ({ ko, en, ja, fr });
const categories = [
  { value: 'all', labelKey: 'category.all' },
  { value: 'new', labelKey: 'category.new' },
  { value: 'ranking', labelKey: 'category.ranking' },
  { value: 'fantasy', labelKey: 'category.fantasy' },
  { value: 'martial', labelKey: 'category.martial' },
  { value: 'romance', labelKey: 'category.romance' },
  { value: 'modern', labelKey: 'category.modern' },
  { value: 'lightNovel', labelKey: 'category.lightNovel' },
  { value: 'bl', labelKey: 'BL' },
  { value: 'gl', labelKey: 'GL' },
];

const demoNovels = [
  {
    title: localized('재벌집 막내아들 [독점]', 'Reborn Rich [Exclusive]', '財閥家の末息子［独占］', 'Le plus jeune fils du conglomérat [Exclusivité]'),
    description: localized('재벌가 비서에서 막내아들로 회귀하다! 미래의 기억을 이용한 복수극.', 'A former secretary is reborn as the youngest son of a conglomerate family and uses his memories of the future to seek revenge.', '財閥家の秘書から末息子へと回帰し、未来の記憶を武器に復讐を始める。', 'Un ancien secrétaire renaît comme le benjamin d’une famille de conglomérat et utilise ses souvenirs du futur pour se venger.'),
    image: 'https://images.unsplash.com/photo-1470115636492-6d2b56f9146d?q=80&w=700&auto=format&fit=crop',
    time: '12:00',
    likes: 540,
    categories: ['modern'],
    tags: [localized('현대판타지', 'Modern Fantasy', '現代ファンタジー', 'Fantasy moderne'), localized('회귀', 'Regression', '回帰', 'Régression'), localized('복수', 'Revenge', '復讐', 'Vengeance'), localized('재벌', 'Conglomerate', '財閥', 'Conglomérat')],
  },
  {
    title: localized('전지적 독자 시점', "Omniscient Reader's Viewpoint", '全知的な読者の視点', 'Le point de vue du lecteur omniscient'),
    description: localized('소설의 결말을 아는 유일한 독자가 멸망한 세상에서 살아남는다.', 'The only reader who knows how the story ends must survive in a world that has become the novel itself.', '物語の結末を知る唯一の読者が、現実となった終末世界を生き抜く。', 'Le seul lecteur à connaître la fin du récit doit survivre dans un monde devenu le roman lui-même.'),
    image: 'https://images.unsplash.com/photo-1448375240586-882707db888b?q=80&w=700&auto=format&fit=crop',
    time: '11:45',
    likes: 1200,
    categories: ['fantasy'],
    tags: [localized('판타지', 'Fantasy', 'ファンタジー', 'Fantasy'), localized('성좌', 'Constellations', '星座', 'Constellations'), localized('아포칼립스', 'Apocalypse', 'アポカリプス', 'Apocalypse')],
  },
  {
    title: localized('나 혼자만 레벨업', 'Solo Leveling', '俺だけレベルアップな件', 'Solo Leveling'),
    description: localized('E급 헌터 성진우가 기이한 능력을 얻고 혼자서만 레벨업을 시작한다.', 'E-rank hunter Sung Jin-woo gains a mysterious ability that lets only him level up.', 'E級ハンターのソン・ジヌは、ただ一人レベルアップできる謎の力を手に入れる。', 'Le chasseur de rang E Sung Jin-woo obtient un pouvoir mystérieux qui lui permet d’être le seul à progresser.'),
    image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=700&auto=format&fit=crop',
    time: '11:30',
    likes: 2400,
    categories: ['fantasy'],
    tags: [localized('헌터', 'Hunter', 'ハンター', 'Chasseur'), localized('성장', 'Growth', '成長', 'Progression'), localized('먼치킨', 'Overpowered', '最強', 'Surpuissant')],
  },
  {
    title: localized('달빛 조각사', 'The Legendary Moonlight Sculptor', '月光彫刻師', 'Le sculpteur légendaire au clair de lune'),
    description: localized('가난에서 벗어나려 게임을 시작한 주인공이 조각술로 전설의 직업을 얻는다.', 'A player seeking a way out of poverty earns a legendary profession through persistence and sculpting.', '貧困から抜け出すためゲームを始め、根性と彫刻術で伝説の職業を手に入れる。', 'Un joueur voulant échapper à la pauvreté obtient une profession légendaire grâce à sa ténacité et à la sculpture.'),
    image: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?q=80&w=700&auto=format&fit=crop',
    time: '11:00',
    likes: 340,
    categories: ['fantasy'],
    tags: [localized('게임판타지', 'Game Fantasy', 'ゲームファンタジー', 'Fantasy de jeu'), localized('노가다', 'Grinding', 'やり込み', 'Progression'), localized('전설', 'Legend', '伝説', 'Légende')],
  },
  {
    title: localized('화산귀환', 'Return of the Mount Hua Sect', '華山帰還', 'Le retour de la secte du mont Hua'),
    description: localized('청명이 백 년 뒤 아이로 환생해 몰락한 화산파를 다시 일으킨다.', 'Cheongmyeong is reborn a century later and sets out to restore the fallen Mount Hua Sect.', 'チョンミョンは百年後の少年に転生し、没落した華山派の再建を目指す。', 'Cheongmyeong renaît un siècle plus tard et entreprend de restaurer la secte déchue du mont Hua.'),
    image: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=700&auto=format&fit=crop',
    time: '10:55',
    likes: 3100,
    categories: ['martial'],
    tags: [localized('무협', 'Martial Arts', '武侠', 'Arts martiaux'), localized('환생', 'Reincarnation', '転生', 'Réincarnation'), localized('개그', 'Comedy', 'ギャグ', 'Comédie')],
  },
];

const novels = process.env.NODE_ENV === 'production' ? [] : demoNovels;

export default function NovelPage() {
  const { locale, t } = useLanguage();
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const applyCategory = (queryCategory: string) => {
      setActiveCategory(categories.some((category) => category.value === queryCategory) ? queryCategory : 'all');
    };
    const syncFromLocation = () => {
      applyCategory(new URLSearchParams(window.location.search).get('category') || 'all');
    };
    const handleCategoryChange = (event: Event) => {
      applyCategory((event as CustomEvent<string>).detail || 'all');
    };

    syncFromLocation();
    window.addEventListener('popstate', syncFromLocation);
    window.addEventListener('arata-content-category-change', handleCategoryChange);
    return () => {
      window.removeEventListener('popstate', syncFromLocation);
      window.removeEventListener('arata-content-category-change', handleCategoryChange);
    };
  }, []);

  const filtered = novels.filter((novel) => {
    const categoryOk =
      activeCategory === 'all' ||
      activeCategory === 'new' ||
      activeCategory === 'ranking' ||
      novel.categories.includes(activeCategory);
    const localizedTitle = novel.title[locale];
    const localizedDescription = novel.description[locale];
    const searchOk = !searchQuery || localizedTitle.toLowerCase().includes(searchQuery.toLowerCase()) || localizedDescription.toLowerCase().includes(searchQuery.toLowerCase());
    return categoryOk && searchOk;
  });
  const visibleNovels = activeCategory === 'ranking'
    ? [...filtered].sort((left, right) => right.likes - left.likes)
    : filtered;

  return (
    <div className="min-h-screen bg-gray-50 transition-colors dark:bg-[#141414]">
      <div className="mx-auto max-w-7xl px-3 py-3 sm:px-4 sm:py-6">
        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-800 dark:bg-[#1b1b1b]">
          <div className="hidden">
            <h1 className="text-2xl font-black text-gray-950 dark:text-white">{t('novel.popular')}</h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{t('novel.popularSub')}</p>
          </div>

          <div className="border-b border-gray-200 bg-gray-100 p-4 dark:border-gray-800 dark:bg-[#202020]">
            <div className="relative mb-3">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                aria-label={t('novel.searchPlaceholder')}
                type="search"
                enterKeyHint="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={t('novel.searchPlaceholder')}
                className="h-11 w-full rounded-lg border border-gray-200 bg-white pl-11 pr-4 text-sm outline-none focus:border-[#00dc64] dark:border-gray-700 dark:bg-[#151515] dark:text-white"
              />
            </div>
          </div>

          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {visibleNovels.map((novel) => (
              <article key={novel.title.ko} className="flex min-w-0 gap-3 p-3 sm:gap-4 sm:p-4">
                <div className="relative aspect-[16/9] w-[38%] shrink-0 self-start overflow-hidden rounded-md bg-gray-200 sm:h-[118px] sm:w-[220px]">
                  <img src={novel.image} alt={novel.title[locale]} className="h-full w-full object-cover" loading="lazy" />
                  <button className="absolute right-2 top-2 rounded-full bg-black/35 p-1.5 text-white">
                    <Heart className="h-4 w-4" />
                  </button>
                </div>
                <div className="min-w-0 flex-1 py-1">
                  <h2 className="line-clamp-2 break-words text-sm font-black text-gray-950 sm:text-lg dark:text-white">{novel.title[locale]}</h2>
                  <p className="mt-1 line-clamp-2 text-sm text-gray-600 dark:text-gray-400">{novel.description[locale]}</p>
                  <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                    <span className="inline-flex items-center gap-1 text-red-500">
                      <Clock3 className="h-3.5 w-3.5" />
                      {novel.time}
                    </span>
                    <span>♡ {novel.likes}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1 sm:mt-4 sm:gap-2">
                    {novel.tags.map((tag) => (
                      <span key={tag.ko} className="rounded border border-gray-200 px-2 py-1 text-xs text-gray-500 dark:border-gray-700">
                        {tag[locale]}
                      </span>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>

          {/* 동작하지 않던 1·2·3 페이지 버튼 대신, 작품이 없을 때 안내 */}
          {visibleNovels.length === 0 && (
            <div className="px-6 py-16 text-center">
              <p className="font-bold text-gray-600 dark:text-gray-300">아직 공개된 웹소설이 없습니다.</p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">연재가 시작되면 이곳에서 볼 수 있어요.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
