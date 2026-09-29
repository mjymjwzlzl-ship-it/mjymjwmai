'use client'

import React, { useState, useEffect, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { MessageCircle, Send, ThumbsUp, MoreVertical, Reply, ChevronDown, ChevronUp, AlertTriangle, UserX, Trash2, X, Award } from 'lucide-react'
import { api } from '@/lib/api'

// Dynamic Import로 모달 컴포넌트 로드 (초기 번들 사이즈 감소)
const ReportModal = dynamic(() => import('./ReportModal'), {
  ssr: false,
  loading: () => null
})

interface Reply {
  id: string
  content: string
  author: string
  authorId: string
  authorAvatar?: string
  createdAt: string
  likes: number
  isLiked: boolean
  isMyComment?: boolean
}

interface Comment {
  id: string
  content: string
  author: string
  authorId: string
  authorAvatar?: string
  createdAt: string
  likes: number
  isLiked: boolean
  replies: Reply[]
  isMyComment?: boolean
}

interface CommentSectionProps {
  episodeId: string | string[] | number | undefined
  initialComments?: Comment[]
}

const BEST_COUNT = 3
type SortMode = 'best' | 'latest'

const byBest = (a: Comment, b: Comment) =>
  b.likes - a.likes || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
const byLatest = (a: Comment, b: Comment) =>
  new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
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

const CommentSection: React.FC<CommentSectionProps> = ({ episodeId, initialComments = [] }) => {
  const [comments, setComments] = useState<Comment[]>(initialComments)
  const [newComment, setNewComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [replyToId, setReplyToId] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState('')
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set())
  const [showReportModal, setShowReportModal] = useState(false)
  const [reportTarget, setReportTarget] = useState<{type: 'COMMENT' | 'USER', id: string, name: string} | null>(null)
  const [showOptions, setShowOptions] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)
  const [sortMode, setSortMode] = useState<SortMode>('best')
  const [notice, setNotice] = useState<string | null>(null)

  const episodeIdStr = Array.isArray(episodeId) ? episodeId[0] : String(episodeId || '')

  useEffect(() => {
    if (!episodeIdStr) return
    const token = localStorage.getItem('authToken')
    setIsAuthenticated(!!token)
    const userData = localStorage.getItem('user')
    if (userData) {
      try {
        const user = JSON.parse(userData)
        setCurrentUserId(user.id || user.userId)
      } catch (e) {
        console.error('Failed to parse user data:', e)
      }
    }
    fetchComments()
  }, [episodeIdStr])

  // 전체보기 창이 열려 있으면 뒤 화면 스크롤을 막는다
  useEffect(() => {
    if (!showAll) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setShowAll(false) }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [showAll])

  useEffect(() => {
    if (!notice) return
    const id = window.setTimeout(() => setNotice(null), 2200)
    return () => window.clearTimeout(id)
  }, [notice])

  const fetchComments = async () => {
    try {
      const response = await api.get(`/episodes/${episodeIdStr}/comments`)
      setComments(response.data?.comments || [])
    } catch (error) {
      console.error('Failed to fetch comments:', error)
      setComments([])
    }
  }

  const isMine = (item: { authorId?: string; isMyComment?: boolean }) =>
    Boolean(item.isMyComment || (currentUserId && item.authorId === currentUserId))

  // 베스트: 좋아요 받은 댓글 중 상위 3개. 좋아요가 하나도 없으면 최신 3개를 보여준다.
  const liked = useMemo(() => comments.filter((comment) => comment.likes > 0).sort(byBest), [comments])
  const previewIsBest = liked.length > 0
  const preview = previewIsBest ? liked.slice(0, BEST_COUNT) : [...comments].sort(byLatest).slice(0, BEST_COUNT)
  const allSorted = useMemo(() => [...comments].sort(sortMode === 'best' ? byBest : byLatest), [comments, sortMode])

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim()) return
    if (!isAuthenticated) {
      alert('댓글을 작성하려면 로그인이 필요합니다.')
      window.location.href = '/login'
      return
    }
    setLoading(true)
    try {
      const response = await api.post(`/episodes/${episodeIdStr}/comments`, { content: newComment })
      if (response.data?.comment) {
        setComments((prev) => [{ ...response.data.comment, isMyComment: true, replies: [] }, ...prev])
        setNewComment('')
        setNotice('댓글을 등록했습니다.')
      }
    } catch (error: any) {
      console.error('Failed to post comment:', error)
      alert(error.response?.data?.error || error.response?.data?.message || '댓글 작성에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleLikeComment = async (target: Comment | Reply, isReply: boolean = false) => {
    if (!isAuthenticated) {
      alert('좋아요를 누르려면 로그인이 필요합니다.')
      return
    }
    if (isMine(target)) {
      setNotice('내 댓글에는 좋아요를 누를 수 없어요.')
      return
    }
    try {
      const response = await api.post(`/comments/${target.id}/like`)
      const { liked: nowLiked, likes } = response.data || {}
      if (typeof likes !== 'number') return
      setComments((prev) => prev.map((comment) => {
        if (!isReply) {
          return comment.id === target.id ? { ...comment, likes, isLiked: Boolean(nowLiked) } : comment
        }
        return {
          ...comment,
          replies: (comment.replies || []).map((reply) =>
            reply.id === target.id ? { ...reply, likes, isLiked: Boolean(nowLiked) } : reply
          ),
        }
      }))
    } catch (error: any) {
      if (error.response?.data?.code === 'OWN_COMMENT') {
        setNotice('내 댓글에는 좋아요를 누를 수 없어요.')
        return
      }
      console.error('Failed to like comment:', error)
      setNotice('좋아요를 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.')
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('댓글을 삭제하시겠습니까?')) return
    try {
      const token = localStorage.getItem('authToken')
      const response = await api.delete(`/comments/${commentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (response.data.success) {
        setComments((prev) => prev.filter((c) => c.id !== commentId))
        setShowOptions(null)
        setNotice('댓글이 삭제되었습니다.')
      }
    } catch (error) {
      console.error('Failed to delete comment:', error)
      alert('댓글 삭제에 실패했습니다.')
    }
  }

  const handleBlockUser = async (userId: string, username: string) => {
    if (!confirm(`${username}님을 차단하시겠습니까? 차단하면 이 사용자의 모든 댓글이 숨겨집니다.`)) return
    try {
      const token = localStorage.getItem('authToken')
      const response = await api.post('/report/block-user', {
        userId,
        reason: '사용자 요청'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (response.data.success) {
        alert('사용자를 차단했습니다.')
        setComments((prev) => prev.filter((c) => c.authorId !== userId))
      }
    } catch (error) {
      console.error('Failed to block user:', error)
      alert('사용자 차단에 실패했습니다.')
    }
  }

  const handleReportClick = (type: 'COMMENT' | 'USER', id: string, name: string) => {
    setReportTarget({ type, id, name })
    setShowReportModal(true)
    setShowOptions(null)
  }

  const handleReply = async (parentId: string) => {
    if (!replyContent.trim()) return
    if (!isAuthenticated) {
      alert('대댓글을 작성하려면 로그인이 필요합니다.')
      return
    }
    setLoading(true)
    try {
      const response = await api.post(`/episodes/${episodeIdStr}/comments`, {
        content: replyContent,
        parentId
      })
      if (response.data?.comment) {
        setComments((prev) => prev.map((comment) =>
          comment.id === parentId
            ? { ...comment, replies: [...(comment.replies || []), { ...response.data.comment, isMyComment: true }] }
            : comment
        ))
        setExpandedComments((prev) => new Set(prev).add(parentId))
        setReplyContent('')
        setReplyToId(null)
      }
    } catch (error) {
      console.error('Failed to post reply:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleReplies = (commentId: string) => {
    setExpandedComments((prev) => {
      const next = new Set(prev)
      if (next.has(commentId)) next.delete(commentId)
      else next.add(commentId)
      return next
    })
  }

  const likeButton = (item: Comment | Reply, isReply: boolean) => {
    const own = isMine(item)
    return (
      <button
        type="button"
        onClick={() => handleLikeComment(item, isReply)}
        aria-disabled={own}
        title={own ? '내 댓글에는 좋아요를 누를 수 없어요' : '좋아요'}
        className={`flex items-center gap-1 ${isReply ? 'text-xs' : 'text-sm'} transition-colors ${
          own
            ? 'cursor-not-allowed text-gray-300 dark:text-gray-600'
            : item.isLiked
              ? 'text-[#00a84c] dark:text-[#00dc64]'
              : 'text-gray-500 hover:text-[#00a84c] dark:text-gray-400 dark:hover:text-[#00dc64]'
        }`}
      >
        <ThumbsUp className={isReply ? 'h-3 w-3' : 'h-4 w-4'} fill={item.isLiked ? 'currentColor' : 'none'} />
        <span>{item.likes}</span>
        {own && !isReply && <span className="text-[11px]">내 댓글</span>}
      </button>
    )
  }

  const renderComment = (comment: Comment, bestRank?: number) => (
    <div key={comment.id} className="border-b border-gray-200 pb-4 last:border-b-0 dark:border-gray-700">
      <div className="flex gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#00dc64] font-bold text-black">
          {comment.author?.charAt(0) || 'U'}
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-1.5">
              {bestRank && (
                <span className="inline-flex shrink-0 items-center gap-0.5 rounded bg-[#00dc64] px-1.5 py-0.5 text-[10px] font-black text-black">
                  <Award className="h-3 w-3" />BEST
                </span>
              )}
              <span className="truncate font-semibold text-gray-950 dark:text-white">{comment.author || '익명'}</span>
            </span>
            <div className="flex shrink-0 items-center gap-2">
              <span className="text-xs text-gray-500 dark:text-gray-400">{formatDate(comment.createdAt)}</span>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowOptions(showOptions === comment.id ? null : comment.id)}
                  className="rounded p-1 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
                  aria-label="댓글 메뉴"
                >
                  <MoreVertical className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                </button>
                {showOptions === comment.id && (
                  <div className="absolute right-0 z-10 mt-1 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-600 dark:bg-gray-700">
                    {isMine(comment) ? (
                      <button
                        type="button"
                        onClick={() => handleDeleteComment(comment.id)}
                        className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-500 hover:bg-gray-100 dark:text-red-400 dark:hover:bg-gray-600"
                      >
                        <Trash2 className="h-4 w-4" />
                        삭제하기
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => handleReportClick('COMMENT', comment.id, comment.content.substring(0, 50))}
                          className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-600"
                        >
                          <AlertTriangle className="h-4 w-4" />
                          댓글 신고
                        </button>
                        <button
                          type="button"
                          onClick={() => handleBlockUser(comment.authorId, comment.author)}
                          className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-600"
                        >
                          <UserX className="h-4 w-4" />
                          사용자 차단
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          <p className="mb-2 whitespace-pre-wrap break-words text-gray-700 dark:text-gray-300">{comment.content}</p>
          <div className="flex items-center gap-4">
            {likeButton(comment, false)}
            <button
              type="button"
              onClick={() => setReplyToId(replyToId === comment.id ? null : comment.id)}
              className="flex items-center gap-1 text-sm text-gray-500 transition-colors hover:text-[#00a84c] dark:text-gray-400"
            >
              <Reply className="h-4 w-4" />
              <span>답글</span>
            </button>
            {comment.replies && comment.replies.length > 0 && (
              <button
                type="button"
                onClick={() => toggleReplies(comment.id)}
                className="flex items-center gap-1 text-sm text-gray-500 transition-colors hover:text-[#00a84c] dark:text-gray-400"
              >
                {expandedComments.has(comment.id) ? (
                  <><ChevronUp className="h-4 w-4" /><span>답글 숨기기</span></>
                ) : (
                  <><ChevronDown className="h-4 w-4" /><span>답글 {comment.replies.length}개</span></>
                )}
              </button>
            )}
          </div>

          {replyToId === comment.id && (
            <div className="mt-3 border-l-2 border-gray-200 pl-4 dark:border-gray-700">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="답글을 입력하세요..."
                  className="flex-1 rounded border border-gray-200 bg-white px-3 py-2 text-sm text-gray-950 focus:outline-none focus:ring-2 focus:ring-[#00dc64] dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => handleReply(comment.id)}
                  disabled={loading || !replyContent.trim()}
                  className="rounded bg-[#00dc64] px-3 py-2 text-sm font-bold text-black transition-colors hover:bg-[#00c85a] disabled:bg-gray-300 dark:disabled:bg-gray-600"
                >
                  답글
                </button>
              </div>
            </div>
          )}

          {expandedComments.has(comment.id) && comment.replies && comment.replies.length > 0 && (
            <div className="mt-3 space-y-3 border-l-2 border-gray-200 pl-4 dark:border-gray-700">
              {comment.replies.map((reply) => (
                <div key={reply.id} className="flex gap-2">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-400 text-xs font-bold text-white">
                    {reply.author?.charAt(0) || 'U'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-950 dark:text-white">{reply.author || '익명'}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">{formatDate(reply.createdAt)}</span>
                    </div>
                    <p className="mb-1 whitespace-pre-wrap break-words text-sm text-gray-700 dark:text-gray-300">{reply.content}</p>
                    {likeButton(reply, true)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )

  if (!episodeId) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <div className="py-8 text-center text-gray-500 dark:text-gray-400">에피소드 정보를 불러올 수 없습니다.</div>
      </div>
    )
  }

  return (
    <div id="comment-section" className="relative rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
      <h3 className="mb-4 flex items-center text-lg font-bold text-gray-950 dark:text-white">
        <MessageCircle className="mr-2 h-5 w-5" />
        댓글 ({comments.length})
      </h3>

      <form onSubmit={handleSubmitComment} className="mb-6">
        <div className="flex gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#00dc64] font-bold text-black">
            {isAuthenticated ? 'U' : '?'}
          </div>
          <div className="flex-1">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={isAuthenticated ? '댓글을 입력하세요...' : '로그인 후 댓글을 작성할 수 있습니다'}
              className="w-full resize-none rounded-lg border border-gray-200 bg-white px-4 py-3 text-gray-950 focus:outline-none focus:ring-2 focus:ring-[#00dc64] dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              rows={3}
              disabled={!isAuthenticated}
            />
            <div className="mt-2 flex justify-end">
              <button
                type="submit"
                disabled={loading || !newComment.trim() || !isAuthenticated}
                className="flex items-center rounded-lg bg-[#00dc64] px-4 py-2 font-bold text-black transition-colors hover:bg-[#00c85a] disabled:cursor-not-allowed disabled:bg-gray-300 dark:disabled:bg-gray-600"
              >
                {loading ? (
                  <><div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-black" />전송 중...</>
                ) : (
                  <><Send className="mr-2 h-4 w-4" />댓글 작성</>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>

      {comments.length === 0 ? (
        <div className="py-8 text-center text-gray-500 dark:text-gray-400">아직 댓글이 없습니다. 첫 번째 댓글을 남겨보세요!</div>
      ) : (
        <>
          <p className="mb-3 text-sm font-black text-gray-700 dark:text-gray-300">
            {previewIsBest ? '베스트 댓글' : '최신 댓글'}
          </p>
          <div className="space-y-4">
            {preview.map((comment, index) => renderComment(comment, previewIsBest ? index + 1 : undefined))}
          </div>
          {comments.length > preview.length && (
            <button
              type="button"
              onClick={() => { setSortMode('best'); setShowAll(true) }}
              className="mt-4 flex h-11 w-full items-center justify-center rounded-lg border border-gray-300 text-sm font-bold text-gray-700 transition hover:border-[#00dc64] hover:text-[#00a84c] dark:border-gray-600 dark:text-gray-200"
            >
              댓글 전체보기 ({comments.length})
            </button>
          )}
        </>
      )}

      {showAll && (
        <div className="fixed inset-0 z-[1300] flex items-end justify-center bg-black/50 sm:items-center" role="dialog" aria-modal="true" aria-label="전체 댓글">
          <button type="button" className="absolute inset-0 cursor-default" aria-label="닫기" onClick={() => setShowAll(false)} />
          <div className="relative flex max-h-[88dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl dark:bg-gray-800">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-700">
              <h4 className="text-base font-black text-gray-950 dark:text-white">전체 댓글 {comments.length}</h4>
              <div className="flex items-center gap-3">
                <div className="flex gap-1 text-xs font-bold">
                  {(['best', 'latest'] as SortMode[]).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setSortMode(mode)}
                      aria-pressed={sortMode === mode}
                      className={`rounded-full px-3 py-1.5 ${sortMode === mode ? 'bg-gray-900 text-white dark:bg-white dark:text-black' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
                    >
                      {mode === 'best' ? '좋아요순' : '최신순'}
                    </button>
                  ))}
                </div>
                <button type="button" onClick={() => setShowAll(false)} className="rounded p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700" aria-label="닫기">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="space-y-4 overflow-y-auto overscroll-contain px-5 py-4">
              {allSorted.map((comment) => renderComment(comment))}
            </div>
          </div>
        </div>
      )}

      {notice && (
        <div className="pointer-events-none fixed bottom-24 left-1/2 z-[1400] -translate-x-1/2 rounded-full bg-gray-900 px-4 py-2 text-sm font-bold text-white shadow-lg">
          {notice}
        </div>
      )}

      {showReportModal && reportTarget && (
        <ReportModal
          isOpen={showReportModal}
          onClose={() => {
            setShowReportModal(false)
            setReportTarget(null)
          }}
          targetType={reportTarget.type}
          targetId={reportTarget.id}
          targetName={reportTarget.name}
        />
      )}
    </div>
  )
}

export default CommentSection
