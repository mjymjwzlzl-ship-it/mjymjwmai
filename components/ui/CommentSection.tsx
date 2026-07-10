'use client'

import React, { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { MessageCircle, Send, ThumbsUp, MoreVertical, Reply, ChevronDown, ChevronUp, AlertTriangle, UserX, Trash2 } from 'lucide-react'
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

  // Convert episodeId to string for API calls
  const episodeIdStr = Array.isArray(episodeId) ? episodeId[0] : String(episodeId || '')
  
  // Don't render if no episodeId
  if (!episodeId) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6 dark:bg-gray-800 dark:border-gray-700">
        <div className="text-center text-gray-500 py-8 dark:text-gray-400">
          에피소드 정보를 불러올 수 없습니다.
        </div>
      </div>
    )
  }

  useEffect(() => {
    const token = localStorage.getItem('authToken')
    setIsAuthenticated(!!token)
    
    // 현재 사용자 ID 가져오기
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

  const fetchComments = async () => {
    try {
      const response = await api.get(`/episodes/${episodeIdStr}/comments`)
      if (response.data) {
        setComments(response.data.comments || [])
      }
    } catch (error) {
      console.error('Failed to fetch comments:', error)
      setComments([])
    }
  }

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
      const response = await api.post(`/episodes/${episodeIdStr}/comments`, {
        content: newComment
      })

      if (response.data.success && response.data.comment) {
        setComments([response.data.comment, ...comments])
        setNewComment('')
      }
    } catch (error: any) {
      console.error('Failed to post comment:', error)
      alert(error.response?.data?.message || '댓글 작성에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleLikeComment = async (commentId: string, isReply: boolean = false) => {
    if (!isAuthenticated) {
      alert('좋아요를 누르려면 로그인이 필요합니다.')
      return
    }

    try {
      const response = await api.post(`/comments/${commentId}/like`)

      if (response.data.success) {
        if (isReply) {
          // 대댓글 좋아요 업데이트
          setComments(comments.map(comment => ({
            ...comment,
            replies: comment.replies?.map(reply => 
              reply.id === commentId 
                ? { ...reply, likes: response.data.likes, isLiked: response.data.liked }
                : reply
            ) || []
          })))
        } else {
          // 댓글 좋아요 업데이트
          setComments(comments.map(comment => 
            comment.id === commentId 
              ? { ...comment, likes: response.data.likes, isLiked: response.data.liked }
              : comment
          ))
        }
      }
    } catch (error) {
      console.error('Failed to like comment:', error)
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
        setComments(comments.filter(c => c.id !== commentId))
        alert('댓글이 삭제되었습니다.')
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
        // 차단한 사용자의 댓글 숨기기
        setComments(comments.filter(c => c.authorId !== userId))
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
        parentId: parentId
      })

      if (response.data.success && response.data.comment) {
        setComments(comments.map(comment => 
          comment.id === parentId
            ? { 
                ...comment, 
                replies: [...(comment.replies || []), response.data.comment]
              }
            : comment
        ))
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
    const newExpanded = new Set(expandedComments)
    if (newExpanded.has(commentId)) {
      newExpanded.delete(commentId)
    } else {
      newExpanded.add(commentId)
    }
    setExpandedComments(newExpanded)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 7) {
      return date.toLocaleDateString('ko-KR')
    } else if (days > 0) {
      return `${days}일 전`
    } else if (hours > 0) {
      return `${hours}시간 전`
    } else if (minutes > 0) {
      return `${minutes}분 전`
    } else {
      return '방금 전'
    }
  }

  return (
    <div id="comment-section" className="bg-white border border-gray-200 rounded-lg p-6 dark:bg-gray-800 dark:border-gray-700">
      <h3 className="text-lg font-bold text-gray-950 mb-4 flex items-center dark:text-white">
        <MessageCircle className="w-5 h-5 mr-2" />
        댓글 ({comments.length})
      </h3>

      {/* 댓글 작성 폼 */}
      <form onSubmit={handleSubmitComment} className="mb-6">
        <div className="flex space-x-3">
          <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold">
            {isAuthenticated ? 'U' : '?'}
          </div>
          <div className="flex-1">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={isAuthenticated ? "댓글을 입력하세요..." : "로그인 후 댓글을 작성할 수 있습니다"}
              className="w-full bg-white border border-gray-200 text-gray-950 rounded-lg px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              rows={3}
              disabled={!isAuthenticated}
            />
            <div className="flex justify-end mt-2">
              <button
                type="submit"
                disabled={loading || !newComment.trim() || !isAuthenticated}
                className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors flex items-center dark:disabled:bg-gray-600"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    전송 중...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    댓글 작성
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* 댓글 목록 */}
      <div className="space-y-4">
        {comments.length === 0 ? (
          <div className="text-center text-gray-500 py-8 dark:text-gray-400">
            아직 댓글이 없습니다. 첫 번째 댓글을 남겨보세요!
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="border-b border-gray-200 pb-4 last:border-b-0 dark:border-gray-700">
              <div className="flex space-x-3">
                <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                  {comment.author?.charAt(0) || 'U'}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-gray-950 dark:text-white">{comment.author || '익명'}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 dark:text-gray-400">{formatDate(comment.createdAt)}</span>
                      <div className="relative">
                        <button
                          onClick={() => setShowOptions(showOptions === comment.id ? null : comment.id)}
                          className="p-1 hover:bg-gray-100 rounded transition-colors dark:hover:bg-gray-700"
                        >
                          <MoreVertical className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        </button>
                        {showOptions === comment.id && (
                          <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1 dark:bg-gray-700 dark:border-gray-600">
                            {comment.authorId === currentUserId ? (
                              <button
                                onClick={() => handleDeleteComment(comment.id)}
                                className="w-full px-4 py-2 text-left text-sm text-red-500 hover:bg-gray-100 flex items-center gap-2 dark:text-red-400 dark:hover:bg-gray-600"
                              >
                                <Trash2 className="w-4 h-4" />
                                삭제하기
                              </button>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleReportClick('COMMENT', comment.id, comment.content.substring(0, 50))}
                                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 dark:text-gray-300 dark:hover:bg-gray-600"
                                >
                                  <AlertTriangle className="w-4 h-4" />
                                  댓글 신고
                                </button>
                                <button
                                  onClick={() => handleBlockUser(comment.authorId, comment.author)}
                                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 dark:text-gray-300 dark:hover:bg-gray-600"
                                >
                                  <UserX className="w-4 h-4" />
                                  사용자 차단
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <p className="text-gray-700 mb-2 dark:text-gray-300">{comment.content}</p>
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() => handleLikeComment(comment.id)}
                      className={`flex items-center space-x-1 text-sm ${
                        comment.isLiked ? 'text-purple-500 dark:text-purple-400' : 'text-gray-500 hover:text-purple-500 dark:text-gray-400 dark:hover:text-purple-400'
                      } transition-colors`}
                    >
                      <ThumbsUp className="w-4 h-4" />
                      <span>{comment.likes}</span>
                    </button>
                    <button
                      onClick={() => setReplyToId(replyToId === comment.id ? null : comment.id)}
                      className="flex items-center space-x-1 text-sm text-gray-500 hover:text-purple-500 transition-colors dark:text-gray-400 dark:hover:text-purple-400"
                    >
                      <Reply className="w-4 h-4" />
                      <span>답글</span>
                    </button>
                    {comment.replies && comment.replies.length > 0 && (
                      <button
                        onClick={() => toggleReplies(comment.id)}
                        className="flex items-center space-x-1 text-sm text-gray-500 hover:text-purple-500 transition-colors dark:text-gray-400 dark:hover:text-purple-400"
                      >
                        {expandedComments.has(comment.id) ? (
                          <>
                            <ChevronUp className="w-4 h-4" />
                            <span>답글 숨기기</span>
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-4 h-4" />
                            <span>답글 {comment.replies.length}개</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {/* 답글 작성 폼 */}
                  {replyToId === comment.id && (
                    <div className="mt-3 pl-4 border-l-2 border-gray-200 dark:border-gray-700">
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          value={replyContent}
                          onChange={(e) => setReplyContent(e.target.value)}
                          placeholder="답글을 입력하세요..."
                          className="flex-1 bg-white border border-gray-200 text-gray-950 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                        <button
                          onClick={() => handleReply(comment.id)}
                          disabled={loading || !replyContent.trim()}
                          className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 text-white px-3 py-2 rounded text-sm transition-colors dark:disabled:bg-gray-600"
                        >
                          답글
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 답글 목록 */}
                  {expandedComments.has(comment.id) && comment.replies && comment.replies.length > 0 && (
                    <div className="mt-3 space-y-3 pl-4 border-l-2 border-gray-200 dark:border-gray-700">
                      {comment.replies.map((reply) => (
                        <div key={reply.id} className="flex space-x-2">
                          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                            {reply.author?.charAt(0) || 'U'}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-semibold text-gray-950 text-sm dark:text-white">{reply.author || '익명'}</span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">{formatDate(reply.createdAt)}</span>
                            </div>
                            <p className="text-gray-700 text-sm mb-1 dark:text-gray-300">{reply.content}</p>
                            <button
                              onClick={() => handleLikeComment(reply.id, true)}
                              className={`flex items-center space-x-1 text-xs ${
                                reply.isLiked ? 'text-purple-500 dark:text-purple-400' : 'text-gray-500 hover:text-purple-500 dark:text-gray-400 dark:hover:text-purple-400'
                              } transition-colors`}
                            >
                              <ThumbsUp className="w-3 h-3" />
                              <span>{reply.likes}</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 신고 모달 */}
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
