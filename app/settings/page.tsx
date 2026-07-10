'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Settings, User, Shield, Bell, Eye, Edit2, Mail, Lock, Save } from 'lucide-react'
import { useThemeStore } from '@/store/theme'

export default function SettingsPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('general')
  const [user, setUser] = useState<any>(null)
  const [isEditingNickname, setIsEditingNickname] = useState(false)
  const [isEditingPassword, setIsEditingPassword] = useState(false)
  const [nickname, setNickname] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const theme = useThemeStore((s) => s.theme)
  const toggleTheme = useThemeStore((s) => s.toggle)

  useEffect(() => {
    const userData = localStorage.getItem('user')
    const token = localStorage.getItem('authToken') || localStorage.getItem('token')
    
    if (userData && token) {
      const parsedUser = JSON.parse(userData)
      setUser(parsedUser)
      setNickname(parsedUser.nickname || parsedUser.name || '')
    }
  }, [])

  const handleNicknameUpdate = async () => {
    if (!nickname.trim()) return
    
    setIsLoading(true)
    setMessage('')
    
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token')
      const response = await fetch('/api/auth/update-nickname', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ nickname: nickname.trim() })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        const updatedUser = { ...user, nickname: nickname.trim() }
        localStorage.setItem('user', JSON.stringify(updatedUser))
        setUser(updatedUser)
        setIsEditingNickname(false)
        setMessage('닉네임이 성공적으로 변경되었습니다.')
      } else {
        setMessage(data.message || '닉네임 변경에 실패했습니다.')
      }
    } catch (error) {
      setMessage('서버 연결에 실패했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePasswordUpdate = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setMessage('모든 비밀번호 필드를 입력해주세요.')
      return
    }
    
    if (newPassword !== confirmPassword) {
      setMessage('새 비밀번호가 일치하지 않습니다.')
      return
    }
    
    if (newPassword.length < 6) {
      setMessage('새 비밀번호는 6자 이상이어야 합니다.')
      return
    }
    
    setIsLoading(true)
    setMessage('')
    
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token')
      const response = await fetch('/api/auth/update-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          currentPassword, 
          newPassword 
        })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
        setIsEditingPassword(false)
        setMessage('비밀번호가 성공적으로 변경되었습니다.')
      } else {
        setMessage(data.message || '비밀번호 변경에 실패했습니다.')
      }
    } catch (error) {
      setMessage('서버 연결에 실패했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
      <header className="sticky top-0 z-10 bg-white dark:bg-gray-900 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-center h-16">
            <button 
              onClick={() => router.back()}
              className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors mr-6"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>뒤로</span>
            </button>
            <div className="flex items-center space-x-3">
              <Settings className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              <h1 className="text-xl font-bold">설정</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid md:grid-cols-4 gap-8">
          {/* 사이드바 메뉴 */}
          <div className="md:col-span-1">
            <nav className="space-y-2">
              <button
                onClick={() => setActiveTab('general')}
                className={`w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center space-x-3 ${
                  activeTab === 'general'
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <Settings className="w-4 h-4" />
                <span>일반 설정</span>
              </button>
              <button
                onClick={() => setActiveTab('account')}
                className={`w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center space-x-3 ${
                  activeTab === 'account'
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <User className="w-4 h-4" />
                <span>계정</span>
              </button>
              <button
                onClick={() => setActiveTab('privacy')}
                className={`w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center space-x-3 ${
                  activeTab === 'privacy'
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <Shield className="w-4 h-4" />
                <span>개인정보</span>
              </button>
              <button
                onClick={() => setActiveTab('notifications')}
                className={`w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center space-x-3 ${
                  activeTab === 'notifications'
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <Bell className="w-4 h-4" />
                <span>알림</span>
              </button>
            </nav>
          </div>

          {/* 메인 설정 컨텐츠 */}
          <div className="md:col-span-3">
            {activeTab === 'general' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold mb-6">일반 설정</h2>
                
                {/* 메시지 표시 */}
                {message && (
                  <div className={`p-4 rounded-lg ${
                    message.includes('성공') 
                      ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 border border-green-300 dark:border-green-700' 
                      : 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-700'
                  }`}>
                    {message}
                  </div>
                )}
                
                {user ? (
                  <>
                    {/* 계정 정보 */}
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
                      <h3 className="text-lg font-semibold mb-4 flex items-center">
                        <User className="w-5 h-5 mr-2 text-emerald-600 dark:text-emerald-400" />
                        계정 정보
                      </h3>
                      
                      <div className="space-y-4">
                        {/* 이메일 */}
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">이메일</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">{user.email}</div>
                          </div>
                          <Mail className="w-5 h-5 text-gray-400" />
                        </div>
                        
                        {/* 닉네임 */}
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="font-medium mb-1">닉네임</div>
                            {isEditingNickname ? (
                              <div className="flex space-x-2">
                                <input
                                  type="text"
                                  value={nickname}
                                  onChange={(e) => setNickname(e.target.value)}
                                  className="flex-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 rounded border border-gray-300 dark:border-gray-600 focus:outline-none focus:border-purple-500"
                                  placeholder="닉네임을 입력하세요"
                                />
                                <button
                                  onClick={handleNicknameUpdate}
                                  disabled={isLoading}
                                  className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 px-3 py-2 rounded text-white disabled:opacity-50"
                                >
                                  <Save className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => {
                                    setIsEditingNickname(false)
                                    setNickname(user.nickname || user.name || '')
                                    setMessage('')
                                  }}
                                  className="bg-gray-600 hover:bg-gray-700 px-3 py-2 rounded text-white"
                                >
                                  취소
                                </button>
                              </div>
                            ) : (
                              <div className="text-sm text-gray-500 dark:text-gray-400">{user.nickname || user.name || '닉네임 없음'}</div>
                            )}
                          </div>
                          {!isEditingNickname && (
                            <button
                              onClick={() => setIsEditingNickname(true)}
                              className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        
                        {/* 비밀번호 */}
                        {user.provider === 'email' && (
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="font-medium mb-1">비밀번호</div>
                              {isEditingPassword ? (
                                <div className="space-y-3">
                                  <input
                                    type="password"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    className="w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 rounded border border-gray-300 dark:border-gray-600 focus:outline-none focus:border-purple-500"
                                    placeholder="현재 비밀번호"
                                  />
                                  <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 rounded border border-gray-300 dark:border-gray-600 focus:outline-none focus:border-purple-500"
                                    placeholder="새 비밀번호 (6자 이상)"
                                  />
                                  <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 rounded border border-gray-300 dark:border-gray-600 focus:outline-none focus:border-purple-500"
                                    placeholder="새 비밀번호 확인"
                                  />
                                  <div className="flex space-x-2">
                                    <button
                                      onClick={handlePasswordUpdate}
                                      disabled={isLoading}
                                      className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 px-4 py-2 rounded text-white disabled:opacity-50"
                                    >
                                      {isLoading ? '변경 중...' : '비밀번호 변경'}
                                    </button>
                                    <button
                                      onClick={() => {
                                        setIsEditingPassword(false)
                                        setCurrentPassword('')
                                        setNewPassword('')
                                        setConfirmPassword('')
                                        setMessage('')
                                      }}
                                      className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded text-white"
                                    >
                                      취소
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="text-sm text-gray-500 dark:text-gray-400">••••••••</div>
                              )}
                            </div>
                            {!isEditingPassword && (
                              <button
                                onClick={() => setIsEditingPassword(true)}
                                className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4">계정 정보</h3>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">로그인 후 이용 가능합니다.</p>
                    
                    <div className="flex space-x-4">
                      <button
                        onClick={() => router.push('/login')}
                        className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 px-6 py-2 rounded-lg transition-colors text-white"
                      >
                        로그인
                      </button>
                      <button 
                        onClick={() => router.push('/register')}
                        className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 px-6 py-2 rounded-lg transition-colors"
                      >
                        회원가입
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'account' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold mb-6">계정 관리</h2>
                
                {user ? (
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4">계정 관리</h3>
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-700 rounded-lg">
                        <div>
                          <div className="font-medium">로그아웃</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">현재 계정에서 로그아웃합니다</div>
                        </div>
                        <button
                          onClick={() => {
                            localStorage.removeItem('authToken')
                            localStorage.removeItem('token')
                            localStorage.removeItem('user')
                            router.push('/')
                          }}
                          className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded text-white"
                        >
                          로그아웃
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4">계정 관리</h3>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">로그인 후 이용 가능합니다.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'privacy' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold mb-6">개인정보 보호</h2>

                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center">
                    <Shield className="w-5 h-5 mr-2 text-red-600 dark:text-red-400" />
                    성인 인증
                  </h3>

                  {user?.adultVerified ? (
                    <div className="space-y-4">
                      <div className="flex items-center space-x-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                        <div className="flex-shrink-0 w-10 h-10 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center">
                          <Shield className="w-6 h-6 text-green-600 dark:text-green-400" />
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-green-900 dark:text-green-100">
                            성인 인증 완료
                          </div>
                          <div className="text-sm text-green-700 dark:text-green-300">
                            19세 이상 콘텐츠를 이용하실 수 있습니다.
                          </div>
                          {user.adultVerifiedAt && (
                            <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                              인증일: {new Date(user.adultVerifiedAt).toLocaleDateString('ko-KR')}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        🔞 성인 웹툰 및 19세 이상 콘텐츠를 이용하려면 성인인증이 필요합니다.
                      </div>

                      <button
                        onClick={() => router.push('/adult')}
                        className="w-full py-3 px-4 rounded-lg font-medium bg-red-600 text-white hover:bg-red-700 transition-colors"
                      >
                        성인인증하기 (만 19세 이상)
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold mb-6">알림 설정</h2>
                
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">푸시 알림</h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">신작 알림</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">새로운 웹툰이 업로드될 때 알림</div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" defaultChecked />
                        <div className="w-11 h-6 bg-gray-400 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-emerald-600 peer-checked:to-teal-600"></div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}