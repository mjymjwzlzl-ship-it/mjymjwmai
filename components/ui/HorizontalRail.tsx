'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// 가로 카드 목록 공통: 모바일은 손가락 스와이프(기본 가로 스크롤), PC는 양옆 〈 〉 버튼·마우스 드래그·트랙패드 가로 스크롤.
// 처음이면 〈, 끝이면 〉 이 흐려진다. arrowTop 으로 버튼 세로 위치(카드 이미지 가운데)를 맞춘다.
export default function HorizontalRail({
  children,
  label,
  arrowTop = '50%',
  className = '',
}: {
  children: React.ReactNode;
  label: string;
  arrowTop?: string;
  className?: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);
  const drag = useRef({ active: false, startX: 0, startLeft: 0, moved: false });

  const update = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 4);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    update();
    const el = trackRef.current;
    if (!el) return;
    const observer = new ResizeObserver(update);
    observer.observe(el);
    Array.from(el.children).forEach((child) => observer.observe(child));
    return () => observer.disconnect();
  }, [children, update]);

  const page = (direction: 1 | -1) => {
    const el = trackRef.current;
    if (el) el.scrollBy({ left: direction * Math.max(el.clientWidth * 0.8, 140), behavior: 'smooth' });
  };

  // 마우스로 끌어서 넘기기 (터치는 브라우저 기본 스와이프)
  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'mouse' || !trackRef.current) return;
    drag.current = { active: true, startX: event.clientX, startLeft: trackRef.current.scrollLeft, moved: false };
  };
  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const el = trackRef.current;
    if (!drag.current.active || !el) return;
    const dx = event.clientX - drag.current.startX;
    if (Math.abs(dx) > 5) drag.current.moved = true;
    el.scrollLeft = drag.current.startLeft - dx;
  };
  const endDrag = () => { drag.current.active = false; };
  const onClickCapture = (event: React.MouseEvent) => {
    if (drag.current.moved) {
      event.preventDefault();
      event.stopPropagation();
      drag.current.moved = false;
    }
  };

  const arrow = 'absolute z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white/95 text-gray-700 shadow-md transition hover:border-[#00dc64] hover:text-[#00a84c] disabled:cursor-default disabled:opacity-30 dark:border-gray-600 dark:bg-gray-900/95 dark:text-gray-200';
  return (
    <div className={`relative ${className}`}>
      <div
        ref={trackRef}
        onScroll={update}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        onClickCapture={onClickCapture}
        onDragStart={(event) => event.preventDefault()}
        role="list"
        aria-label={label}
        className="no-scrollbar flex gap-2 overflow-x-auto overscroll-x-contain pb-2 [-webkit-overflow-scrolling:touch] sm:gap-3"
      >
        {children}
      </div>
      {(canPrev || canNext) && (
        <>
          <button type="button" className={`${arrow} -left-2 sm:-left-3`} style={{ top: arrowTop }} onClick={() => page(-1)} disabled={!canPrev} aria-label={`${label} 이전`}>
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button type="button" className={`${arrow} -right-2 sm:-right-3`} style={{ top: arrowTop }} onClick={() => page(1)} disabled={!canNext} aria-label={`${label} 다음`}>
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}
    </div>
  );
}
