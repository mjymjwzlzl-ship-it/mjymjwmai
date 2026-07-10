'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Coins, ShoppingCart, CreditCard, TrendingUp, TrendingDown } from 'lucide-react'
import { api } from '@/lib/api'

interface Transaction {
  id: string
  type: 'CHARGE' | 'PURCHASE' | 'REWARD' | 'REFUND'
  amount: number
  balance: number
  description: string
  createdAt: string
  payment?: {
    amount: number
    payMethod: string
  }
}

export default function CoinHistoryPage() {
  const router = useRouter()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [currentBalance, setCurrentBalance] = useState(0)

  useEffect(() => {
    loadTransactionHistory()
  }, [])

  const loadTransactionHistory = async () => {
    try {
      const response = await api.get('/payment/history')
      setTransactions(response.data.transactions || [])
      setCurrentBalance(response.data.currentBalance || 0)
    } catch (error) {
      console.error('거래 내역 로드 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'CHARGE':
        return <CreditCard className="w-5 h-5 text-green-500" />
      case 'PURCHASE':
        return <ShoppingCart className="w-5 h-5 text-red-500" />
      case 'REWARD':
        return <Coins className="w-5 h-5 text-yellow-500" />
      case 'REFUND':
        return <TrendingUp className="w-5 h-5 text-blue-500" />
      default:
        return <Coins className="w-5 h-5 text-gray-500" />
    }
  }

  const getTransactionTypeName = (type: string) => {
    switch (type) {
      case 'CHARGE':
        return '충전'
      case 'PURCHASE':
        return '구매'
      case 'REWARD':
        return '보상'
      case 'REFUND':
        return '환불'
      default:
        return type
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* 헤더 */}
      <header className="sticky top-0 z-10 bg-gray-900/95 backdrop-blur-sm border-b border-gray-800">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-center h-16">
            <button 
              onClick={() => router.back()}
              className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors mr-6"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>뒤로</span>
            </button>
            <h1 className="text-xl font-bold">코인 사용 내역</h1>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* 현재 잔액 */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-sm mb-1">현재 보유 코인</p>
              <div className="flex items-center space-x-2">
                <Coins className="w-8 h-8 text-yellow-300" />
                <span className="text-3xl font-bold">{currentBalance.toLocaleString()}</span>
              </div>
            </div>
            <button
              onClick={() => router.push('/coin')}
              className="bg-white/20 hover:bg-white/30 backdrop-blur-sm px-4 py-2 rounded-lg transition-colors"
            >
              충전하기
            </button>
          </div>
        </div>

        {/* 거래 내역 */}
        <div className="space-y-2">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3E7A5A] mx-auto"></div>
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Coins className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>아직 거래 내역이 없습니다</p>
            </div>
          ) : (
            transactions.map((transaction) => (
              <div key={transaction.id} className="bg-gray-800 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getTransactionIcon(transaction.type)}
                    <div>
                      <div className="font-medium">
                        {transaction.description}
                      </div>
                      <div className="text-sm text-gray-400">
                        {formatDate(transaction.createdAt)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-bold text-lg ${
                      transaction.amount > 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {transaction.amount > 0 ? '+' : ''}{transaction.amount.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-400">
                      잔액: {transaction.balance.toLocaleString()}
                    </div>
                  </div>
                </div>
                {transaction.payment && (
                  <div className="mt-2 pt-2 border-t border-gray-700">
                    <div className="flex items-center justify-between text-sm text-gray-400">
                      <span>결제 금액: ₩{transaction.payment.amount.toLocaleString()}</span>
                      <span>{transaction.payment.payMethod}</span>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}