'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, CreditCard, CheckCircle, XCircle, Clock, DollarSign, Calendar, Hash } from 'lucide-react';

interface Payment {
  id: string;
  merchantUid: string;
  impUid: string;
  amount: number;
  coinAmount: number;
  bonusCoins: number;
  payMethod: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'REFUNDED';
  pgProvider: string;
  pgTid: string;
  failReason?: string;
  refundAmount?: number;
  refundReason?: string;
  refundedAt?: string;
  createdAt: string;
  completedAt?: string;
  user: {
    email: string;
    username: string;
    nickname: string;
  };
}

interface UserInfo {
  id: string;
  email: string;
  username: string;
  nickname: string;
  coinBalance: number;
  status: string;
}

export default function UserPaymentHistoryPage() {
  const params = useParams();
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'completed' | 'failed' | 'refunded'>('all');
  const [totalAmount, setTotalAmount] = useState(0);
  const [totalCoins, setTotalCoins] = useState(0);

  useEffect(() => {
    fetchUserData();
    fetchPaymentHistory();
  }, [params.id]);

  const fetchUserData = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`http://localhost:8000/api/admin/users/${params.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUser(data);
      }
    } catch (error) {
      console.error('사용자 정보 조회 실패:', error);
    }
  };

  const fetchPaymentHistory = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`http://localhost:8000/api/admin/users/${params.id}/payments`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setPayments(data.payments || []);
        
        // 총 결제 금액 및 코인 계산
        const completed = data.payments?.filter((p: Payment) => p.status === 'COMPLETED') || [];
        const totalAmt = completed.reduce((sum: number, p: Payment) => sum + p.amount, 0);
        const totalCns = completed.reduce((sum: number, p: Payment) => sum + p.coinAmount + p.bonusCoins, 0);
        setTotalAmount(totalAmt);
        setTotalCoins(totalCns);
      }
    } catch (error) {
      console.error('결제 내역 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefund = async (paymentId: string) => {
    const reason = prompt('환불 사유를 입력해주세요:');
    if (!reason) return;

    if (!confirm('정말로 이 결제를 환불하시겠습니까?')) return;

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`http://localhost:8000/api/admin/payments/${paymentId}/refund`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason })
      });

      if (response.ok) {
        alert('환불이 완료되었습니다.');
        fetchPaymentHistory();
        fetchUserData();
      } else {
        const error = await response.json();
        alert(`환불 실패: ${error.message}`);
      }
    } catch (error) {
      console.error('환불 처리 실패:', error);
      alert('환불 처리 중 오류가 발생했습니다.');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            완료
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
            <XCircle className="w-3 h-3 mr-1" />
            실패
          </span>
        );
      case 'REFUNDED':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
            <XCircle className="w-3 h-3 mr-1" />
            환불
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
            <Clock className="w-3 h-3 mr-1" />
            대기
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
            {status}
          </span>
        );
    }
  };

  const getPayMethodName = (method: string) => {
    const methods: { [key: string]: string } = {
      'card': '신용카드',
      'trans': '실시간계좌이체',
      'vbank': '가상계좌',
      'phone': '휴대폰',
      'kakaopay': '카카오페이',
      'naverpay': '네이버페이',
      'tosspay': '토스페이'
    };
    return methods[method] || method;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredPayments = payments.filter(payment => {
    if (filter === 'all') return true;
    if (filter === 'completed') return payment.status === 'COMPLETED';
    if (filter === 'failed') return payment.status === 'FAILED';
    if (filter === 'refunded') return payment.status === 'REFUNDED';
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto p-6">
        {/* 헤더 */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            돌아가기
          </button>
          
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            결제 내역 - {user?.nickname || user?.username}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {user?.email} | 현재 코인: {user?.coinBalance?.toLocaleString() || 0}
          </p>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <DollarSign className="w-10 h-10 text-green-500 mr-4" />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">총 결제 금액</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  ₩{totalAmount.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <CreditCard className="w-10 h-10 text-blue-500 mr-4" />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">총 구매 코인</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {totalCoins.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <Hash className="w-10 h-10 text-purple-500 mr-4" />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">총 결제 횟수</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {payments.filter(p => p.status === 'COMPLETED').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 필터 탭 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-6">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex -mb-px">
              <button
                onClick={() => setFilter('all')}
                className={`px-6 py-3 text-sm font-medium ${
                  filter === 'all'
                    ? 'border-b-2 border-purple-600 text-purple-600'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                전체 ({payments.length})
              </button>
              <button
                onClick={() => setFilter('completed')}
                className={`px-6 py-3 text-sm font-medium ${
                  filter === 'completed'
                    ? 'border-b-2 border-purple-600 text-purple-600'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                완료 ({payments.filter(p => p.status === 'COMPLETED').length})
              </button>
              <button
                onClick={() => setFilter('failed')}
                className={`px-6 py-3 text-sm font-medium ${
                  filter === 'failed'
                    ? 'border-b-2 border-purple-600 text-purple-600'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                실패 ({payments.filter(p => p.status === 'FAILED').length})
              </button>
              <button
                onClick={() => setFilter('refunded')}
                className={`px-6 py-3 text-sm font-medium ${
                  filter === 'refunded'
                    ? 'border-b-2 border-purple-600 text-purple-600'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                환불 ({payments.filter(p => p.status === 'REFUNDED').length})
              </button>
            </nav>
          </div>
        </div>

        {/* 결제 내역 리스트 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              결제 내역
            </h2>
            
            {filteredPayments.length === 0 ? (
              <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                결제 내역이 없습니다.
              </p>
            ) : (
              <div className="space-y-4">
                {filteredPayments.map((payment) => (
                  <div key={payment.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          {getStatusBadge(payment.status)}
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {formatDate(payment.createdAt)}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">주문번호:</span>
                            <p className="font-mono text-gray-900 dark:text-white">{payment.merchantUid}</p>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">결제수단:</span>
                            <p className="text-gray-900 dark:text-white">{getPayMethodName(payment.payMethod)}</p>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">결제금액:</span>
                            <p className="font-bold text-gray-900 dark:text-white">₩{payment.amount.toLocaleString()}</p>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">코인:</span>
                            <p className="text-gray-900 dark:text-white">
                              {payment.coinAmount.toLocaleString()}
                              {payment.bonusCoins > 0 && (
                                <span className="text-green-600 dark:text-green-400 ml-1">
                                  (+{payment.bonusCoins})
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                        
                        {payment.pgTid && (
                          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                            PG거래번호: {payment.pgTid}
                          </div>
                        )}
                        
                        {payment.failReason && (
                          <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded text-sm text-red-600 dark:text-red-400">
                            실패 사유: {payment.failReason}
                          </div>
                        )}
                        
                        {payment.refundReason && (
                          <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-700 rounded text-sm">
                            <p className="text-gray-600 dark:text-gray-400">
                              환불 사유: {payment.refundReason}
                            </p>
                            {payment.refundedAt && (
                              <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">
                                환불일시: {formatDate(payment.refundedAt)}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                      
                      <div className="ml-4">
                        {payment.status === 'COMPLETED' && (
                          <button
                            onClick={() => handleRefund(payment.id)}
                            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors"
                          >
                            환불
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}