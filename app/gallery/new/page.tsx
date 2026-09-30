'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ImagePlus, Search, X } from 'lucide-react';
import { api } from '@/lib/api';

// 화보 만들기 (회원): 이미지 여러 장(최대 20) · 제목 · 설명 · 작품/캐릭터 연결 · 태그 · 공개 범위(전체 공개 = 검토 후 공개 / 나만 보기)
interface Work { id: string; title: string; contentType?: string }
interface Ch { id: string; name: string }

export default function NewPhotobookPage() {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [visibility, setVisibility] = useState<'PUBLIC' | 'PRIVATE'>('PUBLIC');
  const [work, setWork] = useState<Work | null>(null);
  const [chars, setChars] = useState<Ch[]>([]);
  const [characterId, setCharacterId] = useState('');
  const [characterName, setCharacterName] = useState('');
  const [q, setQ] = useState('');
  const [found, setFound] = useState<Work[]>([]);
  const [suggest, setSuggest] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (!localStorage.getItem('authToken')) router.replace('/login?redirect=/gallery/new'); api.get('/gallery/tags').then(({ data }) => setSuggest((data.tags || []).slice(0, 12).map((t: any) => t.name))).catch(() => {}); }, [router]);
  useEffect(() => { const urls = files.map((f) => URL.createObjectURL(f)); setPreviews(urls); return () => urls.forEach((u) => URL.revokeObjectURL(u)); }, [files]);
  useEffect(() => { if (!q.trim()) { setFound([]); return; } const t = window.setTimeout(() => api.get('/gallery/works', { params: { q: q.trim() } }).then(({ data }) => setFound(data.works || [])).catch(() => {}), 250); return () => window.clearTimeout(t); }, [q]);
  useEffect(() => { setChars([]); setCharacterId(''); if (work) api.get(`/gallery/works/${work.id}/characters`).then(({ data }) => setChars(data.characters || [])).catch(() => {}); }, [work]);

  const submit = async () => {
    if (!files.length) { alert('이미지를 1장 이상 올리세요.'); return; }
    if (!title.trim()) { alert('화보 제목을 입력하세요.'); return; }
    setBusy(true);
    try {
      const body = new FormData();
      files.forEach((f) => body.append('images', f));
      body.append('title', title); body.append('description', description); body.append('tags', tags); body.append('visibility', visibility);
      if (work) body.append('workId', work.id);
      if (characterId) body.append('characterId', characterId);
      const name = characterId ? chars.find((c) => c.id === characterId)?.name || '' : characterName;
      if (name) body.append('characterName', name);
      const { data } = await api.post('/gallery/items', body, { headers: { 'Content-Type': 'multipart/form-data' } });
      alert(data.status === 'REVIEW' ? '화보를 올렸어요. 운영팀 검토 후 화보관에 공개돼요.' : '나만 보기 화보로 저장했어요.');
      router.replace(`/gallery/${data.id}`);
    } catch (e: any) { alert(e?.response?.data?.message || '올리지 못했어요.'); } finally { setBusy(false); }
  };
  const field = 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#00dc64] dark:border-gray-700 dark:bg-[#1b1b1b]';
  return (
    <div className="min-h-screen bg-gray-50 pb-24 text-gray-950 dark:bg-[#141414] dark:text-white">
      <div className="mx-auto max-w-3xl px-3 py-5 sm:px-4">
        <button type="button" onClick={() => router.back()} className="mb-3 inline-flex items-center gap-1 text-sm font-bold text-gray-500"><ArrowLeft className="h-4 w-4" />이전</button>
        <h1 className="text-2xl font-black">화보 만들기</h1>
        <div className="mt-4 space-y-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-[#1b1b1b]">
          <div>
            <span className="mb-1 block text-sm font-black">이미지 ({files.length}/20) · 첫 장이 대표 이미지</span>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {previews.map((src, i) => (
                <span key={src} className="relative aspect-[3/4] overflow-hidden rounded-lg bg-gray-100"><img src={src} alt="" className="h-full w-full object-cover" /><button type="button" onClick={() => setFiles(files.filter((_, j) => j !== i))} className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white" aria-label="빼기"><X className="h-3.5 w-3.5" /></button>{i === 0 && <span className="absolute bottom-1 left-1 rounded bg-[#00dc64] px-1 text-[10px] font-black text-black">대표</span>}</span>
              ))}
              {files.length < 20 && (
                <label className="flex aspect-[3/4] cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 text-xs text-gray-500 dark:border-gray-700"><ImagePlus className="mb-1 h-5 w-5" />추가
                  <input type="file" multiple accept="image/png,image/jpeg,image/webp,image/gif" className="sr-only" onChange={(e) => { setFiles([...files, ...Array.from(e.target.files || [])].slice(0, 20)); e.target.value = ''; }} />
                </label>
              )}
            </div>
          </div>
          <label className="block"><span className="mb-1 block text-sm font-black">제목</span><input className={field} value={title} maxLength={60} onChange={(e) => setTitle(e.target.value)} placeholder="예) 은서율 · 겨울 야경" /></label>
          <div>
            <span className="mb-1 block text-sm font-black">작품·캐릭터 연결 <span className="font-normal text-gray-400">(선택)</span></span>
            {work ? (
              <div className="flex flex-wrap items-center gap-2 rounded-lg bg-gray-50 p-2 text-sm dark:bg-white/5">
                <b>《{work.title}》</b>
                {chars.length > 0 ? (
                  <select aria-label="캐릭터" value={characterId} onChange={(e) => setCharacterId(e.target.value)} className="rounded border border-gray-200 bg-white px-2 py-1 text-xs dark:border-gray-700 dark:bg-[#141414]"><option value="">캐릭터 선택 안 함</option>{chars.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
                ) : <input aria-label="캐릭터 이름" value={characterName} onChange={(e) => setCharacterName(e.target.value)} placeholder="캐릭터 이름" className="rounded border border-gray-200 bg-white px-2 py-1 text-xs dark:border-gray-700 dark:bg-[#141414]" />}
                <button type="button" onClick={() => setWork(null)} className="ml-auto text-gray-400" aria-label="연결 해제"><X className="h-4 w-4" /></button>
              </div>
            ) : (
              <div className="relative">
                <label className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 dark:border-gray-700"><Search className="h-4 w-4 text-gray-400" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="작품명으로 찾기" className="w-full bg-transparent py-2.5 text-sm outline-none" /></label>
                {found.length > 0 && <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-[#1b1b1b]">{found.map((w) => <li key={w.id}><button type="button" onClick={() => { setWork(w); setQ(''); setFound([]); }} className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-white/5">{w.title}</button></li>)}</ul>}
              </div>
            )}
          </div>
          <label className="block"><span className="mb-1 block text-sm font-black">태그 <span className="font-normal text-gray-400">(쉼표로 구분, 최대 15개)</span></span><input className={field} value={tags} onChange={(e) => setTags(e.target.value)} placeholder="교복, 겨울, 데이트" /></label>
          {suggest.length > 0 && <p className="-mt-2 flex flex-wrap gap-1">{suggest.map((t) => <button key={t} type="button" onClick={() => setTags(tags ? `${tags}, ${t}` : t)} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-white/10 dark:text-gray-300">+{t}</button>)}</p>}
          <label className="block"><span className="mb-1 block text-sm font-black">설명</span><textarea rows={3} className={field} value={description} onChange={(e) => setDescription(e.target.value)} /></label>
          <fieldset><legend className="mb-1 text-sm font-black">공개 범위</legend>
            <div className="flex gap-2 text-sm">
              {([['PUBLIC', '전체 공개', '운영팀 검토 후 캐릭터 화보관에 공개'], ['PRIVATE', '나만 보기', '내 화보에서만 보여요']] as const).map(([k, v, d]) => (
                <label key={k} className={`flex-1 cursor-pointer rounded-lg border p-2 ${visibility === k ? 'border-[#00dc64] bg-[#00dc64]/10' : 'border-gray-200 dark:border-gray-700'}`}><input type="radio" className="sr-only" checked={visibility === k} onChange={() => setVisibility(k)} /><b className="block">{v}</b><span className="text-xs text-gray-500">{d}</span></label>
              ))}
            </div>
          </fieldset>
          <p className="text-xs text-gray-500">직접 만들었거나 사용 권한이 있는 이미지만 올려 주세요. 부적절하거나 도용한 이미지는 반려·숨김 처리됩니다.</p>
          <div className="flex justify-end gap-2"><button type="button" onClick={() => router.back()} className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-bold dark:bg-white/10">취소</button><button type="button" disabled={busy} onClick={() => void submit()} className="rounded-lg bg-[#00dc64] px-5 py-2 text-sm font-black text-black disabled:opacity-50">{busy ? '올리는 중...' : '올리기'}</button></div>
        </div>
      </div>
    </div>
  );
}
