'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { ChevronDown, Globe } from 'lucide-react';
import { useLanguageStore, languages, Language } from '@/store/language';

export default function LanguageSelector() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const { language: currentLanguage, setLanguage } = useLanguageStore();

  // 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    setIsOpen(false);

    // 언어에 따라 경로 전환
    if (lang === 'ko') {
      // 한국어 선택 → /home으로 이동
      if (pathname.startsWith('/en') || pathname.startsWith('/zh')) {
        router.push('/home');
      }
    } else if (lang === 'en') {
      // 영어 선택 → /en으로 이동
      if (!pathname.startsWith('/en')) {
        router.push('/en');
      }
    } else if (lang === 'zh') {
      // 중국어 선택 → /zh로 이동
      if (!pathname.startsWith('/zh')) {
        router.push('/zh');
      }
    }
  };

  return (
    <div className="relative z-50" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        aria-label="언어 선택"
      >
        <Globe className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {languages[currentLanguage].flag} {languages[currentLanguage].name}
        </span>
        <ChevronDown 
          className={`w-4 h-4 text-gray-500 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 bottom-full mb-2 w-48 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-[9999] overflow-hidden">
          <div className="py-1">
            {Object.entries(languages).map(([key, lang]) => (
              <button
                key={key}
                onClick={() => handleLanguageChange(key as Language)}
                className={`w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center gap-3 ${
                  currentLanguage === key
                    ? 'bg-purple-50 dark:bg-purple-900/20'
                    : ''
                }`}
              >
                <span className="text-xl">{lang.flag}</span>
                <span className={`text-sm ${
                  currentLanguage === key
                    ? 'text-purple-600 dark:text-purple-400 font-medium'
                    : 'text-gray-700 dark:text-gray-300'
                }`}>
                  {lang.name}
                </span>
                {currentLanguage === key && (
                  <span className="ml-auto">✓</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}