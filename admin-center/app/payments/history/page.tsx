'use client';

import PaymentsTable from '@/components/PaymentsTable';

// 결제 관리 > 결제 내역 (코인 충전 결제). 회차 구매·대여는 [구매·대여 내역]
export default function PaymentHistoryPage() {
  return (
    <div className="min-h-screen bg-gray-900 p-6 text-white">
      <div className="mx-auto max-w-7xl">
        <h1 className="text-2xl font-bold">결제 내역</h1>
        <p className="mt-1 text-sm text-gray-400">코인 충전 결제(원화)입니다. 회원 이름을 누르면 그 회원의 결제·코인 내역으로 갑니다. 회차를 코인으로 산 기록은 [구매·대여 내역]에 있습니다.</p>
        <PaymentsTable mode="history" />
      </div>
    </div>
  );
}
