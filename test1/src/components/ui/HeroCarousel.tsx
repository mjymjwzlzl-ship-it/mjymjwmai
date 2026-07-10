"use client";
import { useEffect, useRef, useState } from 'react';

type HeroItem = {
  id: string;
  title: string;
  tags: string[];
};

const defaultItems: HeroItem[] = [
  { id: 't1', title: '차원이동 레벨업', tags: ['초능력', '먼치킨'] },
  { id: 't2', title: '모검', tags: ['기묘하고', '오싹함'] },
  { id: 't3', title: '이세계에서 반려찍기', tags: ['차원이동', '게임_마스터'] },
];

export default function HeroCarousel({ items = defaultItems }: { items?: HeroItem[] }) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [perView, setPerView] = useState(3);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const update = () => {
      if (typeof window === 'undefined') return;
      if (window.matchMedia('(min-width:1024px)').matches) setPerView(3);
      else if (window.matchMedia('(min-width:768px)').matches) setPerView(2);
      else setPerView(1);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const pages = Math.max(1, items.length - perView + 1);
  const onPrev = () => setIndex((v) => Math.max(0, v - 1));
  const onNext = () => setIndex((v) => Math.min(pages - 1, v + 1));

  return (
    <section aria-label="히어로 배너" className="relative">
      <div className="mx-auto max-w-screen-xl px-4">
        <div className="relative w-full overflow-hidden">
          <div
            ref={trackRef}
            className="flex transition-transform duration-300"
            style={{ transform: `translateX(-${(index * 100) / perView}%)` }}
          >
            {items.map((item) => (
              <article
                key={item.id}
                className="relative shrink-0 basis-full px-2 md:basis-1/2 lg:basis-1/3"
              >
                <div className="aspect-square overflow-hidden rounded-2xl p-5" style={{ background: 'var(--surface)', color: 'var(--ui-text)' }}>
                  <div className="max-w-[75%]">
                    <h3 className="mb-2 text-2xl font-bold md:text-3xl lg:text-4xl">{item.title}</h3>
                    <div className="mb-4 flex flex-wrap gap-2 text-xs md:text-sm">
                      {item.tags.slice(0, 2).map((t) => (
                        <span key={t} className="rounded-full px-2 py-1" style={{ background: 'var(--chip-bg)', color: 'var(--ui-text)' }}>#{t}</span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button className="h-10 rounded-full bg-white px-4 text-sm font-medium text-gray-900 md:h-11">
                        이어보기
                      </button>
                      <button className="h-10 rounded-full border px-4 text-sm font-medium md:h-11" style={{ borderColor: 'var(--border-color)', color: 'var(--ui-text)' }}>1화보기</button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
          {/* Overlay arrows inside gutter */}
          <div className="pointer-events-none absolute inset-0 hidden items-center justify-between px-2 md:flex md:px-4">
            <button
              aria-label="이전"
              onClick={onPrev}
              className="pointer-events-auto flex h-12 w-12 items-center justify-center rounded-full border border-white/25 bg-black/40 text-white hover:bg-black/60"
            >
              <span className="-mt-[1px] text-xl">‹</span>
            </button>
            <button
              aria-label="다음"
              onClick={onNext}
              className="pointer-events-auto flex h-12 w-12 items-center justify-center rounded-full border border-white/25 bg-black/40 text-white hover:bg-black/60"
            >
              <span className="-mt-[1px] text-xl">›</span>
            </button>
          </div>
        </div>
        {/* Dots */}
        <div className="mt-3 flex items-center justify-center gap-2">
          {Array.from({ length: pages }).map((_, i) => (
            <span key={i} className={i === index ? 'h-1.5 w-5 rounded-full' : 'h-1.5 w-1.5 rounded-full'} style={{ background: i === index ? 'var(--dot-active)' : 'var(--dot-inactive)' }} />
          ))}
        </div>
      </div>
    </section>
  );
}


