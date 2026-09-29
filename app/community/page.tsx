'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { MessageSquare } from 'lucide-react';
import AppDownloadBanner from '@/components/ui/AppDownloadBanner';
import { useLanguage, type Locale } from '@/components/providers/LanguageProvider';

type LocalizedText = Record<Locale, string>;
const localized = (ko: string, en: string, ja: string, fr: string): LocalizedText => ({ ko, en, ja, fr });

const copy = {
  title: localized('자유게시판', 'Community Board', '自由掲示板', 'Forum communautaire'),
  description: localized('유저들과 자유롭게 이야기를 나누어보세요.', 'Talk freely with other readers.', 'ユーザー同士で自由に交流しましょう。', 'Échangez librement avec les autres lecteurs.'),
  write: localized('글쓰기', 'New post', '投稿する', 'Publier'),
  number: localized('번호', 'No.', '番号', 'N°'),
  type: localized('분류', 'Type', '分類', 'Type'),
  subject: localized('제목', 'Title', 'タイトル', 'Titre'),
  writer: localized('글쓴이', 'Author', '投稿者', 'Auteur'),
  date: localized('날짜', 'Date', '日付', 'Date'),
  views: localized('조회', 'Views', '閲覧', 'Vues'),
  notice: localized('공지', 'Notice', 'お知らせ', 'Annonce'),
  placeholder: localized('검색어를 입력하세요', 'Enter a search term', '検索キーワードを入力', 'Saisissez un terme de recherche'),
  search: localized('검색', 'Search', '検索', 'Rechercher'),
};

const categoryLabels: Record<string, LocalizedText> = {
  general: localized('자유', 'General', '自由', 'Général'),
  webtoon: localized('웹툰', 'Webtoon', 'ウェブトゥーン', 'Webtoon'),
  novel: localized('소설', 'Novel', '小説', 'Roman'),
  review: localized('리뷰', 'Review', 'レビュー', 'Avis'),
  question: localized('질문', 'Question', '質問', 'Question'),
};

interface BoardPost {
  id: string;
  title: string;
  author: string;
  category: string;
  viewCount: number;
  commentCount: number;
  createdAt: string;
  isPinned: boolean;
}

// 오늘 글은 시:분, 이전 글은 연.월.일
function formatPostDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
  }
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
}

export default function CommunityPage() {
  const router = useRouter();
  const { locale } = useLanguage();
  const [posts, setPosts] = useState<BoardPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [searchInput, setSearchInput] = useState('');

  // 게시글은 서버(/api/community/posts)에서 불러온다 (예전엔 데모 목록만 있어 새 글이 안 보였다)
  const loadPosts = useCallback(async (search = '') => {
    setLoading(true);
    setLoadError(false);
    try {
      const { data } = await api.get('/community/posts', { params: { limit: 50, ...(search ? { search } : {}) } });
      setPosts(Array.isArray(data?.posts) ? data.posts : []);
    } catch {
      setLoadError(true);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPosts();
  }, [loadPosts]);

  const regularCount = posts.filter((post) => !post.isPinned).length;

  return (
    <div className="min-h-screen bg-gray-50 transition-colors dark:bg-[#141414]">
      <div className="mx-auto max-w-7xl px-4 py-6">
        <AppDownloadBanner />

        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-800 dark:bg-[#1b1b1b]">
          <div className="flex items-center justify-between gap-3 border-b border-gray-200 p-4 sm:p-6 dark:border-gray-800">
            <div className="min-w-0">
              <h1 className="text-xl font-black text-gray-950 sm:text-2xl dark:text-white">{copy.title[locale]}</h1>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{copy.description[locale]}</p>
            </div>
            <button
              type="button"
              onClick={() => router.push('/community/write')}
              className="shrink-0 rounded bg-[#00dc64] px-3 py-2 text-xs font-black text-black transition hover:bg-[#20ef7b] sm:px-5 sm:py-3 sm:text-sm"
            >
              {copy.write[locale]}
            </button>
          </div>

          <div className="hidden grid-cols-12 border-b border-gray-200 bg-gray-100 px-5 py-3 text-sm font-bold text-gray-500 sm:grid dark:border-gray-800 dark:bg-[#202020]">
            <div className="col-span-1">{copy.number[locale]}</div>
            <div className="col-span-1">{copy.type[locale]}</div>
            <div className="col-span-6">{copy.subject[locale]}</div>
            <div className="col-span-2 text-center">{copy.writer[locale]}</div>
            <div className="col-span-1 text-center">{copy.date[locale]}</div>
            <div className="col-span-1 text-center">{copy.views[locale]}</div>
          </div>

          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {loading && (
              <div className="px-5 py-12 text-center text-sm text-gray-500">불러오는 중...</div>
            )}
            {!loading && loadError && (
              <div className="px-5 py-12 text-center text-sm text-gray-500">
                게시글을 불러오지 못했습니다.{' '}
                <button type="button" onClick={() => loadPosts(searchInput.trim())} className="font-bold text-[#00a84c] underline">다시 시도</button>
              </div>
            )}
            {!loading && !loadError && posts.length === 0 && (
              <div className="px-5 py-12 text-center text-sm text-gray-500">아직 게시글이 없습니다. 첫 글을 남겨 보세요.</div>
            )}
            {!loading && posts.map((post, index) => {
              const no = regularCount - posts.filter((item, i) => i < index && !item.isPinned).length;
              const typeLabel = categoryLabels[post.category]?.[locale] || post.category;
              const date = formatPostDate(post.createdAt);
              return (
              <button
                key={post.id}
                type="button"
                onClick={() => router.push(`/community/post/${post.id}`)}
                className={`block w-full px-4 py-3 text-left text-sm transition hover:bg-gray-50 sm:grid sm:grid-cols-12 sm:px-5 sm:py-4 dark:hover:bg-white/5 ${post.isPinned ? 'bg-red-50/70 dark:bg-red-950/10' : ''}`}
              >
                <div className="sm:hidden">
                  <div className="flex items-center justify-between gap-3 text-xs text-gray-500">
                    <div className="flex min-w-0 items-center gap-2">
                      {post.isPinned ? (
                        <span className="shrink-0 rounded bg-red-500 px-2 py-1 font-black text-white">{copy.notice[locale]}</span>
                      ) : (
                        <span className="font-black text-gray-400">{no}</span>
                      )}
                      <span className="truncate">{typeLabel}</span>
                    </div>
                    <span className="shrink-0">{date} · {copy.views[locale]} {post.viewCount}</span>
                  </div>
                  <div className="mt-2 break-words font-bold leading-5 text-gray-950 dark:text-white">
                    {post.title}
                    {post.commentCount > 0 && (
                      <span className="ml-2 inline-flex items-center gap-1 text-xs font-black text-[#00a84c]">
                        <MessageSquare className="h-3 w-3 fill-[#00dc64] text-[#00dc64]" />
                        {post.commentCount}
                      </span>
                    )}
                  </div>
                  <div className="mt-1.5 truncate text-xs text-gray-500">{post.author}</div>
                </div>

                <div className="hidden sm:contents">
                  <div className="col-span-1">
                    {post.isPinned ? <span className="rounded bg-red-500 px-2 py-1 text-xs font-black text-white">{copy.notice[locale]}</span> : no}
                  </div>
                  <div className="col-span-1 text-gray-500">{typeLabel}</div>
                  <div className="col-span-6 min-w-0 font-bold text-gray-950 dark:text-white">
                    <span className="truncate">{post.title}</span>
                    {post.commentCount > 0 && (
                      <span className="ml-2 inline-flex items-center gap-1 text-xs font-black text-[#00a84c]">
                        <MessageSquare className="h-3 w-3 fill-[#00dc64] text-[#00dc64]" />
                        {post.commentCount}
                      </span>
                    )}
                  </div>
                  <div className="col-span-2 text-center text-gray-500">{post.author}</div>
                  <div className="col-span-1 text-center text-gray-500">{date}</div>
                  <div className="col-span-1 text-center text-gray-500">{post.viewCount}</div>
                </div>
              </button>
              );
            })}
          </div>

          <form
            onSubmit={(event) => { event.preventDefault(); void loadPosts(searchInput.trim()); }}
            className="flex flex-col justify-center gap-2 border-t border-gray-100 bg-gray-50 p-4 sm:flex-row sm:p-5 dark:border-gray-800 dark:bg-[#202020]"
          >
            <select className="w-full rounded border border-gray-200 bg-white px-4 py-2 text-sm sm:w-auto dark:border-gray-700 dark:bg-[#151515] dark:text-white">
              <option>{copy.subject[locale]} · 내용</option>
            </select>
            <input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder={copy.placeholder[locale]} className="w-full rounded border border-gray-200 bg-white px-4 py-2 text-sm outline-none focus:border-[#00dc64] sm:w-72 dark:border-gray-700 dark:bg-[#151515] dark:text-white" />
            <button type="submit" className="w-full rounded bg-gray-800 px-5 py-2 text-sm font-bold text-white sm:w-auto dark:bg-gray-700">{copy.search[locale]}</button>
          </form>
        </section>
      </div>
    </div>
  );
}
