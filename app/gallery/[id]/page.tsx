'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Coins, Loader2, Lock, X } from 'lucide-react';
import { api } from '@/lib/api';
import { getImageUrl } from '@/lib/config';
import { useLanguage, type Locale } from '@/components/providers/LanguageProvider';
import { useAdultStore } from '@/store/adult';

type PhotobookDetail = {
  id: string;
  photobookId?: string | null;
  workId?: string | null;
  name: string;
  assetCount?: number;
  previewCount?: number;
  contentRating?: string;
  requiredPlan?: string;
  coinPrice?: number;
  assets?: string[];
  access?: {
    allowed?: boolean;
    requiredPlan?: string;
  };
};

const detailText: Record<Locale, {
  back: string;
  photobook: string;
  preview: string;
  total: string;
  unlockTitle: string;
  unlockSub: string;
  buyWithCoins: string;
  openWithPlan: string;
  lockedCut: string;
  loadFail: string;
  notFound: string;
}> = {
  ko: {
    back: '뒤로',
    photobook: '화보',
    preview: '미리보기',
    total: '전체',
    unlockTitle: '전체 화보 잠금 해제',
    unlockSub: '코인으로 한 번 소장하면 전체 컷을 언제든 다시 볼 수 있습니다.',
    buyWithCoins: '코인으로 구매',
    openWithPlan: '요금제로 감상',
    lockedCut: '잠금 컷',
    loadFail: '화보를 불러오지 못했습니다.',
    notFound: '화보를 찾을 수 없습니다.',
  },
  en: {
    back: 'Back',
    photobook: 'Photobook',
    preview: 'Preview',
    total: 'Total',
    unlockTitle: 'Unlock the full photobook',
    unlockSub: 'Unlock once with coins to keep every cut.',
    buyWithCoins: 'Buy with coins',
    openWithPlan: 'View with plan',
    lockedCut: 'Locked cut',
    loadFail: 'Could not load this photobook.',
    notFound: 'Photobook not found.',
  },
  ja: {
    back: '戻る',
    photobook: '画報',
    preview: 'プレビュー',
    total: '全体',
    unlockTitle: '全画報のロック解除',
    unlockSub: 'コインで一度所蔵すると全カットをいつでも見られます。',
    buyWithCoins: 'コインで購入',
    openWithPlan: 'プランで見る',
    lockedCut: 'ロックカット',
    loadFail: '画報を読み込めませんでした。',
    notFound: '画報が見つかりません。',
  },
  fr: {
    back: 'Retour',
    photobook: 'Album',
    preview: 'Aperçu',
    total: 'Total',
    unlockTitle: 'Déverrouiller tout l’album',
    unlockSub: 'Débloquez-le une fois avec des pièces pour garder toutes les images.',
    buyWithCoins: 'Acheter avec des pièces',
    openWithPlan: 'Voir avec l’abonnement',
    lockedCut: 'Image verrouillée',
    loadFail: 'Impossible de charger cet album.',
    notFound: 'Album introuvable.',
  },
};

const albumTitle: Record<string, Record<Locale, string>> = {
  'red-dragon-summer-2026': {
    ko: '레드드래곤 · 여름 합숙',
    en: 'Red Dragon · Summer Camp',
    ja: 'レッドドラゴン · 夏合宿',
    fr: 'Red Dragon · Camp d’été',
  },
};

function getAlbumName(item: PhotobookDetail, locale: Locale) {
  return item.photobookId ? albumTitle[item.photobookId]?.[locale] || item.name : item.name;
}

export default function PhotobookPage() {
  const params = useParams();
  const router = useRouter();
  const { locale } = useLanguage();
  const text = detailText[locale];
  const id = String(params.id);
  const adultMode = useAdultStore((state) => state.adult) === 'on';
  const [item, setItem] = useState<PhotobookDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);
  const [message, setMessage] = useState('');
  const [lightbox, setLightbox] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setMessage('');
    try {
      const response = await api.get(`/content-items/${id}`, { params: { adultMode } });
      const nextItem = response.data?.content || null;
      setItem(nextItem);
    } catch (error: any) {
      setMessage(error.response?.data?.message || text.loadFail);
    } finally {
      setLoading(false);
    }
  }, [adultMode, id, text.loadFail]);

  useEffect(() => {
    void load();
  }, [load]);

  const unlock = async () => {
    if (!(localStorage.getItem('authToken') || localStorage.getItem('token'))) {
      router.push(`/login?redirect=${encodeURIComponent(`/gallery/${id}`)}`);
      return;
    }
    setBuying(true);
    try {
      await api.post(`/contents/${id}/unlock`, { contentType: 'PHOTOBOOK' });
      await load();
    } catch (error: any) {
      setMessage(error.response?.data?.message || text.loadFail);
    } finally {
      setBuying(false);
    }
  };

  const lockedSlots = useMemo(() => {
    if (!item || item.access?.allowed) return 0;
    const visible = item.assets?.length || 0;
    return Math.max(0, (item.assetCount || 0) - visible);
  }, [item]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#00dc64]" />
      </div>
    );
  }

  if (!item) {
    return <div className="mx-auto max-w-xl px-4 py-20 text-center text-red-500">{message || text.notFound}</div>;
  }

  const name = getAlbumName(item, locale);
  const assets = item.assets || [];

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <button
        onClick={() => router.back()}
        className="flex min-h-10 items-center gap-2 text-sm font-black text-gray-500 hover:text-[#00b854]"
      >
        <ArrowLeft className="h-4 w-4" />
        {text.back}
      </button>

      <header className="mt-3 border-b border-gray-200 pb-5 dark:border-gray-800">
        <p className="text-xs font-black uppercase text-[#00b854]">
          {text.photobook} · {item.contentRating || 'GENERAL'}
        </p>
        <h1 className="mt-1 text-3xl font-black text-gray-950 dark:text-white">{name}</h1>
        <p className="mt-2 text-sm font-semibold text-gray-500">
          {text.total} {item.assetCount || assets.length} · {text.preview} {item.previewCount || assets.length}
        </p>
      </header>

      {message && <p className="mt-4 rounded-lg bg-red-500/10 px-4 py-3 text-sm font-bold text-red-500">{message}</p>}

      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {assets.map((asset, index) => (
          <button
            type="button"
            key={`${asset}-${index}`}
            onClick={() => setLightbox(asset)}
            className="group overflow-hidden rounded-lg border border-gray-200 bg-gray-100 text-left dark:border-gray-800 dark:bg-[#181818]"
          >
            <img
              src={getImageUrl(asset, { width: 900 })}
              alt={`${name} ${index + 1}`}
              className="aspect-square h-auto w-full object-cover transition duration-300 group-hover:scale-[1.02]"
            />
          </button>
        ))}
        {Array.from({ length: Math.min(lockedSlots, 12) }).map((_, index) => (
          <div
            key={`locked-${index}`}
            className="flex aspect-square items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-100 dark:border-gray-700 dark:bg-[#181818]"
          >
            <div className="text-center">
              <Lock className="mx-auto h-7 w-7 text-gray-400" />
              <p className="mt-2 text-sm font-black text-gray-500">
                {text.lockedCut} {assets.length + index + 1}
              </p>
            </div>
          </div>
        ))}
      </section>

      {!item.access?.allowed && (
        <section className="sticky bottom-4 mx-auto mt-7 max-w-xl rounded-lg border border-[#00dc64]/40 bg-white/95 p-5 text-center shadow-2xl backdrop-blur dark:bg-[#191919]/95">
          <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-[#00dc64]/15">
            <Lock className="h-5 w-5 text-[#00b854]" />
          </span>
          <h2 className="mt-3 text-lg font-black">{text.unlockTitle}</h2>
          <p className="mt-1 text-sm leading-6 text-gray-500">{text.unlockSub}</p>
          <div className="mt-4 grid gap-2">
            <button
              disabled={buying}
              onClick={() => void unlock()}
              className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#00dc64] px-3 font-black text-black disabled:opacity-60"
            >
              {buying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Coins className="h-4 w-4" />}
              {item.coinPrice || 0} {text.buyWithCoins}
            </button>
          </div>
        </section>
      )}

      {lightbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/88 p-4" onClick={() => setLightbox(null)}>
          <button
            type="button"
            aria-label="Close"
            onClick={() => setLightbox(null)}
            className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white"
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={getImageUrl(lightbox, { width: 1400 })}
            alt={name}
            className="max-h-[92vh] max-w-full rounded-lg object-contain"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}
    </main>
  );
}
