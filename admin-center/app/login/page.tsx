'use client'

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogIn, Shield } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
    setError('');

    try {
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const apiBaseUrl = isLocal
        ? (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api')
        : 'https://api.arata.co.kr/api';
      const response = await fetch(`${apiBaseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.username.trim(), password: formData.password }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || '로그인에 실패했습니다.');
      }
      if (!['ADMIN', 'CS_ADMIN'].includes(data.user?.role)) {
        throw new Error('관리자 권한이 없는 계정입니다.');
      }

      localStorage.setItem('adminToken', data.token);
      localStorage.setItem('adminUser', JSON.stringify(data.user));
      router.replace('/');
    } catch (loginError) {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminUser');
      setError(loginError instanceof Error ? loginError.message : '로그인에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#141414] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
            <Shield className="w-8 h-8 text-emerald-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">ARATA 관리자</h1>
          <p className="text-gray-600">관리자 센터에 로그인하세요</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
              관리자 이메일
            </label>
            <input
              type="email"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="관리자 이메일을 입력하세요"
              autoComplete="username"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              비밀번호
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="비밀번호를 입력하세요"
              autoComplete="current-password"
              required
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 px-4 rounded-lg text-white font-medium transition-colors duration-200 flex items-center justify-center ${
              loading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-90'
            }`}
          >
            <LogIn className="w-5 h-5 mr-2" />
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            관리자만 접근 가능합니다. 승인된 계정으로만 로그인하세요.
          </p>
        </div>
      </div>
    </div>
  );
}
