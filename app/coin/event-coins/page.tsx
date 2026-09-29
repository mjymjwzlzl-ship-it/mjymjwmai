'use client';

import Link from 'next/link';
import { Coins } from 'lucide-react';
import { fmtDate, leftText, useWallet } from '@/components/wallet/CoinBreakdown';

const STATUS: Record<string, string> = { ACTIVE: '사용 가능', USED: '사용 완료', EXPIRED: '소멸' };

export default function EventCoinsPage() {
  const wallet = useWallet();
  return (
    <div className="min-h-screen bg-gray-50 text-gray-950 transition-colors dark:bg-[#141414] dark:text-white">
      <div className="mx-auto max-w-3xl px-4 py-6">
        <h1 className="flex items-center gap-2 text-2xl font-black"><Coins className="h-6 w-6 text-yellow-500" />이벤트 코인 상세</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">이벤트·출석·선물로 받은 코인이에요. 결제할 때 유료 코인보다 먼저, 소멸이 빠른 것부터 쓰여요.</p>
        {!wallet ? (
          <p className="mt-6 text-sm text-gray-500">로그인하면 확인할 수 있어요.</p>
        ) : (
          <>
            <div className="mt-5 grid grid-cols-3 gap-2 rounded-xl border border-gray-200 bg-white p-4 text-center dark:border-gray-800 dark:bg-[#1b1b1b]">
              <div><p className="text-xs text-gray-500">보유 코인</p><p className="text-xl font-black">{wallet.total.toLocaleString()}</p></div>
              <div><p className="text-xs text-gray-500">유료 코인</p><p className="text-xl font-black">{wallet.paid.toLocaleString()}</p></div>
              <div><p className="text-xs text-gray-500">이벤트 코인</p><p className="text-xl font-black text-[#00a84c] dark:text-[#00dc64]">{wallet.event.toLocaleString()}</p></div>
            </div>
            {wallet.grants.length === 0 ? (
              <p className="mt-4 rounded-xl border border-dashed border-gray-300 py-12 text-center text-sm text-gray-500 dark:border-gray-700">받은 이벤트 코인이 없어요.</p>
            ) : (
              <table className="mt-4 w-full overflow-hidden rounded-xl bg-white text-sm dark:bg-[#1b1b1b]">
                <thead className="bg-gray-100 text-left text-xs text-gray-500 dark:bg-white/5">
                  <tr><th className="p-3">지급 사유</th><th className="p-3 text-right">수량</th><th className="p-3">지급일</th><th className="p-3">만료일</th></tr>
                </thead>
                <tbody>
                  {wallet.grants.map((grant) => (
                    <tr key={grant.id} className={`border-t border-gray-100 dark:border-gray-800 ${grant.status !== 'ACTIVE' ? 'text-gray-400' : ''}`}>
                      <td className="p-3">{grant.reason}<span className="ml-1 text-xs text-gray-400">· {STATUS[grant.status]}</span></td>
                      <td className="p-3 text-right font-bold">{grant.remaining.toLocaleString()}<span className="text-xs font-normal text-gray-400"> / {grant.amount.toLocaleString()}</span></td>
                      <td className="p-3">{fmtDate(grant.createdAt)}</td>
                      <td className={`p-3 ${grant.status === 'ACTIVE' && grant.daysLeft !== null && grant.daysLeft <= 3 ? 'font-bold text-red-500' : ''}`}>
                        {grant.expiresAt ? `${fmtDate(grant.expiresAt)}${grant.status === 'ACTIVE' ? ` (${leftText(grant.daysLeft)})` : ''}` : '기한 없음'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <Link href="/coin/history" className="mt-4 inline-block text-sm font-bold text-gray-500 underline">전체 코인 사용 내역</Link>
          </>
        )}
      </div>
    </div>
  );
}
