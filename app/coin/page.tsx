'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { eventBus, EVENTS } from '@/lib/events';
import InicisPayment from '@/components/payment/InicisPayment';

interface CoinPackage {
  id: string;
  coins: number;
  price: number;
  bonus: number;
  description: string;
  popular?: boolean;
  originalPrice?: number;
  firstTimeBonus?: boolean;
}

export default function CoinChargePage() {
  const router = useRouter();
  const [packages, setPackages] = useState<CoinPackage[]>([]);
  const [isFirstTime, setIsFirstTime] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userCoins, setUserCoins] = useState(0);
  const [selectedPackage, setSelectedPackage] = useState<CoinPackage | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentData, setPaymentData] = useState<any>(null);

  useEffect(() => {
    fetchPackages();
    fetchUserInfo();
    
    // 코인 잔액 업데이트 이벤트 리스너
    const handleCoinUpdate = (data: { coinBalance: number }) => {
      console.log('[CoinPage] 코인 업데이트 이벤트 수신:', data);
      setUserCoins(data.coinBalance);
    };
    
    eventBus.on(EVENTS.COIN_BALANCE_UPDATED, handleCoinUpdate);
    
    // localStorage 변경 감지
    const interval = setInterval(() => {
      const userData = localStorage.getItem('user');
      if (userData) {
        try {
          const user = JSON.parse(userData);
          if (user.coinBalance !== undefined && user.coinBalance !== userCoins) {
            setUserCoins(user.coinBalance);
          }
        } catch (error) {
          console.error('user 데이터 파싱 실패:', error);
        }
      }
    }, 500);
    
    return () => {
      eventBus.off(EVENTS.COIN_BALANCE_UPDATED, handleCoinUpdate);
      clearInterval(interval);
    };
  }, []);

  const fetchPackages = async () => {
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const response = await api.get('/payment/coin-packages', {
        params: { first_time_bonus: 'true' },
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setPackages(response.data.packages);
      setIsFirstTime(response.data.isFirstTimeBonus || false);
    } catch (error) {
      console.error('패키지 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserInfo = async () => {
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      if (!token) return;
      
      const response = await api.get('/users/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const coinBalance = response.data.coinBalance || response.data.coins || 0;
      setUserCoins(coinBalance);
      
      // localStorage 업데이트
      const userData = localStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        user.coinBalance = coinBalance;
        localStorage.setItem('user', JSON.stringify(user));
      }
    } catch (error) {
      console.error('사용자 정보 로드 실패:', error);
      
      // API 실패 시 localStorage에서 가져오기
      const userData = localStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        if (user.coinBalance !== undefined) {
          setUserCoins(user.coinBalance);
        }
      }
    }
  };

  const handlePurchase = async (pkg: CoinPackage) => {
    const token = localStorage.getItem('authToken') || localStorage.getItem('token');
    if (!token) {
      alert('로그인이 필요합니다.');
      router.push('/login');
      return;
    }

    setSelectedPackage(pkg);
    
    try {
      // 사용자 정보 가져오기
      const userResponse = await api.get('/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });

      const user = userResponse.data.user;
      
      // 결제 초기화 API 호출
      const response = await api.post('/payment/init', {
        packageId: pkg.id,
        amount: pkg.price,
        coins: pkg.coins + pkg.bonus,
        firstTimeBonus: pkg.firstTimeBonus
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success && response.data.paymentUrl) {
        // 이니시스 결제 서버로 이동
        console.log('📋 이니시스 결제 서버로 이동:', response.data.paymentUrl);
        
        // 기존 결제창이 있으면 닫기
        if ((window as any).paymentWindow && !(window as any).paymentWindow.closed) {
          (window as any).paymentWindow.close();
        }
        
        // 새 창에서 결제 진행
        const paymentWindow = window.open(response.data.paymentUrl, 'inicis_payment_' + Date.now(), 'width=680,height=700,toolbar=no,menubar=no,scrollbars=yes,resizable=yes');
        (window as any).paymentWindow = paymentWindow;
        
        // 결제 완료 메시지 리스너
        const messageHandler = (event: MessageEvent) => {
          if (event.data.type === 'payment-complete') {
            console.log('결제 완료 메시지 수신:', event.data);
            
            if (event.data.resultCode === '00' || event.data.resultCode === '0000') {
              // 결제 성공
              alert('결제가 완료되었습니다!');
              fetchUserInfo(); // 코인 잔액 새로고침
              fetchPackages(); // 패키지 목록 새로고침
              eventBus.emit(EVENTS.COIN_BALANCE_UPDATED, { coinBalance: userCoins + pkg.coins + pkg.bonus });
            } else {
              // 결제 실패
              alert(`결제 실패: ${event.data.resultMsg}`);
            }
            
            window.removeEventListener('message', messageHandler);
            (window as any).paymentWindow = null;
          } else if (event.data.type === 'payment-failed') {
            console.log('결제 실패 메시지 수신:', event.data);
            alert(`결제가 취소되었습니다: ${event.data.resultMsg || '사용자 취소'}`);
            window.removeEventListener('message', messageHandler);
            (window as any).paymentWindow = null;
          } else if (event.data.type === 'payment-closed') {
            console.log('결제창 닫힘');
            window.removeEventListener('message', messageHandler);
            (window as any).paymentWindow = null;
          }
        };
        
        window.addEventListener('message', messageHandler);
        
        // 창이 닫혔는지 확인
        const checkClosed = setInterval(() => {
          if (paymentWindow && paymentWindow.closed) {
            clearInterval(checkClosed);
            window.removeEventListener('message', messageHandler);
            console.log('결제창이 닫혔습니다.');
            (window as any).paymentWindow = null;
          }
        }, 1000);
        
      } else {
        alert('결제 초기화에 실패했습니다.');
      }
    } catch (error: any) {
      console.error('결제 실패 상세:', error);
      console.error('결제 실패 response:', error.response);
      console.error('결제 실패 data:', error.response?.data);
      
      if (error.response?.status === 500) {
        alert(`결제 서버 연결 오류가 발생했습니다.\n${error.response?.data?.message || '잠시 후 다시 시도해주세요.'}`);
      } else if (error.response?.status === 401) {
        alert('로그인이 필요합니다.');
        router.push('/login');
      } else if (error.response?.status === 403) {
        alert('세션이 만료되었습니다. 다시 로그인해주세요.');
        router.push('/login');
      } else {
        alert(`결제 처리 중 오류가 발생했습니다.\n${error.response?.data?.message || error.message || '알 수 없는 오류'}`);
      }
    }
  };

  // 이니시스 결제 성공 처리
  const handlePaymentSuccess = async (result: any) => {
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      
      // 백엔드에 결제 완료 통보
      const response = await api.post('/payment/complete', {
        imp_uid: result.tid || result.paymentId,
        merchant_uid: result.oid || paymentData.oid
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        alert(`${response.data.coinAmount} 코인이 충전되었습니다!`);
        fetchUserInfo(); // 코인 잔액 새로고침
        eventBus.emit(EVENTS.COIN_BALANCE_UPDATED);
      }
    } catch (error) {
      console.error('결제 완료 처리 실패:', error);
      alert('결제는 완료되었으나 코인 지급에 문제가 있었습니다. 고객센터에 문의해주세요.');
    }
    
    setShowPayment(false);
    setPaymentData(null);
  };

  // 이니시스 결제 실패 처리
  const handlePaymentFail = (error: any) => {
    console.error('이니시스 결제 실패:', error);
    alert('결제가 취소되었습니다.');
    setShowPayment(false);
    setPaymentData(null);
  };

  const formatPrice = (price: number) => {
    return price.toLocaleString() + '원';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#141414] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3E7A5A]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#141414] pb-8 px-3 sm:px-6 md:px-8 lg:px-12">
      <div className="max-w-6xl mx-auto">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">코인 충전</h1>
          <div className="flex items-center justify-between">
            <p className="text-gray-400">웹툰을 감상하기 위한 코인을 충전하세요</p>
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/coin/history')}
                className="px-4 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
              >
                <span>📜</span>
                <span className="text-sm text-white">사용 내역</span>
              </button>
              <div className="bg-gray-800 px-4 py-2 rounded-lg border border-[#3E7A5A]">
                <span className="text-sm text-gray-400">보유 코인</span>
                <span className="ml-2 text-xl font-bold text-[#3E7A5A]">
                  {userCoins.toLocaleString()} 코인
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 첫 구매 할인 배너 */}
        {isFirstTime && (
          <div className="mb-6 p-6 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl text-white shadow-lg">
            <h2 className="text-2xl font-bold mb-2">🎉 첫 구매 50% 특별 할인!</h2>
            <p>첫 구매 고객님께 모든 패키지 50% 할인 혜택을 드립니다!</p>
            <p className="text-sm mt-2 opacity-90">* 이 혜택은 첫 구매 시 1회만 적용됩니다</p>
          </div>
        )}

        {/* 일반 고객 안내 배너 */}
        {!isFirstTime && (
          <div className="mb-6 p-6 bg-gradient-to-r from-gray-800 to-gray-700 rounded-2xl text-white border border-[#3E7A5A]">
            <h2 className="text-xl font-bold mb-2">💎 코인 충전 혜택</h2>
            <p>패키지별 보너스 코인을 추가로 드립니다!</p>
            <p className="text-sm mt-2 opacity-90">* 보너스율은 패키지에 따라 다릅니다</p>
          </div>
        )}

        {/* 코인 패키지 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className="relative bg-gray-800 border border-gray-700 rounded-2xl p-6 hover:border-[#3E7A5A] hover:shadow-xl transition-all"
            >
              {pkg.popular && (
                <span className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-[#3E7A5A] text-white px-4 py-1 rounded-full text-sm font-bold">
                  인기
                </span>
              )}

              {pkg.firstTimeBonus && (
                <span className="absolute -top-3 right-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                  50% OFF
                </span>
              )}

              <div className="mb-4">
                <h3 className="text-xl font-bold mb-1 text-white">
                  {pkg.coins.toLocaleString()} 코인
                  {pkg.bonus > 0 && (
                    <span className="ml-2 text-sm text-[#3E7A5A]">+{pkg.bonus} 보너스</span>
                  )}
                </h3>
                <p className="text-sm text-gray-400">{pkg.description}</p>
              </div>

              <div className="mb-4">
                {pkg.originalPrice && (
                  <p className="text-sm text-gray-500 line-through">
                    {formatPrice(pkg.originalPrice)}
                  </p>
                )}
                <p className="text-2xl font-bold text-white">
                  {formatPrice(pkg.price)}
                </p>
              </div>

              <button
                onClick={() => handlePurchase(pkg)}
                className="w-full py-3 rounded-lg font-medium transition-colors bg-[#3E7A5A] hover:bg-[#2d5a42] text-white"
              >
                충전하기
              </button>
            </div>
          ))}
        </div>

        {/* 이용 안내 (이니시스 요구사항 반영) */}
        <div className="mt-12 p-6 bg-gray-800 rounded-xl border border-gray-700">
          <h3 className="font-bold mb-4 text-white">이용 안내</h3>

          {/* 환불 정책 */}
          <div className="mb-6 p-4 bg-gray-900 rounded-lg border border-[#3E7A5A]">
            <h4 className="font-semibold mb-2 text-[#3E7A5A]">환불 정책</h4>
            <ul className="space-y-1 text-sm text-gray-300">
              <li>• <strong>구매한 코인은 환불이 가능하며, 환불은 결제수단으로만 환불됩니다.</strong></li>
              <li>• 소비자보호법에 따라 구매 후 7일 이내 청약철회가 가능합니다.</li>
              <li>• 단, 이미 사용한 코인은 환불 대상에서 제외됩니다.</li>
              <li>• <strong>보너스 코인은 환불이 불가능합니다.</strong></li>
            </ul>
          </div>

          {/* 일반 이용안내 */}
          <ul className="space-y-2 text-sm text-gray-400">
            <li>• <strong className="text-white">코인은 구매일로부터 1년간 사용 가능합니다.</strong></li>
            <li>• 보너스 코인은 유료 코인과 동일하게 사용됩니다.</li>
            <li>• 첫 구매 할인은 계정당 1회만 적용됩니다.</li>
            <li>• 결제는 이니시스(INICIS) 안전결제 시스템을 통해 처리됩니다.</li>
            <li>• 결제 및 환불 관련 문의: <button onClick={() => router.push('/support')} className="text-[#3E7A5A] hover:text-[#2d5a42] underline">고객센터</button> 또는 0507-1440-8816</li>
          </ul>
        </div>

        {/* 이니시스 결제 컴포넌트 */}
        {showPayment && paymentData && (
          <InicisPayment
            isOpen={showPayment}
            onClose={() => {
              setShowPayment(false);
              setPaymentData(null);
            }}
            paymentData={paymentData}
            onPaymentComplete={handlePaymentSuccess}
            onPaymentFail={handlePaymentFail}
          />
        )}
      </div>
    </div>
  );
}