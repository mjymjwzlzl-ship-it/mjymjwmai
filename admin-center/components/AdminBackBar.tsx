'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { groupOf } from '@/lib/admin-nav';

// 상단 메뉴바 아래 줄: [← 관리자 센터] 현재 메뉴 › (상세) + 그 메뉴의 세부 탭(노출 관리 = 홈 화면 섹션·배너 관리·오늘의 추천작 …)
// 대시보드(/)·로그인에는 안 보인다. AdminAuthGuard 가 모든 화면에 붙인다.
export default function AdminBackBar() {
  const pathname = usePathname() || '/';
  const [here, setHere] = useState('');
  useEffect(() => { setHere(`${window.location.pathname}${window.location.search}${window.location.hash}`); }, [pathname]);
  useEffect(() => {
    const sync = () => setHere(`${window.location.pathname}${window.location.search}${window.location.hash}`);
    window.addEventListener('popstate', sync); window.addEventListener('hashchange', sync); window.addEventListener('arata-admin-tab', sync);
    return () => { window.removeEventListener('popstate', sync); window.removeEventListener('hashchange', sync); window.removeEventListener('arata-admin-tab', sync); };
  }, []);
  const parts = pathname.split('/').filter(Boolean);
  if (!parts.length || parts[0] === 'login') return null;
  const group = groupOf(pathname);
  const isDetail = group.key === 'works' && parts[0] === 'works' && parts.length > 1;
  const legacy = parts[0] === 'comic-status' ? '연재 상태(예전 화면)' : parts[0] === 'novels' ? '소설 관리(예전 화면)' : parts[0] === 'users' && parts.length > 2 ? (parts[2] === 'coins' ? '코인 내역' : '결제 내역') : '';
  // 현재 탭: 주소(경로+?tab=+#)가 가장 길게 맞는 탭
  const activeTab = group.tabs.map((t) => t.href).filter((href) => {
    const [path, rest = ''] = href.split(/(?=[?#])/);
    if (path !== pathname) return false;
    return !rest || here.includes(rest);
  }).sort((a, b) => b.length - a.length)[0] || group.tabs.find((t) => t.href === pathname)?.href;

  return (
    <div className="border-b border-gray-800 bg-gray-950 text-sm text-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-3 gap-y-2 px-6 py-2">
        <Link href="/" className="inline-flex items-center gap-1 rounded bg-gray-800 px-2.5 py-1 font-bold text-gray-100 hover:bg-gray-700">
          <ArrowLeft className="h-4 w-4" />관리자 센터
        </Link>
        <nav aria-label="현재 위치" className="flex items-center gap-1 text-gray-400">
          <ChevronRight className="h-3.5 w-3.5 text-gray-600" />
          {isDetail || legacy ? <Link href={group.href} className="hover:text-white hover:underline">{group.label}</Link> : <span className="text-gray-200">{group.label}</span>}
          {(isDetail || legacy) && (<><ChevronRight className="h-3.5 w-3.5 text-gray-600" /><span className="text-gray-200">{isDetail ? '작품 상세' : legacy}</span></>)}
        </nav>
        {group.tabs.length > 1 && (
          <nav aria-label={`${group.label} 세부 메뉴`} className="flex flex-wrap items-center gap-1 sm:ml-4">
            {group.tabs.map((tab) => {
              const active = tab.href === activeTab;
              return (
                <Link key={tab.href} href={tab.href} aria-current={active ? 'page' : undefined}
                  onClick={() => window.setTimeout(() => window.dispatchEvent(new Event('arata-admin-tab')), 0)}
                  className={`rounded-full px-3 py-1 text-xs font-bold ${active ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}>
                  {tab.label}
                </Link>
              );
            })}
          </nav>
        )}
      </div>
    </div>
  );
}
