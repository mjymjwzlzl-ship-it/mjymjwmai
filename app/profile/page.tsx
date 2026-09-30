'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, BookmarkCheck, Gift, MessageSquare, Ticket, ChevronRight, Clock, Coins, Heart, Library, LogOut, Settings, ShieldCheck, User , Sparkles } from 'lucide-react';
import CoinBreakdown from '@/components/wallet/CoinBreakdown';
import { api } from '@/lib/api';
import { useAdultModeStore } from '@/store/adultMode';

interface Me {
  email?: string;
  username?: string;
  nickname?: string;
  provider?: string;
  createdAt?: string;
  coins?: number;
  adultVerified?: boolean;
}

const PROVIDER_LABEL: Record<string, string> = {
  google: 'Google',
  kakao: '카카오',
  naver: '네이버',
  email: '이메일',
};

export default function ProfilePage() {
  const router = useRouter();
  const setAdultEnabled = useAdultModeStore((state) => state.setEnabled);
  const [me, setMe] = useState<Me | null>(null);
  const [counts, setCounts] = useState({ reading: 0, liked: 0, purchased: 0 });

  useEffect(() => {
    const token = localStorage.getItem('authToken') || localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    try {
      setMe(JSON.parse(localStorage.getItem('user') || '{}'));
    } catch {
      setMe({});
    }

    const headers = { Authorization: `Bearer ${token}` };
    api.get('/users/me', { headers })
      .then(({ data }) => setMe((prev) => ({ ...prev, ...data })))
      .catch(() => {});
    Promise.allSettled([
      api.get('/users/library/reading', { headers }),
      api.get('/users/library/liked', { headers }),
      api.get('/users/library/purchased', { headers }),
    ]).then(([reading, liked, purchased]) => {
      setCounts({
        reading: reading.status === 'fulfilled' ? reading.value.data?.webtoons?.length || 0 : 0,
        liked: liked.status === 'fulfilled' ? liked.value.data?.webtoons?.length || 0 : 0,
        purchased: purchased.status === 'fulfilled' ? purchased.value.data?.webtoons?.length || 0 : 0,
      });
    });
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setAdultEnabled(false);
    window.location.href = '/home';
  };

  if (!me) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-[#141414]">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-[#00dc64]" />
      </div>
    );
  }

  const displayName = me.nickname || me.username || (me.email ? me.email.split('@')[0] : '사용자');
  const joined = me.createdAt ? new Date(me.createdAt).toLocaleDateString('ko-KR') : '';

  return (
    <div className="min-h-screen bg-gray-50 text-gray-950 transition-colors dark:bg-[#141414] dark:text-white">
      <div className="mx-auto max-w-3xl px-4 py-6">
        <h1 className="mb-5 text-2xl font-black">마이페이지</h1>

        {/* 계정 */}
        <section className="mb-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-[#1b1b1b]">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#00dc64]">
              <User className="h-8 w-8 text-black" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-xl font-black">{displayName}</h2>
              {me.email && <p className="truncate text-sm text-gray-500 dark:text-gray-400">{me.email}</p>}
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                {me.provider && (
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 font-bold text-gray-600 dark:bg-white/10 dark:text-gray-300">
                    {PROVIDER_LABEL[me.provider] || me.provider} 로그인
                  </span>
                )}
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-bold ${
                    me.adultVerified
                      ? 'bg-[#00dc64]/15 text-[#00a84c] dark:text-[#00dc64]'
                      : 'bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-gray-400'
                  }`}
                >
                  <ShieldCheck className="h-3 w-3" />
                  {me.adultVerified ? '성인인증 완료' : '성인인증 전'}
                </span>
                {joined && <span className="text-gray-400">가입 {joined}</span>}
              </div>
            </div>
          </div>
        </section>

        {/* 코인 */}
        <section className="mb-4 flex items-center justify-between rounded-xl border border-[#00dc64]/30 bg-[#00dc64]/5 p-5">
          <div>
            <p className="flex items-center gap-1.5 text-sm font-bold text-gray-500 dark:text-gray-400">
              <Coins className="h-4 w-4 text-yellow-500" />
              보유 코인
            </p>
            <p className="mt-1 text-3xl font-black">{(me.coins ?? 0).toLocaleString()}</p>
            <CoinBreakdown />
          </div>
          <Link
            href="/coin"
            className="rounded-lg bg-[#00dc64] px-5 py-2.5 text-sm font-black text-black transition hover:bg-[#00c85a]"
          >
            코인 충전
          </Link>
        </section>

        {/* 내 작품 */}
        <section className="mb-4 grid grid-cols-3 gap-3">
          <Link href="/my/library?tab=viewed" className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-[#00dc64] dark:border-gray-800 dark:bg-[#1b1b1b]">
            <Clock className="mb-2 h-5 w-5 text-[#00a84c] dark:text-[#00dc64]" />
            <p className="text-2xl font-black">{counts.reading}</p>
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400">열람한 작품</p>
          </Link>
          <Link href="/my/library?tab=liked" className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-[#00dc64] dark:border-gray-800 dark:bg-[#1b1b1b]">
            <Heart className="mb-2 h-5 w-5 text-red-500" />
            <p className="text-2xl font-black">{counts.liked}</p>
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400">찜한 작품</p>
          </Link>
          <Link href="/my/library?tab=purchased" className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-[#00dc64] dark:border-gray-800 dark:bg-[#1b1b1b]">
            <BookmarkCheck className="mb-2 h-5 w-5 text-yellow-500" />
            <p className="text-2xl font-black">{counts.purchased}</p>
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400">구매 작품</p>
          </Link>
        </section>

        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-[#1b1b1b]">
          <MenuRow href="/my/library" icon={<Library className="h-5 w-5 text-[#00a84c] dark:text-[#00dc64]" />} label="내 서재" />
          <MenuRow href="/notifications" icon={<Bell className="h-5 w-5 text-red-500" />} label="알림함" />
          <MenuRow href="/my/comments" icon={<MessageSquare className="h-5 w-5 text-sky-500" />} label="댓글 내역" />
          <MenuRow href="/gallery?tab=mine" icon={<Sparkles className="h-5 w-5 text-pink-500" />} label="내 화보함 (내 화보·저장한 화보)" />
          <MenuRow href="/my/community" icon={<MessageSquare className="h-5 w-5 text-violet-500" />} label="커뮤니티 활동 (내 글·댓글·저장한 글)" />
          <MenuRow href="/gifts" icon={<Gift className="h-5 w-5 text-pink-500" />} label="선물함" />
          <MenuRow href="/coupons" icon={<Ticket className="h-5 w-5 text-[#00a84c] dark:text-[#00dc64]" />} label="쿠폰함 · 이용권" />
          <MenuRow href="/coin" icon={<Coins className="h-5 w-5 text-yellow-500" />} label="코인 충전" />
          <MenuRow href="/settings" icon={<Settings className="h-5 w-5 text-gray-500" />} label="계정 설정" />
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 px-5 py-4 text-left text-sm font-bold text-gray-600 transition hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/5"
          >
            <LogOut className="h-5 w-5 text-gray-400" />
            로그아웃
          </button>
        </section>
      </div>
    </div>
  );
}

function MenuRow({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 border-b border-gray-100 px-5 py-4 text-sm font-bold transition hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-white/5"
    >
      {icon}
      <span className="flex-1">{label}</span>
      <ChevronRight className="h-4 w-4 text-gray-400" />
    </Link>
  );
}
