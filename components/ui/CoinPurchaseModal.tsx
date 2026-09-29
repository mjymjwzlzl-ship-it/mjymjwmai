'use client'

import React, { useEffect, useState } from 'react';
import { X, Coins, AlertCircle, Clock, BookmarkCheck } from 'lucide-react';

export type PurchaseMode = 'RENT' | 'OWN';

interface CoinPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (mode: PurchaseMode) => void | Promise<void>;
  episodeTitle: string;
  episodeNumber: number;
  /** 소장 가격 (예전 호출과 호환: coinPrice 만 주면 소장만 표시) */
  coinPrice: number;
  userCoinBalance: number;
  webtoonTitle: string;
  rentPrice?: number;
  rentalDays?: number;
  rentalEnabled?: boolean;
  /** 이미 대여 중이면 소장 전환만 */
  currentlyRented?: boolean;
  /** 할인 전 가격 (프로모션 중일 때만) */
  originalOwnPrice?: number;
  originalRentPrice?: number;
  promotionLabel?: string;
}

export default function CoinPurchaseModal({
  isOpen,
  onClose,
  onConfirm,
  episodeTitle,
  episodeNumber,
  coinPrice,
  userCoinBalance,
  webtoonTitle,
  rentPrice,
  rentalDays = 3,
  rentalEnabled = false,
  currentlyRented = false,
  originalOwnPrice,
  originalRentPrice,
  promotionLabel,
}: CoinPurchaseModalProps) {
  // 무료 대여 프로모션이면 대여가가 0
  const canRent = rentalEnabled && typeof rentPrice === 'number' && rentPrice >= 0 && !currentlyRented;
  const [mode, setMode] = useState<PurchaseMode>(canRent ? 'RENT' : 'OWN');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (isOpen) setMode(canRent ? 'RENT' : 'OWN');
  }, [isOpen, canRent]);

  if (!isOpen) return null;

  const price = mode === 'RENT' && canRent ? (rentPrice as number) : coinPrice;
  const hasEnoughCoins = userCoinBalance >= price;

  const handleConfirm = async () => {
    if (!hasEnoughCoins || isProcessing) return;
    setIsProcessing(true);
    try {
      await onConfirm(mode);
    } finally {
      setIsProcessing(false);
    }
  };

  const option = (value: PurchaseMode, title: string, sub: string, amount: number, Icon: typeof Clock, original?: number) => {
    const selected = mode === value;
    const affordable = userCoinBalance >= amount;
    return (
      <button
        type="button"
        onClick={() => setMode(value)}
        aria-pressed={selected}
        className={`flex w-full items-center justify-between rounded-xl border-2 px-4 py-3 text-left transition ${
          selected ? 'border-[#00dc64] bg-[#00dc64]/10' : 'border-gray-700 hover:border-gray-500'
        }`}
      >
        <span className="flex items-center gap-3">
          <Icon className={`h-5 w-5 ${selected ? 'text-[#00dc64]' : 'text-gray-400'}`} />
          <span>
            <span className="block font-bold text-white">{title}</span>
            <span className="block text-xs text-gray-400">{sub}</span>
          </span>
        </span>
        <span className={`flex items-center gap-1 font-black ${affordable ? 'text-yellow-400' : 'text-red-400'}`}>
          {typeof original === 'number' && original > amount && <span className="text-xs font-bold text-gray-500 line-through">{original}</span>}
          {amount === 0 ? '무료' : <><Coins className="h-4 w-4" />{amount}</>}
        </span>
      </button>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true" aria-label="회차 구매">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative mx-4 w-full max-w-md rounded-2xl border border-gray-800 bg-gray-900 p-6">
        <button onClick={onClose} className="absolute right-4 top-4 text-gray-400 transition-colors hover:text-white" aria-label="닫기">
          <X className="h-6 w-6" />
        </button>

        <div className="mb-5 text-center">
          <p className="text-sm text-gray-400">{webtoonTitle}</p>
          <h2 className="mt-1 text-xl font-bold text-white">
            {episodeNumber}화{episodeTitle ? ` · ${episodeTitle}` : ''}
          </h2>
          <p className="mt-1 text-sm text-gray-400">{currentlyRented ? '대여 중인 회차를 소장으로 바꿀 수 있어요' : '이 회차는 유료입니다'}</p>
          {promotionLabel && <p className="mt-2 inline-block rounded bg-red-500/15 px-2 py-0.5 text-xs font-black text-red-400">{promotionLabel}</p>}
        </div>

        <div className="space-y-2">
          {canRent && option('RENT', '대여', `${rentalDays}일 동안 볼 수 있어요`, rentPrice as number, Clock, originalRentPrice)}
          {option('OWN', '소장', '기간 제한 없이 계속 볼 수 있어요', coinPrice, BookmarkCheck, originalOwnPrice)}
        </div>

        <div className="mt-4 space-y-1.5 rounded-lg bg-gray-800 p-3 text-sm">
          <div className="flex justify-between text-gray-300">
            <span>보유 코인</span>
            <span className="font-bold text-white">{userCoinBalance.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-gray-300">
            <span>결제 후 잔액</span>
            <span className={`font-bold ${hasEnoughCoins ? 'text-[#00dc64]' : 'text-red-400'}`}>
              {hasEnoughCoins ? (userCoinBalance - price).toLocaleString() : '부족'}
            </span>
          </div>
        </div>

        {!hasEnoughCoins && (
          <p className="mt-3 flex items-center gap-1.5 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            코인이 {price - userCoinBalance}개 부족합니다. 충전 후 이용해 주세요.
          </p>
        )}

        <div className="mt-5 flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-lg bg-gray-800 py-3 font-bold text-white transition-colors hover:bg-gray-700">
            취소
          </button>
          {hasEnoughCoins ? (
            <button
              onClick={handleConfirm}
              disabled={isProcessing}
              className="flex-1 rounded-lg bg-[#00dc64] py-3 font-black text-black transition hover:brightness-95 disabled:opacity-60"
            >
              {isProcessing ? '처리 중...' : price === 0 ? `무료로 ${mode === 'RENT' ? '대여' : '소장'}` : `${price}코인으로 ${mode === 'RENT' ? '대여' : '소장'}`}
            </button>
          ) : (
            <button
              onClick={() => { window.location.href = '/coin'; }}
              className="flex-1 rounded-lg bg-yellow-400 py-3 font-black text-black transition hover:brightness-95"
            >
              코인 충전하기
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
