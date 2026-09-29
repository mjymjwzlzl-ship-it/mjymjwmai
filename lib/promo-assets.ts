import type { Locale } from '@/components/providers/LanguageProvider';

const supportedLocales = new Set(['ko', 'en', 'ja', 'fr']);
const defaultPromoAssetVersion = 'bundled-promo-20260905';

export function localizedPromoAsset(locale: Locale | string | undefined, filename: string, version?: string) {
  const safeLocale = locale && supportedLocales.has(locale) ? locale : 'ko';
  const assetPath = `/images/promo/i18n/${safeLocale}/${filename}`;
  return `${assetPath}?v=${encodeURIComponent(version || defaultPromoAssetVersion)}`;
}
