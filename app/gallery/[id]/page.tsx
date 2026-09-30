'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { AlertTriangle, ArrowLeft, Bookmark, BookmarkCheck, BookOpen, ChevronLeft, ChevronRight, Heart, Lock, MessageCircle, Pencil, Trash2, X } from 'lucide-react';
import { api } from '@/lib/api';
import { getImageUrl } from '@/lib/utils';
import { useAdultModeStore } from '@/store/adultMode';
import { PhotobookCard, type GalleryCard } from '@/components/gallery/PhotobookGalleryClient';

const ReportModal = dynamic(() => import('@/components/ui/ReportModal'), { ssr: false, loading: () => null });

// 화보 상세: 썸네일 격자 → 누르면 크게(좌우 이동·스와이프), 좋아요·내 화보함 저장, [캐릭터와 채팅하기]·[작품 보기], 태그, 같은 시리즈, 코인 소장, 신고
interface Detail extends GalleryCard {
  description?: string | null; assets: string[]; previewCount: number; access: { allowed: boolean; reason: string; coinPrice?: number };
  chatLink?: string | null; isOwner: boolean; status: string; visibility: string; rejectReason?: string | null;
}
const STATUS_LABEL: Record<string, string> = { REVIEW: '운영팀 검토 대기 중', REJECTED: '반려됨', HIDDEN: '숨김 처리됨', DRAFT: '비공개' };

export default function PhotobookDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params.id || '');
  const [item, setItem] = useState<Detail | null>(null);
  const [series, setSeries] = useState<GalleryCard[]>([]);
  const [error, setError] = useState('');
  const [viewer, setViewer] = useState<number | null>(null);
  const [report, setReport] = useState(false);
  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState('');
  const touch = useRef<number | null>(null);
  const loggedIn = typeof window !== 'undefined' && !!localStorage.getItem('authToken');

  const load = useCallback(() => {
    useAdultModeStore.getState().hydrate();
    api.get(`/gallery/items/${id}`).then(({ data }) => { setItem(data.item); setSeries(data.series || []); }).catch((e) => setError(e?.response?.status === 404 ? '화보를 찾을 수 없어요. 비공개이거나 노출이 끝난 화보일 수 있어요.' : '화보를 불러오지 못했어요.'));
  }, [id]);
  useEffect(() => { if (id) load(); }, [id, load]);
  useEffect(() => { if (!notice) return; const t = window.setTimeout(() => setNotice(''), 2200); return () => window.clearTimeout(t); }, [notice]);
  useEffect(() => {
    if (viewer === null || !item) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setViewer(null); if (e.key === 'ArrowRight') setViewer((v) => (v === null ? v : Math.min(item.assets.length - 1, v + 1))); if (e.key === 'ArrowLeft') setViewer((v) => (v === null ? v : Math.max(0, v - 1))); };
    window.addEventListener('keydown', onKey); const prev = document.body.style.overflow; document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [viewer, item]);

  const needLogin = () => { if (loggedIn) return false; router.push(`/login?redirect=${encodeURIComponent(`/gallery/${id}`)}`); return true; };
  const toggle = async (kind: 'like' | 'save') => {
    if (needLogin() || !item) return;
    const { data } = await api.post(`/gallery/items/${id}/${kind}`);
    setItem({ ...item, ...(kind === 'like' ? { isLiked: data.on, likeCount: data.count } : { isSaved: data.on, saveCount: data.count }) });
    if (kind === 'save') setNotice(data.on ? '내 화보함에 저장했어요' : '저장을 풀었어요');
  };
  const click = (target: 'chat' | 'work') => { void api.post(`/gallery/items/${id}/click`, { target }).catch(() => {}); };
  const unlock = async () => {
    if (needLogin() || !item) return;
    if (!confirm(`${item.access.coinPrice || item.coinPrice}코인으로 이 화보를 소장할까요?`)) return;
    try { await api.post(`/contents/${id}/unlock`, { contentType: 'PHOTOBOOK' }); load(); setNotice('소장했어요. 전체 컷을 볼 수 있어요'); }
    catch (e: any) { if (e?.response?.data?.code === 'INSUFFICIENT_COINS') { if (confirm('코인이 부족해요. 충전하러 갈까요?')) router.push('/coin'); } else alert(e?.response?.data?.message || '소장하지 못했어요.'); }
  };
  const remove = async () => { if (!confirm('이 화보를 삭제할까요? 되돌릴 수 없어요.')) return; await api.delete(`/gallery/items/${id}`); router.replace('/gallery?tab=mine'); };

  if (error) return <div className="min-h-screen bg-gray-50 p-6 text-center dark:bg-[#141414]"><p className="mt-20 text-gray-500">{error}</p><Link href="/gallery" className="mt-4 inline-block underline">화보관으로</Link></div>;
  if (!item) return <div className="flex min-h-screen justify-center bg-gray-50 pt-24 dark:bg-[#141414]"><div className="h-10 w-10 animate-spin rounded-full border-b-2 border-[#00dc64]" /></div>;
  const locked = item.assetCount - item.assets.length;

  return (
    <div className="min-h-screen bg-gray-50 pb-24 text-gray-950 dark:bg-[#141414] dark:text-white">
      <div className="mx-auto max-w-6xl px-3 py-5 sm:px-4">
        <button type="button" onClick={() => (window.history.length > 1 ? router.back() : router.push('/gallery'))} className="mb-3 inline-flex items-center gap-1 text-sm font-bold text-gray-500"><ArrowLeft className="h-4 w-4" />화보관</button>
        {item.isOwner && STATUS_LABEL[item.status] && <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">{STATUS_LABEL[item.status]}{item.rejectReason ? ` · 사유: ${item.rejectReason}` : ''}{item.visibility === 'PRIVATE' ? ' · 나만 보기' : ''}</p>}
        <div className="grid gap-5 md:grid-cols-[1fr_320px]">
          <section>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {item.assets.map((src, i) => (
                <button key={src} type="button" onClick={() => setViewer(i)} className="relative aspect-[3/4] overflow-hidden rounded-lg bg-gray-200 dark:bg-gray-800" aria-label={`${i + 1}번째 이미지 크게 보기`}>
                  <img src={getImageUrl(src, { width: 600 })} alt="" loading="lazy" className="h-full w-full object-cover" />
                </button>
              ))}
              {locked > 0 && (
                <div className="flex aspect-[3/4] flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 p-3 text-center dark:border-gray-700">
                  <Lock className="h-6 w-6 text-gray-400" /><p className="mt-2 text-sm font-black">나머지 {locked}장</p>
                  <button type="button" onClick={() => void unlock()} className="mt-2 rounded-lg bg-[#00dc64] px-3 py-1.5 text-sm font-black text-black">{item.access.coinPrice || item.coinPrice}코인으로 소장</button>
                </div>
              )}
            </div>
          </section>
          <aside className="space-y-3">
            <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-[#1b1b1b]">
              {item.character && <p className="text-xl font-black">{item.character.name}</p>}
              {item.work && <p className="text-sm text-gray-500">《{item.work.title}》</p>}
              <h1 className="mt-2 font-bold">{item.title}</h1>
              {item.series && <button type="button" onClick={() => router.push(`/gallery?tab=latest&series=${item.series!.id}`)} className="mt-1 text-xs font-bold text-[#00a84c] underline">시리즈 · {item.series.title}</button>}
              {item.tags.length > 0 && <p className="mt-2 flex flex-wrap gap-1.5">{item.tags.map((t) => <Link key={t} href={`/gallery?tab=latest&tag=${encodeURIComponent(t)}`} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-bold text-gray-600 hover:text-[#00a84c] dark:bg-white/10 dark:text-gray-300">#{t}</Link>)}</p>}
              {item.description && <p className="mt-3 whitespace-pre-line text-sm text-gray-600 dark:text-gray-300">{item.description}</p>}
              <p className="mt-3 text-xs text-gray-400">{item.isOfficial ? 'ARATA 공식 화보' : `by ${item.creator}`} · {item.assetCount}장 · 조회 {item.viewCount}</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button type="button" onClick={() => void toggle('like')} className={`flex items-center justify-center gap-1 rounded-lg border py-2 text-sm font-bold ${item.isLiked ? 'border-red-300 bg-red-50 text-red-500 dark:bg-red-500/10' : 'border-gray-200 dark:border-gray-700'}`}><Heart className="h-4 w-4" fill={item.isLiked ? 'currentColor' : 'none'} />{item.likeCount}</button>
                <button type="button" onClick={() => void toggle('save')} className={`flex items-center justify-center gap-1 rounded-lg border py-2 text-sm font-bold ${item.isSaved ? 'border-[#00dc64] text-[#00a84c]' : 'border-gray-200 dark:border-gray-700'}`}>{item.isSaved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}{item.isSaved ? '저장됨' : '내 화보함에 저장'}</button>
              </div>
              {item.chatLink && <Link href={item.chatLink} onClick={() => click('chat')} className="mt-2 flex items-center justify-center gap-1.5 rounded-lg bg-[#00dc64] py-2.5 text-sm font-black text-black"><MessageCircle className="h-4 w-4" />{item.character?.name}와(과) 채팅하기</Link>}
              {item.work && <Link href={`/webtoons/${item.work.id}`} onClick={() => click('work')} className="mt-2 flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 py-2.5 text-sm font-bold dark:border-gray-700"><BookOpen className="h-4 w-4" />작품 보기</Link>}
              <div className="mt-3 flex justify-end gap-3 text-xs text-gray-500">
                {item.isOwner ? (
                  <>
                    <button type="button" onClick={() => setEditing(true)} className="inline-flex items-center gap-1"><Pencil className="h-3.5 w-3.5" />수정</button>
                    <button type="button" onClick={() => void remove()} className="inline-flex items-center gap-1 text-red-500"><Trash2 className="h-3.5 w-3.5" />삭제</button>
                  </>
                ) : <button type="button" onClick={() => { if (!needLogin()) setReport(true); }} className="inline-flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" />신고</button>}
              </div>
            </div>
          </aside>
        </div>
        {series.filter((s) => s.id !== item.id).length > 0 && (
          <section className="mt-8">
            <h2 className="mb-2 text-lg font-black">같은 시리즈 · {item.series?.title}</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">{series.filter((s) => s.id !== item.id).map((s) => <PhotobookCard key={s.id} item={s} />)}</div>
          </section>
        )}
      </div>

      {viewer !== null && (
        <div className="fixed inset-0 z-[1500] flex items-center justify-center bg-black/95" role="dialog" aria-modal="true" aria-label="화보 크게 보기"
          onTouchStart={(e) => { touch.current = e.touches[0].clientX; }}
          onTouchEnd={(e) => { if (touch.current === null) return; const dx = e.changedTouches[0].clientX - touch.current; if (Math.abs(dx) > 40) setViewer((v) => (v === null ? v : Math.max(0, Math.min(item.assets.length - 1, v + (dx < 0 ? 1 : -1))))); touch.current = null; }}>
          <img src={getImageUrl(item.assets[viewer], { width: 1600 })} alt={`${viewer + 1}번째 이미지`} className="max-h-[92dvh] max-w-full object-contain" />
          <button type="button" onClick={() => setViewer(null)} aria-label="닫기" className="absolute right-3 top-3 rounded-full bg-white/10 p-2 text-white"><X className="h-6 w-6" /></button>
          {viewer > 0 && <button type="button" onClick={() => setViewer(viewer - 1)} aria-label="이전 이미지" className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white"><ChevronLeft className="h-7 w-7" /></button>}
          {viewer < item.assets.length - 1 && <button type="button" onClick={() => setViewer(viewer + 1)} aria-label="다음 이미지" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white"><ChevronRight className="h-7 w-7" /></button>}
          <span className="absolute bottom-4 rounded-full bg-white/10 px-3 py-1 text-sm text-white">{viewer + 1} / {item.assets.length}{locked > 0 ? ` (잠김 ${locked}장)` : ''}</span>
        </div>
      )}
      {editing && <EditDialog item={item} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); load(); }} />}
      {report && <ReportModal isOpen onClose={() => setReport(false)} targetType="PHOTOBOOK" targetId={item.id} targetName={item.title} />}
      {notice && <div role="status" className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full bg-gray-900 px-4 py-2 text-sm font-bold text-white">{notice}</div>}
    </div>
  );
}

function EditDialog({ item, onClose, onSaved }: { item: Detail; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState(item.title);
  const [description, setDescription] = useState(item.description || '');
  const [tags, setTags] = useState(item.tags.join(', '));
  const [visibility, setVisibility] = useState(item.visibility);
  const save = async () => {
    try { const { data } = await api.put(`/gallery/items/${item.id}`, { title, description, tags, visibility }); if (data.status === 'REVIEW') alert('전체 공개 화보는 운영팀 검토 후 다시 공개돼요.'); onSaved(); } catch (e: any) { alert(e?.response?.data?.message || '저장하지 못했어요.'); }
  };
  const field = 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-[#141414]';
  return (
    <div className="fixed inset-0 z-[1500] flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-label="화보 수정">
      <div className="w-full max-w-md space-y-3 rounded-2xl bg-white p-5 text-gray-950 dark:bg-[#1b1b1b] dark:text-white">
        <h2 className="text-lg font-black">화보 수정</h2>
        <label className="block text-sm font-bold">제목<input className={field} value={title} onChange={(e) => setTitle(e.target.value)} /></label>
        <label className="block text-sm font-bold">설명<textarea rows={3} className={field} value={description} onChange={(e) => setDescription(e.target.value)} /></label>
        <label className="block text-sm font-bold">태그 (쉼표로 구분)<input className={field} value={tags} onChange={(e) => setTags(e.target.value)} /></label>
        <fieldset className="flex gap-3 text-sm"><legend className="mb-1 font-bold">공개 범위</legend>
          <label className="flex items-center gap-1"><input type="radio" checked={visibility === 'PUBLIC'} onChange={() => setVisibility('PUBLIC')} />전체 공개</label>
          <label className="flex items-center gap-1"><input type="radio" checked={visibility === 'PRIVATE'} onChange={() => setVisibility('PRIVATE')} />나만 보기</label>
        </fieldset>
        <div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-bold dark:bg-white/10">취소</button><button type="button" onClick={() => void save()} className="rounded-lg bg-[#00dc64] px-4 py-2 text-sm font-black text-black">저장</button></div>
      </div>
    </div>
  );
}
