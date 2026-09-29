"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import {
  User,
  BookOpen,
  Star,
  Settings,
  HelpCircle,
  LogIn,
  UserPlus,
  X,
  ChevronRight,
  Tag,
  LogOut,
  Heart,
  Library
} from 'lucide-react';
import { api } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';

interface SlideMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

const SlideMenu: React.FC<SlideMenuProps> = ({ isOpen, onClose }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useTranslation();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [categories, setCategories] = useState<{ name: string; slug: string }[]>([]);

  useEffect(() => {
    let isMounted = true; // cleanup을 위한 플래그
    
    const checkAuth = () => {
      if (!isMounted || typeof window === 'undefined') return;
      
      try {
        const token = localStorage.getItem('authToken') || localStorage.getItem('token');
        const userData = localStorage.getItem('user');
        
        if (token && userData && 
            token !== 'null' && token !== 'undefined' && 
            userData !== 'null' && userData !== 'undefined') {
          const parsedUser = JSON.parse(userData);
          if (isMounted) {
            setIsLoggedIn(true);
            setUser(parsedUser);
          }
        } else {
          if (isMounted) {
            setIsLoggedIn(false);
            setUser(null);
          }
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        if (isMounted) {
          setIsLoggedIn(false);
          setUser(null);
        }
      }
    };

    const fetchCategories = async () => {
      if (!isMounted) return;
      
      try {
        const response = await api.get('/frontend/categories/list');
        
        if (!isMounted) return; // 컴포넌트가 언마운트되면 중단
        
        if (Array.isArray(response.data)) {
          setCategories(response.data);
        } else {
          setCategories([
            { name: '로맨스', slug: 'romance' },
            { name: '액션', slug: 'action' },
            { name: '판타지', slug: 'fantasy' },
            { name: '코미디', slug: 'comedy' },
            { name: '드라마', slug: 'drama' },
            { name: '스릴러', slug: 'thriller' },
            { name: '일상', slug: 'slice-of-life' },
          ]);
        }
      } catch (error) {
        console.error('Category load error:', error);
        if (isMounted) {
          setCategories([
            { name: '로맨스', slug: 'romance' },
            { name: '액션', slug: 'action' },
            { name: '판타지', slug: 'fantasy' },
            { name: '코미디', slug: 'comedy' },
            { name: '드라마', slug: 'drama' },
            { name: '스릴러', slug: 'thriller' },
            { name: '일상', slug: 'slice-of-life' },
          ]);
        }
      }
    };

    checkAuth();
    fetchCategories();

    const handleStorageChange = () => {
      checkAuth();
    };
    
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorageChange);
    }

    return () => {
      isMounted = false;
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', handleStorageChange);
      }
    };
  }, []); // 컴포넌트 마운트시에만 실행

  // 메뉴가 처음 열릴 때만 인증 상태 확인 (불필요한 재실행 방지)
  useEffect(() => {
    if (!isOpen) return;
    
    let isMounted = true;
    
    const checkAuth = () => {
      if (!isMounted || typeof window === 'undefined') return;
      
      try {
        const token = localStorage.getItem('authToken') || localStorage.getItem('token');
        const userData = localStorage.getItem('user');
        
        if (token && userData && 
            token !== 'null' && token !== 'undefined' && 
            userData !== 'null' && userData !== 'undefined') {
          const parsedUser = JSON.parse(userData);
          if (isMounted) {
            setIsLoggedIn(true);
            setUser(parsedUser);
          }
        } else {
          if (isMounted) {
            setIsLoggedIn(false);
            setUser(null);
          }
        }
      } catch (error) {
        console.error('User data parsing failed:', error);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('authToken');
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
        if (isMounted) {
          setIsLoggedIn(false);
          setUser(null);
        }
      }
    };
    
    // 약간의 지연을 두고 실행 (렌더링 최적화)
    const timeoutId = setTimeout(checkAuth, 0);
    
    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [isOpen]);

  const handleLoginClick = () => {
    onClose();
    router.push('/login');
  };

  const handleSignupClick = () => {
    onClose();
    router.push('/register');
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsLoggedIn(false);
    setUser(null);
    onClose();
    router.push('/');
  };

  // 성인 페이지에서는 성인 내서재로 연결
  const libraryHref = pathname?.startsWith('/adult') ? '/adult/library' : '/library';

  const userMenuItems = [
    { icon: Library, label: t('navigation.myLibrary'), href: libraryHref },
    { icon: Heart, label: t('navigation.favoriteWorks'), href: '/favorites' },
    { icon: User, label: t('navigation.myProfile'), href: '/profile' },
  ];

  const generalMenuItems = [
    { icon: Settings, label: t('navigation.settings'), href: '/settings' },
    { icon: HelpCircle, label: t('navigation.customerService'), href: '/support' },
  ];

  return (
    <>
      {/* 배경 오버레이 */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      {/* 슬라이드 메뉴 */}
      <div className={`
        fixed top-0 right-0 h-full w-80 max-w-[80vw] bg-white dark:bg-gray-900 z-50 transform transition-transform duration-300 ease-in-out border-l border-gray-200 dark:border-gray-700
        ${isOpen ? 'translate-x-0' : 'translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          {/* 헤더 */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('navigation.menu')}</h2>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-opacity-50 rounded-lg p-1"
              aria-label={t('navigation.menu')}
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* 메뉴 내용 */}
          <div className="flex-1 overflow-y-auto">
            {!isLoggedIn ? (
              /* 비로그인 상태 */
              <div className="p-4">
                <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-lg p-4 mb-6">
                  <h3 className="text-white font-semibold mb-2">Welcome to ARATA!</h3>
                  <p className="text-emerald-100 text-sm mb-4">Login to access more features</p>
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={handleLoginClick}
                      className="w-full bg-white text-emerald-600 font-semibold py-2 px-4 rounded-lg hover:bg-gray-100 transition-colors duration-200 flex items-center justify-center space-x-2"
                    >
                      <LogIn className="w-4 h-4" />
                      <span>{t('common.login')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleSignupClick}
                      className="w-full bg-transparent border border-white text-white font-semibold py-2 px-4 rounded-lg hover:bg-white hover:text-emerald-600 transition-colors duration-200 flex items-center justify-center space-x-2"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>{t('auth.register')}</span>
                    </button>
                  </div>
                </div>

                {/* 비로그인 상태에서도 접근 가능한 메뉴 */}
                <div className="space-y-1">
                  <Link 
                    href="/" 
                    className="flex items-center space-x-3 p-3 text-gray-700 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors duration-200"
                    onClick={onClose}
                  >
                    <BookOpen className="w-5 h-5" />
                    <span>Browse Webtoons</span>
                    <ChevronRight className="w-4 h-4 ml-auto" />
                  </Link>
                  
                  {/* 카테고리 목록 */}
                  {categories.length > 0 && (
                    <>
                      <h4 className="text-gray-400 text-sm font-medium px-3 mb-2 mt-4">{t('navigation.categories')}</h4>
                      {categories.map((category) => (
                        <Link
                          key={category.slug}
                          href={`/?category=${category.slug}`}
                          className="flex items-center space-x-3 p-3 text-gray-700 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors duration-200"
                          onClick={onClose}
                        >
                          <Tag className="w-5 h-5" />
                          <span>{category.name}</span>
                          <ChevronRight className="w-4 h-4 ml-auto" />
                        </Link>
                      ))}
                    </>
                  )}
                  
                  <h4 className="text-gray-400 text-sm font-medium px-3 mb-2 mt-4">{t('navigation.general')}</h4>
                  {generalMenuItems.map((item, index) => (
                    <Link
                      key={index}
                      href={item.href}
                      className="flex items-center space-x-3 p-3 text-gray-700 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors duration-200"
                      onClick={onClose}
                    >
                      <item.icon className="w-5 h-5" />
                      <span>{item.label}</span>
                      <ChevronRight className="w-4 h-4 ml-auto" />
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              /* 로그인 상태 */
              <div className="p-4">
                {/* 사용자 프로필 영역 */}
                <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 mb-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-gray-900 dark:text-white font-semibold">{user?.nickname || user?.username || 'User'}</h3>
                      <p className="text-gray-500 dark:text-gray-400 text-sm">{user?.email || 'Webtoon Reader'}</p>
                    </div>
                  </div>
                </div>

                {/* 사용자 메뉴 */}
                <div className="space-y-1 mb-6">
                  <h4 className="text-gray-400 text-sm font-medium px-3 mb-2">{t('navigation.myAccount')}</h4>
                  {userMenuItems.map((item, index) => (
                    <Link
                      key={index}
                      href={item.href}
                      className="flex items-center space-x-3 p-3 text-gray-700 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors duration-200"
                      onClick={onClose}
                    >
                      <item.icon className="w-5 h-5" />
                      <span>{item.label}</span>
                      <ChevronRight className="w-4 h-4 ml-auto" />
                    </Link>
                  ))}
                </div>

                {/* 카테고리 목록 (로그인 상태에서도 표시) */}
                {categories.length > 0 && (
                  <div className="space-y-1 mb-6">
                    <h4 className="text-gray-400 text-sm font-medium px-3 mb-2">{t('navigation.categories')}</h4>
                    {categories.map((category) => (
                      <Link
                        key={category.slug}
                        href={`/?category=${category.slug}`}
                        className="flex items-center space-x-3 p-3 text-gray-700 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors duration-200"
                        onClick={onClose}
                      >
                        <Tag className="w-5 h-5" />
                        <span>{category.name}</span>
                        <ChevronRight className="w-4 h-4 ml-auto" />
                      </Link>
                    ))}
                  </div>
                )}

                {/* 일반 메뉴 */}
                <div className="space-y-1">
                  <h4 className="text-gray-400 text-sm font-medium px-3 mb-2">{t('navigation.general')}</h4>
                  {generalMenuItems.map((item, index) => (
                    <Link
                      key={index}
                      href={item.href}
                      className="flex items-center space-x-3 p-3 text-gray-700 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors duration-200"
                      onClick={onClose}
                    >
                      <item.icon className="w-5 h-5" />
                      <span>{item.label}</span>
                      <ChevronRight className="w-4 h-4 ml-auto" />
                    </Link>
                  ))}
                </div>

                {/* 로그아웃 */}
                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <button 
                    type="button"
                    onClick={handleLogout}
                    className="w-full flex items-center space-x-3 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-left p-3 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors duration-200"
                  >
                    <LogOut className="w-5 h-5" />
                    <span>{t('navigation.logout')}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default SlideMenu;
