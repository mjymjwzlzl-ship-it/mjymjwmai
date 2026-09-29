'use client'

import React, { useState, useEffect } from 'react';
import { Shield, Users, CheckCircle, XCircle, Calendar, BarChart3, Settings } from 'lucide-react';

interface VerificationStats {
  totalUsers: number;
  verifiedUsers: number;
  pendingVerifications: number;
  expiringSoon: number;
}

export default function AdultSettingsPage() {
  const [verificationMode, setVerificationMode] = useState<'strict' | 'simple'>('strict');
  const [contentFiltering, setContentFiltering] = useState(true);
  const [ageRestriction, setAgeRestriction] = useState(19);
  const [stats, setStats] = useState<VerificationStats>({
    totalUsers: 0,
    verifiedUsers: 0,
    pendingVerifications: 0,
    expiringSoon: 0
  });
  const [systemMode, setSystemMode] = useState('production');

  useEffect(() => {
    loadSettings();
    loadStats();
  }, []);

  const loadSettings = () => {
    // 시스템 설정 로드
    const savedMode = localStorage.getItem('systemVerificationMode') || 'strict';
    const savedFiltering = localStorage.getItem('contentFiltering') !== 'false';
    const savedAgeRestriction = parseInt(localStorage.getItem('ageRestriction') || '19');
    const savedSystemMode = localStorage.getItem('systemMode') || 'production';

    setVerificationMode(savedMode as 'strict' | 'simple');
    setContentFiltering(savedFiltering);
    setAgeRestriction(savedAgeRestriction);
    setSystemMode(savedSystemMode);
  };

  const loadStats = () => {
    // 실제로는 DB에서 통계 데이터 로드
    // 테스트 데이터
    setStats({
      totalUsers: 1240,
      verifiedUsers: 892,
      pendingVerifications: 23,
      expiringSoon: 45
    });
  };

  const saveSettings = () => {
    localStorage.setItem('systemVerificationMode', verificationMode);
    localStorage.setItem('contentFiltering', contentFiltering.toString());
    localStorage.setItem('ageRestriction', ageRestriction.toString());
    localStorage.setItem('systemMode', systemMode);
    
    // 전역 설정 업데이트 이벤트 발생
    window.dispatchEvent(new CustomEvent('adultVerificationSettingsUpdated', {
      detail: {
        mode: verificationMode,
        filtering: contentFiltering,
        ageRestriction,
        systemMode
      }
    }));
    
    alert('설정이 저장되었습니다.');
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-2">성인인증 시스템 관리</h1>
        <p className="text-gray-400">
          성인 콘텐츠 접근 제어 및 연령 인증 시스템을 관리합니다.
        </p>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">전체 사용자</p>
              <p className="text-2xl font-bold text-white">{stats.totalUsers.toLocaleString()}</p>
            </div>
            <Users className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">인증 완료</p>
              <p className="text-2xl font-bold text-white">{stats.verifiedUsers.toLocaleString()}</p>
              <p className="text-green-400 text-xs">
                {Math.round((stats.verifiedUsers / stats.totalUsers) * 100)}%
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">인증 대기</p>
              <p className="text-2xl font-bold text-white">{stats.pendingVerifications}</p>
            </div>
            <XCircle className="w-8 h-8 text-yellow-500" />
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">만료 임박</p>
              <p className="text-2xl font-bold text-white">{stats.expiringSoon}</p>
              <p className="text-red-400 text-xs">30일 이내</p>
            </div>
            <Calendar className="w-8 h-8 text-red-500" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 시스템 설정 */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center">
            <Settings className="w-5 h-5 mr-2 text-purple-400" />
            시스템 설정
          </h2>

          <div className="space-y-6">
            {/* 시스템 모드 */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                시스템 모드
              </label>
              <select
                value={systemMode}
                onChange={(e) => setSystemMode(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
              >
                <option value="development">개발 모드</option>
                <option value="testing">테스트 모드</option>
                <option value="production">운영 모드</option>
              </select>
              <p className="text-xs text-gray-400 mt-1">
                {systemMode === 'development' && '간편 인증 허용, 로깅 활성화'}
                {systemMode === 'testing' && '모든 기능 활성화, 상세 로깅'}
                {systemMode === 'production' && '엄격 모드만 허용, 보안 강화'}
              </p>
            </div>

            {/* 인증 모드 */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                기본 인증 모드
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="verificationMode"
                    value="strict"
                    checked={verificationMode === 'strict'}
                    onChange={(e) => setVerificationMode(e.target.value as 'strict')}
                    className="mr-2"
                  />
                  <span className="text-white">엄격 모드 (휴대폰/아이핀)</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="verificationMode"
                    value="simple"
                    checked={verificationMode === 'simple'}
                    onChange={(e) => setVerificationMode(e.target.value as 'simple')}
                    className="mr-2"
                    disabled={systemMode === 'production'}
                  />
                  <span className={`${systemMode === 'production' ? 'text-gray-500' : 'text-white'}`}>
                    간편 모드 (생년월일만)
                    {systemMode === 'production' && ' - 운영 모드에서 비활성화'}
                  </span>
                </label>
              </div>
            </div>

            {/* 연령 제한 */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                성인 콘텐츠 연령 제한
              </label>
              <select
                value={ageRestriction}
                onChange={(e) => setAgeRestriction(parseInt(e.target.value))}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
              >
                <option value={15}>15세 이상</option>
                <option value={18}>18세 이상</option>
                <option value={19}>19세 이상 (권장)</option>
              </select>
            </div>

            {/* 콘텐츠 필터링 */}
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={contentFiltering}
                  onChange={(e) => setContentFiltering(e.target.checked)}
                  className="mr-2"
                />
                <span className="text-white">자동 콘텐츠 필터링 활성화</span>
              </label>
              <p className="text-xs text-gray-400 mt-1">
                미인증 사용자에게 성인 콘텐츠 자동 숨김
              </p>
            </div>
          </div>

          <button
            onClick={saveSettings}
            className="w-full mt-6 bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg transition-colors"
          >
            설정 저장
          </button>
        </div>

        {/* 인증 방법별 통계 */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center">
            <BarChart3 className="w-5 h-5 mr-2 text-green-400" />
            인증 방법별 통계
          </h2>

          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-gray-700 rounded">
              <span className="text-white">휴대폰 인증</span>
              <div className="text-right">
                <span className="text-white font-semibold">567명</span>
                <span className="text-gray-400 text-sm ml-2">(63.6%)</span>
              </div>
            </div>

            <div className="flex justify-between items-center p-3 bg-gray-700 rounded">
              <span className="text-white">아이핀 인증</span>
              <div className="text-right">
                <span className="text-white font-semibold">234명</span>
                <span className="text-gray-400 text-sm ml-2">(26.2%)</span>
              </div>
            </div>

            <div className="flex justify-between items-center p-3 bg-gray-700 rounded">
              <span className="text-white">간편 인증</span>
              <div className="text-right">
                <span className="text-white font-semibold">91명</span>
                <span className="text-gray-400 text-sm ml-2">(10.2%)</span>
              </div>
            </div>
          </div>

          {/* 월별 인증 트렌드 */}
          <div className="mt-6">
            <h3 className="text-sm font-medium text-gray-300 mb-3">월별 인증 현황</h3>
            <div className="space-y-2">
              {['1월', '2월', '3월', '4월', '5월'].map((month, index) => (
                <div key={month} className="flex items-center">
                  <span className="text-sm text-gray-400 w-8">{month}</span>
                  <div className="flex-1 bg-gray-700 rounded-full h-2 ml-3">
                    <div 
                      className="bg-purple-500 h-2 rounded-full"
                      style={{ width: `${Math.random() * 80 + 20}%` }}
                    />
                  </div>
                  <span className="text-sm text-white ml-3">{Math.floor(Math.random() * 200 + 50)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 법적 안내사항 */}
      <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="text-yellow-800 font-semibold mb-2">법적 준수 사항</h3>
        <ul className="text-yellow-700 text-sm space-y-1">
          <li>• 청소년보호법에 따라 만 19세 미만에게는 성인 콘텐츠 제공 금지</li>
          <li>• 개인정보보호법에 따라 주민등록번호 수집 금지 (2014.8.7부터)</li>
          <li>• 본인인증은 연 1회 의무 실시 (여성가족부 가이드라인)</li>
          <li>• 해외 거주자의 경우 별도 신분증 확인 절차 필요</li>
        </ul>
      </div>
    </div>
  );
}