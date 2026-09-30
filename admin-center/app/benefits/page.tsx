'use client';

import React, { useEffect, useState } from 'react';
import { Gift, Ticket } from 'lucide-react';

// 쿠폰 만들기(번호 등록형 포함) + 선물 보내기(코인·쿠폰). 선물은 사용자가 사이트 [선물함]에서 [받기]를 눌러야 지급된다.
interface Coupon { id: string; name: string; type: string; value: number; comicId?: string | null; code?: string | null; uses: number; validDays?: number | null; expiresAt?: string | null; maxRedemptions?: number | null; isActive: boolean; issued: number }
interface Batch { batchId: string; type: string; reason: string; amount: number; couponId?: string | null; sent: number; claimed: number; createdAt: string }

const TYPE: Record<string, string> = { DISCOUNT: '할인 쿠폰', RENT_PASS: '무료 대여 이용권', OWN_PASS: '무료 소장 이용권' };
const apiBase = () => (typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname) ? 'http://localhost:8000/api' : 'https://api.arata.co.kr/api');
const headers = () => ({ Authorization: `Bearer ${localStorage.getItem('adminToken') || ''}`, 'Content-Type': 'application/json' });
const call = async (path: string, init?: RequestInit) => {
  const response = await fetch(`${apiBase()}${path}`, { ...init, headers: headers() });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || '요청 실패');
  return data;
};
const input = 'w-full rounded border border-gray-600 bg-gray-700 px-2 py-1.5 text-sm text-white';

export default function BenefitsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [comics, setComics] = useState<{ id: string; title: string }[]>([]);
  const [cf, setCf] = useState({ name: '', type: 'DISCOUNT', value: 30, comicId: '', code: '', autoCode: false, uses: 1, validDays: 30, expiresAt: '', maxRedemptions: '' });
  const [gf, setGf] = useState({ type: 'COIN', amount: 100, coinValidDays: 30, couponId: '', reason: '', target: 'EMAILS', emails: '', claimDays: 7 });

  const load = async () => {
    try {
      const [c, g] = await Promise.all([call('/admin/benefits/coupons'), call('/admin/benefits/gifts')]);
      setCoupons(c.coupons || []);
      setBatches(g.batches || []);
    } catch (e: any) { alert(e.message); }
  };
  useEffect(() => {
    void load();
    fetch(`${apiBase()}/admin/comics?rating=all&limit=500`, { headers: headers() }).then((r) => r.json()).then((d) => setComics((d.comics || []).map((c: any) => ({ id: c.id, title: c.title })))).catch(() => {});
  }, []);

  const createCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await call('/admin/benefits/coupons', { method: 'POST', body: JSON.stringify({
        ...cf, code: cf.autoCode ? true : cf.code, comicId: cf.comicId || null, expiresAt: cf.expiresAt ? `${cf.expiresAt}T23:59:59+09:00` : null,
        maxRedemptions: cf.maxRedemptions ? Number(cf.maxRedemptions) : null,
      }) });
      setCf({ ...cf, name: '', code: '', autoCode: false });
      await load();
    } catch (err: any) { alert(err.message); }
  };

  const sendGift = async (e: React.FormEvent) => {
    e.preventDefault();
    const who = gf.target === 'ALL' ? '전체 회원' : `${gf.emails.split(/[\s,;]+/).filter(Boolean).length}명`;
    if (!confirm(`${who}에게 선물을 보낼까요? 보낸 선물은 되돌릴 수 없습니다.`)) return;
    try {
      const data = await call('/admin/benefits/gifts', { method: 'POST', body: JSON.stringify(gf) });
      alert(`${data.sent}명에게 보냈습니다. 사용자가 선물함에서 받아야 지급됩니다.`);
      await load();
    } catch (err: any) { alert(err.message); }
  };

  const toggle = async (coupon: Coupon) => {
    await call(`/admin/benefits/coupons/${coupon.id}`, { method: 'PUT', body: JSON.stringify({ isActive: !coupon.isActive }) }).catch((e) => alert(e.message));
    await load();
  };

  const comicTitle = (id?: string | null) => (id ? comics.find((c) => c.id === id)?.title || '지정 작품' : '모든 작품');

  return (
    <div className="min-h-screen bg-gray-900 p-6 text-white">
      <div className="mx-auto max-w-6xl space-y-8">
        <section id="coupons" className="scroll-mt-32">
          <h1 className="flex items-center gap-2 text-2xl font-bold"><Ticket className="h-6 w-6" />쿠폰 · 이용권</h1>
          <p className="mt-1 text-sm text-gray-400">만든 쿠폰은 번호로 등록하게 하거나(쿠폰 번호), 아래 [선물 보내기]로 줄 수 있습니다. 회차 구매창에서 적용됩니다.</p>
          <form onSubmit={createCoupon} className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-gray-800 p-4 text-sm md:grid-cols-4">
            <label>이름 *<input className={input} value={cf.name} onChange={(e) => setCf({ ...cf, name: e.target.value })} required /></label>
            <label>종류<select className={input} value={cf.type} onChange={(e) => setCf({ ...cf, type: e.target.value })}>{Object.entries(TYPE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
            {cf.type === 'DISCOUNT' && <label>할인율(%)<input type="number" min={1} max={100} className={input} value={cf.value} onChange={(e) => setCf({ ...cf, value: Number(e.target.value) })} /></label>}
            <label>적용 작품<select className={input} value={cf.comicId} onChange={(e) => setCf({ ...cf, comicId: e.target.value })}><option value="">모든 작품</option>{comics.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</select></label>
            <label>장수(1인)<input type="number" min={1} className={input} value={cf.uses} onChange={(e) => setCf({ ...cf, uses: Number(e.target.value) })} /></label>
            <label>받은 뒤 유효(일)<input type="number" min={0} className={input} value={cf.validDays} onChange={(e) => setCf({ ...cf, validDays: Number(e.target.value) })} /></label>
            <label>최종 만료일<input type="date" className={input} value={cf.expiresAt} onChange={(e) => setCf({ ...cf, expiresAt: e.target.value })} /></label>
            <label>쿠폰 번호<input className={input} value={cf.code} disabled={cf.autoCode} placeholder="비우면 번호 없음" onChange={(e) => setCf({ ...cf, code: e.target.value.toUpperCase() })} />
              <span className="mt-1 flex items-center gap-1 text-xs text-gray-400"><input type="checkbox" checked={cf.autoCode} onChange={(e) => setCf({ ...cf, autoCode: e.target.checked })} />자동 생성</span></label>
            <label>번호 등록 한도<input type="number" min={0} className={input} value={cf.maxRedemptions} placeholder="무제한" onChange={(e) => setCf({ ...cf, maxRedemptions: e.target.value })} /></label>
            <div className="flex items-end"><button type="submit" className="w-full rounded bg-purple-600 py-2 font-bold">쿠폰 만들기</button></div>
          </form>
          <table className="mt-4 w-full overflow-hidden rounded-lg border border-gray-700 text-sm">
            <thead className="bg-gray-800 text-left text-gray-400"><tr><th className="p-2">이름</th><th className="p-2">혜택</th><th className="p-2">적용</th><th className="p-2">번호</th><th className="p-2">유효</th><th className="p-2">발급</th><th className="p-2" /></tr></thead>
            <tbody>
              {coupons.map((c) => (
                <tr key={c.id} className={`border-t border-gray-700 ${c.isActive ? '' : 'text-gray-500'}`}>
                  <td className="p-2 font-bold">{c.name}</td>
                  <td className="p-2">{TYPE[c.type]}{c.type === 'DISCOUNT' ? ` ${c.value}%` : ''}{c.uses > 1 ? ` × ${c.uses}장` : ''}</td>
                  <td className="p-2">{comicTitle(c.comicId)}</td>
                  <td className="p-2 font-mono">{c.code || '-'}{c.maxRedemptions ? ` (한도 ${c.maxRedemptions})` : ''}</td>
                  <td className="p-2">{c.validDays ? `받은 뒤 ${c.validDays}일` : ''}{c.expiresAt ? ` ~${new Date(c.expiresAt).toLocaleDateString('ko-KR')}` : ''}{!c.validDays && !c.expiresAt ? '기한 없음' : ''}</td>
                  <td className="p-2">{c.issued}</td>
                  <td className="p-2"><button type="button" onClick={() => void toggle(c)} className="text-xs underline">{c.isActive ? '중지' : '재개'}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section id="gifts" className="scroll-mt-32">
          <h2 className="flex items-center gap-2 text-2xl font-bold"><Gift className="h-6 w-6" />선물함 지급 (선물 보내기)</h2>
          <form onSubmit={sendGift} className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-gray-800 p-4 text-sm md:grid-cols-4">
            <label>종류<select className={input} value={gf.type} onChange={(e) => setGf({ ...gf, type: e.target.value })}><option value="COIN">이벤트 코인</option><option value="COUPON">쿠폰·이용권</option></select></label>
            {gf.type === 'COIN' ? (
              <>
                <label>코인 수<input type="number" min={1} className={input} value={gf.amount} onChange={(e) => setGf({ ...gf, amount: Number(e.target.value) })} /></label>
                <label>받은 뒤 사용기한(일)<input type="number" min={0} className={input} value={gf.coinValidDays} onChange={(e) => setGf({ ...gf, coinValidDays: Number(e.target.value) })} /><span className="text-xs text-gray-400">0 = 기한 없음</span></label>
              </>
            ) : (
              <label className="col-span-2">쿠폰<select className={input} value={gf.couponId} onChange={(e) => setGf({ ...gf, couponId: e.target.value })}><option value="">선택</option>{coupons.filter((c) => c.isActive).map((c) => <option key={c.id} value={c.id}>{c.name} ({TYPE[c.type]})</option>)}</select></label>
            )}
            <label>받기 기한(일)<input type="number" min={0} className={input} value={gf.claimDays} onChange={(e) => setGf({ ...gf, claimDays: Number(e.target.value) })} /><span className="text-xs text-gray-400">0 = 기한 없음</span></label>
            <label className="col-span-2">지급 사유 *<input className={input} value={gf.reason} placeholder="예) 오픈 기념 이벤트 보상" onChange={(e) => setGf({ ...gf, reason: e.target.value })} required /></label>
            <label>받는 사람<select className={input} value={gf.target} onChange={(e) => setGf({ ...gf, target: e.target.value })}><option value="EMAILS">이메일 지정</option><option value="ALL">전체 회원</option></select></label>
            {gf.target === 'EMAILS' && <label className="col-span-2 md:col-span-3">이메일 (쉼표·줄바꿈 구분)<textarea rows={2} className={input} value={gf.emails} onChange={(e) => setGf({ ...gf, emails: e.target.value })} /></label>}
            <div className="flex items-end"><button type="submit" className="w-full rounded bg-pink-600 py-2 font-bold">선물 보내기</button></div>
          </form>
          <table className="mt-4 w-full overflow-hidden rounded-lg border border-gray-700 text-sm">
            <thead className="bg-gray-800 text-left text-gray-400"><tr><th className="p-2">보낸 날</th><th className="p-2">선물</th><th className="p-2">사유</th><th className="p-2">보냄</th><th className="p-2">받음</th></tr></thead>
            <tbody>
              {batches.map((b) => (
                <tr key={b.batchId} className="border-t border-gray-700">
                  <td className="p-2">{new Date(b.createdAt).toLocaleString('ko-KR')}</td>
                  <td className="p-2">{b.type === 'COIN' ? `코인 ${b.amount}` : coupons.find((c) => c.id === b.couponId)?.name || '쿠폰'}</td>
                  <td className="p-2">{b.reason}</td>
                  <td className="p-2">{b.sent}</td>
                  <td className="p-2">{b.claimed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}
