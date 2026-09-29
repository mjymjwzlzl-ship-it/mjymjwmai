'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MessageCircle, ThumbsUp, Eye, Clock, User, Edit3, Shield, Search } from 'lucide-react';
import { api } from '@/lib/api';
import { useAdultStore } from '@/store/adult';

interface Post {
  id: string;
  title: string;
  content: string;
  author: string;
  authorId: string;
  category: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  createdAt: string;
  updatedAt: string;
  isPinned?: boolean;
}

export default function AdultCommunityPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [user, setUser] = useState<any>(null);
  const setAdult = useAdultStore((s) => s.setAdult);

  // 성인 인증 확인
  useEffect(() => {
    setAdult('on');
    const checkAdultVerification = async () => {
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        alert('성인 콘텐츠는 로그인 후 이용할 수 있습니다.');
        router.push('/login?redirect=/adult/community');
        return;
      }

      try {
        const response = await api.get('/users/me');
        setUser(response.data);
        
        if (response.data.adultVerified) {
          setIsVerified(true);
          fetchPosts();
        } else {
          alert('성인 인증이 필요합니다.');
          router.push('/');
        }
      } catch (error) {
        console.error('사용자 정보 확인 실패:', error);
        router.push('/');
      }
    };

    checkAdultVerification();
  }, [router]);

  useEffect(() => {
    if (isVerified) {
      fetchPosts();
    }
  }, [selectedCategory, isVerified]);

  const fetchPosts = async () => {
    try {
      const response = await api.get('/community/posts', {
        params: { 
          category: selectedCategory, 
          type: 'adult',
          search: searchQuery 
        }
      });
      setPosts(response.data.posts || []);
    } catch (error) {
      console.error('게시글 로드 실패:', error);
      // 임시 데이터
      setPosts([
        {
          id: '1',
          title: '🔞 성인 웹툰 추천 리스트',
          content: '19금 웹툰 추천합니다',
          author: '성인유저1',
          authorId: 'adult1',
          category: 'adult',
          viewCount: 542,
          likeCount: 65,
          commentCount: 22,
          createdAt: '2025-01-15T10:00:00Z',
          updatedAt: '2025-01-15T10:00:00Z',
          isPinned: true
        },
        {
          id: '2',
          title: '성인 소설 리뷰',
          content: '최근 읽은 성인 소설 후기',
          author: '리뷰어',
          authorId: 'adult2',
          category: 'review',
          viewCount: 228,
          likeCount: 33,
          commentCount: 18,
          createdAt: '2025-01-14T15:30:00Z',
          updatedAt: '2025-01-14T15:30:00Z'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    { value: 'all', label: '전체', icon: MessageCircle },
    { value: 'adult', label: '성인', icon: MessageCircle },
    { value: 'webtoon', label: '성인웹툰', icon: MessageCircle },
    { value: 'novel', label: '성인소설', icon: MessageCircle },
    { value: 'review', label: '리뷰', icon: MessageCircle },
    { value: 'free', label: '자유', icon: MessageCircle },
  ];

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (hours < 1) return '방금 전';
    if (hours < 24) return `${hours}시간 전`;
    if (hours < 168) return `${Math.floor(hours / 24)}일 전`;
    return date.toLocaleDateString();
  };

  const handleNewPost = () => {
    if (!user) {
      alert('로그인이 필요합니다.');
      router.push('/login');
      return;
    }
    router.push('/adult/community/write');
  };

  if (!isVerified) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 mx-auto mb-4 text-red-400" />
          <h2 className="text-2xl font-bold text-white mb-2">성인 인증이 필요합니다</h2>
          <p className="text-gray-400">성인 콘텐츠를 보시려면 연령 인증을 완료해주세요.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* 성인 커뮤니티 공지 배너 */}
      <div className="bg-gradient-to-r from-red-600 to-pink-600 py-2">
        <div className="container mx-auto px-4 text-center">
          <p className="text-white font-medium text-sm">
            🔞 만 19세 이상만 이용 가능한 성인 커뮤니티입니다
          </p>
        </div>
      </div>

      {/* 헤더 */}
      <div className="bg-gradient-to-r from-red-700 to-red-900 py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-white">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-8 h-8" />
                <span className="bg-white text-red-700 text-xs font-bold px-2 py-1 rounded">19+</span>
              </div>
              <div>
                <h1 className="text-3xl font-bold">성인 커뮤니티</h1>
                <p className="text-red-100 mt-1">성인 전용 소통 공간</p>
              </div>
            </div>
            <button
              onClick={handleNewPost}
              className="bg-white text-red-700 px-4 py-2 rounded-lg font-medium hover:bg-red-50 transition-colors flex items-center gap-2"
            >
              <Edit3 className="w-4 h-4" />
              글쓰기
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* 검색 바 */}
        <div className="mb-6">
          <div className="relative max-w-xl mx-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="게시글 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
        </div>

        {/* 카테고리 탭 */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {categories.map(cat => (
            <button
              key={cat.value}
              onClick={() => setSelectedCategory(cat.value)}
              className={`px-4 py-2 rounded-full whitespace-nowrap transition-colors ${
                selectedCategory === cat.value
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* 게시글 목록 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border-l-4 border-red-600">
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {posts.map(post => (
              <div
                key={post.id}
                className="p-4 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors cursor-pointer"
                onClick={() => router.push(`/adult/community/post/${post.id}`)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {post.isPinned && (
                        <span className="bg-red-600 text-white text-xs px-2 py-1 rounded">
                          공지
                        </span>
                      )}
                      <span className="bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-200 text-xs px-2 py-1 rounded">
                        {categories.find(c => c.value === post.category)?.label || '자유'}
                      </span>
                      <span className="bg-gray-800 text-white text-xs px-2 py-1 rounded font-bold">
                        19+
                      </span>
                    </div>
                    
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                      {post.title}
                    </h3>
                    
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
                      {post.content}
                    </p>
                    
                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {post.author}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(post.createdAt)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {post.viewCount}
                      </span>
                      <span className="flex items-center gap-1">
                        <ThumbsUp className="w-3 h-3" />
                        {post.likeCount}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="w-3 h-3" />
                        {post.commentCount}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {posts.length === 0 && (
          <div className="text-center py-12">
            <MessageCircle className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500 dark:text-gray-400">아직 게시글이 없습니다.</p>
            <button
              onClick={handleNewPost}
              className="mt-4 text-red-600 hover:text-red-700"
            >
              첫 게시글을 작성해보세요!
            </button>
          </div>
        )}
      </div>
    </div>
  );
}