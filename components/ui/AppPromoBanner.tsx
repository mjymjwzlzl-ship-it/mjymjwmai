"use client";
import React from 'react';
import { useRouter } from 'next/navigation';
import { Smartphone, Shield } from 'lucide-react';
import { useAdultStore } from '@/store/adult';
import { useTranslation } from '@/lib/i18n';

export default function AppPromoBanner() {
  const router = useRouter();
  const { t } = useTranslation();
  const adult = useAdultStore((s) => s.adult);
  const isAdultMode = adult === 'on';
  
  return (
    <section className="px-4 mb-28 md:mb-0">
      <div className="mx-auto max-w-screen-xl">
        <div 
          className={`relative overflow-hidden rounded-2xl shadow-xl p-6 md:p-10 cursor-pointer transition-all ${
            isAdultMode 
              ? 'bg-gradient-to-r from-rose-50 to-red-50 dark:from-rose-950 dark:to-red-950 ring-1 ring-rose-200 dark:ring-rose-800 hover:ring-2 hover:ring-rose-300 dark:hover:ring-rose-700 text-gray-900 dark:text-white'
              : 'bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 ring-1 ring-gray-200 dark:ring-gray-700 hover:ring-2 hover:ring-gray-300 dark:hover:ring-gray-600 text-gray-900 dark:text-white'
          }`}
          onClick={() => router.push('/download')}
        >
          <div className="grid items-center gap-8 md:grid-cols-2">
            <div>
              <div className="mb-3 flex items-center gap-2">
                <div className={`inline-block rounded-full px-3 py-1 text-[11px] font-semibold animate-pulse ${
                  isAdultMode
                    ? 'bg-gradient-to-r from-rose-600 to-red-600 text-white'
                    : 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white'
                }`}>
                  NEW APP
                </div>
                {isAdultMode && (
                  <div className="inline-flex items-center gap-1 rounded-full bg-red-100 dark:bg-red-900 px-2 py-1 text-[10px] font-bold text-red-700 dark:text-red-200">
                    <Shield className="w-3 h-3" />
                    19+
                  </div>
                )}
              </div>
              <h3 className={`text-3xl font-extrabold tracking-tight md:text-4xl ${
                isAdultMode ? 'text-gray-900 dark:text-white' : 'text-gray-900 dark:text-white'
              }`}>
                {t('home.appPromo.title')} <span className={`text-transparent bg-clip-text ${
                  isAdultMode
                    ? 'bg-gradient-to-r from-rose-600 to-red-600'
                    : 'bg-gradient-to-r from-emerald-600 to-teal-600'
                }`}>ARATA</span>
              </h3>
              <p className={`mt-3 text-sm ${
                isAdultMode 
                  ? 'text-gray-600 dark:text-gray-300'
                  : 'text-gray-600 dark:text-gray-400'
              }`}>
                {t('home.appPromo.description')}
              </p>
            </div>
            {/* 배너 이미지(하이퍼링크) */}
            <div className="flex items-center justify-end pointer-events-none">
              <div className={`inline-flex items-center gap-3 px-6 py-3 rounded-xl font-semibold transform hover:scale-105 transition-transform ${
                isAdultMode
                  ? 'bg-red-600 text-white shadow-lg'
                  : 'bg-emerald-600 text-white shadow-lg'
              }`}>
                <Smartphone className="w-5 h-5" />
                <span>{t('home.appPromo.downloadApp')}</span>
                <span className="text-2xl">→</span>
              </div>
            </div>
          </div>
          {/* 장식용 라이트 */}
          <div className={`pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full blur-3xl ${
            isAdultMode ? 'bg-red-500/10' : 'bg-emerald-500/10'
          }`} />
          <div className={`pointer-events-none absolute -left-10 -bottom-10 h-40 w-40 rounded-full blur-3xl ${
            isAdultMode ? 'bg-rose-500/10' : 'bg-teal-500/10'
          }`} />
        </div>
      </div>
    </section>
  );
}


