'use client';

import { useRouter } from 'next/navigation';
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

const demoPosts = [
  { id: 'open', type: localized('공지', 'Notice', 'お知らせ', 'Annonce'), title: localized('아라타 코믹스 정식 오픈 기념 이벤트 안내', 'ARATA COMICS launch event', 'ARATA COMICS正式オープン記念イベント', 'Événement de lancement d’ARATA COMICS'), writer: localized('관리자', 'Admin', '管理者', 'Admin'), date: '2024.03.20', views: 5420, comments: 15, pinned: true },
  { id: 'maintenance', type: localized('점검', 'Maintenance', 'メンテナンス', 'Maintenance'), title: localized('3월 25일(월) 정기 점검 안내 (02:00 ~ 06:00)', 'Scheduled maintenance on March 25 (02:00–06:00)', '3月25日（月）定期メンテナンスのお知らせ（02:00～06:00）', 'Maintenance programmée le 25 mars (02:00–06:00)'), writer: localized('관리자', 'Admin', '管理者', 'Admin'), date: '2024.03.19', views: 2300, comments: 0, pinned: true },
  { id: '15', no: 15, type: localized('잡담', 'Chat', '雑談', 'Discussion'), title: localized('이 웹툰 진짜 재밌네요 추천합니다', 'This webtoon is great—I recommend it', 'このウェブトゥーン、本当に面白いのでおすすめです', 'Ce webtoon est excellent, je le recommande'), writer: localized('웹툰조아', 'WebtoonFan', 'ウェブトゥーン好き', 'FanDeWebtoon'), date: '14:30', views: 124, comments: 5 },
  { id: '14', no: 14, type: localized('문의', 'Support', 'お問い合わせ', 'Assistance'), title: localized('코인 충전 오류 문의드립니다', 'Coin top-up error', 'コインチャージエラーについて', 'Erreur de recharge de pièces'), writer: localized('user123', 'user123', 'user123', 'user123'), date: '13:15', views: 45, comments: 2 },
  { id: '13', no: 13, type: localized('질문', 'Question', '質問', 'Question'), title: localized('소설 업데이트 시간 언제인가요?', 'When are novels updated?', '小説の更新時間はいつですか？', 'À quelle heure les romans sont-ils mis à jour ?'), writer: localized('독서왕', 'BookKing', '読書王', 'RoiLecture'), date: '12:40', views: 89, comments: 1 },
  { id: '12', no: 12, type: localized('후기', 'Review', 'レビュー', 'Avis'), title: localized('사이트 속도가 빨라져서 좋네요', 'The site feels much faster now', 'サイトが速くなってうれしいです', 'Le site est beaucoup plus rapide maintenant'), writer: localized('스피드', 'Speed', 'スピード', 'Vitesse'), date: '12:10', views: 210, comments: 8 },
  { id: '11', no: 11, type: localized('질문', 'Question', '質問', 'Question'), title: localized('다음 화 언제 올라오나요?', 'When is the next episode?', '次の話はいつ公開されますか？', 'Quand sort le prochain épisode ?'), writer: localized('기다림', 'Waiting', '待ち人', 'Patience'), date: '11:55', views: 300, comments: 3 },
];

const posts = process.env.NODE_ENV === 'production' ? [] : demoPosts;

export default function CommunityPage() {
  const router = useRouter();
  const { locale } = useLanguage();

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
            {posts.map((post) => (
              <button
                key={post.id}
                type="button"
                className={`block w-full px-4 py-3 text-left text-sm transition hover:bg-gray-50 sm:grid sm:grid-cols-12 sm:px-5 sm:py-4 dark:hover:bg-white/5 ${post.pinned ? 'bg-red-50/70 dark:bg-red-950/10' : ''}`}
              >
                <div className="sm:hidden">
                  <div className="flex items-center justify-between gap-3 text-xs text-gray-500">
                    <div className="flex min-w-0 items-center gap-2">
                      {post.pinned ? (
                        <span className="shrink-0 rounded bg-red-500 px-2 py-1 font-black text-white">{copy.notice[locale]}</span>
                      ) : (
                        <span className="font-black text-gray-400">{post.no}</span>
                      )}
                      <span className="truncate">{post.type[locale]}</span>
                    </div>
                    <span className="shrink-0">{post.date} · {copy.views[locale]} {post.views}</span>
                  </div>
                  <div className="mt-2 break-words font-bold leading-5 text-gray-950 dark:text-white">
                    {post.title[locale]}
                    {post.comments > 0 && (
                      <span className="ml-2 inline-flex items-center gap-1 text-xs font-black text-[#00a84c]">
                        <MessageSquare className="h-3 w-3 fill-[#00dc64] text-[#00dc64]" />
                        {post.comments}
                      </span>
                    )}
                  </div>
                  <div className="mt-1.5 truncate text-xs text-gray-500">{post.writer[locale]}</div>
                </div>

                <div className="hidden sm:contents">
                  <div className="col-span-1">
                    {post.pinned ? <span className="rounded bg-red-500 px-2 py-1 text-xs font-black text-white">{copy.notice[locale]}</span> : post.no}
                  </div>
                  <div className="col-span-1 text-gray-500">{post.type[locale]}</div>
                  <div className="col-span-6 min-w-0 font-bold text-gray-950 dark:text-white">
                    <span className="truncate">{post.title[locale]}</span>
                    {post.comments > 0 && (
                      <span className="ml-2 inline-flex items-center gap-1 text-xs font-black text-[#00a84c]">
                        <MessageSquare className="h-3 w-3 fill-[#00dc64] text-[#00dc64]" />
                        {post.comments}
                      </span>
                    )}
                  </div>
                  <div className="col-span-2 text-center text-gray-500">{post.writer[locale]}</div>
                  <div className="col-span-1 text-center text-gray-500">{post.date}</div>
                  <div className="col-span-1 text-center text-gray-500">{post.views}</div>
                </div>
              </button>
            ))}
          </div>

          <div className="flex flex-col justify-center gap-2 border-t border-gray-100 bg-gray-50 p-4 sm:flex-row sm:p-5 dark:border-gray-800 dark:bg-[#202020]">
            <select className="w-full rounded border border-gray-200 bg-white px-4 py-2 text-sm sm:w-auto dark:border-gray-700 dark:bg-[#151515] dark:text-white">
              <option>{copy.subject[locale]}</option>
            </select>
            <input placeholder={copy.placeholder[locale]} className="w-full rounded border border-gray-200 bg-white px-4 py-2 text-sm outline-none focus:border-[#00dc64] sm:w-72 dark:border-gray-700 dark:bg-[#151515] dark:text-white" />
            <button className="w-full rounded bg-gray-800 px-5 py-2 text-sm font-bold text-white sm:w-auto dark:bg-gray-700">{copy.search[locale]}</button>
          </div>
        </section>
      </div>
    </div>
  );
}
