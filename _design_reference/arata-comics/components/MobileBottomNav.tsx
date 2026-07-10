import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, Library, Coins, BookOpen, ClipboardList, Image, PlaySquare } from 'lucide-react';
import { useTheme } from './ThemeContext';

const MobileBottomNav: React.FC = () => {
  const location = useLocation();
  const { isAdult } = useTheme();
  
  // Hide bottom nav inside webtoon viewer for immersion
  if (location.pathname.includes('/webtoon/')) {
    return null;
  }

  const navItems = [
    { id: 'home', label: '홈', path: '/', icon: Home },
    { id: 'unlimited', label: '무제한', path: '/unlimited', icon: Library },
    { id: 'novel', label: '소설', path: '/novel', icon: BookOpen },
    { id: 'gallery', label: '화보', path: '/gallery', icon: Image },
    { id: 'shorts', label: '숏추', path: '/shorts', icon: PlaySquare, isAdultOnly: true }, // Added Shorts
    { id: 'board', label: '게시판', path: '/board', icon: ClipboardList },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-[#1e1e1e] border-t border-gray-200 dark:border-gray-800 z-50 pb-safe transition-colors duration-300">
      <div className="flex justify-around items-center h-16 px-1 overflow-x-auto no-scrollbar">
        {navItems.map((item) => {
            // Hide adult-only items if not in adult mode
            if (item.isAdultOnly && !isAdult) return null;

            return (
              <NavLink
                key={item.id}
                to={item.path}
                className={({ isActive }) => `
                  flex flex-col items-center justify-center w-full h-full space-y-1
                  transition-colors duration-200 min-w-[60px]
                  ${isActive 
                    ? 'text-arata-green' 
                    : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'}
                `}
              >
                {({ isActive }) => (
                    <>
                        <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                        <span className={`text-[9px] sm:text-[10px] font-medium truncate w-full text-center ${isActive ? 'font-bold' : ''}`}>
                            {item.label}
                        </span>
                    </>
                )}
              </NavLink>
            );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;