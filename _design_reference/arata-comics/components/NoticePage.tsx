import React, { useState } from 'react';
import { NOTICE_DATA } from '../constants';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const NoticePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('공지사항');

  return (
    <div className="max-w-4xl mx-auto bg-white dark:bg-arata-dark min-h-[calc(100vh-200px)] border-x border-gray-100 dark:border-arata-gray/50">
      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-arata-gray">
        {['공지사항', '자주묻는질문', '1:1 문의'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-4 text-center font-bold text-sm md:text-base relative transition-colors ${
              activeTab === tab
                ? 'text-gray-900 dark:text-white'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            {tab}
            {activeTab === tab && (
              <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-red-600"></div>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="bg-white dark:bg-arata-dark">
        {activeTab === '공지사항' ? (
          <div className="divide-y divide-gray-100 dark:divide-arata-gray/30">
            {NOTICE_DATA.map((notice) => (
              <div key={notice.id} className="flex justify-between items-center px-4 py-5 md:px-6 hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer transition-colors group">
                <span className="text-sm md:text-[15px] text-gray-800 dark:text-gray-200 truncate pr-4 group-hover:text-arata-green transition-colors">
                  {notice.title}
                </span>
                <span className="text-xs md:text-sm text-gray-400 whitespace-nowrap font-medium">
                  {notice.date}
                </span>
              </div>
            ))}
          </div>
        ) : (
             <div className="p-20 text-center text-gray-500 dark:text-gray-400">
                 {activeTab} 페이지 준비중입니다.
             </div>
        )}
      </div>

      {/* Pagination */}
      {activeTab === '공지사항' && (
        <div className="flex justify-center items-center gap-1.5 py-10">
            <button className="w-9 h-9 flex items-center justify-center border border-gray-300 dark:border-gray-600 rounded text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
                <ChevronLeft size={16} />
            </button>
            <button className="w-9 h-9 flex items-center justify-center bg-gray-500 text-white rounded font-bold shadow-sm">
                1
            </button>
             {[2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                 <button key={num} className="w-9 h-9 flex items-center justify-center border border-gray-300 dark:border-gray-600 rounded text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10 font-medium transition-colors text-sm">
                     {num}
                 </button>
             ))}
             <button className="w-9 h-9 flex items-center justify-center border border-gray-300 dark:border-gray-600 rounded text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
                <ChevronRight size={16} />
            </button>
        </div>
      )}
    </div>
  );
};

export default NoticePage;