'use client';

import Link from 'next/link';
import { ArrowRight, Crown } from 'lucide-react';

export default function SubscriptionBanner() {
  return (
    <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
      <div className="relative overflow-hidden rounded-lg border border-green-100 bg-gradient-to-r from-green-50 via-white to-white p-5 shadow-sm md:col-span-2 md:min-h-[150px] md:p-6 dark:border-[#00dc64]/20 dark:from-green-950/30 dark:via-[#1c1c1c] dark:to-[#1c1c1c]">
        <div className="absolute -right-16 -top-20 h-72 w-72 rounded-full bg-[#00dc64]/10 blur-3xl" />
        <div className="relative z-10 flex h-full flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <div className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#00dc64] text-black shadow-[0_0_24px_rgba(0,220,100,0.34)] sm:flex">
              <Crown className="h-7 w-7" />
            </div>
            <div>
              <p className="mb-1 text-xs font-black text-[#00a84c] dark:text-[#00dc64]">ARATA 창립회원 모집</p>
              <h2 className="text-xl font-black tracking-tight text-gray-950 md:text-2xl dark:text-white">
                첫 달 <span className="text-3xl text-[#00dc64] md:text-4xl">990원</span>
                <span className="mx-2 text-gray-300">|</span>
                연간 결제 시 <span className="text-3xl text-[#00dc64] md:text-4xl">월 2,800원</span>
              </h2>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                이후 월 3,400원. 100% 다양한 웹툰을 무제한으로 감상하세요.
              </p>
            </div>
          </div>

          <Link
            href="/register"
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#00dc64] px-6 py-3 text-sm font-black text-black shadow-[0_0_22px_rgba(0,220,100,0.28)] transition hover:bg-[#20ef7b] sm:w-auto"
          >
            지금 시작하기
            <ArrowRight className="h-4 w-4" strokeWidth={3} />
          </Link>
        </div>
      </div>

      <Link href="/download" className="group relative min-h-[150px] overflow-hidden rounded-lg bg-black shadow-lg">
        <img
          src="https://images.unsplash.com/photo-1616348436168-de43ad0db179?q=80&w=900&auto=format&fit=crop"
          alt="ARATA app download"
          className="absolute inset-0 h-full w-full object-cover opacity-75 transition duration-700 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/58 to-black/15" />
        <div className="relative z-10 flex h-full min-h-[150px] flex-col justify-end p-5">
          <span className="mb-2 inline-flex w-fit rounded bg-[#00dc64] px-2 py-0.5 text-[10px] font-black text-black">
            APP ONLY
          </span>
          <h3 className="text-xl font-black leading-tight text-white">
            ARATA 완전판
            <br />
            <span className="text-[#00dc64]">앱 다운로드</span>
          </h3>
          <p className="mt-2 text-xs text-gray-300">광고/검열 없는 19+ 버전 설치</p>
        </div>
      </Link>
    </section>
  );
}
