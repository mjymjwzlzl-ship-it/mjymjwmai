'use client';

import PaymentsTable from '@/components/PaymentsTable';

// 결제 관리 > 환불 관리: 환불·취소된 결제와 사유. 완료된 결제의 환불 기록은 [결제 내역]에서 [환불 기록]
export default function RefundsPage() {
  return (
    <div className="min-h-screen bg-gray-900 p-6 text-white">
      <div className="mx-auto max-w-7xl">
        <h1 className="text-2xl font-bold">환불 관리</h1>
        <p className="mt-1 text-sm text-gray-400">환불·취소된 결제입니다. 상태를 [완료]로 바꾸면 환불할 결제를 찾아 [환불 기록]으로 금액·사유를 남기고 충전 코인을 회수할 수 있습니다. 카드 결제 취소 자체는 이니시스 상점관리자에서 처리합니다.</p>
        <PaymentsTable mode="refunds" />
      </div>
    </div>
  );
}
