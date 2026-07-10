'use client'

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Home, 
  Upload, 
  BookOpen, 
  BarChart3, 
  MessageSquare, 
  Settings, 
  HelpCircle 
} from 'lucide-react';

const Sidebar = () => {
  const pathname = usePathname();

  const menuItems = [
    { icon: Home, label: '대시보드', href: '/' },
    { icon: Upload, label: '웹툰 업로드', href: '/upload' },
    { icon: BookOpen, label: '작품 관리', href: '/manage' },
    { icon: BarChart3, label: '통계', href: '/statistics' },
    { icon: MessageSquare, label: '댓글 관리', href: '/comments' },
    { icon: Settings, label: '설정', href: '/settings' },
    { icon: HelpCircle, label: '도움말', href: '/help' },
  ];

  return (
    <aside className="fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 bg-white border-r border-gray-200 overflow-y-auto">
      <div className="p-4">
        <nav className="space-y-2">
          {menuItems.map((item, index) => (
            <Link
              key={index}
              href={item.href}
              className={`
                flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors duration-200
                ${pathname === item.href 
                  ? 'bg-purple-100 text-purple-700 border-r-2 border-purple-500' 
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }
              `}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </Link>
          ))}
        </nav>
      </div>
    </aside>
  );
};

export default Sidebar;