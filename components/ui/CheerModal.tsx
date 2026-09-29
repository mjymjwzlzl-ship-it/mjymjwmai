'use client';

import { useEffect, useState } from 'react';
import { Heart, X } from 'lucide-react';
import { api } from '@/lib/api';
import { useLoginModalStore } from '@/store/loginModal';

const QUICK_AMOUNTS = [10, 50, 100, 500];

interface CheerModalProps {
  open: boolean;
  onClose: () => void;
  comicId: string;
  comicTitle: string;
  onSuccess?: () => void;
}

export default function CheerModal({ open, onClose, comicId, comicTitle, onSuccess }: CheerModalProps) {
  const setLoginModalOpen = useLoginModalStore((state) => state.setOpen);
  const [amount, setAmount] = useState(10);
  const [message, setMessage] = useState('');
  const [coinBalance, setCoinBalance] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!open) return;

    setError('');
    setDone('');

    const token = localStorage.getItem('authToken') || localStorage.getItem('token');
    if (!token) {
      setCoinBalance(null);
      return;
    }

    api
      .get('/users/me')
      .then((response) => setCoinBalance(Number(response.data?.coinBalance ?? 0)))
      .catch(() => setCoinBalance(null));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const handleSubmit = async () => {
    const token = localStorage.getItem('authToken') || localStorage.getItem('token');
    if (!token) {
      onClose();
      setLoginModalOpen(true);
      return;
    }

    if (!Number.isFinite(amount) || amount < 1) {
      setError('응원 코인은 1개 이상 입력해주세요.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await api.post(`/cheer/${comicId}`, { amount, message });
      setDone(response.data?.message || '응원이 전달되었습니다!');
      setCoinBalance(Number(response.data?.coinBalance ?? 0));
      setMessage('');
      window.dispatchEvent(new CustomEvent('coinBalanceUpdated', { detail: response.data?.coinBalance }));
      onSuccess?.();
    } catch (err: any) {
      setError(err.response?.data?.message || '응원 처리에 실패했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1300] flex items-center justify-center bg-black/45 px-4 py-6">
      <button
        type="button"
        aria-label="응원 팝업 닫기"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="작품 응원하기"
        className="relative w-full max-w-[380px] rounded-2xl bg-white p-6 shadow-2xl dark:bg-[#1b1b1b]"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-white/10 dark:hover:text-white"
          aria-label="닫기"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-1 flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#00dc64]/15">
            <Heart className="h-5 w-5 fill-[#00dc64] text-[#00dc64]" />
          </span>
          <h2 className="text-lg font-black text-gray-950 dark:text-white">작품 응원하기</h2>
        </div>
        <p className="mb-5 text-sm text-gray-500 dark:text-gray-400">
          <span className="font-bold text-gray-800 dark:text-gray-200">{comicTitle}</span>
          에 응원을 보내면 외전·시즌2 제작 우선순위에 반영돼요.
        </p>

        {done ? (
          <div className="rounded-xl bg-[#00dc64]/10 p-5 text-center">
            <p className="text-2xl">💚</p>
            <p className="mt-2 text-sm font-black text-[#00a84c] dark:text-[#00dc64]">{done}</p>
            {coinBalance !== null && (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">남은 코인 {coinBalance.toLocaleString()}개</p>
            )}
            <button
              type="button"
              onClick={onClose}
              className="mt-4 h-10 w-full rounded-xl bg-[#00dc64] text-sm font-black text-black transition hover:bg-[#00c85a]"
            >
              확인
            </button>
          </div>
        ) : (
          <>
            <div className="mb-3 flex flex-wrap gap-1.5">
              {QUICK_AMOUNTS.map((quick) => (
                <button
                  key={quick}
                  type="button"
                  onClick={() => setAmount(quick)}
                  className={`rounded-full border px-3.5 py-1.5 text-sm font-black transition ${
                    amount === quick
                      ? 'border-[#00dc64] bg-[#00dc64]/10 text-[#00a84c] dark:text-[#00dc64]'
                      : 'border-gray-200 text-gray-500 hover:border-[#00dc64] hover:text-[#00a84c] dark:border-gray-700 dark:text-gray-400 dark:hover:text-[#00dc64]'
                  }`}
                >
                  {quick.toLocaleString()}코인
                </button>
              ))}
            </div>

            <label className="mb-3 block">
              <span className="mb-1.5 block text-xs font-bold text-gray-500 dark:text-gray-400">원하는 만큼 직접 입력</span>
              <input
                type="number"
                min={1}
                value={Number.isFinite(amount) ? amount : ''}
                onChange={(event) => setAmount(Math.floor(Number(event.target.value)))}
                className="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm font-black text-gray-950 outline-none transition focus:border-[#00dc64] focus:ring-2 focus:ring-[#00dc64]/20 dark:border-gray-700 dark:bg-[#121212] dark:text-white"
                placeholder="응원할 코인 수"
              />
            </label>

            <input
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              maxLength={100}
              className="mb-3 h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-950 outline-none transition focus:border-[#00dc64] focus:ring-2 focus:ring-[#00dc64]/20 dark:border-gray-700 dark:bg-[#121212] dark:text-white"
              placeholder="응원 메시지 (선택, 100자 이내)"
            />

            {coinBalance !== null && (
              <p className="mb-2 text-right text-xs text-gray-500 dark:text-gray-400">
                내 코인 <span className="font-black text-[#00a84c] dark:text-[#00dc64]">{coinBalance.toLocaleString()}</span>개
              </p>
            )}

            {error && (
              <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-300">
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={isLoading}
              className="h-12 w-full rounded-xl bg-[#00dc64] font-black text-black shadow-lg shadow-green-500/15 transition hover:bg-[#00c85a] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? '응원 보내는 중...' : `${Number.isFinite(amount) && amount > 0 ? amount.toLocaleString() : 0}코인 응원하기`}
            </button>

            <p className="mt-3 text-center text-[11px] leading-relaxed text-gray-400">
              응원이 많은 작품은 외전 제작·시즌2가 우선 제작되고,
              <br />
              응원자는 에피소드 방향·표지 시안 투표에 참여할 수 있어요.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
