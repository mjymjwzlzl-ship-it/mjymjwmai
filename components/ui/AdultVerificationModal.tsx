'use client'

import React, { useState, useEffect } from 'react';
import { X, Smartphone, CreditCard, Calendar, Shield, AlertTriangle, CheckCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';

interface AdultVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (token?: string) => void;
  mode?: 'strict' | 'simple';
}

const AdultVerificationModal: React.FC<AdultVerificationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  mode = 'simple'
}) => {
  const router = useRouter();
  const [verificationMethod, setVerificationMethod] = useState<'phone' | 'ipin' | 'simple' | 'naver' | 'kakao'>('naver');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [authStep, setAuthStep] = useState<'input' | 'waiting' | 'complete'>('input');
  const [receiptID, setReceiptID] = useState('');

  // 바로써트 인증 데이터
  const [barocertData, setBarocertData] = useState({
    name: '',
    phoneNumber: '',
    birthday: '', // YYYY-MM-DD 형식
  });

  // 간편 인증 데이터 (한국식 개선)
  const [simpleData, setSimpleData] = useState({
    name: '',
    birthDate: '',
    phoneLastFour: '', // 휴대폰 뒷자리 4자리
    gender: '', // 성별 (주민번호 뒷자리 첫번째)
    agreementChecked: false,
    privacyChecked: false
  });

  useEffect(() => {
    // 개발 모드에서는 간편 인증 기본 선택
    if (mode === 'simple') {
      setVerificationMethod('simple');
    }
  }, [mode]);

  // 바로써트 인증 결과 폴링
  useEffect(() => {
    if (authStep === 'waiting' && receiptID) {
      const pollInterval = setInterval(async () => {
        try {
          const endpoint = verificationMethod === 'naver'
            ? '/auth/barocert/naver/result'
            : '/auth/barocert/kakao/result';

          const response = await api.post(endpoint, {
            receiptID,
            birthday: barocertData.birthday // 생년월일도 함께 전송
          });

          if (response.data.completed && response.data.adultVerified) {
            // 인증 완료
            clearInterval(pollInterval);
            setAuthStep('complete');

            // 로컬스토리지 사용자 정보 업데이트
            const userData = localStorage.getItem('user');
            if (userData) {
              const user = JSON.parse(userData);
              user.adultVerified = true;
              localStorage.setItem('user', JSON.stringify(user));
            }

            alert('성인인증이 완료되었습니다!');
            onSuccess();
            onClose();

            // 성인 홈 페이지로 리다이렉트
            router.push('/adult');
          } else if (response.data.status === 'expired') {
            // 인증 만료
            clearInterval(pollInterval);
            setError('인증 시간이 만료되었습니다. 다시 시도해주세요.');
            setAuthStep('input');
          } else if (!response.data.success && response.data.message) {
            // 에러 발생
            clearInterval(pollInterval);
            setError(response.data.message);
            setAuthStep('input');
          }
        } catch (error: any) {
          console.error('인증 결과 조회 오류:', error);
          // 계속 폴링 (네트워크 일시 오류일 수 있음)
        }
      }, 3000); // 3초마다 폴링

      // 5분 후 타임아웃
      const timeout = setTimeout(() => {
        clearInterval(pollInterval);
        if (authStep === 'waiting') {
          setError('인증 시간이 초과되었습니다. 다시 시도해주세요.');
          setAuthStep('input');
        }
      }, 5 * 60 * 1000);

      return () => {
        clearInterval(pollInterval);
        clearTimeout(timeout);
      };
    }
  }, [authStep, receiptID, verificationMethod]);

  // 바로써트 네이버 인증 시작
  const handleBarocertNaverAuth = async () => {
    setLoading(true);
    setError('');

    // 입력값 검증
    if (!barocertData.name || !barocertData.phoneNumber || !barocertData.birthday) {
      setError('모든 정보를 입력해주세요.');
      setLoading(false);
      return;
    }

    // 휴대폰 번호 형식 검증
    const phoneRegex = /^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/;
    if (!phoneRegex.test(barocertData.phoneNumber)) {
      setError('올바른 휴대폰 번호를 입력해주세요. (예: 010-1234-5678)');
      setLoading(false);
      return;
    }

    // 생년월일 형식 검증
    const birthdayRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!birthdayRegex.test(barocertData.birthday)) {
      setError('올바른 생년월일을 입력해주세요. (예: 1990-01-01)');
      setLoading(false);
      return;
    }

    try {
      const response = await api.post('/auth/barocert/naver/start', barocertData);

      if (response.data.success && response.data.receiptID) {
        setReceiptID(response.data.receiptID);
        setAuthStep('waiting');

        // scheme URL이 있으면 모바일 앱 실행 시도 (선택사항)
        if (response.data.scheme) {
          window.location.href = response.data.scheme;
        }
      }
    } catch (error: any) {
      setError(error.response?.data?.message || '인증 요청 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 바로써트 카카오 인증 시작
  const handleBarocertKakaoAuth = async () => {
    setLoading(true);
    setError('');

    // 입력값 검증
    if (!barocertData.name || !barocertData.phoneNumber || !barocertData.birthday) {
      setError('모든 정보를 입력해주세요.');
      setLoading(false);
      return;
    }

    // 휴대폰 번호 형식 검증
    const phoneRegex = /^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/;
    if (!phoneRegex.test(barocertData.phoneNumber)) {
      setError('올바른 휴대폰 번호를 입력해주세요. (예: 010-1234-5678)');
      setLoading(false);
      return;
    }

    // 생년월일 형식 검증
    const birthdayRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!birthdayRegex.test(barocertData.birthday)) {
      setError('올바른 생년월일을 입력해주세요. (예: 1990-01-01)');
      setLoading(false);
      return;
    }

    try {
      const response = await api.post('/auth/barocert/kakao/start', barocertData);

      if (response.data.success && response.data.receiptID) {
        setReceiptID(response.data.receiptID);
        setAuthStep('waiting');

        // scheme URL이 있으면 카카오톡 앱 실행 시도 (선택사항)
        if (response.data.scheme) {
          window.location.href = response.data.scheme;
        }
      }
    } catch (error: any) {
      setError(error.response?.data?.message || '인증 요청 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 간편 성인인증 (개선된 한국식)
  const handleSimpleVerification = async () => {
    setLoading(true);
    setError('');
    
    // 입력값 검증
    if (!simpleData.name || !simpleData.birthDate || !simpleData.phoneLastFour || !simpleData.gender) {
      setError('모든 정보를 입력해주세요.');
      setLoading(false);
      return;
    }
    
    if (!simpleData.agreementChecked || !simpleData.privacyChecked) {
      setError('약관에 동의해주세요.');
      setLoading(false);
      return;
    }
    
    if (simpleData.phoneLastFour.length !== 4 || !/^\d{4}$/.test(simpleData.phoneLastFour)) {
      setError('휴대폰 뒷자리 4자리를 정확히 입력해주세요.');
      setLoading(false);
      return;
    }
    
    if (!['1', '2', '3', '4'].includes(simpleData.gender)) {
      setError('올바른 성별 코드를 선택해주세요.');
      setLoading(false);
      return;
    }
    
    try {
      const response = await api.post('/auth/adult-verify', {
        birthDate: simpleData.birthDate,
        name: simpleData.name,
        phoneLastFour: simpleData.phoneLastFour,
        gender: simpleData.gender,
        method: 'simple',
        agreedToAdultContent: true
      });
      
      if (response.data) {
        // 로컬스토리지 사용자 정보 업데이트
        const userData = localStorage.getItem('user');
        if (userData) {
          const user = JSON.parse(userData);
          user.adultVerified = true;
          localStorage.setItem('user', JSON.stringify(user));
        }

        alert('성인인증이 완료되었습니다!');
        onSuccess();
        onClose();

        // 성인 홈 페이지로 리다이렉트
        router.push('/adult');
      }
    } catch (error: any) {
      setError(error.response?.data?.message || '서버 연결에 실패했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* 헤더 */}
        <div className="bg-gradient-to-r from-red-600 to-pink-600 p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Shield className="w-6 h-6" />
              <h2 className="text-xl font-bold">성인 인증</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-sm opacity-90">
            만 19세 이상만 이용 가능한 콘텐츠입니다
          </p>
        </div>

        {/* 경고 메시지 */}
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-4 m-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-800 dark:text-yellow-200">
              <p className="font-semibold mb-1">청소년 보호법 안내</p>
              <p>본 콘텐츠는 청소년유해매체물로서 청소년보호법에 따라 19세 미만의 청소년이 이용할 수 없습니다.</p>
            </div>
          </div>
        </div>

        {/* 인증 방법 선택 탭 - 네이버/카카오만 */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 mx-4">
          <button
            onClick={() => setVerificationMethod('naver')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              verificationMethod === 'naver'
                ? 'text-purple-600 dark:text-purple-400 border-b-2 border-purple-600 dark:border-purple-400'
                : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
          >
            <div className="flex items-center justify-center gap-1">
              <span className="text-green-500 font-bold">N</span>
              네이버 인증
            </div>
          </button>
          <button
            onClick={() => setVerificationMethod('kakao')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              verificationMethod === 'kakao'
                ? 'text-purple-600 dark:text-purple-400 border-b-2 border-purple-600 dark:border-purple-400'
                : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
          >
            <div className="flex items-center justify-center gap-1">
              <span className="text-yellow-500">💬</span>
              카카오
            </div>
          </button>
        </div>

        {/* 인증 폼 */}
        <div className="p-6">
          {/* 간편인증 제거 - 사용하지 않음 */}
          {verificationMethod === 'simple' && null}

          {false && verificationMethod === 'simple' && (
            <div className="space-y-4">
              {/* 이름 입력 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  이름
                </label>
                <input
                  type="text"
                  value={simpleData.name}
                  onChange={(e) => setSimpleData({...simpleData, name: e.target.value})}
                  placeholder="실명을 입력하세요"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>

              {/* 생년월일 입력 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  생년월일
                </label>
                <input
                  type="date"
                  value={simpleData.birthDate}
                  onChange={(e) => setSimpleData({...simpleData, birthDate: e.target.value})}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>

              {/* 휴대폰 뒷자리 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  휴대폰 뒷자리 4자리
                </label>
                <input
                  type="text"
                  value={simpleData.phoneLastFour}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                    setSimpleData({...simpleData, phoneLastFour: value});
                  }}
                  placeholder="0000"
                  maxLength={4}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>

              {/* 성별 선택 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  성별
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSimpleData({...simpleData, gender: '1'})}
                    className={`py-2 px-4 rounded-lg border ${
                      simpleData.gender === '1'
                        ? 'bg-blue-500 text-white border-blue-500'
                        : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600'
                    }`}
                  >
                    남성
                  </button>
                  <button
                    type="button"
                    onClick={() => setSimpleData({...simpleData, gender: '2'})}
                    className={`py-2 px-4 rounded-lg border ${
                      simpleData.gender === '2'
                        ? 'bg-pink-500 text-white border-pink-500'
                        : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600'
                    }`}
                  >
                    여성
                  </button>
                </div>
              </div>

              {/* 약관 동의 */}
              <div className="space-y-3 pt-2">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={simpleData.agreementChecked}
                    onChange={(e) => setSimpleData({...simpleData, agreementChecked: e.target.checked})}
                    className="mt-0.5 w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    [필수] 만 19세 이상이며, 성인 콘텐츠 이용에 동의합니다
                  </span>
                </label>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={simpleData.privacyChecked}
                    onChange={(e) => setSimpleData({...simpleData, privacyChecked: e.target.checked})}
                    className="mt-0.5 w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    [필수] 개인정보 수집 및 이용에 동의합니다
                  </span>
                </label>
              </div>

              {/* 에러 메시지 */}
              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}

              {/* 인증 버튼 */}
              <button
                onClick={handleSimpleVerification}
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-medium rounded-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    인증 처리 중...
                  </span>
                ) : (
                  '성인 인증하기'
                )}
              </button>
            </div>
          )}

          {verificationMethod === 'naver' && (
            <div className="space-y-4">
              <div className="text-center py-4">
                <div className="w-20 h-20 mx-auto mb-4 bg-green-500 rounded-2xl flex items-center justify-center">
                  <span className="text-3xl font-bold text-white">N</span>
                </div>
                <h3 className="text-lg font-semibold mb-2">네이버 본인인증</h3>
                <p className="text-sm text-gray-800 dark:text-gray-200">
                  네이버 인증서로 법적 효력이 있는 본인인증을 진행합니다
                </p>
              </div>

              {authStep === 'input' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      이름
                    </label>
                    <input
                      type="text"
                      value={barocertData.name}
                      onChange={(e) => setBarocertData({...barocertData, name: e.target.value})}
                      placeholder="실명을 입력하세요"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      휴대폰 번호
                    </label>
                    <input
                      type="tel"
                      value={barocertData.phoneNumber}
                      onChange={(e) => setBarocertData({...barocertData, phoneNumber: e.target.value})}
                      placeholder="010-1234-5678"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      생년월일
                    </label>
                    <input
                      type="date"
                      value={barocertData.birthday}
                      onChange={(e) => setBarocertData({...barocertData, birthday: e.target.value})}
                      max={new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    />
                  </div>

                  <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg text-sm">
                    <p className="text-gray-800 dark:text-gray-200 mb-2">
                      <strong>인증 절차:</strong>
                    </p>
                    <ol className="text-gray-800 dark:text-gray-200 space-y-1 ml-4">
                      <li>1. 본인 정보 입력</li>
                      <li>2. 네이버 앱에서 인증 요청 확인</li>
                      <li>3. 본인인증 완료</li>
                    </ol>
                  </div>

                  {error && (
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                      <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                    </div>
                  )}

                  <button
                    onClick={handleBarocertNaverAuth}
                    disabled={loading}
                    className="w-full py-3 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        인증 요청 중...
                      </span>
                    ) : (
                      '네이버 인증 시작'
                    )}
                  </button>
                </>
              )}

              {authStep === 'waiting' && (
                <div className="text-center py-8">
                  <div className="relative w-20 h-20 mx-auto mb-4">
                    <div className="absolute inset-0 border-4 border-green-200 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-green-500 rounded-full border-t-transparent animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <CheckCircle className="w-8 h-8 text-green-500" />
                    </div>
                  </div>
                  <h4 className="font-semibold text-lg mb-2">네이버 앱에서 인증을 완료해주세요</h4>
                  <p className="text-sm text-gray-800 dark:text-gray-200 mb-4">
                    네이버 앱에 인증 요청이 전송되었습니다.<br />
                    앱에서 본인인증을 완료하면 자동으로 인증됩니다.
                  </p>
                  <div className="text-xs text-gray-700 dark:text-gray-300">
                    인증 대기 중... (최대 5분)
                  </div>
                </div>
              )}
            </div>
          )}

          {verificationMethod === 'kakao' && (
            <div className="space-y-4">
              <div className="text-center py-4">
                <div className="w-20 h-20 mx-auto mb-4 bg-yellow-400 rounded-2xl flex items-center justify-center">
                  <span className="text-2xl font-bold">💬</span>
                </div>
                <h3 className="text-lg font-semibold mb-2">카카오 본인인증</h3>
                <p className="text-sm text-gray-800 dark:text-gray-200">
                  카카오 인증서로 법적 효력이 있는 본인인증을 진행합니다
                </p>
              </div>

              {authStep === 'input' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      이름
                    </label>
                    <input
                      type="text"
                      value={barocertData.name}
                      onChange={(e) => setBarocertData({...barocertData, name: e.target.value})}
                      placeholder="실명을 입력하세요"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      휴대폰 번호
                    </label>
                    <input
                      type="tel"
                      value={barocertData.phoneNumber}
                      onChange={(e) => setBarocertData({...barocertData, phoneNumber: e.target.value})}
                      placeholder="010-1234-5678"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      생년월일
                    </label>
                    <input
                      type="date"
                      value={barocertData.birthday}
                      onChange={(e) => setBarocertData({...barocertData, birthday: e.target.value})}
                      max={new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    />
                  </div>

                  <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg text-sm">
                    <p className="text-gray-800 dark:text-gray-200 mb-2">
                      <strong>인증 절차:</strong>
                    </p>
                    <ol className="text-gray-800 dark:text-gray-200 space-y-1 ml-4">
                      <li>1. 본인 정보 입력</li>
                      <li>2. 카카오톡 앱에서 인증 요청 확인</li>
                      <li>3. 본인인증 완료</li>
                    </ol>
                  </div>

                  {error && (
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                      <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                    </div>
                  )}

                  <button
                    onClick={handleBarocertKakaoAuth}
                    disabled={loading}
                    className="w-full py-3 bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        인증 요청 중...
                      </span>
                    ) : (
                      '카카오 인증 시작'
                    )}
                  </button>
                </>
              )}

              {authStep === 'waiting' && (
                <div className="text-center py-8">
                  <div className="relative w-20 h-20 mx-auto mb-4">
                    <div className="absolute inset-0 border-4 border-yellow-200 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-yellow-400 rounded-full border-t-transparent animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <CheckCircle className="w-8 h-8 text-yellow-400" />
                    </div>
                  </div>
                  <h4 className="font-semibold text-lg mb-2">카카오톡에서 인증을 완료해주세요</h4>
                  <p className="text-sm text-gray-800 dark:text-gray-200 mb-4">
                    카카오톡 앱에 인증 요청이 전송되었습니다.<br />
                    앱에서 본인인증을 완료하면 자동으로 인증됩니다.
                  </p>
                  <div className="text-xs text-gray-700 dark:text-gray-300">
                    인증 대기 중... (최대 5분)
                  </div>
                </div>
              )}
            </div>
          )}

          {verificationMethod === 'phone' && (
            <div className="text-center py-8">
              <Smartphone className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-800 dark:text-gray-200">
                휴대폰 인증은 준비 중입니다.
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">
                간편인증 또는 네이버 인증을 이용해주세요.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdultVerificationModal;