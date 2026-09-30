'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, ArrowRight, ImagePlus, Star, Trash2, X } from 'lucide-react';
import { adminApi, apiBase, authHeaders, img, siteBase } from '@/lib/works';

// 화보 등록·수정: 제목·대표 썸네일·이미지 여러 장(순서·삭제)·작품/캐릭터 연결·태그·설명·공개 상태·공개일(예약)·노출 종료일·가격·시리즈
const toLocal = (v?: string | null) => { if (!v) return ''; const d = new Date(v); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); };
const input = 'w-full rounded border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none';

function EditContent() {
  const router = useRouter();
  const id = useSearchParams().get('id');
  const [form, setForm] = useState({ title: '', description: '', tags: '', status: 'PUBLISHED', workId: '', workTitle: '', characterId: '', characterName: '', releaseAt: '', endAt: '', coinPrice: '0', previewCount: '4', contentRating: 'GENERAL', seriesId: '', seriesOrder: '0' });
  const [assets, setAssets] = useState<string[]>([]);
  const [thumbnail, setThumbnail] = useState('');
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [chars, setChars] = useState<{ id: string; name: string }[]>([]);
  const [works, setWorks] = useState<{ id: string; title: string }[]>([]);
  const [wq, setWq] = useState('');
  const [series, setSeries] = useState<{ id: string; title: string }[]>([]);
  const [tagDict, setTagDict] = useState<string[]>([]);
  const [meta, setMeta] = useState<{ isOfficial: boolean; creator: string; purchases: number; reports: any[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (p: Partial<typeof form>) => setForm((f) => ({ ...f, ...p }));

  useEffect(() => {
    adminApi<{ series: any[] }>('/admin/gallery/series').then((d) => setSeries(d.series)).catch(() => {});
    adminApi<{ tags: { name: string }[] }>('/admin/gallery/tags').then((d) => setTagDict(d.tags.map((t) => t.name))).catch(() => {});
    adminApi<{ works: any[] }>('/admin/works').then((d) => setWorks(d.works.map((w) => ({ id: w.id, title: w.title })))).catch(() => {});
    if (!id) return;
    adminApi<any>(`/admin/gallery/items/${id}`).then(({ item, reports }) => {
      setForm({ title: item.title, description: item.description || '', tags: item.tags.join(', '), status: item.status, workId: item.workId || '', workTitle: item.work?.title || '', characterId: item.characterId || '', characterName: item.characterName || '', releaseAt: toLocal(item.releaseAt), endAt: toLocal(item.endAt), coinPrice: String(item.coinPrice || 0), previewCount: String(item.previewCount || 0), contentRating: item.contentRating || 'GENERAL', seriesId: item.seriesId || '', seriesOrder: String(item.seriesOrder || 0) });
      setAssets(item.assets); setThumbnail(item.thumbnail || item.assets[0] || '');
      setMeta({ isOfficial: item.isOfficial, creator: item.creator, purchases: item.purchases, reports });
    }).catch((e) => alert(e.message));
  }, [id]);
  useEffect(() => { setChars([]); if (form.workId) adminApi<{ characters: any[] }>(`/admin/gallery/works/${form.workId}/characters`).then((d) => setChars(d.characters)).catch(() => {}); }, [form.workId]);

  const move = (i: number, d: -1 | 1) => { const n = [...assets]; const j = i + d; if (j < 0 || j >= n.length) return; [n[i], n[j]] = [n[j], n[i]]; setAssets(n); };
  const save = async () => {
    if (!form.title.trim()) { alert('화보 제목을 입력하세요.'); return; }
    if (!id && !newFiles.length) { alert('이미지를 1장 이상 올리세요.'); return; }
    setBusy(true);
    try {
      const body = new FormData();
      const add = (k: string, v: string) => body.append(k, v);
      add('title', form.title); add('description', form.description); add('tags', form.tags); add('status', form.status);
      add('workId', form.workId); add('characterId', form.characterId); add('characterName', form.characterId ? chars.find((c) => c.id === form.characterId)?.name || form.characterName : form.characterName);
      add('releaseAt', form.releaseAt ? new Date(form.releaseAt).toISOString() : ''); add('endAt', form.endAt ? new Date(form.endAt).toISOString() : '');
      add('coinPrice', form.coinPrice || '0'); add('previewCount', form.previewCount || '0'); add('contentRating', form.contentRating); add('seriesId', form.seriesId); add('seriesOrder', form.seriesOrder || '0');
      newFiles.forEach((f) => body.append('images', f));
      if (id) { add('assets', JSON.stringify(assets)); add('thumbnail', thumbnail); }
      const r = await fetch(`${apiBase()}/admin/gallery/items${id ? `/${id}` : ''}`, { method: id ? 'PUT' : 'POST', headers: authHeaders(), body });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.message || '저장하지 못했습니다.');
      alert('저장했습니다.');
      if (!id) router.replace(`/gallery/edit?id=${d.id}`); else window.location.reload();
    } catch (e: any) { alert(e.message); } finally { setBusy(false); }
  };
  const remove = async () => { if (!id || !confirm('이 화보를 삭제할까요? 되돌릴 수 없습니다.')) return; try { await adminApi(`/admin/gallery/items/${id}`, { method: 'DELETE' }); router.replace('/gallery'); } catch (e: any) { alert(e.message); } };
  const tagList = form.tags.split(',').map((t) => t.trim()).filter(Boolean);

  return (
    <div className="min-h-screen bg-gray-900 p-6 text-white">
      <div className="mx-auto max-w-5xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-bold">{id ? '화보 수정' : '공식 화보 등록'}</h1>
          <div className="flex gap-2">
            {id && <a href={`${siteBase()}/gallery/${id}`} target="_blank" rel="noreferrer" className="rounded bg-gray-700 px-3 py-2 text-sm">사이트에서 보기</a>}
            {id && <button type="button" onClick={() => void remove()} className="flex items-center gap-1 rounded bg-red-700 px-3 py-2 text-sm"><Trash2 className="h-4 w-4" />삭제</button>}
            <button type="button" disabled={busy} onClick={() => void save()} className="rounded bg-purple-600 px-4 py-2 text-sm font-bold disabled:opacity-50">{busy ? '저장 중...' : '저장'}</button>
          </div>
        </div>
        {meta && <p className="text-sm text-gray-400">{meta.isOfficial ? '공식 화보' : `사용자 화보 · ${meta.creator}`} · 소장 {meta.purchases}명{meta.reports.length ? ` · 신고 ${meta.reports.length}건` : ''}</p>}

        <section className="rounded-lg bg-gray-800 p-4">
          <p className="mb-2 font-bold">이미지 <span className="text-xs font-normal text-gray-400">★ = 대표 썸네일, 화살표로 순서, 저장해야 반영</span></p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {assets.map((src, i) => (
              <div key={src} className={`relative overflow-hidden rounded ${thumbnail === src ? 'ring-2 ring-yellow-400' : ''}`}>
                <img src={img(src)} alt="" className="aspect-[3/4] w-full object-cover" />
                <span className="absolute inset-x-0 bottom-0 flex justify-between bg-black/60 p-0.5">
                  <button type="button" aria-label="앞으로" onClick={() => move(i, -1)}><ArrowLeft className="h-3.5 w-3.5" /></button>
                  <button type="button" aria-label="대표로" onClick={() => setThumbnail(src)}><Star className="h-3.5 w-3.5" fill={thumbnail === src ? 'currentColor' : 'none'} /></button>
                  <button type="button" aria-label="빼기" onClick={() => setAssets(assets.filter((a) => a !== src))}><X className="h-3.5 w-3.5 text-red-300" /></button>
                  <button type="button" aria-label="뒤로" onClick={() => move(i, 1)}><ArrowRight className="h-3.5 w-3.5" /></button>
                </span>
              </div>
            ))}
            <label className="flex aspect-[3/4] cursor-pointer flex-col items-center justify-center rounded border border-dashed border-gray-600 text-xs text-gray-400"><ImagePlus className="mb-1 h-5 w-5" />이미지 추가{newFiles.length > 0 && <span className="mt-1 text-purple-300">{newFiles.length}장 대기</span>}
              <input type="file" multiple accept="image/png,image/jpeg,image/webp,image/gif" className="sr-only" onChange={(e) => setNewFiles([...newFiles, ...Array.from(e.target.files || [])])} />
            </label>
          </div>
          {!id && <p className="mt-1 text-xs text-gray-400">첫 번째로 고른 이미지가 대표 썸네일이 됩니다(등록 후 바꿀 수 있음).</p>}
        </section>

        <section className="grid gap-3 rounded-lg bg-gray-800 p-4 md:grid-cols-2">
          <label className="block text-sm">화보 제목 *<input className={input} value={form.title} onChange={(e) => set({ title: e.target.value })} /></label>
          <label className="block text-sm">공개 상태
            <select className={input} value={form.status} onChange={(e) => set({ status: e.target.value })}><option value="PUBLISHED">공개</option><option value="DRAFT">비공개</option><option value="REVIEW">검토 중</option><option value="HIDDEN">숨김</option><option value="REJECTED">반려</option></select>
          </label>
          <label className="block text-sm">작품 연결
            <input className={input} list="work-list" value={wq || form.workTitle} placeholder="작품명 입력 후 선택" onChange={(e) => { setWq(e.target.value); const w = works.find((x) => x.title === e.target.value); if (w) { set({ workId: w.id, workTitle: w.title, characterId: '' }); setWq(''); } if (!e.target.value) set({ workId: '', workTitle: '', characterId: '' }); }} />
            <datalist id="work-list">{works.map((w) => <option key={w.id} value={w.title} />)}</datalist>
          </label>
          <label className="block text-sm">캐릭터 연결 <span className="text-xs text-gray-400">(작품의 캐릭터 채팅 목록, 없으면 이름 직접)</span>
            {chars.length > 0 ? (
              <select className={input} value={form.characterId} onChange={(e) => set({ characterId: e.target.value })}><option value="">선택 안 함</option>{chars.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
            ) : <input className={input} value={form.characterName} onChange={(e) => set({ characterName: e.target.value })} placeholder="캐릭터 이름" />}
          </label>
          <label className="block text-sm md:col-span-2">태그 <span className="text-xs text-gray-400">쉼표로 구분</span><input className={input} value={form.tags} onChange={(e) => set({ tags: e.target.value })} />
            <span className="mt-1 flex flex-wrap gap-1">{tagDict.filter((t) => !tagList.includes(t)).slice(0, 20).map((t) => <button key={t} type="button" onClick={() => set({ tags: tagList.concat(t).join(', ') })} className="rounded-full bg-gray-700 px-2 py-0.5 text-xs">+{t}</button>)}</span>
          </label>
          <label className="block text-sm md:col-span-2">화보 설명<textarea rows={3} className={input} value={form.description} onChange={(e) => set({ description: e.target.value })} /></label>
          <label className="block text-sm">공개일 <span className="text-xs text-gray-400">(미래 = 예약 공개, 비우면 바로)</span><input type="datetime-local" className={input} value={form.releaseAt} onChange={(e) => set({ releaseAt: e.target.value })} /></label>
          <label className="block text-sm">노출 종료일 <span className="text-xs text-gray-400">(비우면 계속)</span><input type="datetime-local" className={input} value={form.endAt} onChange={(e) => set({ endAt: e.target.value })} /></label>
          <label className="block text-sm">가격(코인) <span className="text-xs text-gray-400">0 = 무료</span><input type="number" min={0} className={input} value={form.coinPrice} onChange={(e) => set({ coinPrice: e.target.value })} /></label>
          <label className="block text-sm">미리보기 장수 <span className="text-xs text-gray-400">(유료일 때 무료로 보이는 장수)</span><input type="number" min={0} className={input} value={form.previewCount} onChange={(e) => set({ previewCount: e.target.value })} /></label>
          <label className="block text-sm">이용등급<select className={input} value={form.contentRating} onChange={(e) => set({ contentRating: e.target.value })}><option value="GENERAL">전체</option><option value="ADULT">19세 (성인 인증·19 ON)</option></select></label>
          <label className="block text-sm">시리즈
            <span className="flex gap-2"><select className={input} value={form.seriesId} onChange={(e) => set({ seriesId: e.target.value })}><option value="">없음</option>{series.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}</select><input type="number" className={`${input} w-24`} value={form.seriesOrder} onChange={(e) => set({ seriesOrder: e.target.value })} aria-label="시리즈 순서" title="시리즈 안 순서" /></span>
          </label>
        </section>
      </div>
    </div>
  );
}
export default function GalleryEditPage() { return <Suspense fallback={null}><EditContent /></Suspense>; }
