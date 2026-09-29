'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

export interface WalletGrant { id: string; reason: string; source: string; amount: number; remaining: number; createdAt: string; expiresAt?: string | null; status: 'ACTIVE' | 'USED' | 'EXPIRED'; daysLeft: number | null }
export interface Wallet { total: number; paid: number; event: number; nextExpiry: { amount: number; expiresAt: string; daysLeft: number } | null; grants: WalletGrant[] }

export const fmtDate = (value: string) => new Date(value).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Asia/Seoul' });
export const leftText = (days: number | null) => (days === null ? '기한 없음' : days <= 0 ? '오늘 소멸' : `${days}일 후 소멸`);

export function useWallet() {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  useEffect(() => {
    if (!(localStorage.getItem('authToken') || localStorage.getItem('token'))) return;
    const load = () => api.get('/wallet').then(({ data }) => setWallet(data)).catch(() => {});
    load();
    window.addEventListener('giftsUpdated', load);
    return () => window.removeEventListener('giftsUpdated', load);
  }, []);
  return wallet;
}

// 보유 코인 = 유료 코인 + 이벤트 코인. 이벤트 코인이 먼저 쓰인다.
export default function CoinBreakdown({ tone = 'light' }: { tone?: 'light' | 'dark' }) {
  const wallet = useWallet();
  if (!wallet) return null;
  const muted = tone === 'dark' ? 'text-gray-400' : 'text-gray-500 dark:text-gray-400';
  return (
    <div className={`mt-2 space-y-0.5 text-xs ${muted}`}>
      <p>유료 코인 <b className={tone === 'dark' ? 'text-white' : 'text-gray-900 dark:text-white'}>{wallet.paid.toLocaleString()}</b> · 이벤트 코인 <b className="text-[#00a84c] dark:text-[#00dc64]">{wallet.event.toLocaleString()}</b></p>
      {wallet.nextExpiry && (
        <p className="font-bold text-red-500">
          {wallet.nextExpiry.amount.toLocaleString()}코인 · {fmtDate(wallet.nextExpiry.expiresAt)}까지 ({leftText(wallet.nextExpiry.daysLeft)})
        </p>
      )}
      <Link href="/coin/event-coins" className="inline-block font-bold underline">이벤트 코인 상세보기</Link>
    </div>
  );
}
