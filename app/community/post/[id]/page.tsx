'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Clock, Eye, MessageCircle, Send, ThumbsDown, ThumbsUp, Trash2, User } from 'lucide-react';
import { api } from '@/lib/api';

interface Comment {
  id: string;
  content: string;
  author: { nickname: string };
  authorId: string;
  createdAt: string;
}

interface Post {
  id: string;
  title: string;
  content: string;
  author: { nickname: string; id: string };
  authorId: string;
  category: string;
  viewCount: number;
  upvotes: number;
  downvotes: number;
  likeCount: number;
  _count: {
    comments: number;
  };
  comments: Comment[];
  createdAt: string;
  updatedAt: string;
  userVote?: boolean | null;
}

export default function PostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [commentContent, setCommentContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [postId, setPostId] = useState('');
  const [userVote, setUserVote] = useState<boolean | null>(null);

  useEffect(() => {
    const init = async () => {
      const resolvedParams = await params;
      setPostId(resolvedParams.id);
      const userData = localStorage.getItem('user');
      if (userData) {
        setUser(JSON.parse(userData));
      }
    };
    init();
  }, [params]);

  useEffect(() => {
    if (postId) {
      fetchPost();
    }
  }, [postId]);

  const fetchPost = async (skipViewIncrement = false) => {
    try {
      const url = skipViewIncrement
        ? `/community/posts/${postId}?skipViewIncrement=true`
        : `/community/posts/${postId}`;
      const response = await api.get(url);
      setPost(response.data.post);
      setUserVote(response.data.post?.userVote ?? null);
    } catch (error) {
      console.error('Failed to fetch post:', error);
      alert('게시글을 불러올 수 없습니다.');
      router.push('/community');
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (isUpvote: boolean) => {
    if (!user) {
      alert('로그인이 필요합니다.');
      router.push('/login');
      return;
    }

    try {
      const response = await api.post(`/community/posts/${postId}/vote`, { isUpvote });

      if (response.data.voted) {
        setUserVote(isUpvote);
      } else {
        setUserVote(null);
      }

      fetchPost(true);
    } catch (error) {
      console.error('Failed to vote:', error);
      alert('투표에 실패했습니다.');
    }
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert('로그인이 필요합니다.');
      router.push('/login');
      return;
    }

    if (!commentContent.trim()) return;

    setSubmitting(true);
    try {
      await api.post(`/community/posts/${postId}/comments`, {
        content: commentContent,
      });
      setCommentContent('');
      fetchPost(true);
    } catch (error) {
      console.error('Failed to post comment:', error);
      alert('댓글 작성에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePost = async () => {
    if (!confirm('정말로 게시글을 삭제하시겠습니까?')) return;

    try {
      await api.delete(`/community/posts/${postId}`);
      router.push('/community');
    } catch (error) {
      console.error('Failed to delete post:', error);
      alert('게시글 삭제에 실패했습니다.');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('정말로 댓글을 삭제하시겠습니까?')) return;

    try {
      await api.delete(`/community/comments/${commentId}`);
      fetchPost(true);
    } catch (error) {
      console.error('Failed to delete comment:', error);
      alert('댓글 삭제에 실패했습니다.');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ko-KR');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-[#141414]">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-[#00dc64]" />
      </div>
    );
  }

  if (!post) return null;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-950 transition-colors dark:bg-[#141414] dark:text-white">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6">
          <button
            onClick={() => router.push('/community')}
            className="flex items-center gap-2 text-sm font-bold text-gray-500 transition hover:text-[#00a84c] dark:text-gray-400 dark:hover:text-[#00dc64]"
          >
            <ArrowLeft className="h-5 w-5" />
            목록으로
          </button>
        </div>

        <article className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-[#1b1b1b]">
          <div className="p-6">
            <div className="mb-4">
              <span className="rounded bg-[#00dc64] px-2 py-1 text-xs font-black text-black">
                {post.category}
              </span>
            </div>

            <h1 className="mb-4 text-2xl font-black text-gray-950 dark:text-white">{post.title}</h1>

            <div className="mb-6 flex items-center justify-between gap-4 text-sm text-gray-500 dark:text-gray-400">
              <div className="flex flex-wrap items-center gap-4">
                <span className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  {post.author.nickname}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {formatDate(post.createdAt)}
                </span>
                <span className="flex items-center gap-1">
                  <Eye className="h-4 w-4" />
                  {post.viewCount}
                </span>
              </div>
              {user?.id === post.authorId && (
                <button
                  onClick={handleDeletePost}
                  className="flex items-center gap-1 text-red-500 transition hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                  삭제
                </button>
              )}
            </div>

            <div className="mb-8 whitespace-pre-wrap leading-7 text-gray-800 dark:text-gray-100">{post.content}</div>

            <div className="mb-6 flex items-center justify-center gap-4 border-b border-gray-100 pb-6 dark:border-gray-800">
              <button
                onClick={() => handleVote(true)}
                className={`flex items-center gap-2 rounded-lg px-6 py-3 font-bold transition ${
                  userVote === true
                    ? 'bg-orange-500 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-600 hover:bg-orange-50 hover:text-orange-500 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-orange-950/20'
                }`}
              >
                <ThumbsUp className="h-5 w-5" />
                추천 {post.upvotes || 0}
              </button>

              <button
                onClick={() => handleVote(false)}
                className={`flex items-center gap-2 rounded-lg px-6 py-3 font-bold transition ${
                  userVote === false
                    ? 'bg-blue-500 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-600 hover:bg-blue-50 hover:text-blue-500 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-blue-950/20'
                }`}
              >
                <ThumbsDown className="h-5 w-5" />
                비추천 {post.downvotes || 0}
              </button>

              <div className="ml-2 flex items-center gap-2 text-gray-500 dark:text-gray-400">
                <MessageCircle className="h-4 w-4" />
                {post._count.comments}
              </div>
            </div>
          </div>

          <section className="border-t border-gray-100 bg-gray-50 p-6 dark:border-gray-800 dark:bg-[#202020]">
            <h3 className="mb-4 font-black text-gray-950 dark:text-white">댓글 {post._count.comments}</h3>

            {user && (
              <form onSubmit={handleComment} className="mb-6">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={commentContent}
                    onChange={(e) => setCommentContent(e.target.value)}
                    placeholder="댓글을 입력하세요..."
                    className="flex-1 rounded-lg border border-gray-200 bg-white px-4 py-2 text-gray-950 outline-none transition focus:border-[#00dc64] focus:ring-2 focus:ring-[#00dc64]/20 dark:border-gray-700 dark:bg-[#121212] dark:text-white"
                  />
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex items-center gap-2 rounded-lg bg-[#00dc64] px-4 py-2 font-black text-black transition hover:bg-[#00c85a] disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" />
                    등록
                  </button>
                </div>
              </form>
            )}

            <div className="space-y-4">
              {post.comments.map((comment) => (
                <div key={comment.id} className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-[#1b1b1b]">
                  <div className="mb-2 flex items-start justify-between">
                    <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                      <User className="h-4 w-4" />
                      <span className="font-bold">{comment.author.nickname}</span>
                      <span>{formatDate(comment.createdAt)}</span>
                    </div>
                    {user?.id === comment.authorId && (
                      <button
                        onClick={() => handleDeleteComment(comment.id)}
                        className="text-red-500 transition hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <p className="text-gray-700 dark:text-gray-300">{comment.content}</p>
                </div>
              ))}
            </div>

            {post.comments.length === 0 && (
              <div className="py-8 text-center text-gray-500 dark:text-gray-400">
                아직 댓글이 없습니다. 첫 댓글을 작성해보세요!
              </div>
            )}
          </section>
        </article>
      </div>
    </div>
  );
}
