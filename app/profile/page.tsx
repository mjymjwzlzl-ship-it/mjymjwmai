'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, BookOpen, Clock, Heart, LogOut, Settings, User } from 'lucide-react';
import { api } from '@/lib/api';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState({
    readWebtoons: 0,
    likedWebtoons: 0,
    recentlyViewed: [],
  });

  useEffect(() => {
    const userData = localStorage.getItem('user');
    const token = localStorage.getItem('authToken') || localStorage.getItem('token');

    if (userData && token) {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      loadUserStats();
    } else {
      router.push('/login');
    }
  }, [router]);

  const loadUserStats = async () => {
    try {
      const readingResponse = await api.get('/users/library/reading');
      const likedResponse = await api.get('/users/library/liked');

      setStats({
        readWebtoons: readingResponse.data?.webtoons?.length || 0,
        likedWebtoons: likedResponse.data?.webtoons?.length || 0,
        recentlyViewed: readingResponse.data?.webtoons?.slice(0, 5) || [],
      });
    } catch (error) {
      console.error('사용자 통계 로드 실패:', error);
      setStats({ readWebtoons: 0, likedWebtoons: 0, recentlyViewed: [] });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/');
  };

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-[#141414]">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-[#00dc64]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-950 transition-colors dark:bg-[#141414] dark:text-white">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/95 backdrop-blur-sm dark:border-gray-800 dark:bg-[#141414]/95">
        <div className="mx-auto max-w-4xl px-4">
          <div className="flex h-16 items-center">
            <button
              onClick={() => router.back()}
              className="mr-6 flex items-center gap-2 text-sm font-bold text-gray-500 transition hover:text-[#00a84c] dark:text-gray-400 dark:hover:text-[#00dc64]"
            >
              <ArrowLeft className="h-5 w-5" />
              뒤로
            </button>
            <h1 className="text-xl font-black">프로필</h1>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-8">
        <section className="mb-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-[#1b1b1b]">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#00dc64]">
                <User className="h-10 w-10 text-black" />
              </div>
              <div>
                <h2 className="text-2xl font-black">{user.nickname || user.name || user.username || '사용자'}</h2>
                <p className="text-gray-500 dark:text-gray-400">{user.email}</p>
                <div className="mt-2 flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                  <span>가입일: {new Date(user.createdAt || Date.now()).toLocaleDateString('ko-KR')}</span>
                  {user.provider && user.provider !== 'email' && (
                    <span className="rounded bg-gray-100 px-2 py-1 text-xs dark:bg-white/10">
                      {user.provider === 'google' ? 'Google' : 'Kakao'} 로그인
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={() => router.push('/settings')}
              className="rounded-lg p-2 transition hover:bg-gray-100 dark:hover:bg-white/10"
              aria-label="설정"
            >
              <Settings className="h-5 w-5" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Stat icon={<BookOpen className="h-5 w-5 text-blue-500" />} value={stats.readWebtoons} label="읽은 작품" />
            <Stat icon={<Heart className="h-5 w-5 text-red-500" />} value={stats.likedWebtoons} label="찜한 작품" />
            <Stat icon={<Clock className="h-5 w-5 text-[#00a84c]" />} value="2h" label="오늘 이용" />
          </div>
        </section>

        <section className="space-y-2">
          <MenuButton icon={<BookOpen className="h-5 w-5 text-blue-500" />} label="내 서재" onClick={() => router.push('/library')} />
          <MenuButton icon={<Heart className="h-5 w-5 text-red-500" />} label="찜한 작품" onClick={() => router.push('/favorites')} />
          <MenuButton icon={<Settings className="h-5 w-5 text-[#00a84c]" />} label="설정" onClick={() => router.push('/settings')} />
          <MenuButton icon={<LogOut className="h-5 w-5 text-gray-400" />} label="로그아웃" onClick={handleLogout} />
        </section>
      </div>
    </div>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: React.ReactNode; label: string }) {
  return (
    <div className="text-center">
      <div className="mb-2 flex items-center justify-center">{icon}</div>
      <div className="text-2xl font-black">{value}</div>
      <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
    </div>
  );
}

function MenuButton({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center justify-between rounded-xl border border-gray-200 bg-white p-4 text-left font-bold transition hover:bg-gray-50 dark:border-gray-800 dark:bg-[#1b1b1b] dark:hover:bg-white/5"
    >
      <span className="flex items-center gap-3">
        {icon}
        {label}
      </span>
      <span className="text-gray-400">›</span>
    </button>
  );
}
