'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface NotificationPopupProps {
  title: string;
  message: string;
  link?: string;
  thumbnail?: string;
  onClose: () => void;
  onHideForDay: () => void;
}

export default function NotificationPopup({
  title,
  message,
  link,
  thumbnail,
  onClose,
  onHideForDay
}: NotificationPopupProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // 애니메이션을 위해 약간의 지연
    setTimeout(() => setIsVisible(true), 100);
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  const handleHideForDay = () => {
    setIsVisible(false);
    setTimeout(onHideForDay, 300);
  };

  const handleClick = () => {
    if (link) {
      window.location.href = link;
      handleClose();
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-[9999] max-w-sm w-full mx-4 sm:mx-0">
      <div
        className={`bg-gray-900 border border-gray-700 rounded-lg shadow-2xl overflow-hidden transition-all duration-300 ${
          isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
        }`}
      >
        {/* 상단 헤더 */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 flex items-center justify-between">
          <h3 className="text-white font-bold text-sm">🔔 새로운 알림</h3>
          <button
            onClick={handleClose}
            className="text-white hover:text-gray-200 transition-colors p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 콘텐츠 */}
        <div
          className={`p-4 ${link ? 'cursor-pointer hover:bg-gray-800' : ''}`}
          onClick={handleClick}
        >
          <div className="flex gap-3">
            {thumbnail && (
              <div className="flex-shrink-0 w-16 h-20 rounded overflow-hidden bg-gray-800">
                <img
                  src={thumbnail}
                  alt={title}
                  loading="lazy"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/images/placeholder.png';
                  }}
                />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h4 className="text-white font-semibold text-sm mb-1 line-clamp-2">
                {title}
              </h4>
              <p className="text-gray-400 text-xs line-clamp-2">
                {message}
              </p>
            </div>
          </div>
        </div>

        {/* 하단 버튼 */}
        <div className="px-4 pb-4 flex gap-2">
          <button
            onClick={handleHideForDay}
            className="flex-1 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs rounded-lg transition-colors"
          >
            하루 안보기
          </button>
          <button
            onClick={handleClose}
            className="flex-1 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs rounded-lg transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
