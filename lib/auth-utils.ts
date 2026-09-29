// 로그인 상태 관리 유틸리티

export const setTestLogin = () => {
  // 테스트용 토큰 설정
  localStorage.setItem('authToken', 'test-token-' + Date.now());
  localStorage.setItem('user', JSON.stringify({
    id: 'test-user',
    email: 'test@example.com',
    username: 'TestUser'
  }));
};

export const logout = () => {
  localStorage.removeItem('authToken');
  localStorage.removeItem('user');
  localStorage.removeItem('viewedWebtoons'); // 시청 기록도 삭제 (옵션)
};

export const isLoggedIn = () => {
  return !!localStorage.getItem('authToken');
};

export const getCurrentUser = () => {
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
};