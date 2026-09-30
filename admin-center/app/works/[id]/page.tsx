'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ExternalLink, Plus, Save, Trash2, Upload } from 'lucide-react';
import { STATUS_LABEL, TYPE_LABEL, adminApi, apiBase, authHeaders, img, siteBase } from '@/lib/works';
import ComicNoticeManager from '@/components/ComicNoticeManager';

// 작품 상세 관리 (MIB 관리자 작품 편집 + 회차 등록·예약 공개)
interface Work {
  id: string; title: string; authorName?: string | null; genre: string; description?: string | null; thumbnail?: string | null; rating: string;
  status: string; resumeAt?: string | null; contentType: string; type: 'webtoon' | 'book' | 'novel'; isPublished: boolean; isOfficial: boolean;
  paidStartEpisode: number; episodeCoinPrice: number; rentalCoinPrice: number | null; rentalDays: number; updateDays?: string | null;
  viewCount: number; createdAt: string; lastEpisodeAt?: string | null; newUntil?: string | null; tags?: string[];
  badges: { up: boolean; new: boolean; hiatus: boolean; suspended: boolean };
  upcoming: { id: string; episodeNumber: number; title: string; publishAt: string }[];
}
interface Episode {
  id: string; episodeNumber: number; title: string; publishedAt: string; scheduled: boolean; publishedToday: boolean; free: boolean;
  imageCount: number; textLength: number; textContent?: string; viewCount: number; purchases: number;
}

// 사이트 장르 탭과 맞춘 장르 값
const GENRES = [['fantasy', '판타지'], ['romance', '로맨스'], ['action', '액션'], ['martial', '무협'], ['drama', '드라마'], ['school', '학원'], ['comedy', '코미디'], ['thriller', '스릴러'], ['sports', '스포츠'], ['daily', '일상'],
  ['modern', '현대물'], ['romance-fantasy', '로맨스판타지'], ['modern-fantasy', '현대판타지'], ['mystery', '미스터리·스릴러'], ['sf', 'SF'], ['horror', '공포·호러'], ['historical', '역사·시대물'], ['lightnovel', '라이트노벨'], ['bl', 'BL'], ['gl', 'GL']] as const;

const DAYS = [['mon', '월'], ['tue', '화'], ['wed', '수'], ['thu', '목'], ['fri', '금'], ['sat', '토'], ['sun', '일']] as const;
// datetime-local <-> ISO (브라우저 시간대 = 한국)
const toLocal = (value?: string | null) => {
  if (!value) return '';
  const d = new Date(value);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
const fromLocal = (value: string) => (value ? new Date(value).toISOString() : null);
// 발행 날짜·시간을 따로 입력 (한국 시간)
const splitLocal = (value: string) => ({ date: value.slice(0, 10), time: value.slice(11, 16) });
const joinLocal = (date: string, time: string) => (date ? `${date}T${time || '00:00'}` : '');
const fmt = (value: string) => new Date(value).toLocaleString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit' });

// 사용자 화면과 같은 모양의 배지
function BadgeRow({ b }: { b: Work['badges'] }) {
  return (
    <span className="flex flex-wrap gap-1">
      {b.up && <span className="rounded-sm bg-red-600 px-1.5 py-0.5 text-[10px] font-black text-white">UP</span>}
      {b.new && <span className="rounded-sm bg-[#00dc64] px-1.5 py-0.5 text-[10px] font-black text-black">NEW</span>}
      {b.hiatus && <span className="rounded-sm bg-amber-400 px-1.5 py-0.5 text-[10px] font-black text-black">휴재</span>}
      {b.suspended && <span className="rounded-sm bg-gray-800 px-1.5 py-0.5 text-[10px] font-black text-white">판매중지</span>}
    </span>
  );
}
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
  const [allTags, setAllTags] = useState<{ name: string; count: number }[]>([]);
  const [tagInput, setTagInput] = useState('');
  useEffect(() => { adminApi<{ tags: { name: string; count: number }[] }>('/admin/works-tags').then((d) => setAllTags(d.tags)).catch(() => {}); }, []);

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
      tags: data.work.tags || [],
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
              <BadgeRow b={work.badges} />
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

        {/* 배지 미리보기·공개 예정: 사용자 화면에 지금 어떻게 보이는지 */}
        <section className="grid gap-5 rounded-lg border border-purple-500/30 bg-gray-800 p-5 md:grid-cols-[150px_1fr_1fr]">
          <div>
            <p className="mb-2 text-xs font-bold text-gray-400">사용자 화면 미리보기</p>
            <div className="relative aspect-[3/4] w-full overflow-hidden rounded bg-gray-700">
              <img src={img(work.thumbnail)} alt="" className="h-full w-full object-cover" />
              <span className="absolute left-1.5 top-1.5"><BadgeRow b={work.badges} /></span>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <p className="text-xs font-bold text-gray-400">배지 상태 (저장된 설정 기준, 자동 계산)</p>
            <p><b className="text-red-400">UP</b> {work.badges.up ? `붙음 · 오늘 ${work.lastEpisodeAt ? fmt(work.lastEpisodeAt) : ''} 공개 회차` : work.upcoming[0] ? `다음 UP: ${fmt(work.upcoming[0].publishAt)} (${work.upcoming[0].episodeNumber}화 예약 공개)` : '없음 · 오늘 공개된 회차가 없음'}</p>
            <p><b className="text-green-400">NEW</b> {work.badges.new ? `붙음 · ${work.newUntil}까지 (런칭일 포함 7일)` : `없음 · 런칭 ${new Date(work.createdAt).toLocaleDateString('ko-KR')} (NEW는 ${work.newUntil}까지였음)`}</p>
            <p><b className="text-amber-300">휴재</b> {work.badges.hiatus ? `붙음${work.resumeAt ? ` · 재개 예정 ${new Date(work.resumeAt).toLocaleDateString('ko-KR')}` : ''}` : '없음'}</p>
            <p><b className="text-gray-300">판매중지</b> {work.badges.suspended ? '붙음 · 새 대여·소장 불가, 보유 회차는 열람' : '없음'}</p>
            <p className="text-xs text-gray-500">휴재·판매중지를 연재중/완결로 바꾸면 배지는 바로 사라지고, [중요] 공지 고정도 풀립니다.</p>
          </div>
          <div className="text-sm">
            <p className="mb-2 text-xs font-bold text-gray-400">공개 예정 회차 ({work.upcoming.length})</p>
            {work.upcoming.length === 0 ? <p className="text-gray-500">예약된 회차가 없습니다.</p> : (
              <ul className="space-y-1">
                {work.upcoming.map((ep) => <li key={ep.id} className="flex justify-between gap-2 rounded bg-gray-900/60 px-2 py-1"><span>{ep.episodeNumber}화 {ep.title}</span><span className="shrink-0 text-yellow-300">{fmt(ep.publishAt)}</span></li>)}
              </ul>
            )}
          </div>
        </section>

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
            <Field label="장르" hint="목록에서 고르거나 입력"><input list="genre-options" className={input} value={form.genre} onChange={(e) => set({ genre: e.target.value })} /></Field>
            <datalist id="genre-options">
              {GENRES.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </datalist>
            <Field label="유형">
              <select className={input} value={form.contentType} onChange={(e) => set({ contentType: e.target.value })}>
                <option value="WEBTOON">웹툰</option><option value="BOOK">단행본</option><option value="NOVEL">웹소설</option>
              </select>
            </Field>
            <Field label="연령"><select className={input} value={form.rating} onChange={(e) => set({ rating: e.target.value })}><option value="GENERAL">일반</option><option value="19">19+</option></select></Field>
            <Field label="연재 상태" hint="휴재·판매중지 = 배지·[중요] 공지 자동">
              <select className={input} value={form.status} onChange={(e) => set({ status: e.target.value })}>{Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
            </Field>
            {form.status === 'HIATUS' && <Field label="연재 재개 예정일"><input type="datetime-local" className={input} value={form.resumeAt} onChange={(e) => set({ resumeAt: e.target.value })} /></Field>}
            <Field label="런칭일" hint="NEW = 런칭일 포함 7일 (예: 9/25 → 10/1까지)"><input type="datetime-local" className={input} value={form.launchedAt} onChange={(e) => set({ launchedAt: e.target.value })} /></Field>
            <div className="md:col-span-2">
              <Field label="소개"><textarea rows={3} className={input} value={form.description} onChange={(e) => set({ description: e.target.value })} /></Field>
            </div>
            <div className="text-sm md:col-span-2">
              <span className="mb-1 block text-gray-300">태그 <span className="text-xs text-gray-500">소재·키워드 (장르와 별개) · 사이트 상세에 대표 5개 표시, 검색·태그 필터·비슷한 작품 추천에 사용</span></span>
              <div className="flex flex-wrap items-center gap-1.5 rounded border border-gray-600 bg-gray-700 p-2">
                {form.tags.map((tag: string) => (
                  <span key={tag} className="flex items-center gap-1 rounded-full bg-purple-600 px-2.5 py-0.5 text-xs font-bold">
                    #{tag}<button type="button" aria-label={`${tag} 삭제`} onClick={() => set({ tags: form.tags.filter((t: string) => t !== tag) })}>×</button>
                  </span>
                ))}
                <input
                  list="tag-options"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault();
                      const tag = tagInput.replace(/^#/, '').trim();
                      if (tag && !form.tags.includes(tag)) set({ tags: [...form.tags, tag].slice(0, 20) });
                      setTagInput('');
                    }
                  }}
                  placeholder="태그 입력 후 Enter (예: 회귀)"
                  className="min-w-40 flex-1 bg-transparent px-1 py-0.5 text-sm outline-none"
                />
                <datalist id="tag-options">{allTags.map((t) => <option key={t.name} value={t.name}>{`${t.count}개 작품`}</option>)}</datalist>
              </div>
              {allTags.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  <span className="text-xs text-gray-500">기존 태그:</span>
                  {allTags.slice(0, 30).filter((t) => !form.tags.includes(t.name)).map((t) => (
                    <button key={t.name} type="button" onClick={() => set({ tags: [...form.tags, t.name].slice(0, 20) })} className="rounded-full bg-gray-700 px-2 py-0.5 text-xs text-gray-300 hover:bg-gray-600">+{t.name}</button>
                  ))}
                </div>
              )}
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
          <p className="mt-3 text-xs text-gray-400">할인·무료 이벤트는 [할인·무료]에서 관리합니다. 연재 상태를 휴재·판매중지로 바꿔 저장하면 [중요] 공지가 아래 목록에 자동으로 추가됩니다.</p>
        </section>

        {/* 작품 공지: 사이트 작품 상세 [작품 공지] 탭 */}
        <section id="notices" className="rounded-lg bg-gray-800 p-5">
          <h2 className="mb-3 text-lg font-bold">작품 공지</h2>
          <ComicNoticeManager comicId={id} />
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
          <thead className="text-left text-gray-400"><tr><th className="p-2">회차</th><th className="p-2">제목</th><th className="p-2">발행 날짜 · 시간</th><th className="p-2">가격</th><th className="p-2">{isNovel ? '글자' : '이미지'}</th><th className="p-2">조회</th><th className="p-2">구매</th><th className="p-2" /></tr></thead>
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
                      <div className="flex gap-1">
                        <input type="date" aria-label="발행 날짜" className={`${input} py-1`} value={splitLocal(e.publishedAt).date} onChange={(ev) => change(ep, { publishedAt: joinLocal(ev.target.value, splitLocal(e.publishedAt).time) })} />
                        <input type="time" aria-label="발행 시간" className={`${input} w-28 py-1`} value={splitLocal(e.publishedAt).time} onChange={(ev) => change(ep, { publishedAt: joinLocal(splitLocal(e.publishedAt).date, ev.target.value) })} />
                      </div>
                      <span className="mt-0.5 block text-[11px]">
                        {ep.scheduled ? <span className="text-yellow-300">예약 · {fmt(ep.publishedAt)} 자동 공개</span> : ep.publishedToday ? <span className="text-red-400">오늘 공개 → 작품에 UP</span> : <span className="text-gray-500">공개됨</span>}
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
          <div />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="발행 날짜" hint="미래면 예약"><input type="date" className={input} value={splitLocal(publishedAt).date} onChange={(e) => setPublishedAt(joinLocal(e.target.value, splitLocal(publishedAt).time))} /></Field>
          <Field label="발행 시간"><input type="time" className={input} value={splitLocal(publishedAt).time} onChange={(e) => setPublishedAt(joinLocal(splitLocal(publishedAt).date, e.target.value))} /></Field>
        </div>
        <p className="text-xs text-gray-400">{new Date(publishedAt) > new Date() ? `예약 공개: ${fmt(new Date(publishedAt).toISOString())}에 사이트에 자동으로 나오고, 그날 작품에 UP 배지가 붙습니다.` : '바로 공개되고, 오늘 공개라 작품에 UP 배지가 붙습니다.'}</p>
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
