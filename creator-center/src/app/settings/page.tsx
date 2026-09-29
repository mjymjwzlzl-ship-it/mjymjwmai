'use client'

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { 
  Settings as SettingsIcon, 
  User, 
  Lock, 
  Mail, 
  Bell,
  Shield,
  Save,
  Eye,
  EyeOff
} from 'lucide-react';

interface UserProfile {
  id: string;
  username: string;
  email: string;
  nickname: string;
  createdAt: string;
}

interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface ProfileForm {
  nickname: string;
  email: string;
}

interface NotificationSettings {
  emailNotifications: boolean;
  commentNotifications: boolean;
  likeNotifications: boolean;
  updateNotifications: boolean;
}

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // 사용자 프로필 상태
  const [userProfile, setUserProfile] = useState<UserProfile>({
    id: '',
    username: '',
    email: '',
    nickname: '',
    createdAt: ''
  });

  // 프로필 수정 폼
  const [profileForm, setProfileForm] = useState<ProfileForm>({
    nickname: '',
    email: ''
  });

  // 비밀번호 변경 폼
  const [passwordForm, setPasswordForm] = useState<PasswordForm>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // 알림 설정
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    emailNotifications: true,
    commentNotifications: true,
    likeNotifications: true,
    updateNotifications: false
  });

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      // 실제로는 백엔드에서 사용자 정보를 가져와야 하지만, 
      // 현재는 localStorage에서 기본 정보를 가져옵니다
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/auth/login');
        return;
      }

      // 더미 데이터 (실제로는 API 호출)
      const mockProfile: UserProfile = {
        id: '1',
        username: 'creator123',
        email: 'creator@example.com',
        nickname: '작가님',
        createdAt: new Date().toISOString()
      };

      setUserProfile(mockProfile);
      setProfileForm({
        nickname: mockProfile.nickname,
        email: mockProfile.email
      });
    } catch (error) {
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 실제로는 백엔드 API 호출
      
      // 더미 응답
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setUserProfile(prev => ({
        ...prev,
        nickname: profileForm.nickname,
        email: profileForm.email
      }));

      alert('프로필이 성공적으로 업데이트되었습니다!');
    } catch (error) {
      alert('프로필 업데이트 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 비밀번호 유효성 검사
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert('새 비밀번호가 일치하지 않습니다.');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      alert('비밀번호는 최소 6자 이상이어야 합니다.');
      return;
    }

    setLoading(true);

    try {
      // 실제로는 백엔드 API 호출
      // 비밀번호 변경 API 호출 (미구현)
      
      // 더미 응답
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });

      alert('비밀번호가 성공적으로 변경되었습니다!');
    } catch (error) {
      alert('비밀번호 변경 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationUpdate = async (key: keyof NotificationSettings, value: boolean) => {
    setNotificationSettings(prev => ({
      ...prev,
      [key]: value
    }));

    try {
      // 실제로는 백엔드 API 호출
      
      // 더미 응답
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className=" pt-16 p-8">
        <div className="max-w-4xl mx-auto">
          {/* 헤더 */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">설정</h1>
            <p className="text-gray-600">계정 정보 및 알림 설정을 관리하세요</p>
          </div>

          <div className="space-y-8">
            {/* 계정 정보 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <User className="w-5 h-5 mr-2" />
                  계정 정보
                </h2>
              </div>
              <div className="p-6">
                <form onSubmit={handleProfileUpdate} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        사용자명
                      </label>
                      <input
                        type="text"
                        value={userProfile.username}
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">사용자명은 변경할 수 없습니다</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        닉네임 *
                      </label>
                      <input
                        type="text"
                        value={profileForm.nickname}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, nickname: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="닉네임을 입력하세요"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        이메일 *
                      </label>
                      <input
                        type="email"
                        value={profileForm.email}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="이메일을 입력하세요"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        가입일
                      </label>
                      <input
                        type="text"
                        value={formatDate(userProfile.createdAt)}
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={loading}
                      className={`px-6 py-2 ${loading ? 'bg-gray-400' : 'bg-purple-600 hover:bg-purple-700'} text-white rounded-md transition-colors duration-200 flex items-center`}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {loading ? '저장 중...' : '프로필 저장'}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* 비밀번호 변경 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <Lock className="w-5 h-5 mr-2" />
                  비밀번호 변경
                </h2>
              </div>
              <div className="p-6">
                <form onSubmit={handlePasswordChange} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      현재 비밀번호 *
                    </label>
                    <div className="relative">
                      <input
                        type={showCurrentPassword ? 'text' : 'password'}
                        value={passwordForm.currentPassword}
                        onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                        className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="현재 비밀번호를 입력하세요"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        {showCurrentPassword ? (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        새 비밀번호 *
                      </label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          value={passwordForm.newPassword}
                          onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                          className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          placeholder="새 비밀번호를 입력하세요"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        >
                          {showNewPassword ? (
                            <EyeOff className="h-4 w-4 text-gray-400" />
                          ) : (
                            <Eye className="h-4 w-4 text-gray-400" />
                          )}
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">최소 6자 이상</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        새 비밀번호 확인 *
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={passwordForm.confirmPassword}
                          onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                          className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          placeholder="새 비밀번호를 다시 입력하세요"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-4 w-4 text-gray-400" />
                          ) : (
                            <Eye className="h-4 w-4 text-gray-400" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={loading}
                      className={`px-6 py-2 ${loading ? 'bg-gray-400' : 'bg-purple-600 hover:bg-purple-700'} text-white rounded-md transition-colors duration-200 flex items-center`}
                    >
                      <Shield className="w-4 h-4 mr-2" />
                      {loading ? '변경 중...' : '비밀번호 변경'}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* 알림 설정 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <Bell className="w-5 h-5 mr-2" />
                  알림 설정
                </h2>
              </div>
              <div className="p-6">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">이메일 알림</h3>
                      <p className="text-sm text-gray-500">중요한 소식을 이메일로 받아보세요</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notificationSettings.emailNotifications}
                        onChange={(e) => handleNotificationUpdate('emailNotifications', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">댓글 알림</h3>
                      <p className="text-sm text-gray-500">새로운 댓글이 달렸을 때 알림을 받습니다</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notificationSettings.commentNotifications}
                        onChange={(e) => handleNotificationUpdate('commentNotifications', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">좋아요 알림</h3>
                      <p className="text-sm text-gray-500">작품에 좋아요가 눌렸을 때 알림을 받습니다</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notificationSettings.likeNotifications}
                        onChange={(e) => handleNotificationUpdate('likeNotifications', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">업데이트 소식</h3>
                      <p className="text-sm text-gray-500">플랫폼 업데이트 및 공지사항을 받아보세요</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notificationSettings.updateNotifications}
                        onChange={(e) => handleNotificationUpdate('updateNotifications', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* 계정 보안 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <Shield className="w-5 h-5 mr-2" />
                  계정 보안
                </h2>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">계정 상태</h3>
                        <p className="text-sm text-gray-500">활성 상태</p>
                      </div>
                    </div>
                  </div>

                  <div className="text-sm text-gray-600">
                    <p className="mb-2"><strong>보안 팁:</strong></p>
                    <ul className="space-y-1 ml-4">
                      <li>• 정기적으로 비밀번호를 변경하세요</li>
                      <li>• 다른 사이트와 다른 비밀번호를 사용하세요</li>
                      <li>• 의심스러운 활동이 있으면 즉시 비밀번호를 변경하세요</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}