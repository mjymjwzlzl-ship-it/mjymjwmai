'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, BookOpen, CheckCheck, Gift, Settings } from 'lucide-react';
import { api } from '@/lib/api';
import { getImageUrl } from '@/lib/utils';
import { useLoginModalStore } from '@/store/loginModal';

type Tab = 'all' | 'update' | 'event';
interface NotificationItem {
  id: string;
  type: 'UPDATE' | 'EVENT' | 'PROMOTION';
  title: string;
  body?: string | null;
  link?: string | null;
  imageUrl?: string | null;
  isRead: boolean;
  createdAt: string;
}

const TABS: { key: Tab; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'update', label: '작품 업데이트' },
  { key: 'event', label: '이벤트·혜택' },
];
const TYPE_LABEL: Record<NotificationItem['type'], string> = { UPDATE: '작품 업데이트', EVENT: '이벤트', PROMOTION: '할인·무료' };

function timeAgo(value: string) {
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '방금';
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}일 전`;
  return new Date(value).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
}

export default function NotificationsPage() {
  const router = useRouter();
  const openLogin = useLoginModalStore((state) => state.setOpen);
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [tab, setTab] = useState<Tab>('all');
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadByType, setUnreadByType] = useState({ update: 0, event: 0 });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (nextTab: Tab) => {
    setLoading(true);
    try {
      const { data } = await api.get('/notifications', { params: { type: nextTab, limit: 100 } });
      setItems(data.notifications || []);
      setUnreadByType(data.unreadByType || { update: 0, event: 0 });
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('authToken') || localStorage.getItem('token');
    setLoggedIn(!!token);
    if (token) void load(tab);
    else setLoading(false);
  }, [tab, load]);

  const notifyHeader = () => window.dispatchEvent(new Event('notificationsUpdated'));

  const open = async (item: NotificationItem) => {
    if (!item.isRead) {
      setItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n)));
      await api.post(`/notifications/${item.id}/read`).catch(() => {});
      notifyHeader();
    }
    if (item.link) {
      if (/^https?:\/\//.test(item.link)) window.open(item.link, '_blank', 'noopener');
      else router.push(item.link);
    }
  };

  const readAll = async () => {
    await api.post('/notifications/read-all', null, { params: { type: tab } }).catch(() => {});
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadByType((prev) => (tab === 'all' ? { update: 0, event: 0 } : { ...prev, [tab]: 0 }));
    notifyHeader();
  };

  const unreadCount = (key: Tab) => (key === 'all' ? unreadByType.update + unreadByType.event : unreadByType[key]);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-950 transition-colors dark:bg-[#141414] dark:text-white">
      <div className="mx-auto max-w-3xl px-4 py-6">
        <div className="flex items-end justify-between gap-3">
          <h1 className="flex items-center gap-2 text-2xl font-black">
            <Bell className="h-6 w-6 text-[#00a84c] dark:text-[#00dc64]" />
            알림함
          </h1>
          {loggedIn && (
            <Link href="/settings?tab=notifications" className="flex items-center gap-1 text-sm font-bold text-gray-500 hover:text-[#00a84c] dark:text-gray-400">
              <Settings className="h-4 w-4" />알림 설정
            </Link>
          )}
        </div>

        {loggedIn === false ? (
          <div className="mt-6 rounded-xl border border-dashed border-gray-300 bg-white py-16 text-center dark:border-gray-700 dark:bg-[#1b1b1b]">
            <p className="mb-4 font-bold text-gray-500 dark:text-gray-400">로그인하면 찜한 작품 소식과 이벤트 알림을 받을 수 있어요</p>
            <button type="button" onClick={() => openLogin(true)} className="rounded-lg bg-[#00dc64] px-6 py-2 text-sm font-black text-black">로그인 / 회원가입</button>
          </div>
        ) : (
          <>
            <div className="mb-3 mt-5 flex items-center justify-between gap-2 border-b border-gray-200 dark:border-gray-800">
              <div className="no-scrollbar flex gap-2 overflow-x-auto" role="tablist">
                {TABS.map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={tab === key}
                    onClick={() => setTab(key)}
                    className={`-mb-px shrink-0 border-b-2 px-3 py-2.5 text-sm font-black transition ${tab === key ? 'border-[#00dc64] text-gray-950 dark:text-white' : 'border-transparent text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                  >
                    {label}
                    {unreadCount(key) > 0 && <span className="ml-1 rounded-full bg-red-600 px-1.5 text-[10px] font-black text-white">{unreadCount(key)}</span>}
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => void readAll()} disabled={unreadCount(tab) === 0} className="flex shrink-0 items-center gap-1 pb-2 text-xs font-bold text-gray-500 hover:text-[#00a84c] disabled:opacity-40 dark:text-gray-400">
                <CheckCheck className="h-4 w-4" />전체 읽음
              </button>
            </div>

            {loading ? (
              <div className="flex justify-center py-20"><div className="h-10 w-10 animate-spin rounded-full border-b-2 border-[#00dc64]" /></div>
            ) : items.length === 0 ? (
              <p className="rounded-xl border border-dashed border-gray-300 bg-white py-16 text-center text-sm font-bold text-gray-500 dark:border-gray-700 dark:bg-[#1b1b1b] dark:text-gray-400">
                {tab === 'update' ? '찜한 작품의 새 회차와 작품 공지(휴재·연재 재개·완결·이벤트 안내 등)를 여기에 알려 드려요.' : '새 알림이 없습니다.'}
              </p>
            ) : (
              <ul className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-[#1b1b1b]">
                {items.map((item) => (
                  <li key={item.id} className="border-b border-gray-100 last:border-0 dark:border-gray-800">
                    <button type="button" onClick={() => void open(item)} className={`flex w-full items-start gap-3 px-4 py-3.5 text-left transition hover:bg-gray-50 dark:hover:bg-white/5 ${item.isRead ? '' : 'bg-[#00dc64]/5'}`}>
                      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
                        {item.imageUrl ? (
                          <img src={getImageUrl(item.imageUrl, { width: 160 })} alt="" className="h-full w-full object-cover" loading="lazy" />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center text-gray-400">{item.type === 'UPDATE' ? <BookOpen className="h-6 w-6" /> : <Gift className="h-6 w-6" />}</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-1.5 text-[11px] font-bold text-gray-500 dark:text-gray-400">
                          {!item.isRead && <span className="h-2 w-2 rounded-full bg-red-600" aria-label="안 읽음" />}
                          {TYPE_LABEL[item.type]} · {timeAgo(item.createdAt)}
                        </p>
                        <p className={`mt-0.5 line-clamp-2 text-sm ${item.isRead ? 'font-bold text-gray-600 dark:text-gray-300' : 'font-black'}`}>{item.title}</p>
                        {item.body && <p className="mt-0.5 line-clamp-1 text-xs text-gray-500 dark:text-gray-400">{item.body}</p>}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}
