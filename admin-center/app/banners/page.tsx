'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, ExternalLink, ImagePlus, Pencil, Plus, Trash2, X } from 'lucide-react';
import { adminApi, apiBase, authHeaders, img, siteBase } from '@/lib/works';

// 배너 관리 = 홈 대배너의 유일한 기준 (/api/admin/banner-center)
// 등록·켜짐·노출 기간 안 → 사용자 화면 [메인 홈 > 대배너] 노출 / 삭제·끄기·기간 끝 → 대배너에서 빠짐.
// 목록 순서(위→아래) = 대배너 왼쪽→오른쪽. [이벤트 관리 > 대배너에 추가]로 만든 배너도 여기서 관리한다.
interface Banner {
  id: string; title: string; subtitle?: string | null; description?: string | null; imageUrl: string; ctaText: string; ctaLink: string;
  placement: string; placementLabel: string; showText: boolean; isActive: boolean; startAt?: string | null; endAt?: string | null; order: number;
  webtoonId?: string | null; webtoonTitle?: string | null; state: 'LIVE' | 'SCHEDULED' | 'ENDED' | 'OFF';
  event?: { id: string; title: string; endAt?: string | null; ended: boolean } | null;
}
const STATE: Record<Banner['state'], { label: string; className: string }> = {
  LIVE: { label: '노출 중', className: 'bg-green-500/20 text-green-300' },
  SCHEDULED: { label: '노출 예정', className: 'bg-sky-500/20 text-sky-300' },
  ENDED: { label: '기간 종료', className: 'bg-gray-500/30 text-gray-300' },
  OFF: { label: '꺼짐', className: 'bg-gray-700 text-gray-400' },
};
const toLocal = (v?: string | null) => { if (!v) return ''; const d = new Date(v); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); };
const fmt = (v?: string | null) => (v ? new Date(v).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '');
const input = 'w-full rounded border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none';

export default function BannersPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Banner | 'new' | null>(null);

  const load = useCallback(async () => {
    try { setBanners((await adminApi<{ banners: Banner[] }>('/admin/banner-center')).banners); } catch (e: any) { alert(e.message); } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const move = async (index: number, dir: -1 | 1) => {
    const next = [...banners];
    const j = index + dir;
    if (j < 0 || j >= next.length) return;
    [next[index], next[j]] = [next[j], next[index]];
    setBanners(next);
    try { await adminApi('/admin/banner-center/reorder', { method: 'POST', json: { ids: next.map((b) => b.id) } }); } catch (e: any) { alert(e.message); await load(); }
  };
  const toggle = async (b: Banner) => {
    try { await adminApi(`/admin/banner-center/${b.id}`, { method: 'PUT', json: { isActive: !b.isActive } }); await load(); } catch (e: any) { alert(e.message); }
  };
  const remove = async (b: Banner) => {
    if (!confirm(`'${b.title}' 배너를 삭제할까요?\n홈 대배너에서도 바로 빠집니다.`)) return;
    try { await adminApi(`/admin/banner-center/${b.id}`, { method: 'DELETE' }); await load(); } catch (e: any) { alert(e.message); }
  };
  const live = banners.filter((b) => b.state === 'LIVE');

  return (
    <div className="min-h-screen bg-gray-900 p-6 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">배너 관리</h1>
            <p className="mt-1 text-sm text-gray-400">
              여기 등록된 배너만 <b className="text-white">사용자 화면 · 메인 홈 &gt; 대배너</b>에 나옵니다. 켜져 있고 노출 기간 안이면 노출, 삭제·끄기·기간 종료면 대배너에서 빠집니다.
              목록 순서(위→아래)가 대배너 왼쪽→오른쪽 순서입니다. 이벤트는 [이벤트 관리 &gt; 대배너에 추가]로도 올릴 수 있습니다.
            </p>
          </div>
          <div className="flex gap-2">
            <a href={`${siteBase()}/home`} target="_blank" rel="noreferrer" className="flex items-center gap-1 rounded bg-gray-700 px-3 py-2 text-sm hover:bg-gray-600"><ExternalLink className="h-4 w-4" />홈에서 보기</a>
            <button type="button" onClick={() => setEditing('new')} className="flex items-center gap-1 rounded bg-purple-600 px-4 py-2 text-sm font-bold hover:bg-purple-700"><Plus className="h-4 w-4" />배너 추가</button>
          </div>
        </div>
        <p className="mt-3 rounded bg-gray-800 px-3 py-2 text-sm">지금 홈 대배너에 <b className="text-green-300">{live.length}개</b> 노출 중{live.length === 0 && ' — 노출할 배너가 없으면 대배너 영역이 숨겨집니다.'}</p>

        {loading ? <p className="py-20 text-center text-gray-400">불러오는 중...</p> : banners.length === 0 ? (
          <p className="mt-4 rounded-lg border border-dashed border-gray-700 py-16 text-center text-gray-400">등록된 배너가 없습니다. [배너 추가]로 올리세요.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {banners.map((b, index) => (
              <li key={b.id} className={`flex flex-wrap items-center gap-4 rounded-lg border p-3 ${b.state === 'LIVE' ? 'border-green-500/30 bg-gray-800' : 'border-gray-700 bg-gray-800/60'}`}>
                <div className="flex flex-col gap-1">
                  <button type="button" aria-label="위로" disabled={index === 0} onClick={() => void move(index, -1)} className="rounded bg-gray-700 p-1 disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button>
                  <button type="button" aria-label="아래로" disabled={index === banners.length - 1} onClick={() => void move(index, 1)} className="rounded bg-gray-700 p-1 disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button>
                </div>
                <img src={img(b.imageUrl)} alt="" className="h-20 w-40 shrink-0 rounded bg-gray-700 object-cover" />
                <div className="min-w-0 flex-1 text-sm">
                  <p className="flex flex-wrap items-center gap-2">
                    <span className={`rounded px-2 py-0.5 text-xs font-bold ${STATE[b.state].className}`}>{STATE[b.state].label}</span>
                    <span className="rounded bg-purple-500/20 px-2 py-0.5 text-xs text-purple-200">노출 위치: {b.placementLabel}</span>
                    <b className="truncate">{b.title}</b>
                  </p>
                  {b.subtitle && <p className="mt-0.5 truncate text-gray-400">{b.subtitle}</p>}
                  <p className="mt-1 text-xs text-gray-400">
                    이동: {b.ctaLink || (b.webtoonId ? `/webtoons/${b.webtoonId}` : '-')}{b.webtoonTitle && ` (작품: ${b.webtoonTitle})`}
                    {' · '}기간: {b.startAt || b.endAt ? `${fmt(b.startAt) || '바로'} ~ ${fmt(b.endAt) || '계속'}` : '제한 없음'}
                    {!b.showText && ' · 글자 없이 이미지만'}
                  </p>
                  {b.event && (
                    <p className={`mt-1 text-xs ${b.event.ended ? 'text-amber-300' : 'text-sky-300'}`}>
                      이벤트로 만든 배너: {b.event.title}{b.event.ended ? ' — 이벤트가 끝났습니다. 대배너에 계속 둘지 확인하세요.' : b.event.endAt ? ` (이벤트 종료 ${fmt(b.event.endAt)})` : ''}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <label className="flex cursor-pointer items-center gap-1 text-xs">
                    <input type="checkbox" checked={b.isActive} onChange={() => void toggle(b)} />노출
                  </label>
                  <button type="button" onClick={() => setEditing(b)} className="flex items-center gap-1 rounded bg-gray-700 px-2 py-1 text-xs"><Pencil className="h-3 w-3" />수정</button>
                  <button type="button" onClick={() => void remove(b)} className="flex items-center gap-1 rounded bg-red-600/80 px-2 py-1 text-xs"><Trash2 className="h-3 w-3" />삭제</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      {editing && <BannerForm banner={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={async () => { setEditing(null); await load(); }} />}
    </div>
  );
}

function BannerForm({ banner, onClose, onSaved }: { banner: Banner | null; onClose: () => void; onSaved: () => Promise<void> }) {
  const [form, setForm] = useState({
    title: banner?.title || '', subtitle: banner?.subtitle || '', ctaLink: banner?.ctaLink || '', ctaText: banner?.ctaText || '',
    webtoonId: banner?.webtoonId || '', showText: banner?.showText ?? true, isActive: banner?.isActive ?? true,
    startAt: toLocal(banner?.startAt), endAt: toLocal(banner?.endAt),
  });
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState(banner ? img(banner.imageUrl) : '');
  const [busy, setBusy] = useState(false);
  const set = (patch: Partial<typeof form>) => setForm({ ...form, ...patch });
  useEffect(() => { if (!file) return; const url = URL.createObjectURL(file); setPreview(url); return () => URL.revokeObjectURL(url); }, [file]);

  const save = async () => {
    if (!form.title.trim()) { alert('배너 제목을 입력하세요.'); return; }
    if (!banner && !file) { alert('배너 이미지를 올리세요.'); return; }
    if (!form.ctaLink.trim() && !form.webtoonId.trim()) { alert('누르면 이동할 링크를 넣거나 작품 ID를 연결하세요.'); return; }
    setBusy(true);
    try {
      const body = new FormData();
      body.append('title', form.title); body.append('subtitle', form.subtitle); body.append('ctaLink', form.ctaLink); body.append('ctaText', form.ctaText);
      body.append('webtoonId', form.webtoonId); body.append('showText', String(form.showText)); body.append('isActive', String(form.isActive)); body.append('placement', 'HOME_MAIN');
      body.append('startAt', form.startAt ? new Date(form.startAt).toISOString() : ''); body.append('endAt', form.endAt ? new Date(form.endAt).toISOString() : '');
      if (file) body.append('image', file);
      const r = await fetch(`${apiBase()}/admin/banner-center${banner ? `/${banner.id}` : ''}`, { method: banner ? 'PUT' : 'POST', headers: authHeaders(), body });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.message || '저장하지 못했습니다.');
      await onSaved();
    } catch (e: any) { alert(e.message); } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-label="배너 편집">
      <div className="max-h-[92vh] w-full max-w-2xl space-y-3 overflow-y-auto rounded-xl bg-gray-800 p-6 text-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">{banner ? '배너 수정' : '배너 추가'}</h2>
          <button type="button" onClick={onClose} aria-label="닫기" className="rounded p-1 text-gray-400 hover:bg-gray-700"><X className="h-5 w-5" /></button>
        </div>
        <p className="rounded bg-purple-500/10 px-3 py-2 text-purple-200">노출 위치: <b>메인 홈 &gt; 대배너</b></p>
        <label className="block"><span className="mb-1 block text-gray-300">배너 이미지 {banner ? '(바꿀 때만)' : '*'} <span className="text-xs text-gray-500">가로형 권장(약 2:1), 10MB 이하 · 자르지 않고 폭 1600px로 줄여 저장</span></span>
          {preview && <img src={preview} alt="배너 미리보기" className="mb-2 max-h-48 rounded border border-gray-600" />}
          <span className="flex cursor-pointer items-center gap-2 rounded border border-dashed border-gray-600 px-3 py-3 text-gray-300 hover:bg-gray-700"><ImagePlus className="h-4 w-4" />{file ? file.name : '이미지 선택'}
            <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </span>
        </label>
        <label className="block"><span className="mb-1 block text-gray-300">제목 *</span><input className={input} value={form.title} maxLength={60} onChange={(e) => set({ title: e.target.value })} /></label>
        <label className="block"><span className="mb-1 block text-gray-300">부제</span><input className={input} value={form.subtitle} maxLength={80} onChange={(e) => set({ subtitle: e.target.value })} /></label>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="block"><span className="mb-1 block text-gray-300">누르면 이동할 링크 <span className="text-xs text-gray-500">예) /events, /webtoons/작품ID</span></span><input className={input} value={form.ctaLink} onChange={(e) => set({ ctaLink: e.target.value })} /></label>
          <label className="block"><span className="mb-1 block text-gray-300">작품 연결(작품 ID) <span className="text-xs text-gray-500">링크가 비면 이 작품으로</span></span><input className={input} value={form.webtoonId} onChange={(e) => set({ webtoonId: e.target.value })} /></label>
          <label className="block"><span className="mb-1 block text-gray-300">노출 시작 <span className="text-xs text-gray-500">비우면 바로</span></span><input type="datetime-local" className={input} value={form.startAt} onChange={(e) => set({ startAt: e.target.value })} /></label>
          <label className="block"><span className="mb-1 block text-gray-300">노출 종료 <span className="text-xs text-gray-500">비우면 계속</span></span><input type="datetime-local" className={input} value={form.endAt} onChange={(e) => set({ endAt: e.target.value })} /></label>
        </div>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2"><input type="checkbox" checked={form.showText} onChange={(e) => set({ showText: e.target.checked })} />배너 위에 제목·부제 글자 표시 <span className="text-xs text-gray-500">(이미지에 글자가 있으면 끄기)</span></label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={form.isActive} onChange={(e) => set({ isActive: e.target.checked })} />노출 켜기</label>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded bg-gray-700 px-4 py-2">취소</button>
          <button type="button" disabled={busy} onClick={() => void save()} className="rounded bg-purple-600 px-4 py-2 font-bold disabled:opacity-50">{busy ? '저장 중...' : '저장'}</button>
        </div>
      </div>
    </div>
  );
}
