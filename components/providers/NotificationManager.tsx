'use client';

import { useState, useEffect } from 'react';
import NotificationPopup from '@/components/ui/NotificationPopup';
import { api } from '@/lib/api';

interface Notification {
  id: string;
  type: 'new_webtoon' | 'new_episode';
  title: string;
  message: string;
  link?: string;
  thumbnail?: string;
  createdAt: string;
}

export default function NotificationManager() {
  const [notification, setNotification] = useState<Notification | null>(null);
  const [notificationEnabled, setNotificationEnabled] = useState(false);

  useEffect(() => {
    // 알림 설정 확인
    const enabled = localStorage.getItem('notificationEnabled') === 'true';
    setNotificationEnabled(enabled);

    if (!enabled) return;

    // 브라우저 알림 권한 요청
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // 알림 체크 시작
    checkForNotifications();

    // 5분마다 알림 체크
    const interval = setInterval(checkForNotifications, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [notificationEnabled]);

  const checkForNotifications = async () => {
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      if (!token) return;

      // 하루 안보기 체크
      const hideUntil = localStorage.getItem('notificationHideUntil');
      if (hideUntil) {
        const hideUntilDate = new Date(hideUntil);
        if (hideUntilDate > new Date()) {
          return; // 아직 숨김 기간
        } else {
          localStorage.removeItem('notificationHideUntil');
        }
      }

      // 마지막 확인 시간
      const lastCheck = localStorage.getItem('lastNotificationCheck');
      const lastCheckDate = lastCheck ? new Date(lastCheck) : new Date(0);

      // 1. 새 웹툰 체크
      const newWebtoonsRes = await api.get('/frontend/comics/popular', {
        params: { limit: 10 }
      });

      const newWebtoons = (newWebtoonsRes.data?.comics || []).filter(
        (comic: any) => new Date(comic.createdAt) > lastCheckDate
      );

      if (newWebtoons.length > 0) {
        const comic = newWebtoons[0];
        showNotification({
          id: `new_webtoon_${comic.id}`,
          type: 'new_webtoon',
          title: '🎉 새로운 웹툰이 등록되었습니다!',
          message: `${comic.title} - ${comic.author}`,
          link: `/webtoons/${comic.id}`,
          thumbnail: comic.thumbnailUrl,
          createdAt: comic.createdAt
        });
        localStorage.setItem('lastNotificationCheck', new Date().toISOString());
        return;
      }

      // 2. 내가 본 웹툰의 새 에피소드 체크
      const viewedComics: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('webtoon_progress_')) {
          viewedComics.push(key.replace('webtoon_progress_', ''));
        }
      }

      if (viewedComics.length > 0) {
        // 각 웹툰의 최신 에피소드 확인
        for (const comicId of viewedComics.slice(0, 5)) { // 최대 5개만 체크
          try {
            const episodesRes = await api.get(`/frontend/comics/${comicId}/episodes`);
            const episodes = episodesRes.data?.episodes || [];

            const newEpisodes = episodes.filter(
              (ep: any) => new Date(ep.createdAt) > lastCheckDate
            );

            if (newEpisodes.length > 0) {
              const comicRes = await api.get(`/frontend/comics/${comicId}`);
              const comic = comicRes.data;
              const episode = newEpisodes[0];

              showNotification({
                id: `new_episode_${episode.id}`,
                type: 'new_episode',
                title: '📚 새 에피소드가 업데이트되었습니다!',
                message: `${comic.title} - ${episode.title}`,
                link: `/webtoons/${comicId}/episode/${episode.id}`,
                thumbnail: comic.thumbnailUrl,
                createdAt: episode.createdAt
              });
              localStorage.setItem('lastNotificationCheck', new Date().toISOString());
              return;
            }
          } catch (error) {
            console.error(`에피소드 체크 실패 (${comicId}):`, error);
          }
        }
      }

      localStorage.setItem('lastNotificationCheck', new Date().toISOString());
    } catch (error) {
      console.error('알림 체크 실패:', error);
    }
  };

  const showNotification = (notif: Notification) => {
    // 브라우저 알림 (백그라운드에서도 작동)
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(notif.title, {
        body: notif.message,
        icon: notif.thumbnail || '/favicon.png',
        tag: notif.id,
        requireInteraction: false
      });
    }

    // 팝업 알림 (웹사이트 내에서만 표시)
    setNotification(notif);
  };

  const handleClose = () => {
    setNotification(null);
  };

  const handleHideForDay = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    localStorage.setItem('notificationHideUntil', tomorrow.toISOString());
    setNotification(null);
  };

  if (!notification) return null;

  return (
    <NotificationPopup
      title={notification.title}
      message={notification.message}
      link={notification.link}
      thumbnail={notification.thumbnail}
      onClose={handleClose}
      onHideForDay={handleHideForDay}
    />
  );
}
