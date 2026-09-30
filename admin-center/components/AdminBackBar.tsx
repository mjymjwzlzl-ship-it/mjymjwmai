'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowLeft, ChevronRight } from 'lucide-react';

// 관리자 하위 화면 공통 상단 줄: [← 관리자 센터] + 현재 위치(작품 관리 › 작품 상세).
// 대시보드(/)·로그인에는 안 보인다. AdminAuthGuard 에서 모든 화면에 붙인다.
const SECTIONS: Record<string, string> = {
  works: '작품 관리', banners: '배너 관리', events: '이벤트 관리', promotions: '할인·무료', 'comic-status': '연재 상태·공지',
  benefits: '쿠폰·선물', popular: '인기작 관리', payment: '결제 관리', 'adult-settings': '성인 설정', novels: '소설 관리',
  reports: '신고 관리', support: '고객센터', users: '회원',
};
const SUB_LABEL: Record<string, string> = { coins: '코인 내역', payments: '결제 내역' };

export default function AdminBackBar() {
  const pathname = usePathname() || '/';
  const parts = pathname.split('/').filter(Boolean);
  if (!parts.length || parts[0] === 'login') return null;
  const section = parts[0];
  const crumbs: { label: string; href?: string }[] = [];
  // 섹션 첫 화면이 있으면 링크, 하위 화면이면 마지막 칸은 현재 위치
  const sectionHasPage = section !== 'users';
  crumbs.push({ label: SECTIONS[section] || section, href: parts.length > 1 && sectionHasPage ? `/${section}` : undefined });
  if (parts.length > 1) crumbs.push({ label: section === 'works' ? '작품 상세' : SUB_LABEL[parts[parts.length - 1]] || '상세' });

  return (
    <div className="border-b border-gray-800 bg-gray-950 text-sm text-white">
      <div className="mx-auto flex max-w-7xl items-center gap-2 px-6 py-2">
        <Link href="/" className="inline-flex items-center gap-1 rounded bg-gray-800 px-2.5 py-1 font-bold text-gray-100 hover:bg-gray-700">
          <ArrowLeft className="h-4 w-4" />관리자 센터
        </Link>
        <nav aria-label="현재 위치" className="flex min-w-0 items-center gap-1 text-gray-400">
          {crumbs.map((crumb, index) => (
            <span key={index} className="flex items-center gap-1">
              <ChevronRight className="h-3.5 w-3.5 text-gray-600" />
              {crumb.href ? <Link href={crumb.href} className="hover:text-white hover:underline">{crumb.label}</Link> : <span className="text-gray-200">{crumb.label}</span>}
            </span>
          ))}
        </nav>
      </div>
    </div>
  );
}
