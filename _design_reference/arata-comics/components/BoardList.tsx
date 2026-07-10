import React from 'react';
import { BOARD_POSTS } from '../constants';
import { MessageSquare, Eye } from 'lucide-react';

const BoardList: React.FC = () => {
  return (
    <div className="bg-white dark:bg-arata-dark rounded-lg shadow-lg border border-gray-200 dark:border-arata-gray overflow-hidden transition-colors">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-arata-gray bg-gray-50 dark:bg-[#252525] flex justify-between items-center">
            <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">자유게시판</h2>
                <p className="text-gray-600 dark:text-gray-400 text-sm">유저들과 자유롭게 이야기를 나누어보세요.</p>
            </div>
            <button className="bg-arata-green text-black px-4 py-2 rounded font-bold hover:bg-green-400 transition-colors text-sm">
                글쓰기
            </button>
        </div>

      {/* Board Table */}
      <div className="w-full">
        {/* Table Header - Hidden on mobile */}
        <div className="hidden md:flex bg-gray-100 dark:bg-arata-black text-gray-500 dark:text-gray-400 text-sm border-b border-gray-200 dark:border-arata-gray font-medium">
            <div className="w-16 py-3 text-center">번호</div>
            <div className="w-20 py-3 text-center">분류</div>
            <div className="flex-1 py-3 px-4">제목</div>
            <div className="w-24 py-3 text-center">글쓴이</div>
            <div className="w-24 py-3 text-center">날짜</div>
            <div className="w-20 py-3 text-center">조회</div>
        </div>

        {/* Table Body */}
        <div>
            {BOARD_POSTS.map((post) => (
                <div 
                    key={post.id} 
                    className={`flex flex-col md:flex-row md:items-center border-b border-gray-200 dark:border-arata-gray hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer ${post.isNotice ? 'bg-red-50 dark:bg-red-900/10' : ''}`}
                >
                    {/* Mobile: Top Row (Category + Title) */}
                    <div className="flex-1 p-4 md:py-3 md:px-0 md:flex md:items-center">
                        
                        {/* Desktop Only Columns */}
                        <div className="hidden md:block w-16 text-center text-gray-600 dark:text-gray-500 text-xs">
                            {post.isNotice ? <span className="bg-red-600 text-white px-1.5 py-0.5 rounded text-[10px]">공지</span> : post.id}
                        </div>
                        <div className="hidden md:block w-20 text-center text-gray-500 dark:text-gray-400 text-xs">
                            {post.category}
                        </div>

                        {/* Title Section */}
                        <div className="flex-1 md:px-4 flex items-center gap-2">
                             {/* Mobile Only Badges */}
                            <span className="md:hidden">
                                {post.isNotice && <span className="bg-red-600 text-white px-1.5 py-0.5 rounded text-[10px] mr-2">공지</span>}
                                <span className="text-arata-green text-xs mr-1">[{post.category}]</span>
                            </span>
                            
                            <span className={`text-sm md:text-base ${post.isNotice ? 'font-bold text-gray-900 dark:text-white' : 'text-gray-800 dark:text-gray-200'}`}>
                                {post.title}
                            </span>
                            
                            {post.commentCount && post.commentCount > 0 && (
                                <div className="flex items-center gap-0.5 text-arata-green text-xs font-bold">
                                    <MessageSquare size={12} fill="currentColor" />
                                    <span>{post.commentCount}</span>
                                </div>
                            )}
                        </div>
                        
                        {/* Mobile: Bottom Row (Info) */}
                        <div className="mt-2 md:mt-0 flex items-center gap-3 text-xs text-gray-500 md:hidden">
                            <span>{post.author}</span>
                            <span>{post.date}</span>
                            <div className="flex items-center gap-1">
                                <Eye size={12} />
                                <span>{post.views}</span>
                            </div>
                        </div>

                    </div>

                    {/* Desktop Only Columns (Right side) */}
                    <div className="hidden md:block w-24 text-center text-gray-500 dark:text-gray-400 text-sm">{post.author}</div>
                    <div className="hidden md:block w-24 text-center text-gray-500 text-xs">{post.date}</div>
                    <div className="hidden md:block w-20 text-center text-gray-500 text-xs">{post.views}</div>
                </div>
            ))}
        </div>
      </div>
      
      {/* Search Bar */}
      <div className="p-4 bg-gray-50 dark:bg-[#202020] border-t border-gray-200 dark:border-arata-gray flex justify-center">
          <div className="flex w-full max-w-md gap-2">
              <select className="bg-white dark:bg-arata-black border border-gray-300 dark:border-arata-gray text-gray-900 dark:text-gray-300 text-sm rounded px-2 py-2 outline-none focus:border-arata-green">
                  <option>제목</option>
                  <option>글쓴이</option>
                  <option>내용</option>
              </select>
              <input 
                type="text" 
                placeholder="검색어를 입력하세요" 
                className="flex-1 bg-white dark:bg-arata-black border border-gray-300 dark:border-arata-gray text-gray-900 dark:text-white text-sm rounded px-3 py-2 outline-none focus:border-arata-green placeholder-gray-500 dark:placeholder-gray-600"
              />
              <button className="bg-gray-700 text-white px-4 py-2 rounded text-sm hover:bg-gray-600">검색</button>
          </div>
      </div>
    </div>
  );
};

export default BoardList;