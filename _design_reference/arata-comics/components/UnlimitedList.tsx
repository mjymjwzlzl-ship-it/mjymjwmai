import React, { useState, useRef, useEffect } from 'react';
import { LATEST_WEBTOONS, CATEGORIES_ADULT, CATEGORIES_GENERAL } from '../constants';
import WebtoonListItem from './WebtoonListItem';
import { Palette, PenTool, User, Heart, Check, Filter, ArrowUpDown, ChevronDown, Search, X, Book, Smartphone, Gift, Unlock } from 'lucide-react';
import { useTheme } from './ThemeContext';

type SortOption = 'date' | 'views' | 'likes';

const UnlimitedList: React.FC = () => {
  const { isAdult } = useTheme();
  const [activeCategory, setActiveCategory] = useState("전체");
  
  // Search State
  const [searchQuery, setSearchQuery] = useState("");

  // Filters for Type (Color/BW), Format (Comics/Webtoon), and Audience (Male/Female)
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<string | null>(null);
  const [selectedAudience, setSelectedAudience] = useState<string | null>(null);
  const [selectedFreeType, setSelectedFreeType] = useState<'completely_free' | 'first_episode_free' | null>(null);

  // Sorting
  const [sortBy, setSortBy] = useState<SortOption>('date');
  const [isSortOpen, setIsSortOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);

  // Determine current categories based on isAdult
  const categories = isAdult ? CATEGORIES_ADULT : CATEGORIES_GENERAL;

  // Reset active category if it doesn't exist in the new list (when switching modes)
  useEffect(() => {
    if (!categories.includes(activeCategory)) {
        setActiveCategory("전체");
    }
  }, [isAdult, categories, activeCategory]);

  // Close sort dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(event.target as Node)) {
        setIsSortOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const toggleType = (type: string) => {
    if (selectedType === type) setSelectedType(null);
    else setSelectedType(type);
  };

  const toggleFormat = (format: string) => {
    if (selectedFormat === format) setSelectedFormat(null);
    else setSelectedFormat(format);
  };

  const toggleAudience = (audience: string) => {
    if (selectedAudience === audience) setSelectedAudience(null);
    else setSelectedAudience(audience);
  };

  const toggleFreeType = (type: 'completely_free' | 'first_episode_free') => {
    if (selectedFreeType === type) setSelectedFreeType(null);
    else setSelectedFreeType(type);
  };

  const handleSortChange = (option: SortOption) => {
    setSortBy(option);
    setIsSortOpen(false);
  };

  const clearSearch = () => setSearchQuery("");

  // Filter and Sort Data
  const getFilteredAndSortedWebtoons = () => {
    let result = [...LATEST_WEBTOONS];

    // STRICT MODE FILTERING:
    // If isAdult is TRUE, show ONLY items where isAdult === true
    // If isAdult is FALSE, show ONLY items where isAdult !== true (undefined or false)
    if (isAdult) {
        result = result.filter(w => w.isAdult);
    } else {
        result = result.filter(w => !w.isAdult);
    }

    // 1. Search Filter
    if (searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase();
        result = result.filter(w => 
            w.title.toLowerCase().includes(query) || 
            w.author.toLowerCase().includes(query) ||
            w.tags?.some(tag => tag.toLowerCase().includes(query))
        );
    }

    // 2. Category Filter
    if (activeCategory !== "전체") {
        // Simple mock filter: if category is in tags (case insensitive)
        result = result.filter(w => w.tags?.includes(activeCategory) || w.tags?.some(t => t.includes(activeCategory)));
    }

    // 3. Free Type Filter
    if (selectedFreeType) {
        result = result.filter(w => w.freeType === selectedFreeType);
    }

    // 4. Sort Logic
    result.sort((a, b) => {
        if (sortBy === 'views') {
            return b.views - a.views;
        } else if (sortBy === 'likes') {
            return (b.likes || 0) - (a.likes || 0);
        } else {
            // Date sort
            if (a.updatedAt && b.updatedAt) {
                return b.updatedAt.localeCompare(a.updatedAt);
            }
            return 0;
        }
    });

    return result;
  };

  const filteredWebtoons = getFilteredAndSortedWebtoons();

  const sortLabels: Record<SortOption, string> = {
    date: '날짜순',
    views: '조회순',
    likes: '추천순'
  };

  return (
    <div className="bg-white dark:bg-arata-dark rounded-xl shadow-lg border border-gray-200 dark:border-arata-gray overflow-hidden transition-colors">
      
      {/* Header & Search & Filter Area */}
      <div className="border-b border-gray-100 dark:border-arata-gray">
        
        {/* Search Bar Row */}
        <div className="p-5 pb-0">
            <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-arata-green transition-colors">
                    <Search size={20} />
                </div>
                <input 
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="작품명, 작가명, 태그로 검색해보세요"
                    className="w-full pl-10 pr-10 py-3 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-gray-700 rounded-xl text-sm md:text-base text-gray-900 dark:text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-arata-green/50 focus:border-arata-green transition-all"
                />
                {searchQuery && (
                    <button 
                        onClick={clearSearch}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                    >
                        <X size={18} />
                    </button>
                )}
            </div>
        </div>

        {/* Top Controls Row */}
        <div className="p-5 pb-2 flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Left: Filter Buttons */}
            <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500 mr-2">
                    <Filter size={16} />
                    <span className="text-xs font-bold uppercase tracking-wider">Option</span>
                </div>

                {/* Free Type Group */}
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => toggleFreeType('completely_free')}
                        className={`group flex items-center gap-1.5 px-3 py-1.5 md:px-4 md:py-2 rounded-full text-xs md:text-sm font-bold transition-all duration-200 border ${
                            selectedFreeType === 'completely_free' 
                            ? 'bg-indigo-500 border-indigo-500 text-white shadow-md shadow-indigo-500/20' 
                            : 'bg-white dark:bg-arata-dark border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-400'
                        }`}
                    >
                        {selectedFreeType === 'completely_free' ? <Check size={14} strokeWidth={3} /> : <Gift size={14} />}
                        완전무료
                    </button>
                    <button 
                        onClick={() => toggleFreeType('first_episode_free')}
                        className={`group flex items-center gap-1.5 px-3 py-1.5 md:px-4 md:py-2 rounded-full text-xs md:text-sm font-bold transition-all duration-200 border ${
                            selectedFreeType === 'first_episode_free' 
                            ? 'bg-teal-500 border-teal-500 text-white shadow-md shadow-teal-500/20' 
                            : 'bg-white dark:bg-arata-dark border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-teal-400 hover:text-teal-500 dark:hover:text-teal-400'
                        }`}
                    >
                        {selectedFreeType === 'first_episode_free' ? <Check size={14} strokeWidth={3} /> : <Unlock size={14} />}
                        1화 무료
                    </button>
                </div>

                {/* Vertical Divider (Hidden on small mobile) */}
                <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1 hidden sm:block"></div>

                {/* Format Group (Comics/Webtoon) */}
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => toggleFormat('webtoon')}
                        className={`group flex items-center gap-1.5 px-3 py-1.5 md:px-4 md:py-2 rounded-full text-xs md:text-sm font-bold transition-all duration-200 border ${
                            selectedFormat === 'webtoon' 
                            ? 'bg-purple-500 border-purple-500 text-white shadow-md shadow-purple-500/20' 
                            : 'bg-white dark:bg-arata-dark border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-purple-400 hover:text-purple-500 dark:hover:text-purple-400'
                        }`}
                    >
                        {selectedFormat === 'webtoon' ? <Check size={14} strokeWidth={3} /> : <Smartphone size={14} />}
                        웹툰
                    </button>
                    <button 
                        onClick={() => toggleFormat('comics')}
                        className={`group flex items-center gap-1.5 px-3 py-1.5 md:px-4 md:py-2 rounded-full text-xs md:text-sm font-bold transition-all duration-200 border ${
                            selectedFormat === 'comics' 
                            ? 'bg-orange-500 border-orange-500 text-white shadow-md shadow-orange-500/20' 
                            : 'bg-white dark:bg-arata-dark border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-orange-400 hover:text-orange-500 dark:hover:text-orange-400'
                        }`}
                    >
                        {selectedFormat === 'comics' ? <Check size={14} strokeWidth={3} /> : <Book size={14} />}
                        코믹스
                    </button>
                </div>

                {/* Vertical Divider (Hidden on small mobile) */}
                <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1 hidden sm:block"></div>

                {/* Type Group */}
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => toggleType('color')}
                        className={`group flex items-center gap-1.5 px-3 py-1.5 md:px-4 md:py-2 rounded-full text-xs md:text-sm font-bold transition-all duration-200 border ${
                            selectedType === 'color' 
                            ? 'bg-green-500 border-green-500 text-white shadow-md shadow-green-500/20' 
                            : 'bg-white dark:bg-arata-dark border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-green-400 hover:text-green-500 dark:hover:text-green-400'
                        }`}
                    >
                        {selectedType === 'color' ? <Check size={14} strokeWidth={3} /> : <Palette size={14} />}
                        칼라만화
                    </button>
                    <button 
                        onClick={() => toggleType('bw')}
                        className={`group flex items-center gap-1.5 px-3 py-1.5 md:px-4 md:py-2 rounded-full text-xs md:text-sm font-bold transition-all duration-200 border ${
                            selectedType === 'bw' 
                            ? 'bg-gray-800 border-gray-800 text-white shadow-md dark:bg-white dark:text-black dark:border-white' 
                            : 'bg-white dark:bg-arata-dark border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-800 hover:text-gray-900 dark:hover:text-white'
                        }`}
                    >
                        {selectedType === 'bw' ? <Check size={14} strokeWidth={3} /> : <PenTool size={14} />}
                        흑백만화
                    </button>
                </div>

                {/* Vertical Divider (Hidden on small mobile) */}
                <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1 hidden sm:block"></div>

                {/* Audience Group */}
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => toggleAudience('male')}
                        className={`group flex items-center gap-1.5 px-3 py-1.5 md:px-4 md:py-2 rounded-full text-xs md:text-sm font-bold transition-all duration-200 border ${
                            selectedAudience === 'male' 
                            ? 'bg-blue-500 border-blue-500 text-white shadow-md shadow-blue-500/20' 
                            : 'bg-white dark:bg-arata-dark border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-blue-400 hover:text-blue-500 dark:hover:text-blue-400'
                        }`}
                    >
                        {selectedAudience === 'male' ? <Check size={14} strokeWidth={3} /> : <User size={14} />}
                        남성향
                    </button>
                    <button 
                        onClick={() => toggleAudience('female')}
                        className={`group flex items-center gap-1.5 px-3 py-1.5 md:px-4 md:py-2 rounded-full text-xs md:text-sm font-bold transition-all duration-200 border ${
                            selectedAudience === 'female' 
                            ? 'bg-pink-500 border-pink-500 text-white shadow-md shadow-pink-500/20' 
                            : 'bg-white dark:bg-arata-dark border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-pink-400 hover:text-pink-500 dark:hover:text-pink-400'
                        }`}
                    >
                        {selectedAudience === 'female' ? <Check size={14} strokeWidth={3} /> : <Heart size={14} />}
                        여성향
                    </button>
                </div>
            </div>

            {/* Right: Sort Dropdown */}
            <div className="relative flex justify-end" ref={sortRef}>
                <button 
                    onClick={() => setIsSortOpen(!isSortOpen)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors border border-transparent hover:border-gray-200 dark:hover:border-gray-700"
                >
                    <ArrowUpDown size={14} className="text-gray-400" />
                    <span>{sortLabels[sortBy]}</span>
                    <ChevronDown size={14} className={`text-gray-400 transition-transform duration-200 ${isSortOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {isSortOpen && (
                    <div className="absolute top-full right-0 mt-2 w-32 bg-white dark:bg-[#1e2329] rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden z-20 animate-fade-in-down">
                        {(Object.keys(sortLabels) as SortOption[]).map((option) => (
                            <button
                                key={option}
                                onClick={() => handleSortChange(option)}
                                className={`w-full text-left px-4 py-3 text-sm font-medium transition-colors flex items-center justify-between ${
                                    sortBy === option 
                                    ? 'bg-gray-50 dark:bg-white/5 text-arata-green' 
                                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5'
                                }`}
                            >
                                {sortLabels[option]}
                                {sortBy === option && <Check size={14} />}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>

        {/* Categories Scroll */}
        <div className="px-5 pb-4 pt-2">
             <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                {categories.map((cat) => (
                    <button
                        key={cat}
                        onClick={() => setActiveCategory(cat)}
                        className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-bold transition-all duration-200 ${
                            activeCategory === cat
                            ? 'bg-arata-green text-black shadow-md shadow-green-500/10 ring-1 ring-arata-green dark:ring-offset-arata-dark' // Brand Green
                            : 'bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-black dark:hover:text-white'
                        }`}
                    >
                        {cat}
                    </button>
                ))}
            </div>
        </div>
      </div>

      {/* Webtoon List */}
      <div className="divide-y divide-gray-100 dark:divide-arata-gray/50">
        {filteredWebtoons.length > 0 ? (
            filteredWebtoons.map((webtoon) => (
            <WebtoonListItem key={webtoon.id} webtoon={webtoon} />
            ))
        ) : (
            <div className="p-10 text-center text-gray-500 dark:text-gray-400 text-sm">
                {searchQuery 
                    ? `"${searchQuery}"에 대한 검색 결과가 없습니다.` 
                    : !isAdult 
                        ? "19세 이상 웹툰을 보려면 성인 모드를 켜주세요."
                        : "조건에 맞는 웹툰이 없습니다."
                }
            </div>
        )}
      </div>
      
      {/* Pagination */}
      <div className="p-8 flex justify-center gap-2 border-t border-gray-100 dark:border-arata-gray/50">
         {[1, 2, 3, 4, 5].map(num => (
             <button key={num} className={`w-9 h-9 flex items-center justify-center rounded-lg font-bold text-sm transition-all ${num === 1 ? 'bg-arata-green text-black shadow-lg shadow-green-500/20' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10 dark:text-gray-400'}`}>
                 {num}
             </button>
         ))}
      </div>
    </div>
  );
};

export default UnlimitedList;