'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminApi } from '@/lib/works';
import { NAV } from '@/lib/admin-nav';

// 대시보드: 오늘 운영 현황 + 메뉴별 역할 안내
// (예전 첫 화면의 수동 [카테고리 관리]는 작품 정보 기반 자동 분류로 바뀌어 [노출 관리 > 자동 분류]에서 확인)
interface Summary { works: number; scheduled: number; users: number; newUsers: number; views: number; hiatus: number; upToday: number; pendingReports: number; purchases: number; coins: number; payments: number }

const ROLE: Record<string, string> = {
  works: '작품 정보의 기준: 유형·언어·이용등급·연재 상태·연재 요일·장르·태그·회차·예약 공개·작품 공지',
  exposure: '사용자 화면에 무엇을 어디에: 홈 섹션 순서, 대배너, 오늘의 추천작, 추천 신작, 인기 작품 고정, 실시간 랭킹, 자동 분류 현황',
  promotion: '사용자 혜택: 이벤트, 할인·무료 작품, 쿠폰, 선물함 지급',
  payment: '돈과 가격: 작품별 대여·소장 가격, 코인 가격, 결제·구매·대여 내역, 환불',
  users: '회원: 회원 정보, 성인 인증 상태·설정, 이용 제한·차단, 고객센터',
  reports: '작품·회차·댓글·사용자 신고 처리 (접수 → 확인 중 → 처리 완료/반려, 메모·이력)',
  stats: '운영 결과: 작품·회차 조회수, 찜, 구매, 매출, 인기 추이, 랭킹',
};

export default function Dashboard() {
  const [s, setS] = useState<Summary | null>(null);
  useEffect(() => { adminApi<Summary>('/admin/ops/dashboard').then(setS).catch((e) => alert(e.message)); }, []);
  const card = (label: string, value: React.ReactNode, href: string, tone = '') => (
    <Link href={href} className={`rounded-lg bg-gray-800 p-4 hover:bg-gray-700 ${tone}`}><p className="text-xs text-gray-400">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></Link>
  );
  return (
    <div className="min-h-screen bg-gray-900 p-6 text-white">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-2xl font-bold">대시보드</h1>
        <p className="mt-1 text-sm text-gray-400">오늘(한국 시간) 운영 현황입니다.</p>
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          {card('오늘 조회', s ? s.views.toLocaleString() : '…', '/stats')}
          {card('오늘 구매', s ? `${s.purchases}건 · ${s.coins.toLocaleString()}코인` : '…', '/payments/purchases')}
          {card('오늘 결제', s ? `${s.payments.toLocaleString()}원` : '…', '/payments/history')}
          {card('신규 회원', s ? `${s.newUsers}명 / 전체 ${s.users.toLocaleString()}` : '…', '/users')}
          {card('오늘 새 회차 공개(UP)', s ? `${s.upToday}작품` : '…', '/exposure?tab=auto')}
          {card('예약 공개 대기', s ? `${s.scheduled}회차` : '…', '/works?dateField=nextScheduledAt')}
          {card('휴재 작품', s ? `${s.hiatus}작품` : '…', '/works?status=HIATUS')}
          {card('처리할 신고', s ? `${s.pendingReports}건` : '…', '/reports', s && s.pendingReports > 0 ? 'ring-1 ring-red-500/60' : '')}
        </div>

        <h2 className="mb-3 mt-8 text-lg font-bold">메뉴 안내</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {NAV.filter((g) => g.key !== 'dashboard').map((g) => (
            <div key={g.key} className="rounded-lg border border-gray-700 bg-gray-800/60 p-4">
              <Link href={g.href} className="text-base font-bold hover:underline">{g.label} →</Link>
              <p className="mt-1 text-sm text-gray-400">{ROLE[g.key]}</p>
              {g.tabs.length > 1 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {g.tabs.map((t) => <Link key={t.href} href={t.href} className="rounded bg-gray-700 px-2 py-0.5 text-xs hover:bg-gray-600">{t.label}</Link>)}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
