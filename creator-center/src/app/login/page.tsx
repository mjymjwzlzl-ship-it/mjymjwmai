'use client'

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI } from '@/lib/api';
import { LogIn, Mail, Lock, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {

      // 실제 API 호출 시도
      const response = await authAPI.login(formData);
      const { token, user } = response.data;
      
      // 토큰을 localStorage에 저장 (메인 앱과 일관성 유지)
      localStorage.setItem('authToken', token);
      localStorage.setItem('token', token); // 호환성 유지
      localStorage.setItem('user', JSON.stringify(user));
      
      // 로그인 성공 - 팝업 제거
      router.push('/');
    } catch (error: any) {
      
      // 연결 오류인 경우 콘솔에만 로그
      if (error.code === 'ECONNREFUSED' || error.message.includes('Network Error')) {
        console.error('백엔드 서버 연결 실패. 테스트 계정: test@creator.com / test123');
      } else {
        console.error('로그인 실패:', error.response?.data?.message || error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="min-h-screen bg-[#141414] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
            <LogIn className="w-8 h-8 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">ARATA 작가센터</h1>
          <p className="text-gray-600">로그인하여 작품을 관리하세요</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              이메일
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="이메일을 입력하세요"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              비밀번호
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="비밀번호를 입력하세요"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 px-4 rounded-lg text-white font-medium transition-colors duration-200 ${
              loading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2'
            }`}
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
          
          {/* 테스트 로그인 버튼 */}
          <button
            type="button"
            onClick={() => {
              setFormData({ email: 'test@creator.com', password: 'test123' });
              setTimeout(() => {
                handleSubmit({ preventDefault: () => {} } as React.FormEvent);
              }, 100);
            }}
            className="w-full py-2 px-4 rounded-lg bg-yellow-500 hover:bg-yellow-600 text-white font-medium transition-colors duration-200"
          >
            🚀 테스트 계정으로 로그인
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            계정이 없으신가요?{' '}
            <button
              onClick={() => router.push('/register')}
              className="text-emerald-600 hover:text-emerald-700 font-medium"
            >
              회원가입
            </button>
          </p>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="text-center">
            <button className="text-sm text-gray-500 hover:text-gray-700">
              비밀번호를 잊으셨나요?
            </button>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}