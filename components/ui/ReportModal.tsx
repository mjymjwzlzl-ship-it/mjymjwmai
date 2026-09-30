'use client';

import { useEffect, useState } from 'react';
import { X, AlertTriangle, ImagePlus } from 'lucide-react';
import { getApiUrl } from '@/lib/api-config';

// 신고: 작품(COMIC) · 회차(EPISODE) · 댓글(COMMENT) · 사용자(USER)
// 작품·회차 신고는 보고 있던 작품명·회차가 자동으로 붙고, 내용 작성·스크린샷 1장 첨부를 받는다.
// 사유 값은 backend/lib/report-reasons.js 와 같다.
interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: 'COMIC' | 'EPISODE' | 'COMMENT' | 'USER' | 'POST' | 'POST_COMMENT';
  targetId: string;
  targetName?: string;
  /** 작품·회차 신고에 자동으로 붙는 정보 */
  context?: { comicTitle?: string; episodeLabel?: string };
}

const REASONS: Record<ReportModalProps['targetType'], { value: string; label: string; description: string }[]> = {
  COMMENT: [
    { value: 'ABUSE', label: '욕설·비방', description: '욕설, 인신공격, 혐오 표현' },
    { value: 'SPAM', label: '도배·광고', description: '같은 내용 반복, 홍보·광고' },
    { value: 'SPOILER', label: '스포일러', description: '스포일러 표시 없이 줄거리·결말을 공개' },
    { value: 'INAPPROPRIATE', label: '부적절한 내용', description: '선정적·폭력적이거나 불쾌한 내용' },
    { value: 'OTHER', label: '기타', description: '위 항목에 해당하지 않는 사유' },
  ],
  USER: [
    { value: 'ABUSE', label: '욕설·비방', description: '다른 사용자를 향한 공격' },
    { value: 'SPAM', label: '도배·광고', description: '반복 게시, 홍보 계정' },
    { value: 'INAPPROPRIATE', label: '부적절한 활동', description: '불쾌하거나 규칙에 어긋나는 활동' },
    { value: 'OTHER', label: '기타', description: '위 항목에 해당하지 않는 사유' },
  ],
  COMIC: [
    { value: 'CONTENT_ERROR', label: '작품 오류', description: '작품 정보·화면이 잘못 나와요' },
    { value: 'IMAGE_BROKEN', label: '이미지 누락 / 이미지 깨짐', description: '컷이 빠지거나 깨져 보여요' },
    { value: 'TYPO', label: '오탈자', description: '글자·대사에 오류가 있어요' },
    { value: 'EPISODE_ORDER', label: '회차 내용 또는 순서 오류', description: '다른 회차 내용이거나 순서가 뒤바뀌었어요' },
    { value: 'INAPPROPRIATE', label: '부적절한 콘텐츠', description: '연령 등급에 맞지 않거나 문제가 되는 내용' },
    { value: 'OTHER', label: '기타 문의', description: '그 밖의 문제' },
  ],
  EPISODE: [],
  POST: [],
  POST_COMMENT: [],
};
REASONS.EPISODE = REASONS.COMIC;
// 게시판 글·댓글: 댓글과 같은 사유 (스포일러 포함)
REASONS.POST = REASONS.COMMENT.map((r) => (r.value === 'SPOILER' ? { ...r, description: '스포일러 표시 없이 줄거리·결말을 공개' } : r));
REASONS.POST_COMMENT = REASONS.COMMENT;

const TYPE_LABEL = { COMIC: '작품', EPISODE: '회차', COMMENT: '댓글', USER: '사용자', POST: '게시글', POST_COMMENT: '댓글' } as const;

export default function ReportModal({ isOpen, onClose, targetType, targetId, targetName, context }: ReportModalProps) {
  const [selectedReason, setSelectedReason] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isContent = targetType === 'COMIC' || targetType === 'EPISODE';

  useEffect(() => {
    if (!file) { setPreview(''); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  if (!isOpen) return null;

  const reset = () => { setSelectedReason(''); setDescription(''); setFile(null); };
  const close = () => { reset(); onClose(); };

  const handleSubmit = async () => {
    if (!selectedReason) { alert('신고 사유를 선택해 주세요.'); return; }
    const token = localStorage.getItem('authToken');
    if (!token) { alert('로그인이 필요합니다.'); close(); return; }
    setIsSubmitting(true);
    try {
      const body = new FormData();
      body.append('type', targetType);
      body.append('targetId', targetId);
      body.append('reason', selectedReason);
      body.append('description', description);
      if (file) body.append('image', file);
      const response = await fetch(`${getApiUrl()}/report/submit`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body });
      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        alert(data.message || '신고가 접수되었습니다.');
        close();
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

  return (
    <div className="fixed inset-0 z-[1500] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={`${TYPE_LABEL[targetType]} 신고`}>
      <div className="flex max-h-[92dvh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl bg-white text-gray-950 shadow-2xl sm:rounded-2xl dark:bg-gray-800 dark:text-white">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-700">
          <h2 className="flex items-center gap-2 text-lg font-black"><AlertTriangle className="h-5 w-5 text-red-500" />{TYPE_LABEL[targetType]} 신고</h2>
          <button type="button" onClick={close} className="rounded p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700" aria-label="닫기"><X className="h-5 w-5" /></button>
        </div>

        <div className="space-y-4 overflow-y-auto px-5 py-4">
          {isContent ? (
            <dl className="grid grid-cols-[4.5rem_1fr] gap-y-1 rounded-lg bg-gray-50 p-3 text-sm dark:bg-gray-700/50" aria-label="신고 대상">
              <dt className="text-gray-500 dark:text-gray-400">작품명</dt><dd className="font-bold">{context?.comicTitle || targetName || '-'}</dd>
              {targetType === 'EPISODE' && (<><dt className="text-gray-500 dark:text-gray-400">회차</dt><dd className="font-bold">{context?.episodeLabel || '-'}</dd></>)}
              {selectedReason && (<><dt className="text-gray-500 dark:text-gray-400">신고 유형</dt><dd className="font-bold">{REASONS[targetType].find((r) => r.value === selectedReason)?.label}</dd></>)}
            </dl>
          ) : targetName ? (
            <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-600 dark:bg-gray-700/50 dark:text-gray-300"><span className="mb-1 block text-xs text-gray-400">신고 대상</span>{targetName}</p>
          ) : null}

          <fieldset>
            <legend className="mb-2 text-sm font-black">신고 유형</legend>
            <div className="space-y-1.5">
              {REASONS[targetType].map((reason) => (
                <label key={reason.value} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition ${selectedReason === reason.value ? 'border-red-500 bg-red-50 dark:bg-red-500/10' : 'border-gray-200 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700'}`}>
                  <input type="radio" name="report-reason" value={reason.value} checked={selectedReason === reason.value} onChange={(e) => setSelectedReason(e.target.value)} className="mt-0.5 accent-red-500" />
                  <span><span className="block text-sm font-bold">{reason.label}</span><span className="block text-xs text-gray-500 dark:text-gray-400">{reason.description}</span></span>
                </label>
              ))}
            </div>
          </fieldset>

          <label className="block">
            <span className="mb-1.5 block text-sm font-black">내용 {isContent ? '' : '(선택)'}</span>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} rows={4}
              placeholder={isContent ? '어느 부분이 어떻게 문제인지 적어 주세요. 예) 15번째 컷이 보이지 않아요' : '신고 내용을 자세히 적어 주세요'}
              className="w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-red-500 dark:border-gray-600 dark:bg-gray-700" />
          </label>

          {isContent && (
            <div>
              <span className="mb-1.5 block text-sm font-black">스크린샷 (선택, 1장)</span>
              {preview ? (
                <div className="relative inline-block">
                  <img src={preview} alt="첨부한 스크린샷" className="max-h-40 rounded-lg border border-gray-200 dark:border-gray-600" />
                  <button type="button" onClick={() => setFile(null)} className="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-white" aria-label="첨부 삭제"><X className="h-3.5 w-3.5" /></button>
                </div>
              ) : (
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 py-4 text-sm text-gray-500 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700">
                  <ImagePlus className="h-4 w-4" />이미지 첨부 (10MB 이하)
                  <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="sr-only"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f && f.size > 10 * 1024 * 1024) { alert('10MB 이하 이미지만 첨부할 수 있어요.'); return; } setFile(f || null); }} />
                </label>
              )}
            </div>
          )}

          <p className="text-xs text-gray-500 dark:text-gray-400">허위 신고는 제재될 수 있어요. 접수된 신고는 운영팀이 확인 후 처리합니다.</p>
        </div>

        <div className="flex gap-2 border-t border-gray-200 px-5 py-4 dark:border-gray-700">
          <button type="button" onClick={close} className="flex-1 rounded-xl bg-gray-100 py-3 text-sm font-black dark:bg-gray-700">취소</button>
          <button type="button" onClick={() => void handleSubmit()} disabled={isSubmitting || !selectedReason} className="flex-1 rounded-xl bg-red-600 py-3 text-sm font-black text-white disabled:opacity-40">{isSubmitting ? '접수 중...' : '신고하기'}</button>
        </div>
      </div>
    </div>
  );
}
