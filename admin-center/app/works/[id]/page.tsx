'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ExternalLink, Plus, Save, Trash2, Upload } from 'lucide-react';
import { STATUS_LABEL, TYPE_LABEL, adminApi, apiBase, authHeaders, img, siteBase } from '@/lib/works';

// 작품 상세 관리 (MIB 관리자 작품 편집 + 회차 등록·예약 공개)
interface Work {
  id: string; title: string; authorName?: string | null; genre: string; description?: string | null; thumbnail?: string | null; rating: string;
  status: string; resumeAt?: string | null; contentType: string; type: 'webtoon' | 'book' | 'novel'; isPublished: boolean; isOfficial: boolean;
  paidStartEpisode: number; episodeCoinPrice: number; rentalCoinPrice: number | null; rentalDays: number; updateDays?: string | null;
  viewCount: number; createdAt: string; lastEpisodeAt?: string | null; badges: { up: boolean; new: boolean };
}
interface Episode {
  id: string; episodeNumber: number; title: string; publishedAt: string; scheduled: boolean; publishedToday: boolean; free: boolean;
  imageCount: number; textLength: number; textContent?: string; viewCount: number; purchases: number;
}

const DAYS = [['mon', '월'], ['tue', '화'], ['wed', '수'], ['thu', '목'], ['fri', '금'], ['sat', '토'], ['sun', '일']] as const;
// datetime-local <-> ISO (브라우저 시간대 = 한국)
const toLocal = (value?: string | null) => {
  if (!value) return '';
  const d = new Date(value);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
const fromLocal = (value: string) => (value ? new Date(value).toISOString() : null);
const input = 'w-full rounded border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none';

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-gray-300">{label}{hint && <span className="ml-1 text-xs text-gray-500">{hint}</span>}</span>
      {children}
    </label>
  );
}

export default function WorkDetailPage() {
  const params = useParams();
  const id = String(params.id || '');
  const [work, setWork] = useState<Work | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [form, setForm] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    const data = await adminApi<{ work: Work; episodes: Episode[] }>(`/admin/works/${id}`);
    setWork(data.work);
    setEpisodes(data.episodes);
    let days: string[] = [];
    try { days = JSON.parse(data.work.updateDays || '[]') || []; } catch {}
    setForm({
      title: data.work.title, authorName: data.work.authorName || '', genre: data.work.genre || '', description: data.work.description || '',
      contentType: data.work.contentType || 'WEBTOON', rating: ['19', 'ADULT'].includes(data.work.rating) ? '19' : 'GENERAL', status: data.work.status,
      resumeAt: toLocal(data.work.resumeAt), isPublished: data.work.isPublished, isOfficial: data.work.isOfficial, launchedAt: toLocal(data.work.createdAt),
      paidStartEpisode: data.work.paidStartEpisode, episodeCoinPrice: data.work.episodeCoinPrice,
      rentalCoinPrice: data.work.rentalCoinPrice === null || data.work.rentalCoinPrice === undefined ? '' : String(data.work.rentalCoinPrice), rentalDays: data.work.rentalDays || 3,
      updateDays: days,
    });
  }, [id]);
  useEffect(() => { load().catch((e) => alert(e.message)); }, [load]);

  const save = async () => {
    setSaving(true);
    setMessage('');
    try {
      await adminApi(`/admin/works/${id}`, { method: 'PATCH', json: {
        ...form,
        resumeAt: form.status === 'HIATUS' ? fromLocal(form.resumeAt) : null,
        launchedAt: fromLocal(form.launchedAt),
        paidStartEpisode: Number(form.paidStartEpisode), episodeCoinPrice: Number(form.episodeCoinPrice), rentalDays: Number(form.rentalDays),
        rentalCoinPrice: form.rentalCoinPrice === '' ? null : Number(form.rentalCoinPrice),
      } });
      await load();
      setMessage('저장했습니다. 사이트에 바로 반영됩니다.');
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  const uploadThumbnail = async (file: File) => {
    const body = new FormData();
    body.append('thumbnail', file);
    const r = await fetch(`${apiBase()}/admin/works/${id}/thumbnail`, { method: 'POST', headers: authHeaders(), body });
    const d = await r.json();
    if (!r.ok) { alert(d.message || '업로드 실패'); return; }
    await load();
  };

  if (!work || !form) return <div className="min-h-screen bg-gray-900 p-6 text-gray-400">불러오는 중...</div>;
  const set = (patch: any) => setForm({ ...form, ...patch });
  const isNovel = form.contentType === 'NOVEL';

  return (
    <div className="min-h-screen bg-gray-900 p-6 text-white">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Link href="/works" className="text-xs text-gray-400 hover:text-white">← 작품 목록</Link>
            <h1 className="mt-1 flex flex-wrap items-center gap-2 text-2xl font-bold">
              {work.title}
              {work.badges.up && <span className="rounded bg-red-600 px-1.5 text-xs">UP</span>}
              {work.badges.new && <span className="rounded bg-green-500 px-1.5 text-xs text-black">NEW</span>}
              <span className="rounded bg-gray-700 px-1.5 text-xs">{TYPE_LABEL[work.type]}</span>
              <span className="rounded bg-gray-700 px-1.5 text-xs">{STATUS_LABEL[work.status] || work.status}</span>
            </h1>
            <p className="mt-1 text-sm text-gray-400">ID {work.id} · 조회 {work.viewCount.toLocaleString()} · 회차 {episodes.length} · 마지막 공개 {work.lastEpisodeAt ? new Date(work.lastEpisodeAt).toLocaleString('ko-KR') : '-'}</p>
          </div>
          <div className="flex gap-2">
            <a href={`${siteBase()}/webtoons/${work.id}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 rounded bg-gray-700 px-3 py-2 text-sm hover:bg-gray-600"><ExternalLink className="h-4 w-4" />사이트에서 보기</a>
            <button type="button" onClick={() => void save()} disabled={saving} className="flex items-center gap-1 rounded bg-purple-600 px-4 py-2 text-sm font-bold hover:bg-purple-700 disabled:opacity-50"><Save className="h-4 w-4" />{saving ? '저장 중...' : '저장'}</button>
          </div>
        </div>
        {message && <p className="rounded bg-green-900/40 px-3 py-2 text-sm text-green-300">{message}</p>}

        <section className="grid gap-6 rounded-lg bg-gray-800 p-5 md:grid-cols-[180px_1fr]">
          <div>
            <img src={img(work.thumbnail)} alt="" className="aspect-[3/4] w-full rounded bg-gray-700 object-cover" />
            <label className="mt-2 flex cursor-pointer items-center justify-center gap-1 rounded bg-gray-700 py-2 text-xs hover:bg-gray-600">
              <Upload className="h-4 w-4" />표지 바꾸기
              <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadThumbnail(f); }} />
            </label>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="제목"><input className={input} value={form.title} onChange={(e) => set({ title: e.target.value })} /></Field>
            <Field label="작가"><input className={input} value={form.authorName} onChange={(e) => set({ authorName: e.target.value })} /></Field>
            <Field label="장르" hint="예) fantasy, romance, action"><input className={input} value={form.genre} onChange={(e) => set({ genre: e.target.value })} /></Field>
            <Field label="유형">
              <select className={input} value={form.contentType} onChange={(e) => set({ contentType: e.target.value })}>
                <option value="WEBTOON">웹툰</option><option value="BOOK">단행본</option><option value="NOVEL">웹소설</option>
              </select>
            </Field>
            <Field label="연령"><select className={input} value={form.rating} onChange={(e) => set({ rating: e.target.value })}><option value="GENERAL">일반</option><option value="19">19+</option></select></Field>
            <Field label="연재 상태">
              <select className={input} value={form.status} onChange={(e) => set({ status: e.target.value })}>{Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
            </Field>
            {form.status === 'HIATUS' && <Field label="연재 재개 예정일"><input type="datetime-local" className={input} value={form.resumeAt} onChange={(e) => set({ resumeAt: e.target.value })} /></Field>}
            <Field label="런칭일" hint="NEW 배지 = 이날부터 7일"><input type="datetime-local" className={input} value={form.launchedAt} onChange={(e) => set({ launchedAt: e.target.value })} /></Field>
            <div className="md:col-span-2">
              <Field label="소개"><textarea rows={3} className={input} value={form.description} onChange={(e) => set({ description: e.target.value })} /></Field>
            </div>
            <div className="text-sm md:col-span-2">
              <span className="mb-1 block text-gray-300">연재 요일</span>
              <div className="flex flex-wrap gap-2">
                {DAYS.map(([key, label]) => {
                  const on = form.updateDays.includes(key);
                  return <button key={key} type="button" onClick={() => set({ updateDays: on ? form.updateDays.filter((d: string) => d !== key) : [...form.updateDays, key] })} className={`h-9 w-9 rounded-full text-sm font-bold ${on ? 'bg-purple-600' : 'bg-gray-700 text-gray-400'}`}>{label}</button>;
                })}
              </div>
            </div>
            <div className="flex flex-wrap gap-5 text-sm md:col-span-2">
              <label className="flex items-center gap-2"><input type="checkbox" checked={form.isPublished} onChange={(e) => set({ isPublished: e.target.checked })} />사이트에 공개</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={form.isOfficial} onChange={(e) => set({ isOfficial: e.target.checked })} />정식 연재</label>
            </div>
          </div>
        </section>

        <section className="rounded-lg bg-gray-800 p-5">
          <h2 className="mb-3 text-lg font-bold">판매 설정</h2>
          <div className="grid gap-4 md:grid-cols-4">
            <Field label="유료 시작 회차" hint="0 = 전편 무료"><input type="number" min={0} className={input} value={form.paidStartEpisode} onChange={(e) => set({ paidStartEpisode: e.target.value })} /></Field>
            <Field label="소장가(코인)"><input type="number" min={0} className={input} value={form.episodeCoinPrice} onChange={(e) => set({ episodeCoinPrice: e.target.value })} /></Field>
            <Field label="대여가(코인)" hint="비우면 소장가-1, 0이면 대여 없음"><input type="number" min={0} className={input} value={form.rentalCoinPrice} onChange={(e) => set({ rentalCoinPrice: e.target.value })} /></Field>
            <Field label="대여 기간(일)"><input type="number" min={1} className={input} value={form.rentalDays} onChange={(e) => set({ rentalDays: e.target.value })} /></Field>
          </div>
          <p className="mt-3 text-xs text-gray-400">할인·무료 이벤트는 [할인·무료], 휴재·판매중지 공지는 [연재 상태]에서 관리합니다.</p>
        </section>

        <EpisodeSection workId={id} isNovel={isNovel} episodes={episodes} onChanged={load} paidStart={Number(form.paidStartEpisode)} />
      </div>
    </div>
  );
}

function EpisodeSection({ workId, isNovel, episodes, onChanged, paidStart }: { workId: string; isNovel: boolean; episodes: Episode[]; onChanged: () => Promise<void>; paidStart: number }) {
  const [edits, setEdits] = useState<Record<string, { title: string; publishedAt: string; textContent?: string }>>({});
  const [openNew, setOpenNew] = useState(false);
  const [openText, setOpenText] = useState<string | null>(null);
  const edit = (ep: Episode) => edits[ep.id] || { title: ep.title, publishedAt: toLocal(ep.publishedAt), textContent: ep.textContent };
  const change = (ep: Episode, patch: any) => setEdits({ ...edits, [ep.id]: { ...edit(ep), ...patch } });

  const saveEp = async (ep: Episode) => {
    const e = edit(ep);
    try {
      await adminApi(`/admin/works/${workId}/episodes/${ep.id}`, { method: 'PATCH', json: { title: e.title, publishedAt: fromLocal(e.publishedAt), ...(isNovel ? { textContent: e.textContent } : {}) } });
      const next = { ...edits }; delete next[ep.id]; setEdits(next);
      await onChanged();
    } catch (err: any) { alert(err.message); }
  };
  const removeEp = async (ep: Episode) => {
    if (!confirm(`${ep.episodeNumber}화 '${ep.title}'을(를) 삭제할까요? 되돌릴 수 없습니다.`)) return;
    try { await adminApi(`/admin/works/${workId}/episodes/${ep.id}`, { method: 'DELETE' }); await onChanged(); } catch (err: any) { alert(err.message); }
  };

  return (
    <section className="rounded-lg bg-gray-800 p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold">회차 ({episodes.length})</h2>
        <button type="button" onClick={() => setOpenNew(true)} className="flex items-center gap-1 rounded bg-purple-600 px-3 py-1.5 text-sm font-bold"><Plus className="h-4 w-4" />새 회차</button>
      </div>
      <p className="mb-3 text-xs text-gray-400">공개 일시를 미래로 두면 <b>예약 공개</b>: 그 시각 전에는 사이트에 보이지 않고, 공개되는 날 작품에 <b className="text-red-400">UP</b> 배지가 붙습니다.</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-gray-400"><tr><th className="p-2">회차</th><th className="p-2">제목</th><th className="p-2">공개 일시</th><th className="p-2">가격</th><th className="p-2">{isNovel ? '글자' : '이미지'}</th><th className="p-2">조회</th><th className="p-2">구매</th><th className="p-2" /></tr></thead>
          <tbody>
            {episodes.map((ep) => {
              const e = edit(ep);
              const dirty = Boolean(edits[ep.id]);
              return (
                <React.Fragment key={ep.id}>
                  <tr className="border-t border-gray-700 align-middle">
                    <td className="p-2 font-bold">{ep.episodeNumber}화</td>
                    <td className="p-2"><input className={`${input} py-1`} value={e.title} onChange={(ev) => change(ep, { title: ev.target.value })} /></td>
                    <td className="p-2">
                      <input type="datetime-local" className={`${input} py-1`} value={e.publishedAt} onChange={(ev) => change(ep, { publishedAt: ev.target.value })} />
                      <span className="mt-0.5 block text-[11px]">
                        {ep.scheduled ? <span className="text-yellow-300">예약 공개</span> : ep.publishedToday ? <span className="text-red-400">오늘 공개 (UP)</span> : <span className="text-gray-500">공개됨</span>}
                      </span>
                    </td>
                    <td className="p-2 text-xs">{paidStart === 0 || ep.episodeNumber < paidStart ? '무료' : '유료'}</td>
                    <td className="p-2 text-xs">
                      {isNovel ? <button type="button" className="underline" onClick={() => setOpenText(openText === ep.id ? null : ep.id)}>{ep.textLength.toLocaleString()}자 · 편집</button> : `${ep.imageCount}장`}
                    </td>
                    <td className="p-2 text-xs">{ep.viewCount.toLocaleString()}</td>
                    <td className="p-2 text-xs">{ep.purchases}</td>
                    <td className="whitespace-nowrap p-2">
                      <button type="button" disabled={!dirty} onClick={() => void saveEp(ep)} className="mr-2 rounded bg-purple-600 px-2 py-1 text-xs font-bold disabled:bg-gray-700 disabled:text-gray-500">저장</button>
                      <button type="button" onClick={() => void removeEp(ep)} className="rounded p-1 text-red-400 hover:bg-gray-700" aria-label="삭제"><Trash2 className="h-4 w-4" /></button>
                    </td>
                  </tr>
                  {isNovel && openText === ep.id && (
                    <tr><td colSpan={8} className="p-2"><textarea rows={10} className={input} value={e.textContent || ''} onChange={(ev) => change(ep, { textContent: ev.target.value })} /></td></tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      {openNew && <NewEpisode workId={workId} isNovel={isNovel} nextNumber={(episodes[episodes.length - 1]?.episodeNumber || 0) + 1} onClose={() => setOpenNew(false)} onDone={onChanged} />}
    </section>
  );
}

function NewEpisode({ workId, isNovel, nextNumber, onClose, onDone }: { workId: string; isNovel: boolean; nextNumber: number; onClose: () => void; onDone: () => Promise<void> }) {
  const [number, setNumber] = useState(nextNumber);
  const [title, setTitle] = useState('');
  const [publishedAt, setPublishedAt] = useState(toLocal(new Date().toISOString()));
  const [files, setFiles] = useState<File[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      const body = new FormData();
      body.append('episodeNumber', String(number));
      body.append('title', title);
      body.append('publishedAt', new Date(publishedAt).toISOString());
      if (isNovel) body.append('textContent', text);
      else files.forEach((f) => body.append('images', f));
      const r = await fetch(`${apiBase()}/admin/works/${workId}/episodes`, { method: 'POST', headers: authHeaders(), body });
      const d = await r.json();
      if (!r.ok) throw new Error(d.message || '등록 실패');
      await onDone();
      onClose();
      alert(d.episode.scheduled ? `${number}화를 예약 등록했습니다. 공개 시각에 사이트에 나옵니다.` : `${number}화를 공개했습니다.`);
    } catch (e: any) { alert(e.message); } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[90vh] w-full max-w-lg space-y-3 overflow-y-auto rounded-xl bg-gray-800 p-6">
        <h3 className="text-lg font-bold">새 회차 등록</h3>
        <div className="grid grid-cols-2 gap-3">
          <Field label="회차 번호"><input type="number" min={0} className={input} value={number} onChange={(e) => setNumber(Number(e.target.value))} /></Field>
          <Field label="공개 일시" hint="미래 = 예약"><input type="datetime-local" className={input} value={publishedAt} onChange={(e) => setPublishedAt(e.target.value)} /></Field>
        </div>
        <Field label="제목" hint="비우면 'N화'"><input className={input} value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
        {isNovel ? (
          <Field label="본문" hint="줄바꿈이 문단"><textarea rows={12} className={input} value={text} onChange={(e) => setText(e.target.value)} /></Field>
        ) : (
          <Field label="회차 이미지" hint="여러 장 선택, 파일 이름 순서로 이어 붙임 · webp 자동 변환">
            <input type="file" accept="image/*" multiple className="block w-full text-sm" onChange={(e) => setFiles(Array.from(e.target.files || []))} />
            {files.length > 0 && <span className="mt-1 block text-xs text-gray-400">{files.length}장 선택됨</span>}
          </Field>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded bg-gray-700 px-4 py-2 text-sm">취소</button>
          <button type="button" disabled={busy} onClick={() => void submit()} className="rounded bg-purple-600 px-4 py-2 text-sm font-bold disabled:opacity-50">{busy ? '올리는 중...' : '등록'}</button>
        </div>
      </div>
    </div>
  );
}
