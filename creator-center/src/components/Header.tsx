'use client'

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Home, User, Settings, LogOut, ChevronDown, BarChart3, HelpCircle, MessageSquare } from 'lucide-react';

const Header = () => {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* 로고 */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">A</span>
            </div>
            <span className="text-xl font-bold text-gray-900">ARATA 작가센터</span>
          </Link>

          {/* 네비게이션 메뉴 */}
          <nav className="flex items-center space-x-6">
            <Link 
              href="/" 
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors duration-200"
            >
              <Home className="w-4 h-4" />
              <span>대시보드</span>
            </Link>
            <Link 
              href="/upload" 
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors duration-200"
            >
              <span>웹툰 업로드</span>
            </Link>
            <Link 
              href="/manage" 
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors duration-200"
            >
              <span>작품 관리</span>
            </Link>
            <Link 
              href="/statistics" 
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors duration-200"
            >
              <BarChart3 className="w-4 h-4" />
              <span>통계</span>
            </Link>
            <Link 
              href="/comments" 
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors duration-200"
            >
              <MessageSquare className="w-4 h-4" />
              <span>댓글 관리</span>
            </Link>
            <Link 
              href="/help" 
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors duration-200"
            >
              <HelpCircle className="w-4 h-4" />
              <span>도움말</span>
            </Link>
          </nav>

          {/* 우측 메뉴 */}
          <div className="flex items-center space-x-4">
            <Link
              href="http://localhost:4000"
              target="_blank"
              className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg hover:opacity-90 transition-colors duration-200"
            >
              ARATA 메인으로
            </Link>
            
            {/* 프로필 드롭다운 */}
            <div className="relative">
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors duration-200 p-2 rounded-lg hover:bg-gray-100"
              >
                <User className="w-5 h-5" />
                <span>{user?.username || '사용자'}</span>
                <ChevronDown className="w-4 h-4" />
              </button>

              {showDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <div className="text-sm font-medium text-gray-900">
                      {user?.username || '사용자'}
                    </div>
                    <div className="text-xs text-gray-500">{user?.email}</div>
                  </div>
                  <Link
                    href="/settings"
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    설정
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-100 flex items-center"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    로그아웃
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;