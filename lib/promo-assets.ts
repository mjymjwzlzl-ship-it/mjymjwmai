import type { Locale } from '@/components/providers/LanguageProvider';

const supportedLocales = new Set(['ko', 'en', 'ja', 'fr']);

export function localizedPromoAsset(locale: Locale | string | undefined, filename: string, version?: string) {
  const safeLocale = locale && supportedLocales.has(locale) ? locale : 'ko';
  const assetPath = `/uploads/promo/i18n/${safeLocale}/${filename}`;
  return version ? `${assetPath}?v=${encodeURIComponent(version)}` : assetPath;
}
