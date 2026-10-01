'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { NAV, groupOf } from '@/lib/admin-nav';
import AdminThemeToggle from './AdminThemeToggle';
import { BarChart3, BookOpen, Crown, ExternalLink, Home, Image, LogOut, Mail, Menu, Shield, TrendingUp, Users, X } from 'lucide-react';

const contentKeys = ['works', 'gallery', 'community', 'exposure'];
const menuIcons = { works: BookOpen, gallery: Image, community: Users, exposure: TrendingUp, promotion: Crown, payment: BarChart3, users: Users, reports: Shield, stats: BarChart3 };
const menuItem = (group: typeof NAV[number]) => ({ href: group.href, label: group.label, icon: menuIcons[group.key as keyof typeof menuIcons] || Home });
const groups = [
  { label: '콘텐츠', items: NAV.filter(group => contentKeys.includes(group.key)).map(menuItem) },
  { label: '운영', items: NAV.filter(group => group.key !== 'dashboard' && !contentKeys.includes(group.key)).map(menuItem) },
];

export default function AdminHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [adminName, setAdminName] = useState('관리자');
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const toggleRef = useRef<HTMLButtonElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const links = groups.flatMap(group => group.items);

  useEffect(() => {
    try {
      const admin = JSON.parse(localStorage.getItem('adminUser') || 'null');
      if (admin?.name || admin?.username) setAdminName(admin.name || admin.username);
    } catch { /* 표시용 정보 오류가 메뉴를 막지 않도록 한다. */ }
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    sidebarRef.current?.querySelector<HTMLAnchorElement>('a')?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setOpen(false); toggleRef.current?.focus(); }
      if (event.key === 'Tab') {
        const controls = sidebarRef.current?.querySelectorAll<HTMLElement>('a, button, input');
        if (!controls?.length) return;
        const first = controls[0], last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener('keydown', handleKey); };
  }, [open]);

  const isActive = (href: string) => groupOf(pathname || '/').href === href;
  const currentTitle = groupOf(pathname || '/').label;
  const logout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    router.replace('/login');
  };
  const closeMenu = () => { setOpen(false); setQuery(''); };

  return <>
    {open && <button className="admin-backdrop" aria-label="메뉴 닫기" onClick={closeMenu} tabIndex={-1} />}
    <aside ref={sidebarRef} id="admin-navigation" className={`admin-sidebar ${open ? 'is-open' : ''}`} aria-label="관리자 메뉴">
      <div className="admin-brand-row">
        <Link href="/" className="admin-brand" onClick={closeMenu}>ARATA<span>관리자 센터</span></Link>
        <button className="admin-mobile-close admin-icon-button" onClick={closeMenu} aria-label="메뉴 닫기"><X size={22} /></button>
      </div>
      <nav className="admin-navigation">
        <Link href="/" className={`admin-nav-link ${pathname === '/' ? 'is-active' : ''}`} aria-current={pathname === '/' ? 'page' : undefined} onClick={closeMenu}><Home size={21} />대시보드</Link>
        <label className="admin-menu-search"><span className="sr-only">관리 메뉴 검색</span><input type="search" placeholder="메뉴 검색" value={query} onChange={event => setQuery(event.target.value)} /></label>
        {groups.map(group => <div key={group.label} className="admin-nav-group">
          <p>{group.label}</p>
          {group.items.filter(item => item.label.includes(query.trim())).map(item => <Link key={item.href} href={item.href} className={`admin-nav-link ${isActive(item.href) ? 'is-active' : ''}`} aria-current={isActive(item.href) ? 'page' : undefined} onClick={closeMenu}><item.icon size={21} />{item.label}</Link>)}
        </div>)}
        {query && !links.some(item => item.label.includes(query.trim())) && <p className="admin-search-empty">일치하는 메뉴가 없습니다.</p>}
      </nav>
      <a className="admin-service-link" href="https://arata.co.kr/home" target="_blank" rel="noopener noreferrer"><ExternalLink size={18} />서비스로 이동</a>
    </aside>
    <header className="admin-topbar">
      <div className="admin-breadcrumb"><button ref={toggleRef} className="admin-menu-toggle admin-icon-button" onClick={() => setOpen(!open)} aria-controls="admin-navigation" aria-expanded={open} aria-label="관리 메뉴 열기"><Menu size={23} /></button><span>관리자 센터</span><span aria-hidden="true">/</span><strong>{currentTitle}</strong></div>
      <div className="admin-account"><AdminThemeToggle /><Link href="/support" className="admin-icon-button" aria-label="고객센터 문의 확인"><Mail size={21} /></Link><span className="admin-avatar" aria-hidden="true"><Users size={18} /></span><span className="admin-account-name">{adminName}</span><button onClick={logout} className="admin-logout"><LogOut size={17} /><span>로그아웃</span></button></div>
    </header>
  </>;
}
