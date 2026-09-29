'use client';

import { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { getApiUrl } from '@/lib/api-config';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: 'COMIC' | 'EPISODE' | 'COMMENT' | 'USER';
  targetId: string;
  targetName?: string;
}

const REPORT_REASONS = [
  { value: 'INAPPROPRIATE', label: '부적절한 콘텐츠', description: '폭력, 선정적 내용 등 부적절한 콘텐츠' },
  { value: 'COPYRIGHT', label: '저작권 침해', description: '무단 도용, 표절 등 저작권 위반' },
  { value: 'SPAM', label: '스팸/광고', description: '원치 않는 광고, 스팸성 콘텐츠' },
  { value: 'VIOLENCE', label: '폭력적인 콘텐츠', description: '과도한 폭력, 잔인한 내용' },
  { value: 'ADULT', label: '성인물 노출', description: '부적절한 성인 콘텐츠 노출' },
  { value: 'HATE', label: '혐오 발언', description: '차별, 혐오 표현 포함' },
  { value: 'PRIVACY', label: '개인정보 노출', description: '타인의 개인정보 무단 공개' },
  { value: 'ILLEGAL', label: '불법 콘텐츠', description: '법률 위반 콘텐츠' },
  { value: 'OTHER', label: '기타', description: '위 항목에 해당하지 않는 사유' }
];

export default function ReportModal({ isOpen, onClose, targetType, targetId, targetName }: ReportModalProps) {
  const [selectedReason, setSelectedReason] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!selectedReason) {
      alert('신고 사유를 선택해주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        alert('로그인이 필요합니다.');
        onClose();
        return;
      }

      const response = await fetch(`${getApiUrl()}/report/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          type: targetType,
          targetId,
          reason: selectedReason,
          description
        })
      });

      const data = await response.json();

      if (response.ok) {
        alert(data.message || '신고가 접수되었습니다.');
        onClose();
        setSelectedReason('');
        setDescription('');
      } else {
        alert(data.message || '신고 처리 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('신고 오류:', error);
      alert('신고 처리 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTargetTypeLabel = () => {
    switch (targetType) {
      case 'COMIC': return '웹툰';
      case 'EPISODE': return '에피소드';
      case 'COMMENT': return '댓글';
      case 'USER': return '사용자';
      default: return '콘텐츠';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <h2 className="text-lg font-semibold">{getTargetTypeLabel()} 신고</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 본문 */}
        <div className="p-4">
          {targetName && (
            <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded">
              <p className="text-sm text-gray-600 dark:text-gray-400">신고 대상</p>
              <p className="font-medium">{targetName}</p>
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              신고 사유 <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              {REPORT_REASONS.map((reason) => (
                <label
                  key={reason.value}
                  className={`block p-3 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                    selectedReason === reason.value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-600'
                  }`}
                >
                  <input
                    type="radio"
                    name="reason"
                    value={reason.value}
                    checked={selectedReason === reason.value}
                    onChange={(e) => setSelectedReason(e.target.value)}
                    className="sr-only"
                  />
                  <div>
                    <p className="font-medium">{reason.label}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {reason.description}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              상세 설명 (선택)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
              placeholder="신고 사유를 자세히 설명해주세요..."
            />
          </div>

          <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              ⚠️ 허위 신고 시 서비스 이용이 제한될 수 있습니다.
            </p>
          </div>
        </div>

        {/* 푸터 */}
        <div className="flex gap-2 p-4 border-t dark:border-gray-700">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            disabled={isSubmitting}
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
            disabled={isSubmitting || !selectedReason}
          >
            {isSubmitting ? '신고 중...' : '신고하기'}
          </button>
        </div>
      </div>
    </div>
  );
}