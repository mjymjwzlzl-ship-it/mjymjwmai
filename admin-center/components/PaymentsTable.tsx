'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';
import { adminApi } from '@/lib/works';

// 결제(코인 충전) 내역 + 환불 기록 (결제 내역·환불 관리 화면 공용)
interface Payment { id: string; merchantUid: string; amount: number; coinAmount: number; bonusCoins: number; status: string; payMethod: string; createdAt: string; completedAt?: string | null; refundAmount?: number | null; refundReason?: string | null; refundedAt?: string | null; user: { id: string; name: string; email: string } }
const STATUS: Record<string, string> = { PENDING: '대기', COMPLETED: '완료', PAID: '완료', FAILED: '실패', CANCELLED: '취소', REFUNDED: '환불' };
const fmt = (v?: string | null) => (v ? new Date(v).toLocaleString('ko-KR', { year: '2-digit', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-');

export default function PaymentsTable({ mode }: { mode: 'history' | 'refunds' }) {
  const [rows, setRows] = useState<Payment[]>([]);
  const [summary, setSummary] = useState<{ status: string; count: number; amount: number; refund: number }[]>([]);
  const [status, setStatus] = useState(mode === 'refunds' ? 'REFUND' : '');
  const [q, setQ] = useState('');
  const [refundOf, setRefundOf] = useState<Payment | null>(null);
  const load = useCallback(async () => {
    try { const d = await adminApi<{ payments: Payment[]; summary: any[] }>(`/admin/ops/payments?${new URLSearchParams({ ...(status ? { status } : {}), ...(q.trim() ? { q: q.trim() } : {}) })}`); setRows(d.payments); setSummary(d.summary); } catch (e: any) { alert(e.message); }
  }, [status, q]);
  useEffect(() => { void load(); }, [status]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div>
      <div className="my-4 flex flex-wrap gap-2 text-sm">
        {summary.map((s) => <span key={s.status} className="rounded bg-gray-800 px-2 py-1">{STATUS[s.status] || s.status} {s.count}건 · {s.amount.toLocaleString()}원{s.refund ? ` (환불 ${s.refund.toLocaleString()}원)` : ''}</span>)}
      </div>
      <div className="mb-3 flex flex-wrap gap-2">
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded border border-gray-600 bg-gray-800 px-2 py-1.5 text-sm">
          <option value="">전체 상태</option><option value="COMPLETED">완료</option><option value="PENDING">대기</option><option value="FAILED">실패</option><option value="REFUND">환불·취소</option>
        </select>
        <form onSubmit={(e) => { e.preventDefault(); void load(); }} className="flex items-center gap-1 rounded border border-gray-600 bg-gray-800 px-2"><Search className="h-4 w-4 text-gray-400" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="주문번호·이메일·닉네임" className="bg-transparent py-1.5 text-sm outline-none" /></form>
      </div>
      <div className="overflow-x-auto rounded-lg border border-gray-700">
        <table className="w-full text-sm">
          <thead className="bg-gray-800 text-left text-gray-400"><tr><th className="p-2">결제일</th><th className="p-2">회원</th><th className="p-2">주문번호</th><th className="p-2">금액</th><th className="p-2">코인(+보너스)</th><th className="p-2">수단</th><th className="p-2">상태</th><th className="p-2">환불</th><th className="p-2" /></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={9} className="p-8 text-center text-gray-500">내역이 없습니다.</td></tr>}
            {rows.map((p) => (
              <tr key={p.id} className="border-t border-gray-700">
                <td className="whitespace-nowrap p-2 text-xs">{fmt(p.createdAt)}</td>
                <td className="p-2"><a href={`/users/${p.user.id}/payments`} className="hover:underline">{p.user.name}</a><span className="block text-xs text-gray-500">{p.user.email}</span></td>
                <td className="p-2 text-xs">{p.merchantUid}</td>
                <td className="p-2">{p.amount.toLocaleString()}원</td>
                <td className="p-2">{p.coinAmount}{p.bonusCoins ? ` +${p.bonusCoins}` : ''}</td>
                <td className="p-2 text-xs">{p.payMethod}</td>
                <td className="p-2"><span className={`rounded px-1.5 text-xs ${['COMPLETED', 'PAID'].includes(p.status) ? 'bg-green-600/30' : p.status === 'REFUNDED' || p.status === 'CANCELLED' ? 'bg-red-600/30' : 'bg-gray-700'}`}>{STATUS[p.status] || p.status}</span></td>
                <td className="p-2 text-xs">{p.refundAmount ? <>{p.refundAmount.toLocaleString()}원 · {fmt(p.refundedAt)}<span className="block text-gray-400">{p.refundReason}</span></> : '-'}</td>
                <td className="p-2">{['COMPLETED', 'PAID'].includes(p.status) && <button type="button" onClick={() => setRefundOf(p)} className="rounded bg-red-600/70 px-2 py-1 text-xs">환불 기록</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {refundOf && <RefundDialog payment={refundOf} onClose={() => setRefundOf(null)} onDone={async () => { setRefundOf(null); await load(); }} />}
    </div>
  );
}

function RefundDialog({ payment, onClose, onDone }: { payment: Payment; onClose: () => void; onDone: () => Promise<void> }) {
  const [amount, setAmount] = useState(String(payment.amount));
  const [reason, setReason] = useState('');
  const [deduct, setDeduct] = useState(true);
  const [coins, setCoins] = useState(String(payment.coinAmount + (payment.bonusCoins || 0)));
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!confirm(`${payment.user.name}님 결제 ${Number(amount).toLocaleString()}원을 환불로 기록할까요?${deduct ? `\n코인 ${coins}개를 회수합니다(잔액 한도 안에서).` : ''}`)) return;
    setBusy(true);
    try { await adminApi(`/admin/ops/payments/${payment.id}/refund`, { method: 'POST', json: { amount: Number(amount), reason, deductCoins: deduct, coins: Number(coins) } }); await onDone(); } catch (e: any) { alert(e.message); } finally { setBusy(false); }
  };
  const input = 'w-full rounded border border-gray-600 bg-gray-700 px-3 py-2 text-sm';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-label="환불 기록">
      <div className="w-full max-w-md space-y-3 rounded-xl bg-gray-800 p-6 text-sm">
        <div className="flex items-center justify-between"><h2 className="text-lg font-bold">환불 기록</h2><button type="button" onClick={onClose} aria-label="닫기"><X className="h-5 w-5 text-gray-400" /></button></div>
        <p className="rounded bg-amber-500/10 p-2 text-amber-200">실제 카드 결제 취소(PG)는 이니시스 상점관리자에서 먼저 처리하세요. 여기서는 환불 상태·사유를 남기고 충전된 코인을 회수합니다.</p>
        <p className="text-gray-300">{payment.user.name} · {payment.merchantUid} · {payment.amount.toLocaleString()}원 / 코인 {payment.coinAmount}{payment.bonusCoins ? `+${payment.bonusCoins}` : ''}</p>
        <label className="block">환불 금액(원)<input type="number" className={input} value={amount} onChange={(e) => setAmount(e.target.value)} /></label>
        <label className="block">사유 *<input className={input} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="예) 중복 결제, 고객 요청 (미사용)" /></label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={deduct} onChange={(e) => setDeduct(e.target.checked)} />충전 코인 회수</label>
        {deduct && <label className="block">회수할 코인<input type="number" className={input} value={coins} onChange={(e) => setCoins(e.target.value)} /></label>}
        <div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded bg-gray-700 px-4 py-2">취소</button><button type="button" disabled={busy || !reason.trim()} onClick={() => void submit()} className="rounded bg-red-600 px-4 py-2 font-bold disabled:opacity-40">환불 기록</button></div>
      </div>
    </div>
  );
}
