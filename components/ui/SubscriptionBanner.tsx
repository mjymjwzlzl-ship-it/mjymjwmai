'use client';

import Link from 'next/link';
import { ArrowRight, Crown } from 'lucide-react';
import { useLanguage } from '@/components/providers/LanguageProvider';
import SubscriptionBannerLayout from './SubscriptionBannerLayout';

export default function SubscriptionBanner() {
  const { t } = useLanguage();

  return (
    <SubscriptionBannerLayout>
      <div className="relative min-h-[128px] w-full min-w-0 overflow-hidden rounded-lg border border-green-200 bg-gradient-to-r from-green-50 via-white to-white p-4 shadow-md shadow-green-100/70 md:min-h-[150px] md:p-6 dark:border-[#00dc64]/20 dark:from-green-950/30 dark:via-[#1c1c1c] dark:to-[#1c1c1c] dark:shadow-none">
        <div className="absolute -right-16 -top-20 h-72 w-72 rounded-full bg-[#00dc64]/10 blur-3xl" />
        <div className="relative z-10 flex h-full flex-col items-start justify-between gap-3 lg:flex-row lg:items-center md:gap-5">
          <div className="flex min-w-0 items-center gap-4">
            <div className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#00dc64] text-black shadow-[0_0_24px_rgba(0,220,100,0.34)] sm:flex">
              <Crown className="h-7 w-7" />
            </div>
            <div className="min-w-0">
              <p className="mb-1 text-xs font-black text-[#00a84c] dark:text-[#00dc64]">{t('subscription.founder')}</p>
              <div className="sm:hidden">
                <p className="text-sm font-black leading-tight text-gray-950 dark:text-white">
                  {t('subscription.firstMonth')} <span className="text-xl text-[#00dc64]">{t('subscription.firstPrice')}</span>
                </p>
                <p className="mt-0.5 text-xs font-bold leading-tight text-gray-600 dark:text-gray-300">
                  {t('subscription.annual')} <span className="text-lg font-black text-[#00dc64]">{t('subscription.monthlyPrice')}</span>
                </p>
              </div>
              <h2 className="hidden text-xl font-black tracking-tight text-gray-950 sm:block md:text-2xl dark:text-white">
                <span className="inline-block">{t('subscription.firstMonth')} <span className="text-2xl text-[#00dc64] sm:text-3xl md:text-4xl">{t('subscription.firstPrice')}</span></span>
                <span className="mx-2 text-gray-300">|</span>
                <span className="inline-block">{t('subscription.annual')} <span className="text-2xl text-[#00dc64] sm:text-3xl md:text-4xl">{t('subscription.monthlyPrice')}</span></span>
              </h2>
              <p className="mt-2 hidden text-sm text-gray-600 sm:block dark:text-gray-400">
                {t('subscription.description')}
              </p>
            </div>
          </div>

          <Link
            href="/register"
            className="inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-full bg-[#00dc64] px-5 py-2 text-xs font-black text-black shadow-[0_0_22px_rgba(0,220,100,0.28)] transition hover:bg-[#20ef7b] sm:w-auto sm:px-6 sm:py-3 sm:text-sm"
          >
            {t('subscription.start')}
            <ArrowRight className="h-4 w-4" strokeWidth={3} />
          </Link>
        </div>
      </div>

    </SubscriptionBannerLayout>
  );
}
