'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Award, MessageCircle, ThumbsUp, X } from 'lucide-react'
import { api } from '@/lib/api'

// 작품 상세: 모든 회차의 댓글을 모아 보여준다 (베스트 3 + 전체보기 창)
interface ComicComment {
  id: string
  content: string
  author: string
  createdAt: string
  likes: number
  replyCount: number
  episodeId: string | null
  episodeNumber: number | null
}

type SortMode = 'best' | 'latest'
const PAGE = 20

const formatDate = (value: string) => {
  const date = new Date(value)
  const diff = Date.now() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  if (days > 7) return date.toLocaleDateString('ko-KR')
  if (days > 0) return `${days}일 전`
  if (hours > 0) return `${hours}시간 전`
  if (minutes > 0) return `${minutes}분 전`
  return '방금 전'
}

function CommentRow({ comment, comicId, best }: { comment: ComicComment; comicId: string; best?: boolean }) {
  return (
    <li className="border-b border-gray-100 py-3 last:border-b-0 dark:border-white/10">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="flex min-w-0 items-center gap-1.5">
          {best && (
            <span className="inline-flex shrink-0 items-center gap-0.5 rounded bg-[#00dc64] px-1.5 py-0.5 text-[10px] font-black text-black">
              <Award className="h-3 w-3" />BEST
            </span>
          )}
          {comment.episodeId && comment.episodeNumber !== null && (
            <Link
              href={`/webtoons/${comicId}/episode/${comment.episodeId}`}
              className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 font-bold text-gray-600 hover:text-[#00a84c] dark:bg-white/10 dark:text-gray-300"
            >
              {comment.episodeNumber === 0 ? '프롤로그' : `${comment.episodeNumber}화`}
            </Link>
          )}
          <span className="truncate font-bold text-gray-900 dark:text-white">{comment.author}</span>
        </span>
        <span className="shrink-0 text-gray-400">{formatDate(comment.createdAt)}</span>
      </div>
      <p className="mt-1.5 whitespace-pre-wrap break-words text-sm text-gray-700 dark:text-gray-300">{comment.content}</p>
      <div className="mt-1.5 flex items-center gap-3 text-xs text-gray-400">
        <span className="inline-flex items-center gap-1"><ThumbsUp className="h-3 w-3" />{comment.likes}</span>
        {comment.replyCount > 0 && <span>답글 {comment.replyCount}</span>}
      </div>
    </li>
  )
}

export default function ComicCommentsSection({ comicId }: { comicId: string }) {
  const [best, setBest] = useState<ComicComment[]>([])
  const [total, setTotal] = useState(0)
  const [loaded, setLoaded] = useState(false)
  const [open, setOpen] = useState(false)
  const [sort, setSort] = useState<SortMode>('best')
  const [items, setItems] = useState<ComicComment[]>([])
  const [loadingMore, setLoadingMore] = useState(false)

  useEffect(() => {
    if (!comicId) return
    api.get(`/comic-comments/${comicId}`, { params: { sort: 'best', limit: 3 } })
      .then(({ data }) => {
        setBest(Array.isArray(data?.comments) ? data.comments : [])
        setTotal(Number(data?.total) || 0)
      })
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [comicId])

  const loadPage = useCallback(async (mode: SortMode, offset: number) => {
    setLoadingMore(true)
    try {
      const { data } = await api.get(`/comic-comments/${comicId}`, { params: { sort: mode, limit: PAGE, offset } })
      const next: ComicComment[] = Array.isArray(data?.comments) ? data.comments : []
      setItems((prev) => (offset === 0 ? next : [...prev, ...next]))
      setTotal(Number(data?.total) || 0)
    } catch {
      // 목록을 못 불러와도 창은 유지
    } finally {
      setLoadingMore(false)
    }
  }, [comicId])

  useEffect(() => {
    if (open) void loadPage(sort, 0)
  }, [open, sort, loadPage])

  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (!loaded) return null
  const hasLikes = best.some((comment) => comment.likes > 0)

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5 dark:border-white/10 dark:bg-[#1b1b1b]">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-base font-black text-gray-950 dark:text-white">
          <MessageCircle className="h-4 w-4" />전체 댓글
          <span className="text-sm font-bold text-gray-400">{total.toLocaleString()}</span>
        </h3>
        <span className="text-xs text-gray-400">모든 회차</span>
      </div>
      {total === 0 ? (
        <p className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">아직 이 작품에 달린 댓글이 없습니다.</p>
      ) : (
        <>
          <ul>{best.map((comment) => <CommentRow key={comment.id} comment={comment} comicId={comicId} best={hasLikes && comment.likes > 0} />)}</ul>
          {total > best.length && (
            <button
              type="button"
              onClick={() => { setSort('best'); setOpen(true) }}
              className="mt-2 flex h-10 w-full items-center justify-center rounded-lg border border-gray-300 text-sm font-bold text-gray-700 transition hover:border-[#00dc64] hover:text-[#00a84c] dark:border-gray-700 dark:text-gray-200"
            >
              전체 댓글 보기 ({total.toLocaleString()})
            </button>
          )}
        </>
      )}

      {open && (
        <div className="fixed inset-0 z-[1300] flex items-end justify-center bg-black/50 sm:items-center" role="dialog" aria-modal="true" aria-label="작품 전체 댓글">
          <button type="button" className="absolute inset-0 cursor-default" aria-label="닫기" onClick={() => setOpen(false)} />
          <div className="relative flex max-h-[88dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl dark:bg-[#1b1b1b]">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-white/10">
              <h4 className="text-base font-black text-gray-950 dark:text-white">전체 댓글 {total.toLocaleString()}</h4>
              <div className="flex items-center gap-3">
                <div className="flex gap-1 text-xs font-bold">
                  {(['best', 'latest'] as SortMode[]).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      aria-pressed={sort === mode}
                      onClick={() => setSort(mode)}
                      className={`rounded-full px-3 py-1.5 ${sort === mode ? 'bg-gray-900 text-white dark:bg-white dark:text-black' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
                    >
                      {mode === 'best' ? '좋아요순' : '최신순'}
                    </button>
                  ))}
                </div>
                <button type="button" onClick={() => setOpen(false)} className="rounded p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10" aria-label="닫기">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="overflow-y-auto overscroll-contain px-5 py-2">
              <ul>{items.map((comment) => <CommentRow key={comment.id} comment={comment} comicId={comicId} />)}</ul>
              {items.length < total && (
                <button
                  type="button"
                  disabled={loadingMore}
                  onClick={() => loadPage(sort, items.length)}
                  className="my-3 flex h-10 w-full items-center justify-center rounded-lg bg-gray-100 text-sm font-bold text-gray-700 disabled:opacity-60 dark:bg-white/10 dark:text-gray-200"
                >
                  {loadingMore ? '불러오는 중...' : '댓글 더 보기'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
