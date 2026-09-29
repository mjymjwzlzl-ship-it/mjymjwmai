'use client'

import React, { useState } from 'react';
import { X, Coins, AlertCircle } from 'lucide-react';

interface CoinPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  episodeTitle: string;
  episodeNumber: number;
  coinPrice: number;
  userCoinBalance: number;
  webtoonTitle: string;
}

export default function CoinPurchaseModal({
  isOpen,
  onClose,
  onConfirm,
  episodeTitle,
  episodeNumber,
  coinPrice,
  userCoinBalance,
  webtoonTitle
}: CoinPurchaseModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const hasEnoughCoins = userCoinBalance >= coinPrice;

  const handleConfirm = async () => {
    if (!hasEnoughCoins) return;
    
    setIsProcessing(true);
    try {
      await onConfirm();
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 배경 오버레이 */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* 모달 컨텐츠 */}
      <div className="relative bg-gray-900 rounded-2xl p-6 m-4 max-w-md w-full shadow-xl border border-gray-800">
        {/* 닫기 버튼 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* 아이콘 */}
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center">
            <Coins className="w-8 h-8 text-yellow-500" />
          </div>
        </div>

        {/* 제목 */}
        <h2 className="text-xl font-bold text-white text-center mb-2">
          에피소드 구매
        </h2>

        {/* 에피소드 정보 */}
        <div className="bg-gray-800 rounded-lg p-4 mb-4">
          <p className="text-gray-300 text-sm mb-1">{webtoonTitle}</p>
          <p className="text-white font-medium">
            {episodeNumber}화: {episodeTitle}
          </p>
        </div>

        {/* 코인 정보 */}
        <div className="space-y-3 mb-6">
          <div className="flex justify-between items-center">
            <span className="text-gray-400">필요 코인</span>
            <span className="text-yellow-500 font-bold flex items-center">
              <Coins className="w-4 h-4 mr-1" />
              {coinPrice} 코인
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-gray-400">보유 코인</span>
            <span className={`font-bold flex items-center ${hasEnoughCoins ? 'text-white' : 'text-red-500'}`}>
              <Coins className="w-4 h-4 mr-1" />
              {userCoinBalance.toLocaleString()} 코인
            </span>
          </div>

          <div className="border-t border-gray-700 pt-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">구매 후 잔액</span>
              <span className={`font-bold flex items-center ${hasEnoughCoins ? 'text-green-500' : 'text-red-500'}`}>
                <Coins className="w-4 h-4 mr-1" />
                {hasEnoughCoins ? (userCoinBalance - coinPrice).toLocaleString() : '부족'} 코인
              </span>
            </div>
          </div>
        </div>

        {/* 경고 메시지 */}
        {!hasEnoughCoins && (
          <div className="bg-red-900/20 border border-red-800 rounded-lg p-3 mb-4">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
              <div>
                <p className="text-red-400 text-sm font-medium">코인이 부족합니다</p>
                <p className="text-red-400/80 text-xs mt-1">
                  {coinPrice - userCoinBalance}코인이 더 필요합니다.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 안내 메시지 */}
        <p className="text-gray-500 text-xs text-center mb-6">
          구매한 에피소드는 영구적으로 이용할 수 있습니다
        </p>

        {/* 버튼 */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium py-3 rounded-lg transition-colors"
            disabled={isProcessing}
          >
            취소
          </button>
          
          {hasEnoughCoins ? (
            <button
              onClick={handleConfirm}
              disabled={isProcessing}
              className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-90 text-white font-medium py-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <span className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  구매 중...
                </span>
              ) : (
                '구매하기'
              )}
            </button>
          ) : (
            <button
              onClick={() => {
                onClose();
                window.location.href = '/coin';
              }}
              className="flex-1 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-medium py-3 rounded-lg transition-all"
            >
              코인 충전하기
            </button>
          )}
        </div>
      </div>
    </div>
  );
}