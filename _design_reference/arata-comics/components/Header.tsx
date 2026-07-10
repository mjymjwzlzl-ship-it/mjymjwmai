import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Search, Clock, User, Coins, LogOut, Settings, Library, CreditCard, ChevronRight, Sun, Moon, UserPlus, HelpCircle, Megaphone, Headphones, Heart } from 'lucide-react';
import { MENU_ITEMS } from '../constants';
import { useTheme } from './ThemeContext';
import SignUpModal from './SignUpModal';
import LoginModal from './LoginModal';

const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isVip, setIsVip] = useState(false); // Mock state for Arata Plus subscription
  const [isLoggedIn, setIsLoggedIn] = useState(false); // Default to false for demo
  
  // Auth Modal State Management
  const [authModal, setAuthModal] = useState<'none' | 'login' | 'signup'>('none');

  const dropdownRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const { isDarkMode, toggleTheme, isAdult, toggleAdult } = useTheme();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const toggleVip = () => setIsVip(!isVip);

  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
    setAuthModal('none');
  };

  // Handle Logout: Reset login state and force 19+ mode to OFF for safety
  const handleLogout = () => {
      setIsLoggedIn(false);
      if (isAdult) {
          toggleAdult();
      }
  };

  // Handle 19+ Toggle: Require login to turn ON
  const handleAdultToggle = () => {
      if (isAdult) {
          // If turning OFF, allow it immediately
          toggleAdult();
      } else {
          // If turning ON, check login status
          if (!isLoggedIn) {
              setAuthModal('login');
          } else {
              toggleAdult();
          }
      }
  };

  return (
    <>
    <header className="sticky top-0 z-50 shadow-md bg-white dark:bg-arata-black border-b border-gray-200 dark:border-arata-gray transition-colors duration-300">
      {/* Top Brand Bar */}
      <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center relative">
        {/* Left: Brand */}
        <div className="flex items-center gap-4">
          <Link to="/" className="text-2xl font-black text-arata-green tracking-tighter uppercase flex items-center gap-1">
            ARATA COMICS
          </Link>
        </div>
        
        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          
          {/* Theme Toggle */}
          <button 
            onClick={toggleTheme}
            className="p-2 text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-white/10"
          >
            {isDarkMode ? <Sun size={22} /> : <Moon size={22} />}
          </button>

          {/* 19+ Toggle (Restricted) */}
          <button 
            onClick={handleAdultToggle}
            className={`hidden md:flex items-center justify-center px-3 py-1 rounded-full text-xs font-bold border transition-colors ${
              isAdult 
                ? 'border-red-500 text-red-500 bg-red-50 dark:bg-black/50 shadow-[0_0_10px_rgba(239,68,68,0.3)]' 
                : 'border-gray-300 dark:border-gray-600 text-gray-500 bg-transparent hover:border-arata-green hover:text-arata-green'
            }`}
          >
            19 {isAdult ? 'ON' : 'OFF'}
          </button>

          {/* Check-in Button */}
          <button className="hidden md:flex items-center justify-center px-4 py-1 rounded-full text-xs font-medium border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-arata-green hover:text-arata-green transition-colors bg-gray-100 dark:bg-arata-gray">
            출첵
          </button>

          {/* Icons */}
          <button className="p-2 text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors">
            <Search size={22} />
          </button>
          
          <button className="p-2 text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors hidden md:block">
            <Clock size={22} />
          </button>

          {/* Hamburger Menu (Triggers Profile Dropdown) */}
          <div className="relative" ref={dropdownRef}>
            <button 
              className={`p-2 transition-colors rounded-full ${isMenuOpen ? 'bg-gray-100 dark:bg-arata-gray text-black dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white'}`}
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            {/* Menu Dropdown */}
            {isMenuOpen && (
              <div className="absolute right-0 top-full mt-3 w-80 bg-white dark:bg-[#1e2329] border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden text-sm animate-fade-in-down max-h-[80vh] overflow-y-auto no-scrollbar">
                
                {isLoggedIn ? (
                  /* Logged In State */
                  <>
                    {/* User Info Header */}
                    <div className="p-5 border-b border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-base font-bold text-gray-900 dark:text-white">사용자2171</h3>
                        {isVip && <span className="text-[10px] bg-arata-green text-black px-1.5 py-0.5 rounded font-bold">VIP</span>}
                      </div>
                      <p className="text-gray-500 dark:text-gray-400 text-xs mb-3">mjymjwzlzl@gmail.com</p>
                      
                    </div>

                    {/* Arata Plus Status */}
                    <div className="p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gradient-to-r dark:from-gray-800 dark:to-gray-900">
                        {isVip ? (
                            <div className="flex items-center justify-between text-arata-green">
                                <span className="font-bold flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-arata-green animate-pulse"></span>
                                    아라타 코믹스 Plus 적용중
                                </span>
                                <button onClick={toggleVip} className="text-xs text-gray-500 underline decoration-gray-400 dark:decoration-gray-600">해지</button>
                            </div>
                        ) : (
                            <button 
                                onClick={toggleVip}
                                className="w-full flex items-center justify-between bg-arata-green text-black font-bold py-2 px-3 rounded hover:bg-green-400 transition-colors"
                            >
                                <span>아라타 코믹스 Plus 가입하기</span>
                                <ChevronRight size={16} />
                            </button>
                        )}
                    </div>

                    {/* Menu Links - Compact */}
                    <div className="py-1">
                      <a href="#" className="flex items-center gap-3 px-5 py-2.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-black dark:hover:text-white transition-colors">
                        <User size={16} /> 내 프로필
                      </a>
                      <a href="#" className="flex items-center gap-3 px-5 py-2.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-black dark:hover:text-white transition-colors">
                        <Library size={16} /> 내 서재
                      </a>
                      <Link 
                        to="/liked" 
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center gap-3 px-5 py-2.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-black dark:hover:text-white transition-colors"
                      >
                        <Heart size={16} /> 좋아요한 작품
                      </Link>
                      <a href="#" className="flex items-center gap-3 px-5 py-2.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-black dark:hover:text-white transition-colors">
                        <Settings size={16} /> 설정
                      </a>
                    </div>

                    {/* Customer Center Section - Compact */}
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-2 pb-1">
                      <h4 className="px-5 py-1 text-[11px] font-bold text-gray-400 dark:text-gray-500 mb-0.5">고객센터</h4>
                      <Link 
                        to="/notice" 
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center justify-between px-5 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-arata-green dark:hover:text-arata-green transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                            <HelpCircle size={16} className="text-gray-400 group-hover:text-arata-green transition-colors" />
                            <span>자주 묻는 질문</span>
                        </div>
                        <ChevronRight size={14} className="text-gray-400" />
                      </Link>
                      <Link 
                        to="/notice" 
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center justify-between px-5 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-arata-green dark:hover:text-arata-green transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                            <Megaphone size={16} className="text-gray-400 group-hover:text-arata-green transition-colors" />
                            <span>공지사항</span>
                        </div>
                        <ChevronRight size={14} className="text-gray-400" />
                      </Link>
                      <Link 
                        to="/notice" 
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center justify-between px-5 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-arata-green dark:hover:text-arata-green transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                            <Headphones size={16} className="text-gray-400 group-hover:text-arata-green transition-colors" />
                            <span>1:1 문의</span>
                        </div>
                        <ChevronRight size={14} className="text-gray-400" />
                      </Link>
                    </div>

                    {/* Footer / Logout */}
                    <div className="border-t border-gray-200 dark:border-gray-700 p-1.5">
                      <button 
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded transition-colors text-left"
                      >
                        <LogOut size={16} /> 로그아웃
                      </button>
                    </div>
                  </>
                ) : (
                  /* Logged Out State */
                  <div className="p-6">
                    <div className="flex justify-end mb-4">
                        <button 
                          onClick={() => setIsMenuOpen(false)} 
                          className="text-gray-400 hover:text-black dark:hover:text-white transition-colors"
                        >
                          <X size={20} />
                        </button>
                    </div>

                    <div className="flex justify-between items-end mb-8">
                        <div className="text-gray-800 dark:text-gray-100 font-medium text-base leading-snug">
                            로그인하여<br/>
                            더 많은 정보를 확인해보세요.
                        </div>
                        <button 
                            onClick={() => {
                                setIsMenuOpen(false);
                                setAuthModal('signup');
                            }}
                            className="flex items-center gap-1 border border-arata-green text-arata-green dark:text-arata-green dark:border-arata-green rounded-full px-3 py-1.5 text-xs font-bold hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors whitespace-nowrap"
                        >
                            <UserPlus size={14} />
                            회원가입
                        </button>
                    </div>

                    <button 
                        onClick={() => {
                            setIsMenuOpen(false);
                            setAuthModal('login');
                        }}
                        className="w-full bg-arata-green text-black font-bold text-base py-3 rounded hover:bg-green-400 transition-colors mb-4 shadow-sm"
                    >
                        로그인
                    </button>
                    
                    {/* Guest Links */}
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                      <Link 
                        to="/liked" 
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center gap-2 py-2 text-gray-500 dark:text-gray-400 hover:text-arata-green text-sm"
                      >
                          <Heart size={16} /> 좋아요한 작품
                      </Link>
                      <Link 
                        to="/notice" 
                        onClick={() => setIsMenuOpen(false)}
                        className="block py-2 text-gray-500 dark:text-gray-400 hover:text-arata-green text-sm"
                      >
                          고객센터
                      </Link>
                      <Link 
                        to="/notice" 
                        onClick={() => setIsMenuOpen(false)}
                        className="block py-2 text-gray-500 dark:text-gray-400 hover:text-arata-green text-sm"
                      >
                          공지사항
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Navigation Bar (Dark + Green Highlight) */}
      <nav className="hidden md:block border-t border-gray-200 dark:border-arata-gray bg-white dark:bg-arata-dark">
        <div className="max-w-7xl mx-auto flex">
          {/* Nav Items */}
          <div className="flex flex-1">
            {MENU_ITEMS.map((item) => {
              // Hide 'shorts' if not in adult mode
              if (item.id === 'shorts' && !isAdult) return null;

              const isActive = location.pathname === item.path;
              return (
                <Link 
                  key={item.id} 
                  to={item.path}
                  className={`flex items-center px-8 py-4 font-medium transition-all text-base border-r border-gray-200 dark:border-arata-gray last:border-r-0 ${
                    isActive 
                      ? 'bg-gray-100 dark:bg-arata-gray text-arata-green' 
                      : 'text-gray-600 dark:text-gray-300 hover:text-arata-green hover:bg-gray-50 dark:hover:bg-arata-gray/50'
                  }`}
                >
                  <span className={`mr-2 group-hover:opacity-100 ${isActive ? 'opacity-100' : 'opacity-70'}`}>
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </header>

    {/* Auth Modals */}
    <SignUpModal 
        isOpen={authModal === 'signup'} 
        onClose={() => setAuthModal('none')} 
        onSwitchToLogin={() => setAuthModal('login')}
    />
    <LoginModal 
        isOpen={authModal === 'login'} 
        onClose={() => setAuthModal('none')}
        onSwitchToSignup={() => setAuthModal('signup')}
        onLogin={handleLoginSuccess}
    />
    </>
  );
};

export default Header;