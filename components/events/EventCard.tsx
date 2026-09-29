import Link from 'next/link';
import { getImageUrl } from '@/lib/utils';

export type EventStatus = 'ONGOING' | 'UPCOMING' | 'ENDED';
export interface SiteEvent {
  id: string;
  title: string;
  summary?: string | null;
  thumbnailUrl: string;
  link: string;
  startAt: string;
  endAt?: string | null;
  status: EventStatus;
}

export const EVENT_STATUS_LABEL: Record<EventStatus, string> = { ONGOING: '진행 중', UPCOMING: '예정', ENDED: '종료' };

const fmt = (value: string) => new Date(value).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Asia/Seoul' });
export const eventPeriod = (event: SiteEvent) => `${fmt(event.startAt)} ~ ${event.endAt ? fmt(event.endAt) : '상시 진행'}`;

const badgeClass: Record<EventStatus, string> = {
  ONGOING: 'bg-[#00dc64] text-black',
  UPCOMING: 'bg-sky-500 text-white',
  ENDED: 'bg-gray-500 text-white',
};

export default function EventCard({ event }: { event: SiteEvent }) {
  const ended = event.status === 'ENDED';
  const external = /^https?:\/\//.test(event.link);
  const body = (
    <>
      <div className="relative aspect-[16/9] overflow-hidden bg-gray-200 dark:bg-gray-800">
        <img
          src={getImageUrl(event.thumbnailUrl, { width: 720 })}
          alt={event.title}
          loading="lazy"
          className={`h-full w-full object-cover transition duration-500 ${ended ? 'grayscale' : 'group-hover:scale-105'}`}
        />
        <span className={`absolute right-2 top-2 rounded px-2 py-1 text-[11px] font-black ${badgeClass[event.status]}`}>
          {EVENT_STATUS_LABEL[event.status]}
        </span>
        {ended && <div className="absolute inset-0 bg-black/40" />}
      </div>
      <div className="p-3">
        <h3 className={`line-clamp-2 text-sm font-black leading-snug sm:text-base ${ended ? 'text-gray-500 dark:text-gray-400' : 'group-hover:text-[#00a84c] dark:group-hover:text-[#00dc64]'}`}>
          {event.title}
        </h3>
        {event.summary && <p className="mt-1 line-clamp-2 text-xs text-gray-500 dark:text-gray-400">{event.summary}</p>}
        <p className="mt-2 text-xs font-bold text-gray-500 dark:text-gray-400">{eventPeriod(event)}</p>
      </div>
    </>
  );
  const className = `group block overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition dark:border-gray-700 dark:bg-[#181818] ${ended ? 'cursor-default' : 'hover:-translate-y-0.5 hover:shadow-md'}`;
  // 종료된 이벤트는 이동하지 않는다
  if (ended) return <div className={className} aria-disabled="true">{body}</div>;
  if (external) return <a href={event.link} target="_blank" rel="noopener noreferrer" className={className}>{body}</a>;
  return <Link href={event.link} className={className}>{body}</Link>;
}
