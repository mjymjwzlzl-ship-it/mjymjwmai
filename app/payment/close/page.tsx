'use client'

import { useEffect } from 'react';

export default function PaymentClosePage() {
  useEffect(() => {
    // 부모 창에 결제 취소 메시지 전달
    if (window.opener) {
      window.opener.postMessage({ 
        type: 'payment-closed',
        message: '결제창이 닫혔습니다'
      }, '*');
    }
    
    // 창 닫기
    setTimeout(() => {
      window.close();
    }, 100);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <p>결제창을 닫는 중...</p>
      </div>
    </div>
  );
}