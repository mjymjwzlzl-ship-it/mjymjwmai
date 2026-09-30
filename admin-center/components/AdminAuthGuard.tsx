'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import AdminBackBar from '@/components/AdminBackBar';
import AdminHeader from '@/components/AdminHeader';

// 로그인하지 않은 상태로 관리자 화면(결제 설정·배너·고객센터 등)을 열면 로그인으로 보낸다.
// 데이터 API 는 서버에서 관리자 권한을 따로 확인한다(이 가드는 화면 노출만 막음).
export default function AdminAuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLogin = pathname === '/login' || pathname?.startsWith('/login/');
  const [allowed, setAllowed] = useState(isLogin);

  useEffect(() => {
    if (isLogin) {
      setAllowed(true);
      return;
    }
    let token: string | null = null;
    try { token = localStorage.getItem('adminToken'); } catch { token = null; }
    if (!token) {
      router.replace('/login');
      return;
    }
    setAllowed(true);
  }, [isLogin, pathname, router]);

  if (!allowed) return null;
  // 모든 관리자 화면 공통: 상단 메뉴바(8개) + 세부 탭 줄
  return <>{!isLogin && <><AdminHeader /><AdminBackBar /></>}{children}</>;
}
