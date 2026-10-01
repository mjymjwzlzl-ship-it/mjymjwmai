'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { groupOf } from '@/lib/admin-nav';

export default function AdminBackBar() {
  const pathname = usePathname() || '/';
  const searchParams = useSearchParams();
  const [hash, setHash] = useState('');
  useEffect(() => {
    const sync = () => setHash(window.location.hash);
    sync(); window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, [pathname]);
  if (pathname === '/' || pathname.startsWith('/login')) return null;
  const group = groupOf(pathname);
  const here = pathname + (searchParams.toString() ? '?' + searchParams.toString() : '') + hash;
  const active = group.tabs.map(tab => tab.href).filter(href => here === href || (href.includes('?') && here.startsWith(href + '&'))).sort((a,b) => b.length - a.length)[0];
  return <div className="admin-subnav">
    {pathname !== group.href && !group.tabs.some(tab => tab.href.split(/[?#]/)[0] === pathname) && <div className="admin-subnav-heading"><Link href={group.href}>← {group.label}</Link><span>상세 관리</span></div>}
    {group.tabs.length > 1 && <nav aria-label={group.label + ' 세부 메뉴'} className="admin-subnav-links">{group.tabs.map(tab => <Link key={tab.href} href={tab.href} aria-current={active === tab.href ? 'page' : undefined}>{tab.label}</Link>)}</nav>}
  </div>;
}
