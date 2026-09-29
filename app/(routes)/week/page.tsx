'use client';

import { useState } from 'react';
import GeneralComicListPage from '@/components/ui/GeneralComicListPage';

const WEEKDAYS = [
  { id: 'mon', label: '월', fullLabel: '월요일' },
  { id: 'tue', label: '화', fullLabel: '화요일' },
  { id: 'wed', label: '수', fullLabel: '수요일' },
  { id: 'thu', label: '목', fullLabel: '목요일' },
  { id: 'fri', label: '금', fullLabel: '금요일' },
  { id: 'sat', label: '토', fullLabel: '토요일' },
  { id: 'sun', label: '일', fullLabel: '일요일' },
  { id: 'all', label: '전체', fullLabel: '전체' },
];

export default function WeekPage() {
  const [selectedDay, setSelectedDay] = useState('all');

  return (
    <GeneralComicListPage
      title="요일별 웹툰"
      queryKey={['home-data', 'week', selectedDay]}
      beforeGrid={
        <div className="mb-6">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {WEEKDAYS.map((day) => (
              <button
                key={day.id}
                onClick={() => setSelectedDay(day.id)}
                className={`whitespace-nowrap rounded-lg px-4 py-2 font-medium transition-colors ${
                  selectedDay === day.id
                    ? 'bg-[#00dc64] text-gray-950'
                    : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                {day.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {WEEKDAYS.find((day) => day.id === selectedDay)?.fullLabel} 연재 작품
          </p>
        </div>
      }
      selectItems={(homeData) => {
        const categories = homeData?.data?.categories || {};
        const comics = homeData?.data?.allComics || [];
        if (selectedDay === 'all') return comics;

        const weekdayData = categories[`week_${selectedDay}`];
        if (weekdayData?.length > 0) return weekdayData;

        return comics.filter((comic: any) => Array.isArray(comic.updateDays) && comic.updateDays.includes(selectedDay));
      }}
      emptyMessage="해당 요일에 연재되는 작품이 없습니다."
    />
  );
}
