'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Coins, TrendingUp, TrendingDown, CreditCard, ShoppingCart, Gift, RefreshCw } from 'lucide-react';

interface Transaction {
  id: string;
  type: 'CHARGE' | 'PURCHASE' | 'REWARD' | 'REFUND';
  amount: number;
  balance: number;
  description: string;
  createdAt: string;
  payment?: {
    amount: number;
    payMethod: string;
    merchantUid: string;
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

export default function UserCoinManagementPage() {
  const params = useParams();
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [adjustAmount, setAdjustAmount] = useState<string>('');
  const [adjustReason, setAdjustReason] = useState<string>('');
  const [adjustType, setAdjustType] = useState<'add' | 'subtract'>('add');

  useEffect(() => {
    fetchUserData();
    fetchTransactions();
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

  const fetchTransactions = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`http://localhost:8000/api/admin/users/${params.id}/transactions`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setTransactions(data.transactions || []);
      }
    } catch (error) {
      console.error('거래 내역 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCoinAdjustment = async () => {
    if (!adjustAmount || !adjustReason) {
      alert('금액과 사유를 입력해주세요.');
      return;
    }

    const amount = parseInt(adjustAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('올바른 금액을 입력해주세요.');
      return;
    }

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`http://localhost:8000/api/admin/users/${params.id}/adjust-coins`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: adjustType === 'add' ? amount : -amount,
          reason: adjustReason,
          type: adjustType === 'add' ? 'REWARD' : 'REFUND'
        })
      });

      if (response.ok) {
        alert(`코인 ${adjustType === 'add' ? '지급' : '차감'}이 완료되었습니다.`);
        setAdjustAmount('');
        setAdjustReason('');
        fetchUserData();
        fetchTransactions();
      } else {
        alert('코인 조정에 실패했습니다.');
      }
    } catch (error) {
      console.error('코인 조정 실패:', error);
      alert('코인 조정 중 오류가 발생했습니다.');
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'CHARGE':
        return <CreditCard className="w-5 h-5 text-green-500" />;
      case 'PURCHASE':
        return <ShoppingCart className="w-5 h-5 text-red-500" />;
      case 'REWARD':
        return <Gift className="w-5 h-5 text-yellow-500" />;
      case 'REFUND':
        return <RefreshCw className="w-5 h-5 text-blue-500" />;
      default:
        return <Coins className="w-5 h-5 text-gray-500" />;
    }
  };

  const getTransactionTypeName = (type: string) => {
    switch (type) {
      case 'CHARGE':
        return '충전';
      case 'PURCHASE':
        return '구매';
      case 'REWARD':
        return '보상/지급';
      case 'REFUND':
        return '환불/차감';
      default:
        return type;
    }
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
            코인 관리 - {user?.nickname || user?.username}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {user?.email} | 상태: {user?.status}
          </p>
        </div>

        {/* 현재 잔액 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">현재 코인 잔액</p>
              <div className="flex items-center mt-2">
                <Coins className="w-8 h-8 text-yellow-500 mr-3" />
                <span className="text-3xl font-bold text-gray-900 dark:text-white">
                  {user?.coinBalance?.toLocaleString() || 0}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 코인 조정 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            코인 조정 (관리자 권한)
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                조정 타입
              </label>
              <select
                value={adjustType}
                onChange={(e) => setAdjustType(e.target.value as 'add' | 'subtract')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="add">지급 (추가)</option>
                <option value="subtract">차감 (환불)</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                코인 수량
              </label>
              <input
                type="number"
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(e.target.value)}
                placeholder="조정할 코인 수량"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                min="1"
              />
            </div>
          </div>
          
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              조정 사유
            </label>
            <textarea
              value={adjustReason}
              onChange={(e) => setAdjustReason(e.target.value)}
              placeholder="코인 조정 사유를 입력하세요 (예: 고객 클레임 보상, 이벤트 지급 등)"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              rows={3}
            />
          </div>
          
          <button
            onClick={handleCoinAdjustment}
            className={`mt-4 px-6 py-2 rounded-lg font-medium text-white transition-colors ${
              adjustType === 'add' 
                ? 'bg-green-600 hover:bg-green-700' 
                : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {adjustType === 'add' ? '코인 지급' : '코인 차감'}
          </button>
        </div>

        {/* 거래 내역 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            거래 내역
          </h2>
          
          {transactions.length === 0 ? (
            <p className="text-center text-gray-500 dark:text-gray-400 py-8">
              거래 내역이 없습니다.
            </p>
          ) : (
            <div className="space-y-3">
              {transactions.map((transaction) => (
                <div key={transaction.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {getTransactionIcon(transaction.type)}
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {transaction.description}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {formatDate(transaction.createdAt)} | {getTransactionTypeName(transaction.type)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-bold text-lg ${
                        transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {transaction.amount > 0 ? '+' : ''}{transaction.amount.toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        잔액: {transaction.balance.toLocaleString()}
                      </div>
                    </div>
                  </div>
                  
                  {transaction.payment && (
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                        <span>결제 금액: ₩{transaction.payment.amount.toLocaleString()}</span>
                        <span>결제 수단: {transaction.payment.payMethod}</span>
                        <span>주문번호: {transaction.payment.merchantUid}</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}