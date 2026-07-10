"use client";
import React from 'react';

export default function AppPromoBanner() {
  return (
    <section className="px-4">
      <div className="mx-auto max-w-screen-xl">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#1b1f24] to-[#0d0f14] ring-1 ring-white/10 shadow-xl p-6 text-white md:p-10">
          <div className="grid items-center gap-8 md:grid-cols-2">
            <div>
              <div className="mb-3 inline-block rounded-full bg-rose-600 px-3 py-1 text-[11px] font-semibold text-white">
                ONLY ANDROID
              </div>
              <h3 className="text-3xl font-extrabold tracking-tight md:text-4xl">
                난 <span className="text-rose-500">ARATA+</span>로 19 웹툰 본다!
              </h3>
              <p className="mt-3 text-sm text-white/70">제한없이 편하게! App으로 빠르게!</p>
            </div>
            {/* 배너 이미지(하이퍼링크) */}
            <div className="hidden items-center justify-end md:flex">
              <a href="#" target="_blank" rel="noopener" className="block cursor-pointer">
                <div className="h-40 w-40 rounded-2xl bg-white/90" aria-label="다운로드 배너 이미지" />
              </a>
            </div>
          </div>
          {/* 장식용 라이트 */}
          <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-rose-500/20 blur-3xl" />
          <div className="pointer-events-none absolute -left-10 -bottom-10 h-40 w-40 rounded-full bg-emerald-500/20 blur-3xl" />
        </div>
      </div>
    </section>
  );
}


