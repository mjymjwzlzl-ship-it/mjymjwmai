'use client';

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Type, X } from 'lucide-react';

// 웹소설 텍스트 뷰어.
// 설정: 보기 방식(세로 스크롤 / 좌우 넘기기) · 글자 크기 · 줄간격 · 배경색(흰색·아이보리·회색·검정, 글자색 자동 대비) ·
//       글자색 톤 · 화면 밝기 · 글꼴. 설정은 이 기기에 저장되어 다른 회차·재접속에도 유지된다.
// 메뉴 숨김/표시: 본문 가운데를 누르면 뷰어 상·하단 메뉴가 토글된다(뷰어 페이지의 onClick). 좌우 넘기기에서는 화면 양옆을 누르면 이전/다음 쪽.

type Mode = 'scroll' | 'page';
type Theme = 'white' | 'ivory' | 'gray' | 'black';
type Tone = 'auto' | 'strong' | 'soft';
type FontKey = 'sans' | 'serif' | 'myeongjo' | 'gothic';
export interface NovelSettings { mode: Mode; fontSize: number; lineHeight: number; theme: Theme; tone: Tone; brightness: number; font: FontKey }

const STORAGE_KEY = 'arata_novel_viewer_v1';
const DEFAULTS: NovelSettings = { mode: 'scroll', fontSize: 18, lineHeight: 1.9, theme: 'white', tone: 'auto', brightness: 100, font: 'sans' };

const THEMES: Record<Theme, { label: string; bg: string; fg: string; strong: string; soft: string; swatch: string }> = {
  white: { label: '흰색', bg: '#ffffff', fg: '#222222', strong: '#000000', soft: '#555555', swatch: '#ffffff' },
  ivory: { label: '아이보리', bg: '#f7f1e3', fg: '#3b3328', strong: '#1f1a12', soft: '#6b604f', swatch: '#f7f1e3' },
  gray: { label: '회색', bg: '#3a3d42', fg: '#e6e6e6', strong: '#ffffff', soft: '#b8bcc2', swatch: '#3a3d42' },
  black: { label: '검정', bg: '#111111', fg: '#d8d8d8', strong: '#f5f5f5', soft: '#9a9a9a', swatch: '#111111' },
};
const FONTS: Record<FontKey, { label: string; family: string }> = {
  sans: { label: '기본 고딕', family: 'Pretendard, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif' },
  gothic: { label: '나눔고딕', family: '"Nanum Gothic", "Noto Sans KR", sans-serif' },
  myeongjo: { label: '나눔명조', family: '"Nanum Myeongjo", "Noto Serif KR", serif' },
  serif: { label: '본명조', family: '"Noto Serif KR", "Nanum Myeongjo", serif' },
};
const FONT_LINK_ID = 'arata-novel-fonts';

function loadSettings(): NovelSettings {
  try { return { ...DEFAULTS, ...(JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') || {}) }; } catch { return DEFAULTS; }
}

export default function NovelReader({ text, title, onReachEnd }: { text: string; title?: string; onReachEnd?: () => void }) {
  const [settings, setSettings] = useState<NovelSettings>(DEFAULTS);
  const [panelOpen, setPanelOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [frameWidth, setFrameWidth] = useState(0);
  const frameRef = useRef<HTMLDivElement>(null);
  const columnsRef = useRef<HTMLDivElement>(null);
  const swipe = useRef<number | null>(null);

  useEffect(() => { setSettings(loadSettings()); }, []);
  useEffect(() => {
    // 글꼴은 처음 한 번만 불러온다 (Google Fonts)
    if (document.getElementById(FONT_LINK_ID)) return;
    const link = document.createElement('link');
    link.id = FONT_LINK_ID;
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Nanum+Gothic:wght@400;700&family=Nanum+Myeongjo:wght@400;700&family=Noto+Serif+KR:wght@400;700&display=swap';
    document.head.appendChild(link);
  }, []);

  const update = (patch: Partial<NovelSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const theme = THEMES[settings.theme];
  const color = settings.tone === 'strong' ? theme.strong : settings.tone === 'soft' ? theme.soft : theme.fg;
  const paragraphs = useMemo(() => text.split(/\n+/).map((line) => line.trim()).filter(Boolean), [text]);
  const bodyStyle: React.CSSProperties = { fontSize: settings.fontSize, lineHeight: settings.lineHeight, fontFamily: FONTS[settings.font].family, color };

  // 좌우 넘기기: CSS 다단(column)으로 화면 폭만큼 나눠 한 쪽씩 보여준다
  const GAP = 48;
  const measure = useCallback(() => {
    const frame = frameRef.current;
    const columns = columnsRef.current;
    if (!frame || !columns || settings.mode !== 'page') return;
    const width = frame.clientWidth;
    setFrameWidth(width);
    const count = Math.max(1, Math.round((columns.scrollWidth + GAP) / (width + GAP)));
    setPageCount(count);
    setPage((current) => Math.min(current, count - 1));
  }, [settings.mode]);
  useLayoutEffect(() => { measure(); }, [measure, settings, text]);
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    return () => observer.disconnect();
  }, [measure]);
  useEffect(() => { setPage(0); }, [text, settings.mode]);
  useEffect(() => { if (settings.mode === 'page' && page === pageCount - 1) onReachEnd?.(); }, [page, pageCount, settings.mode, onReachEnd]);

  const go = (delta: number) => setPage((current) => Math.max(0, Math.min(pageCount - 1, current + delta)));

  const chip = (active: boolean) => `rounded-lg border px-2.5 py-1.5 text-xs font-bold transition ${active ? 'border-[#00dc64] bg-[#00dc64]/15 text-[#00a84c] dark:text-[#00dc64]' : 'border-gray-300 text-gray-600 dark:border-gray-600 dark:text-gray-300'}`;

  return (
    <div className="relative w-full" style={{ background: theme.bg }}>
      {/* 화면 밝기: 검은 막의 진하기로 조절 */}
      {settings.brightness < 100 && (
        <div className="pointer-events-none fixed inset-0 z-[55] bg-black" style={{ opacity: (100 - settings.brightness) / 100 * 0.8 }} aria-hidden />
      )}

      {settings.mode === 'scroll' ? (
        <article className="mx-auto max-w-2xl px-5 py-10 sm:px-8" style={bodyStyle}>
          {title && <h2 className="mb-8 text-center font-bold" style={{ fontSize: settings.fontSize * 1.15 }}>{title}</h2>}
          {paragraphs.map((line, index) => <p key={index} className="mb-[0.9em] break-keep">{line}</p>)}
        </article>
      ) : (
        <div className="mx-auto max-w-2xl px-5 py-6 sm:px-8">
          <div
            ref={frameRef}
            className="relative overflow-hidden"
            style={{ height: 'calc(100dvh - 190px)' }}
            onTouchStart={(event) => { swipe.current = event.touches[0].clientX; }}
            onTouchEnd={(event) => {
              if (swipe.current === null) return;
              const dx = event.changedTouches[0].clientX - swipe.current;
              swipe.current = null;
              if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
            }}
          >
            <div
              ref={columnsRef}
              className="h-full transition-transform duration-300 ease-out"
              style={{ ...bodyStyle, columnWidth: frameWidth || 600, columnGap: GAP, columnFill: 'auto', transform: `translateX(-${page * (frameWidth + GAP)}px)` }}
            >
              {title && <h2 className="mb-8 text-center font-bold" style={{ fontSize: settings.fontSize * 1.15 }}>{title}</h2>}
              {paragraphs.map((line, index) => <p key={index} className="mb-[0.9em] break-keep">{line}</p>)}
            </div>
            {/* 양옆 1/4 을 누르면 이전·다음 쪽, 가운데는 메뉴 토글(부모로 전달) */}
            <button type="button" aria-label="이전 쪽" className="absolute inset-y-0 left-0 w-1/4" onClick={(event) => { event.stopPropagation(); go(-1); }} />
            <button type="button" aria-label="다음 쪽" className="absolute inset-y-0 right-0 w-1/4" onClick={(event) => { event.stopPropagation(); go(1); }} />
          </div>
          <div className="mt-3 flex items-center justify-center gap-4 text-sm font-bold" style={{ color: theme.soft }} onClick={(event) => event.stopPropagation()}>
            <button type="button" onClick={() => go(-1)} disabled={page === 0} className="disabled:opacity-30" aria-label="이전 쪽"><ChevronLeft className="h-5 w-5" /></button>
            <span>{page + 1} / {pageCount}</span>
            <button type="button" onClick={() => go(1)} disabled={page >= pageCount - 1} className="disabled:opacity-30" aria-label="다음 쪽"><ChevronRight className="h-5 w-5" /></button>
          </div>
        </div>
      )}

      {/* 뷰어 설정 버튼 */}
      <button
        type="button"
        onClick={(event) => { event.stopPropagation(); setPanelOpen(true); }}
        className="fixed bottom-24 right-4 z-[65] flex h-12 w-12 items-center justify-center rounded-full bg-[#00dc64] text-black shadow-lg"
        aria-label="뷰어 설정"
      >
        <Type className="h-5 w-5" />
      </button>

      {panelOpen && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 sm:items-center" onClick={(event) => { event.stopPropagation(); setPanelOpen(false); }}>
          <div className="w-full max-w-md space-y-4 rounded-t-2xl bg-white p-5 text-gray-900 shadow-xl sm:rounded-2xl dark:bg-[#1b1b1b] dark:text-white" onClick={(event) => event.stopPropagation()} role="dialog" aria-label="뷰어 설정">
            <div className="flex items-center justify-between">
              <p className="text-base font-black">뷰어 설정</p>
              <button type="button" onClick={() => setPanelOpen(false)} aria-label="닫기"><X className="h-5 w-5 text-gray-400" /></button>
            </div>
            <div>
              <p className="mb-1.5 text-xs font-bold text-gray-500">보기 방식</p>
              <div className="flex gap-2">
                <button type="button" className={chip(settings.mode === 'scroll')} onClick={() => update({ mode: 'scroll' })}>세로 스크롤</button>
                <button type="button" className={chip(settings.mode === 'page')} onClick={() => update({ mode: 'page' })}>좌우 넘기기</button>
              </div>
            </div>
            <label className="block text-xs font-bold text-gray-500">글자 크기 <span className="text-gray-900 dark:text-white">{settings.fontSize}px</span>
              <input type="range" min={14} max={28} step={1} value={settings.fontSize} onChange={(e) => update({ fontSize: Number(e.target.value) })} className="mt-1 w-full accent-[#00dc64]" />
            </label>
            <label className="block text-xs font-bold text-gray-500">줄간격 <span className="text-gray-900 dark:text-white">{settings.lineHeight.toFixed(1)}</span>
              <input type="range" min={1.4} max={2.6} step={0.1} value={settings.lineHeight} onChange={(e) => update({ lineHeight: Number(e.target.value) })} className="mt-1 w-full accent-[#00dc64]" />
            </label>
            <div>
              <p className="mb-1.5 text-xs font-bold text-gray-500">배경색 <span className="font-normal">(글자색은 배경에 맞춰 자동)</span></p>
              <div className="flex gap-2">
                {(Object.keys(THEMES) as Theme[]).map((key) => (
                  <button key={key} type="button" onClick={() => update({ theme: key })} aria-pressed={settings.theme === key} className={`flex flex-col items-center gap-1 text-[11px] font-bold ${settings.theme === key ? 'text-[#00a84c] dark:text-[#00dc64]' : 'text-gray-500'}`}>
                    <span className={`h-9 w-9 rounded-full border-2 ${settings.theme === key ? 'border-[#00dc64]' : 'border-gray-300'}`} style={{ background: THEMES[key].swatch }} />
                    {THEMES[key].label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-xs font-bold text-gray-500">글자색</p>
              <div className="flex gap-2">
                {([['auto', '자동'], ['strong', '진하게'], ['soft', '부드럽게']] as const).map(([key, label]) => (
                  <button key={key} type="button" className={chip(settings.tone === key)} onClick={() => update({ tone: key })}>{label}</button>
                ))}
              </div>
            </div>
            <label className="block text-xs font-bold text-gray-500">화면 밝기 <span className="text-gray-900 dark:text-white">{settings.brightness}%</span>
              <input type="range" min={30} max={100} step={5} value={settings.brightness} onChange={(e) => update({ brightness: Number(e.target.value) })} className="mt-1 w-full accent-[#00dc64]" />
            </label>
            <div>
              <p className="mb-1.5 text-xs font-bold text-gray-500">글꼴</p>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(FONTS) as FontKey[]).map((key) => (
                  <button key={key} type="button" className={chip(settings.font === key)} style={{ fontFamily: FONTS[key].family }} onClick={() => update({ font: key })}>{FONTS[key].label}</button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-gray-100 pt-3 text-xs text-gray-500 dark:border-gray-800">
              <span>본문 가운데를 누르면 메뉴가 숨겨지거나 나타나요.</span>
              <button type="button" onClick={() => update(DEFAULTS)} className="font-bold underline">초기화</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
