'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Send } from 'lucide-react';
import { api } from '@/lib/api';

const categoryLabels: Record<string, string> = {
  general: '자유',
  webtoon: '웹툰',
  novel: '소설',
  review: '리뷰',
  question: '질문',
};

function CommunityWriteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('general');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const categoryParam = searchParams.get('category');
    if (categoryParam && categoryLabels[categoryParam]) {
      setCategory(categoryParam);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !content.trim()) {
      alert('제목과 내용을 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/community/posts', {
        title,
        content,
        category,
        isAdult: false,
      });

      router.push(`/community?category=${category}`);
    } catch (error) {
      console.error('Failed to create post:', error);
      alert('게시글 작성에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-950 transition-colors dark:bg-[#141414] dark:text-white">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-sm font-bold text-gray-500 transition hover:text-[#00a84c] dark:text-gray-400 dark:hover:text-[#00dc64]"
          >
            <ArrowLeft className="h-5 w-5" />
            돌아가기
          </button>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-[#1b1b1b]">
          <h1 className="mb-6 text-2xl font-black">
            {categoryLabels[category] || '게시글'} 작성
          </h1>

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="mb-2 block text-sm font-bold text-gray-800 dark:text-gray-100">제목</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="제목을 입력하세요"
                className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-gray-950 outline-none transition focus:border-[#00dc64] focus:ring-2 focus:ring-[#00dc64]/20 dark:border-gray-700 dark:bg-[#121212] dark:text-white"
                maxLength={100}
              />
            </div>

            <div className="mb-6">
              <label className="mb-2 block text-sm font-bold text-gray-800 dark:text-gray-100">내용</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="내용을 입력하세요"
                className="w-full resize-none rounded-lg border border-gray-200 bg-white px-4 py-3 text-gray-950 outline-none transition focus:border-[#00dc64] focus:ring-2 focus:ring-[#00dc64]/20 dark:border-gray-700 dark:bg-[#121212] dark:text-white"
                rows={12}
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => router.back()}
                className="rounded-lg border border-gray-200 px-6 py-2 font-bold text-gray-600 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 rounded-lg bg-[#00dc64] px-6 py-2 font-black text-black transition hover:bg-[#00c85a] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                {loading ? '작성 중...' : '작성하기'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function CommunityWritePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-[#141414]">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-[#00dc64]" />
        </div>
      }
    >
      <CommunityWriteContent />
    </Suspense>
  );
}
