'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Camera, Image as ImageIcon, Loader2, Lock, Sparkles } from 'lucide-react';
import { api } from '@/lib/api';
import { getImageUrl } from '@/lib/config';
import { localizeComicTitle } from '@/lib/comic-localization';
import { useLanguage, type Locale } from '@/components/providers/LanguageProvider';
import { useAdultStore } from '@/store/adult';

type PhotobookItem = {
  id: string;
  photobookId?: string | null;
  workId?: string | null;
  name: string;
  thumbnail?: string | null;
  assetCount?: number;
  previewCount?: number;
  coinPrice?: number;
  productTags?: string[];
  access?: {
    allowed?: boolean;
    requiredPlan?: string;
  };
};

const albumCopy: Record<string, Record<Locale, { title: string; description: string; theme: string }>> = {
  'red-dragon-summer-2026': {
    ko: {
      title: '레드드래곤 · 여름 합숙',
      description: '고교전설 레드드래곤 주역들의 해변 합숙과 여름 휴가를 담은 한정 화보.',
      theme: '해변 콘셉트',
    },
    en: {
      title: 'Red Dragon · Summer Camp',
      description: 'A limited beach and summer retreat photobook starring the Red Dragon main cast.',
      theme: 'Beach Concept',
    },
    ja: {
      title: 'レッドドラゴン · 夏合宿',
      description: 'レッドドラゴンの主要キャラクターたちの海辺合宿と夏休みを収めた限定フォトブック。',
      theme: 'ビーチコンセプト',
    },
    fr: {
      title: 'Red Dragon · Camp d’été',
      description: 'Un album limité autour du camp d’été à la plage des personnages principaux de Red Dragon.',
      theme: 'Concept plage',
    },
  },
};

const galleryText: Record<Locale, {
  eyebrow: string;
  title: string;
  subtitle: string;
  emptyTitle: string;
  emptySub: string;
  cuts: string;
  preview: string;
  included: string;
}> = {
  ko: {
    eyebrow: 'ARATA PHOTOBOOK',
    title: '캐릭터 화보관',
    subtitle: '작품별 캐릭터를 해변, 화보, 이벤트 콘셉트로 모은 전용 갤러리입니다.',
    emptyTitle: '공개된 화보가 아직 없습니다.',
    emptySub: '생성한 화보를 등록하면 여기에 바로 표시됩니다.',
    cuts: '컷',
    preview: '미리보기',
    included: '수록',
  },
  en: {
    eyebrow: 'ARATA PHOTOBOOK',
    title: 'Character Gallery',
    subtitle: 'A dedicated gallery for beach, editorial, and event concept images by title.',
    emptyTitle: 'No photobooks are available yet.',
    emptySub: 'Generated photobooks will appear here as soon as they are registered.',
    cuts: 'cuts',
    preview: 'preview',
    included: 'included',
  },
  ja: {
    eyebrow: 'ARATA PHOTOBOOK',
    title: 'キャラクター画報館',
    subtitle: '作品別キャラクターをビーチ、グラビア、イベントコンセプトで集めた専用ギャラリーです。',
    emptyTitle: '公開中の画報はまだありません。',
    emptySub: '生成した画報を登録するとここに表示されます。',
    cuts: '枚',
    preview: 'プレビュー',
    included: '収録',
  },
  fr: {
    eyebrow: 'ARATA PHOTOBOOK',
    title: 'Galerie personnages',
    subtitle: 'Une galerie dédiée aux concepts plage, magazine et événement par œuvre.',
    emptyTitle: 'Aucun album disponible pour le moment.',
    emptySub: 'Les albums générés apparaîtront ici dès leur enregistrement.',
    cuts: 'images',
    preview: 'aperçu',
    included: 'incluses',
  },
};

const workTitleFallback: Record<string, Record<Locale, string>> = {
  cmhd1wrdp0000dtqp2vqkumzx: {
    ko: '고교전설 레드드래곤',
    en: 'High School Legend: Red Dragon',
    ja: '高校伝説 レッドドラゴン',
    fr: 'Légende du lycée : Red Dragon',
  },
};

function localizeAlbum(item: PhotobookItem, locale: Locale) {
  const known = item.photobookId ? albumCopy[item.photobookId]?.[locale] : null;
  if (known) return known;
  return {
    title: item.name,
    description: galleryText[locale].subtitle,
    theme: galleryText[locale].preview,
  };
}

function localizeWork(item: PhotobookItem, locale: Locale) {
  if (item.workId && workTitleFallback[item.workId]?.[locale]) {
    return workTitleFallback[item.workId][locale];
  }
  return localizeComicTitle({ id: item.workId }, locale, '');
}

export default function PhotobookGalleryClient() {
  const { locale } = useLanguage();
  const adultMode = useAdultStore((state) => state.adult) === 'on';
  const text = galleryText[locale];
  const [items, setItems] = useState<PhotobookItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const workId = new URLSearchParams(window.location.search).get('workId');
    setLoading(true);
    setMessage('');
    api
      .get('/content-items', {
        params: { contentType: 'PHOTOBOOK', adultMode, workId: workId || undefined },
      })
      .then((response) => setItems(response.data?.content || []))
      .catch((error) => setMessage(error.response?.data?.message || text.emptyTitle))
      .finally(() => setLoading(false));
  }, [adultMode, text.emptyTitle]);

  const featured = useMemo(() => items[0], [items]);
  const launchBannerSrc = `/images/promo/i18n/${locale}/arata-launch-promo-banner-v4.png`;

  return (
    <main className="min-h-screen bg-gray-50 pb-12 text-gray-950 transition-colors dark:bg-[#111] dark:text-white">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
        <section className="mb-6 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-[#191919]">
          <div className="relative flex min-h-[280px] items-center justify-center bg-[#050b14] p-4 sm:min-h-[360px]">
            <img
              src={launchBannerSrc}
              alt={text.title}
              className="relative z-10 max-h-[520px] w-auto max-w-full rounded-lg object-contain shadow-2xl"
              onError={(event) => {
                event.currentTarget.src = '/images/promo/arata-launch-promo-banner-v4.png';
              }}
            />
            {featured?.thumbnail && (
              <img
                src={getImageUrl(featured.thumbnail, { width: 1400 })}
                alt=""
                className="absolute inset-0 h-full w-full object-cover opacity-20 blur-sm"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/50" />
          </div>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-[#191919] sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-black text-[#00b854]">{text.eyebrow}</p>
              <h2 className="mt-1 text-xl font-black sm:text-2xl">{text.title}</h2>
            </div>
            <Camera className="h-7 w-7 text-[#00dc64]" />
          </div>

          {loading ? (
            <div className="flex min-h-72 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-[#00dc64]" />
            </div>
          ) : message ? (
            <p className="py-16 text-center text-sm font-bold text-red-500">{message}</p>
          ) : items.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 py-16 text-center dark:border-gray-700">
              <Sparkles className="mx-auto h-8 w-8 text-gray-400" />
              <p className="mt-3 font-black text-gray-700 dark:text-gray-200">{text.emptyTitle}</p>
              <p className="mt-1 text-sm text-gray-500">{text.emptySub}</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => {
                const album = localizeAlbum(item, locale);
                const workTitle = localizeWork(item, locale);
                const isLocked = !item.access?.allowed;
                return (
                  <Link
                    key={item.id}
                    href={`/gallery/${item.id}`}
                    className="group overflow-hidden rounded-lg border border-gray-200 bg-gray-50 transition hover:-translate-y-0.5 hover:border-[#00c85a] hover:shadow-lg dark:border-gray-800 dark:bg-[#121212]"
                  >
                    <div className="relative aspect-[16/10] overflow-hidden bg-gray-200 dark:bg-gray-800">
                      {item.thumbnail ? (
                        <img
                          src={getImageUrl(item.thumbnail, { width: 900 })}
                          alt={album.title}
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <ImageIcon className="h-10 w-10 text-gray-400" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/82 via-black/10 to-transparent" />
                      {isLocked && (
                        <span className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/65 text-white">
                          <Lock className="h-4 w-4" />
                        </span>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                        <p className="mb-2 inline-flex rounded bg-[#00dc64] px-2 py-1 text-[11px] font-black text-black">
                          {album.theme}
                        </p>
                        <h3 className="text-xl font-black leading-tight">{album.title}</h3>
                      </div>
                    </div>
                    <div className="p-4">
                      {workTitle && <p className="text-sm font-bold text-gray-700 dark:text-gray-300">{workTitle}</p>}
                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-gray-500 dark:text-gray-400">{album.description}</p>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs font-black">
                        <span className="rounded border border-gray-300 px-2 py-1 dark:border-gray-700">
                          {text.included} {item.assetCount || 0} {text.cuts}
                        </span>
                        <span className="rounded border border-gray-300 px-2 py-1 dark:border-gray-700">
                          {text.preview} {item.previewCount || 0}
                        </span>
                        {isLocked && (
                          <span className="rounded border border-[#00dc64]/50 px-2 py-1 text-[#00a84c] dark:text-[#00dc64]">
                            {item.coinPrice || 0} coin
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
