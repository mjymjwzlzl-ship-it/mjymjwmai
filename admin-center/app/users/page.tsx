'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { History, Search, ShieldCheck, X } from 'lucide-react';
import { adminApi } from '@/lib/works';

// 사용자 관리 > 회원 목록: 회원 정보·성인 인증 상태·이용 제한(SUSPENDED)/차단(BANNED)
// 제한·차단된 계정은 로그인·API 가 막힌다(middleware/auth). 상태를 바꿀 때마다 사유와 이력이 남는다.
interface User {
  id: string; name: string; email: string; username: string; role: string; status: 'ACTIVE' | 'SUSPENDED' | 'BANNED';
  adultVerified: boolean; adultVerifiedAt?: string | null; adultVerificationMethod?: string | null; birthYear?: number | null;
  coinBalance: number; createdAt: string; purchases: number; likes: number; paidAmount: number;
}
interface Log { id: string; fromStatus: string; toStatus: string; reason?: string | null; adminName?: string | null; createdAt: string }
const STATUS: Record<string, { label: string; className: string }> = {
  ACTIVE: { label: '정상', className: 'bg-green-600/30 text-green-200' },
  SUSPENDED: { label: '이용 제한', className: 'bg-amber-600/30 text-amber-200' },
  BANNED: { label: '차단', className: 'bg-red-600/40 text-red-200' },
};
const fmt = (v?: string | null) => (v ? new Date(v).toLocaleDateString('ko-KR', { year: '2-digit', month: 'numeric', day: 'numeric' }) : '-');

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [adultTotal, setAdultTotal] = useState(0);
  const [q, setQ] = useState('');
  const [adult, setAdult] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [target, setTarget] = useState<User | null>(null);
  const load = useCallback(async () => {
    try {
      const d = await adminApi<{ users: User[]; counts: Record<string, number>; adultVerified: number }>(`/admin/ops/users?${new URLSearchParams({ ...(q.trim() ? { q: q.trim() } : {}), ...(adult ? { adult } : {}), ...(status ? { status } : {}) })}`);
      setUsers(d.users); setCounts(d.counts); setAdultTotal(d.adultVerified);
    } catch (e: any) { alert(e.message); } finally { setLoading(false); }
  }, [q, adult, status]);
  // 신고 관리·커뮤니티 관리에서 ?q=닉네임 으로 넘어오면 바로 그 회원을 찾는다
  const [ready, setReady] = useState(false);
  useEffect(() => { try { const q0 = new URLSearchParams(window.location.search).get('q'); if (q0) setQ(q0); } catch {} setReady(true); }, []);
  useEffect(() => { if (ready) void load(); }, [adult, status, ready]); // eslint-disable-line react-hooks/exhaustive-deps
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="min-h-screen bg-gray-900 p-6 text-white">
      <div className="mx-auto max-w-7xl">
        <h1 className="text-2xl font-bold">회원 목록</h1>
        <p className="mt-1 text-sm text-gray-400">전체 {total}명 · 성인 인증 {adultTotal}명 · 이용 제한 {counts.SUSPENDED || 0}명 · 차단 {counts.BANNED || 0}명. 이용 제한·차단하면 그 계정은 로그인과 이용이 막힙니다. 성인 인증 방식 설정은 [성인 인증 설정].</p>
        <div className="my-4 flex flex-wrap gap-2 text-sm">
          <form onSubmit={(e) => { e.preventDefault(); void load(); }} className="flex items-center gap-1 rounded border border-gray-600 bg-gray-800 px-2"><Search className="h-4 w-4 text-gray-400" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="이메일·닉네임·아이디" className="bg-transparent py-1.5 outline-none" /></form>
          <select value={adult} onChange={(e) => setAdult(e.target.value)} className="rounded border border-gray-600 bg-gray-800 px-2 py-1.5"><option value="">성인 인증 전체</option><option value="true">인증 완료</option><option value="false">미인증</option></select>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded border border-gray-600 bg-gray-800 px-2 py-1.5"><option value="">상태 전체</option><option value="ACTIVE">정상</option><option value="SUSPENDED">이용 제한</option><option value="BANNED">차단</option></select>
        </div>
        {loading ? <p className="py-20 text-center text-gray-400">불러오는 중...</p> : (
          <div className="overflow-x-auto rounded-lg border border-gray-700">
            <table className="w-full text-sm">
              <thead className="bg-gray-800 text-left text-gray-400"><tr><th className="p-2">회원</th><th className="p-2">가입일</th><th className="p-2">성인 인증</th><th className="p-2">보유 코인</th><th className="p-2">결제·구매</th><th className="p-2">상태</th><th className="p-2" /></tr></thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-t border-gray-700">
                    <td className="p-2"><b>{u.name}</b>{u.role !== 'USER' && <span className="ml-1 rounded bg-purple-600/40 px-1 text-[10px]">{u.role}</span>}<span className="block text-xs text-gray-400">{u.email}</span></td>
                    <td className="p-2 text-xs">{fmt(u.createdAt)}</td>
                    <td className="p-2 text-xs">{u.adultVerified ? <span className="inline-flex items-center gap-1 text-green-300"><ShieldCheck className="h-3.5 w-3.5" />완료 {fmt(u.adultVerifiedAt)}{u.adultVerificationMethod ? ` · ${u.adultVerificationMethod}` : ''}</span> : <span className="text-gray-500">미인증</span>}</td>
                    <td className="p-2"><Link href={`/users/${u.id}/coins`} className="hover:underline">{u.coinBalance.toLocaleString()}</Link></td>
                    <td className="p-2 text-xs"><Link href={`/users/${u.id}/payments`} className="hover:underline">{u.paidAmount.toLocaleString()}원</Link> · 구매 {u.purchases}</td>
                    <td className="p-2"><span className={`rounded px-1.5 py-0.5 text-xs ${STATUS[u.status]?.className || ''}`}>{STATUS[u.status]?.label || u.status}</span></td>
                    <td className="p-2">{!['ADMIN', 'CS_ADMIN'].includes(u.role) && <button type="button" onClick={() => setTarget(u)} className="rounded bg-gray-700 px-2 py-1 text-xs hover:bg-gray-600">이용 상태</button>}</td>
                  </tr>
                ))}
                {users.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-gray-500">회원이 없습니다.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {target && <StatusDialog user={target} onClose={() => setTarget(null)} onDone={async () => { setTarget(null); await load(); }} />}
    </div>
  );
}

function StatusDialog({ user, onClose, onDone }: { user: User; onClose: () => void; onDone: () => Promise<void> }) {
  const [next, setNext] = useState<User['status']>(user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE');
  const [reason, setReason] = useState('');
  const [logs, setLogs] = useState<Log[]>([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => { adminApi<{ logs: Log[] }>(`/admin/ops/users/${user.id}/status-logs`).then((d) => setLogs(d.logs)).catch(() => {}); }, [user.id]);
  const save = async () => {
    setBusy(true);
    try { await adminApi(`/admin/ops/users/${user.id}/status`, { method: 'PATCH', json: { status: next, reason } }); await onDone(); } catch (e: any) { alert(e.message); } finally { setBusy(false); }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-label="이용 상태">
      <div className="max-h-[90vh] w-full max-w-md space-y-3 overflow-y-auto rounded-xl bg-gray-800 p-6 text-sm">
        <div className="flex items-center justify-between"><h2 className="text-lg font-bold">{user.name} 이용 상태</h2><button type="button" onClick={onClose} aria-label="닫기"><X className="h-5 w-5 text-gray-400" /></button></div>
        <p>현재: <span className={`rounded px-1.5 ${STATUS[user.status].className}`}>{STATUS[user.status].label}</span></p>
        <div className="flex gap-2">
          {(['ACTIVE', 'SUSPENDED', 'BANNED'] as const).filter((s) => s !== user.status).map((s) => (
            <label key={s} className={`cursor-pointer rounded-full px-3 py-1 ${next === s ? 'bg-purple-600' : 'bg-gray-700'}`}><input type="radio" className="sr-only" checked={next === s} onChange={() => setNext(s)} />{s === 'ACTIVE' ? '정상으로 풀기' : STATUS[s].label}</label>
          ))}
        </div>
        <label className="block">사유 {next !== 'ACTIVE' && '*'}<textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} className="mt-1 w-full rounded border border-gray-600 bg-gray-700 px-3 py-2" placeholder={next === 'ACTIVE' ? '해제 사유 (선택)' : '예) 댓글 욕설 반복 신고 3건'} /></label>
        <div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded bg-gray-700 px-4 py-2">취소</button><button type="button" disabled={busy || (next !== 'ACTIVE' && !reason.trim())} onClick={() => void save()} className="rounded bg-purple-600 px-4 py-2 font-bold disabled:opacity-40">저장</button></div>
        <div>
          <h3 className="mb-1 flex items-center gap-1 font-bold"><History className="h-4 w-4" />이력</h3>
          {logs.length === 0 ? <p className="text-gray-500">이력 없음</p> : (
            <ol className="space-y-1 border-l border-gray-600 pl-3">
              {logs.map((l) => <li key={l.id}><span className="text-xs text-gray-400">{new Date(l.createdAt).toLocaleString('ko-KR')} · {l.adminName || '관리자'}</span><br />{STATUS[l.fromStatus]?.label || l.fromStatus} → <b>{STATUS[l.toStatus]?.label || l.toStatus}</b>{l.reason && <span className="block text-gray-300">{l.reason}</span>}</li>)}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}
