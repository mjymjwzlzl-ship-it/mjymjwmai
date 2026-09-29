'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage, type Locale } from '@/components/providers/LanguageProvider';

const footerCopy: Record<Locale, {
  links: {
    terms: string;
    privacy: string;
    youth: string;
    support: string;
  };
  company: string;
  address: string;
  ecommerce: string;
  copyright: string;
}> = {
  ko: {
    links: {
      terms: '이용약관',
      privacy: '개인정보처리방침',
      youth: '청소년보호정책',
      support: '고객센터',
    },
    company: '상호명: 에이단 스튜디오스 | 대표: 문제용 | 사업자등록번호: 690-81-00705',
    address: '주소: 서울 강서구 마곡중앙8로 14 410호 | 대표전화: 0507-1440-8816',
    ecommerce: '통신판매업신고: 2017-서울강서-1279',
    copyright: 'Copyright © Arata Comics. All rights reserved.',
  },
  en: {
    links: {
      terms: 'Terms of Use',
      privacy: 'Privacy Policy',
      youth: 'Youth Protection Policy',
      support: 'Customer Support',
    },
    company: 'Company: AIDAN STUDIOS | CEO: Moon Jeyong | Business Registration No.: 690-81-00705',
    address: 'Address: Room 410, 14 Magokjungang 8-ro, Gangseo-gu, Seoul | Tel: 0507-1440-8816',
    ecommerce: 'Mail-order Business Report No.: 2017-Seoul Gangseo-1279',
    copyright: 'Copyright © Arata Comics. All rights reserved.',
  },
  ja: {
    links: {
      terms: '利用規約',
      privacy: 'プライバシーポリシー',
      youth: '青少年保護方針',
      support: 'カスタマーサポート',
    },
    company: '会社名: AIDAN STUDIOS | 代表: Moon Jeyong | 事業者登録番号: 690-81-00705',
    address: '住所: ソウル特別市 江西区 麻谷中央8路 14 410号 | 代表電話: 0507-1440-8816',
    ecommerce: '通信販売業届出番号: 2017-ソウル江西-1279',
    copyright: 'Copyright © Arata Comics. All rights reserved.',
  },
  fr: {
    links: {
      terms: 'Conditions d’utilisation',
      privacy: 'Politique de confidentialité',
      youth: 'Protection des mineurs',
      support: 'Service client',
    },
    company: 'Société : AIDAN STUDIOS | Représentant : Moon Jeyong | No d’enregistrement : 690-81-00705',
    address: 'Adresse : Bureau 410, 14 Magokjungang 8-ro, Gangseo-gu, Séoul | Tél. : 0507-1440-8816',
    ecommerce: 'Déclaration de vente en ligne : 2017-Seoul Gangseo-1279',
    copyright: 'Copyright © Arata Comics. All rights reserved.',
  },
};

export default function Footer() {
  const pathname = usePathname();
  const { locale } = useLanguage();
  const copy = footerCopy[locale] || footerCopy.ko;
  const isCharacterChatPage = pathname?.includes('/chat/webtoon/') || pathname?.includes('/adult/chat/webtoon/');

  if (isCharacterChatPage) return null;

  return (
    <footer className="border-t border-gray-200 bg-gray-100 text-center text-xs text-gray-500 dark:border-gray-800 dark:bg-[#181818] dark:text-gray-400">
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="mb-5 text-2xl font-black tracking-tight text-gray-400 dark:text-gray-500">
          ARATA COMICS
        </div>

        <nav className="mb-5 flex flex-wrap items-center justify-center gap-x-7 gap-y-2">
          <Link href="/terms/service" className="hover:text-[#00a84c] dark:hover:text-[#00dc64]">{copy.links.terms}</Link>
          <Link href="/terms/privacy" className="hover:text-[#00a84c] dark:hover:text-[#00dc64]">{copy.links.privacy}</Link>
          <Link href="/terms/youth" className="hover:text-[#00a84c] dark:hover:text-[#00dc64]">{copy.links.youth}</Link>
          <Link href="/support" className="hover:text-[#00a84c] dark:hover:text-[#00dc64]">{copy.links.support}</Link>
        </nav>

        <div className="space-y-1 leading-relaxed">
          <p>{copy.company}</p>
          <p>{copy.address}</p>
          <p>{copy.ecommerce}</p>
          <p className="pt-1">{copy.copyright}</p>
        </div>
      </div>
    </footer>
  );
}
