'use client';

import { Heart } from 'lucide-react';
import { useLanguage, type Locale } from '@/components/providers/LanguageProvider';

type LocalizedText = Record<Locale, string>;
const localized = (ko: string, en: string, ja: string, fr: string): LocalizedText => ({ ko, en, ja, fr });

const galleryCopy = {
  description: localized(
    '웹툰 속 주인공들의 비밀스러운 모습을 만나보세요. 오직 아라타 화보관에서만 공개됩니다.',
    'Discover exclusive portraits of your favorite webtoon characters, only in the ARATA Gallery.',
    'ウェブトゥーンの主人公たちの特別な姿を、ARATAギャラリー限定でお楽しみください。',
    'Découvrez des portraits exclusifs de vos personnages préférés, uniquement dans la galerie ARATA.',
  ),
  popular: localized('인기 캐릭터 화보', 'Popular Character Portraits', '人気キャラクターギャラリー', 'Portraits de personnages populaires'),
};

const galleryItems = [
  {
    name: localized('유나', 'Yuna', 'ユナ', 'Yuna'),
    subtitle: localized('나의 위험한 소악마', 'My Dangerous Little Devil', '私の危険な小悪魔', 'Mon dangereux petit démon'),
    count: localized('화보 2개', '2 portraits', 'ギャラリー2点', '2 portraits'),
    image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=900&auto=format&fit=crop',
  },
  {
    name: localized('미소', 'Miso', 'ミソ', 'Miso'),
    subtitle: localized('음란한 헤어트리스', 'The Seductive Hairtrice', '魅惑のヘアトリス', 'La séduisante Hairtrice'),
    count: localized('화보 1개', '1 portrait', 'ギャラリー1点', '1 portrait'),
    image: 'https://images.unsplash.com/photo-1507146426996-ef05306b995a?q=80&w=900&auto=format&fit=crop',
  },
  {
    name: localized('지원', 'Jiwon', 'ジウォン', 'Jiwon'),
    subtitle: localized('동네 누나', 'The Girl Next Door', '近所のお姉さん', 'La voisine'),
    count: localized('화보 2개', '2 portraits', 'ギャラリー2点', '2 portraits'),
    image: 'https://images.unsplash.com/photo-1448375240586-882707db888b?q=80&w=900&auto=format&fit=crop',
  },
];

export default function GalleryPage() {
  const { locale } = useLanguage();

  return (
    <div className="min-h-screen bg-gray-50 transition-colors dark:bg-[#141414]">
      <div className="mx-auto max-w-7xl px-4 py-6">
        <section className="relative mb-6 flex h-[240px] items-center justify-center overflow-hidden rounded-xl bg-gray-900 text-center shadow-sm md:h-[300px]">
          <img
            src="https://images.unsplash.com/photo-1454496522488-7a8e488e8606?q=80&w=1600&auto=format&fit=crop"
            alt="Secret gallery"
            className="absolute inset-0 h-full w-full object-cover opacity-55"
          />
          <div className="absolute inset-0 bg-black/35" />
          <div className="relative z-10 px-4">
            <h1 className="text-3xl font-black tracking-tight text-white md:text-4xl">SECRET GALLERY</h1>
            <p className="mt-3 text-sm font-bold leading-relaxed text-white/90 md:text-base">
              {galleryCopy.description[locale]}
            </p>
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-[#1b1b1b]">
          <div className="hidden">
            <div className="h-7 w-1 rounded-full bg-[#00dc64]" />
            <h2 className="text-2xl font-black text-gray-950 dark:text-white">{galleryCopy.popular[locale]}</h2>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {galleryItems.map((item) => (
              <article key={item.name.ko} className="group relative aspect-[2/3] overflow-hidden rounded-lg bg-gray-200 shadow-lg">
                <img src={item.image} alt={item.name[locale]} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/88 via-black/15 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <p className="mb-2 text-xs font-black text-[#00dc64]">{item.subtitle[locale]}</p>
                  <h3 className="text-2xl font-black text-white">{item.name[locale]}</h3>
                  <p className="mt-2 inline-flex items-center gap-1 text-sm font-bold text-white">
                    <Heart className="h-4 w-4 fill-pink-500 text-pink-500" />
                    {item.count[locale]}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
