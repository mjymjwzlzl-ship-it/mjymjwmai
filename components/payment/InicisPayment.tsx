'use client';

import { useEffect, useState, useRef } from 'react';
import Script from 'next/script';

interface InicisPaymentProps {
  isOpen: boolean;
  onClose: () => void;
  paymentData: {
    mid: string; // 상점ID (테스트: INIpayTest)
    oid: string; // 주문번호
    price: number; // 결제금액
    goodName: string; // 상품명
    buyerName: string; // 구매자명
    buyerEmail: string; // 구매자 이메일
    buyerTel: string; // 구매자 전화번호
    returnUrl: string; // 결제 결과 수신 URL
    timestamp: string;
    signature: string;
    verification: string;
    mKey: string;
    use_chkfake: string;
  };
  onPaymentComplete: (result: any) => void;
  onPaymentFail: (error: any) => void;
}

declare global {
  interface Window {
    INIStdPay: any;
  }
}

export default function InicisPayment({
  isOpen,
  onClose,
  paymentData,
  onPaymentComplete,
  onPaymentFail
}: InicisPaymentProps) {
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // 이니시스 결제 실행 (샘플 코드 방식)
  const initiatePayment = () => {
    if (!isScriptLoaded || !window.INIStdPay) {
      console.error('이니시스 스크립트가 로드되지 않았습니다.');
      return;
    }

    console.log('📋 이니시스 결제 요청:', paymentData);

    try {
      // INIStdPay.pay() 메서드로 결제창 호출
      window.INIStdPay.pay('InicisPaymentForm');
      console.log('✅ 이니시스 결제창 호출');
    } catch (error) {
      console.error('이니시스 결제 호출 실패:', error);
      onPaymentFail(error);
    }
  };

  // 결제창이 열릴 때 결제 시작
  useEffect(() => {
    if (isOpen && isScriptLoaded) {
      setTimeout(initiatePayment, 100); // DOM 렌더링 후 실행
    }
  }, [isOpen, isScriptLoaded]);

  return (
    <>
      {/* 이니시스 JavaScript 라이브러리 로드 (테스트용) */}
      <Script
        src="https://stgstdpay.inicis.com/stdjs/INIStdPay.js"
        onLoad={() => {
          console.log('✅ 이니시스 스크립트 로드 완료');
          setIsScriptLoaded(true);
        }}
        onError={() => {
          console.error('❌ 이니시스 스크립트 로드 실패');
        }}
      />

      {/* 결제 폼 (hidden) */}
      {isOpen && (
        <form 
          ref={formRef}
          id="InicisPaymentForm" 
          name="InicisPaymentForm" 
          method="post" 
          style={{ display: 'none' }}
        >
          <input type="hidden" name="version" value="1.0" />
          <input type="hidden" name="gopaymethod" value="Card:DirectBank:VBank:HPP" />
          <input type="hidden" name="mid" value={paymentData.mid} />
          <input type="hidden" name="oid" value={paymentData.oid} />
          <input type="hidden" name="price" value={paymentData.price.toString()} />
          <input type="hidden" name="timestamp" value={paymentData.timestamp} />
          <input type="hidden" name="use_chkfake" value={paymentData.use_chkfake} />
          <input type="hidden" name="signature" value={paymentData.signature} />
          <input type="hidden" name="verification" value={paymentData.verification} />
          <input type="hidden" name="mKey" value={paymentData.mKey} />
          <input type="hidden" name="currency" value="WON" />
          <input type="hidden" name="goodname" value={paymentData.goodName} />
          <input type="hidden" name="buyername" value={paymentData.buyerName} />
          <input type="hidden" name="buyertel" value={paymentData.buyerTel || '01012345678'} />
          <input type="hidden" name="buyeremail" value={paymentData.buyerEmail} />
          <input type="hidden" name="returnUrl" value={paymentData.returnUrl} />
          <input type="hidden" name="closeUrl" value={`${window.location.origin}/payment/cancel`} />
          <input type="hidden" name="acceptmethod" value="HPP(1):va_receipt:below1000:centerCd(Y)" />
        </form>
      )}

      {/* 로딩 표시 */}
      {isOpen && !isScriptLoaded && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-700 dark:text-gray-300">이니시스 결제 시스템 로딩 중...</p>
          </div>
        </div>
      )}
    </>
  );
}