'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Language = 'ko' | 'en' | 'zh';

interface LanguageState {
  language: Language;
  setLanguage: (language: Language) => void;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      language: 'ko', // 기본값: 한국어
      setLanguage: (language) => set({ language }),
    }),
    {
      name: 'arata-language',
    }
  )
);

// 언어 정보 (ko/en/zh 지원)
export const languages = {
  ko: {
    code: 'ko',
    name: '한국어',
    flag: '🇰🇷',
    locale: 'ko-KR',
  },
  en: {
    code: 'en',
    name: 'English',
    flag: '🇺🇸',
    locale: 'en-US',
  },
  zh: {
    code: 'zh',
    name: '简体中文',
    flag: '🇨🇳',
    locale: 'zh-CN',
  },
};