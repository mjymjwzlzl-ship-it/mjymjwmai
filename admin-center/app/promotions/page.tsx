'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { BadgePercent, Pencil, Plus, Trash2, X } from 'lucide-react';

// 할인·무료 이벤트 작품 관리. 기간 안에서만 실제 가격·열람 권한에 반영되고, 끝나면 사이트 목록에서 자동으로 빠진다.
// - 할인(DISCOUNT): 유료 회차 대여·소장가를 value% 할인 (최소 1코인)
// - 회차 무료(FREE_EPISODES): 1~value화를 무료로 열람
// - 무료 대여(FREE_RENTAL): 유료 회차를 0코인으로 대여

type PromoType = 'DISCOUNT' | 'FREE_EPISODES' | 'FREE_RENTAL';
interface Promotion {
  id: string;
  comicId: string;
  comicTitle: string;
  type: PromoType;
  value: number;
  title?: string | null;
  startAt: string;
  endAt: string;
  isActive: boolean;
  status: 'ONGOING' | 'UPCOMING' | 'ENDED' | 'OFF';
  label: string;
}

const TYPE_LABEL: Record<PromoType, string> = { DISCOUNT: '할인', FREE_EPISODES: '회차 무료', FREE_RENTAL: '무료 대여' };
const STATUS: Record<Promotion['status'], [string, string]> = {
  ONGOING: ['진행 중', 'bg-green-500/20 text-green-300'],
  UPCOMING: ['예정', 'bg-blue-500/20 text-blue-300'],
  ENDED: ['종료', 'bg-gray-600/40 text-gray-400'],
  OFF: ['꺼짐', 'bg-gray-600/40 text-gray-400'],
};

const apiBase = () => (typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname) ? 'http://localhost:8000/api' : 'https://api.arata.co.kr/api');
const headers = () => ({ Authorization: `Bearer ${localStorage.getItem('adminToken') || ''}`, 'Content-Type': 'application/json' });
const toLocalInput = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
const fmt = (value: string) => new Date(value).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });

const emptyForm = { comicId: '', type: 'DISCOUNT' as PromoType, value: 30, title: '', startAt: '', endAt: '', isActive: true };

export default function PromotionsAdminPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [comics, setComics] = useState<{ id: string; title: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Promotion | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [comicQuery, setComicQuery] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [promoRes, comicRes] = await Promise.all([
        fetch(`${apiBase()}/admin/promotions`, { headers: headers() }),
        fetch(`${apiBase()}/admin/comics?rating=all&limit=500`, { headers: headers() }),
      ]);
      const promoData = await promoRes.json();
      if (!promoRes.ok) throw new Error(promoData.message || '불러오기 실패');
      setPromotions(promoData.promotions || []);
      const comicData = await comicRes.json().catch(() => ({}));
      setComics((comicData.comics || comicData.data || []).map((comic: any) => ({ id: comic.id, title: comic.title })));
    } catch (error: any) {
      alert(error.message || '불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void load(); }, []);

  const filteredComics = useMemo(() => {
    const q = comicQuery.trim();
    return (q ? comics.filter((comic) => comic.title.includes(q)) : comics).slice(0, 50);
  }, [comics, comicQuery]);

  const openForm = (promo: Promotion | null) => {
    setEditing(promo);
    const now = new Date();
    setForm(promo ? {
      comicId: promo.comicId, type: promo.type, value: promo.value, title: promo.title || '',
      startAt: toLocalInput(promo.startAt), endAt: toLocalInput(promo.endAt), isActive: promo.isActive,
    } : { ...emptyForm, startAt: toLocalInput(now.toISOString()), endAt: toLocalInput(new Date(now.getTime() + 7 * 86400000).toISOString()) });
    setComicQuery(promo ? promo.comicTitle : '');
    setOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.comicId) { alert('작품을 선택하세요.'); return; }
    setSaving(true);
    try {
      const body = { ...form, value: form.type === 'FREE_RENTAL' ? 0 : Number(form.value), startAt: new Date(form.startAt).toISOString(), endAt: new Date(form.endAt).toISOString() };
      const response = await fetch(`${apiBase()}/admin/promotions${editing ? `/${editing.id}` : ''}`, { method: editing ? 'PUT' : 'POST', headers: headers(), body: JSON.stringify(body) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || '저장 실패');
      setOpen(false);
      await load();
    } catch (error: any) {
      alert(error.message || '저장하지 못했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (promo: Promotion) => {
    if (!confirm(`'${promo.comicTitle}' ${promo.label} 이벤트를 삭제할까요? (잠시 멈추려면 '적용'을 끄세요)`)) return;
    const response = await fetch(`${apiBase()}/admin/promotions/${promo.id}`, { method: 'DELETE', headers: headers() });
    if (!response.ok) { alert('삭제하지 못했습니다.'); return; }
    await load();
  };

  const input = 'w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white focus:border-purple-500 focus:outline-none';

  return (
    <div className="min-h-screen bg-gray-900 p-6 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold"><BadgePercent className="h-6 w-6" />할인·무료 이벤트 작품</h1>
            <p className="mt-1 text-sm text-gray-400">기간 동안 실제 가격과 열람 권한에 바로 반영됩니다(최대 30초). 홈 [이벤트 작품]과 /promotions 에 노출되고, 종료되면 자동으로 빠집니다.</p>
          </div>
          <button type="button" onClick={() => openForm(null)} className="flex items-center gap-1.5 rounded-lg bg-purple-600 px-4 py-2 font-bold hover:bg-purple-700"><Plus className="h-4 w-4" />새 이벤트</button>
        </div>
        {loading ? (
          <p className="py-20 text-center text-gray-400">불러오는 중...</p>
        ) : promotions.length === 0 ? (
          <p className="rounded-lg border border-dashed border-gray-700 py-20 text-center text-gray-400">등록된 할인·무료 이벤트가 없습니다.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-gray-700">
            <table className="w-full text-sm">
              <thead className="bg-gray-800 text-left text-gray-400">
                <tr><th className="p-3">작품</th><th className="p-3">혜택</th><th className="p-3">기간</th><th className="p-3">상태</th><th className="p-3" /></tr>
              </thead>
              <tbody>
                {promotions.map((promo) => (
                  <tr key={promo.id} className="border-t border-gray-700">
                    <td className="p-3 font-bold">{promo.comicTitle}</td>
                    <td className="p-3">{promo.label}{promo.title ? <span className="block text-xs text-gray-400">{promo.title}</span> : null}</td>
                    <td className="p-3 text-gray-300">{fmt(promo.startAt)} ~ {fmt(promo.endAt)}</td>
                    <td className="p-3"><span className={`rounded px-2 py-0.5 text-xs font-bold ${STATUS[promo.status][1]}`}>{STATUS[promo.status][0]}</span></td>
                    <td className="p-3">
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => openForm(promo)} className="rounded p-1.5 text-gray-300 hover:bg-gray-700" aria-label="수정"><Pencil className="h-4 w-4" /></button>
                        <button type="button" onClick={() => void remove(promo)} className="rounded p-1.5 text-red-400 hover:bg-gray-700" aria-label="삭제"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <form onSubmit={save} className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-gray-800 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">{editing ? '이벤트 수정' : '새 할인·무료 이벤트'}</h2>
              <button type="button" onClick={() => setOpen(false)} aria-label="닫기"><X className="h-5 w-5 text-gray-400" /></button>
            </div>
            <div className="space-y-4 text-sm">
              <div>
                작품 *
                <input className={input} placeholder="작품명 검색" value={comicQuery} onChange={(e) => { setComicQuery(e.target.value); setForm({ ...form, comicId: '' }); }} />
                {!form.comicId && comicQuery && (
                  <div className="mt-1 max-h-40 overflow-y-auto rounded-lg border border-gray-600 bg-gray-900">
                    {filteredComics.map((comic) => (
                      <button key={comic.id} type="button" className="block w-full px-3 py-1.5 text-left hover:bg-gray-700" onClick={() => { setForm({ ...form, comicId: comic.id }); setComicQuery(comic.title); }}>{comic.title}</button>
                    ))}
                    {filteredComics.length === 0 && <p className="px-3 py-2 text-gray-400">검색 결과 없음</p>}
                  </div>
                )}
                {form.comicId && <p className="mt-1 text-xs text-green-400">선택됨</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">종류 *
                  <select className={input} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as PromoType })}>
                    {(Object.keys(TYPE_LABEL) as PromoType[]).map((type) => <option key={type} value={type}>{TYPE_LABEL[type]}</option>)}
                  </select>
                </label>
                {form.type !== 'FREE_RENTAL' && (
                  <label className="block">{form.type === 'DISCOUNT' ? '할인율(%) *' : '무료 회차 수(1~N화) *'}
                    <input type="number" min={1} max={form.type === 'DISCOUNT' ? 90 : 9999} className={input} value={form.value} onChange={(e) => setForm({ ...form, value: Number(e.target.value) })} />
                  </label>
                )}
              </div>
              <label className="block">안내 문구 <span className="text-gray-400">(선택)</span>
                <input className={input} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">시작 *<input type="datetime-local" className={input} value={form.startAt} onChange={(e) => setForm({ ...form, startAt: e.target.value })} required /></label>
                <label className="block">종료 *<input type="datetime-local" className={input} value={form.endAt} onChange={(e) => setForm({ ...form, endAt: e.target.value })} required /></label>
              </div>
              <label className="flex items-center gap-2"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />적용</label>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg bg-gray-700 px-4 py-2">취소</button>
              <button type="submit" disabled={saving} className="rounded-lg bg-purple-600 px-4 py-2 font-bold hover:bg-purple-700 disabled:opacity-50">{saving ? '저장 중...' : '저장'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
