'use client'

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogOut, Home, BarChart3, FileText, Users, Shield, TrendingUp, Edit, Mail, Book, AlertTriangle, CalendarDays } from 'lucide-react';

export default function AdminHeader() {
  const router = useRouter();
  const [adminName, setAdminName] = useState('관리자');
  const [unreadCount, setUnreadCount] = useState(1); // 더미 데이터로 1개 표시
  
  useEffect(() => {
    // 관리자 정보 로드
    const admin = localStorage.getItem('adminUser');
    if (admin) {
      const adminData = JSON.parse(admin);
      setAdminName(adminData.name || '관리자');
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    router.push('/login');
  };

  return (
    <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-50">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          {/* 로고 및 메뉴 */}
          <div className="flex items-center space-x-8">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">A</span>
              </div>
              <span className="text-xl font-bold text-white">관리자 센터</span>
            </Link>
            
            {/* 네비게이션 메뉴 */}
            <nav className="flex items-center space-x-6">
              <Link href="/" className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors">
                <Home className="w-4 h-4" />
                <span className="text-sm font-medium">대시보드</span>
              </Link>
              <Link href="/banners" className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors">
                <Edit className="w-4 h-4" />
                <span className="text-sm font-medium">배너 관리</span>
              </Link>
              <Link href="/events" className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors">
                <CalendarDays className="w-4 h-4" />
                <span className="text-sm font-medium">이벤트 관리</span>
              </Link>
              <Link href="/popular" className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm font-medium">인기작 관리</span>
              </Link>
              <Link href="/payment" className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors">
                <BarChart3 className="w-4 h-4" />
                <span className="text-sm font-medium">결제 관리</span>
              </Link>
              <Link href="/adult-settings" className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors">
                <Shield className="w-4 h-4" />
                <span className="text-sm font-medium">성인 설정</span>
              </Link>
              <Link href="/novels" className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors">
                <Book className="w-4 h-4" />
                <span className="text-sm font-medium">소설 관리</span>
              </Link>
              <Link href="/reports" className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm font-medium">신고 관리</span>
              </Link>
            </nav>
          </div>
          
          {/* 우측 메뉴 */}
          <div className="flex items-center space-x-4">
            {/* 메일함 */}
            <Link 
              href="/support"
              className="relative text-gray-300 hover:text-white transition-colors p-2"
              title="메일함"
            >
              <Mail className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                  {unreadCount}
                </span>
              )}
            </Link>
            
            {/* 구분선 */}
            <div className="h-6 w-px bg-gray-700" />
            
            {/* 관리자 정보 */}
            <div className="flex items-center space-x-3">
              <div className="text-right">
                <p className="text-sm text-white font-medium">{adminName}</p>
                <p className="text-xs text-gray-400">관리자</p>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors text-gray-300 hover:text-white"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm">로그아웃</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}