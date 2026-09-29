'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useLanguage } from '@/components/providers/LanguageProvider';

/** Legacy membership content is opt-in; catalogue pages show only the app promotion. */
export default function SubscriptionBannerLayout({ children }: { children?: ReactNode }) {
  const { t } = useLanguage();

  return (
    <section data-testid="subscription-banners" className="mb-4 flex w-full min-w-0 flex-col gap-3 md:mb-6 md:gap-4">
      {children && <div data-promotion="membership" className="w-full min-w-0">{children}</div>}
      <Link
        href="/download"
        data-promotion="app-download"
        className="group relative isolate block w-full min-w-0 overflow-hidden rounded-2xl border border-emerald-800/60 bg-[#031712] shadow-sm transition-colors hover:border-[#00dc64]/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#00dc64]"
      >
        <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 w-[56%] sm:w-[50%]">
          <img
            src="/images/promo/app-download-characters-cel-v1.webp"
            alt=""
            width={1536}
            height={1024}
            decoding="async"
            className="h-full w-full object-contain object-right-bottom sm:object-cover sm:object-center"
          />
          <div className="absolute inset-y-0 left-0 w-[20%] bg-gradient-to-r from-[#031712] to-transparent" />
        </div>
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-r from-emerald-400/5 via-transparent to-transparent" />
        <div className="relative z-10 flex min-h-[208px] items-center px-4 py-5 sm:min-h-[224px] sm:px-7 md:px-9">
          <div className="w-[60%] min-w-0 sm:w-[58%]">
            <span className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-[#00dc64]/30 bg-[#00dc64]/10 px-2.5 py-1 text-[9px] font-black tracking-[0.12em] text-[#61f5a5] sm:text-[10px]">
              <span className="h-1 w-1 rounded-full bg-[#00dc64]" />APP ONLY
            </span>
            <h3 className="text-lg font-black leading-[1.25] tracking-tight text-white min-[375px]:text-xl sm:text-2xl md:text-[28px]">
              {t('subscription.fullEdition')}
              <span className="mt-0.5 block text-[#00dc64]">{t('subscription.appDownload')}</span>
            </h3>
            <p className="mt-2 max-w-[28rem] text-[11px] leading-relaxed text-emerald-100/75 sm:text-xs md:text-sm">{t('subscription.appDescription')}</p>
            <span className="mt-4 inline-flex min-h-11 max-w-full items-center justify-center gap-2 rounded-full bg-[#00dc64] px-4 py-2.5 text-xs font-black leading-snug text-[#002613] transition-colors group-hover:bg-[#46ed90] sm:px-5 sm:text-sm">
              <span>{t('subscription.appDownload')}</span>
              <ArrowRight className="h-4 w-4 shrink-0" strokeWidth={2.5} />
            </span>
          </div>
        </div>
      </Link>
    </section>
  );
}
