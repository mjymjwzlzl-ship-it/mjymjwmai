// WebView에서 인증 처리를 위한 헬퍼 함수들

/**
 * WebView에서 안전하게 로그인 상태 확인
 */
export function checkAuthInWebView(): boolean {
  // WebView인지 확인
  const isApp = typeof window !== 'undefined' && (window as any).isArataApp;
  
  if (!isApp) {
    // 일반 웹브라우저
    return !!localStorage.getItem('authToken');
  }
  
  // WebView에서는 쿠키도 함께 확인
  try {
    const token = localStorage.getItem('authToken');
    const user = localStorage.getItem('user');
    
    // 토큰이 있으면 로그인 상태
    if (token && user) {
      return true;
    }
    
    // 쿠키 체크 (백업)
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
      if (cookie.trim().startsWith('authToken=')) {
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error('Auth check error in WebView:', error);
    return false;
  }
}

/**
 * WebView에서 로그인 후 처리
 */
export function handleLoginSuccessInWebView(token: string, user: any) {
  const isApp = typeof window !== 'undefined' && (window as any).isArataApp;
  
  // localStorage에 저장
  localStorage.setItem('authToken', token);
  localStorage.setItem('user', JSON.stringify(user));
  
  if (isApp) {
    // WebView에서는 쿠키도 설정
    document.cookie = `authToken=${token}; path=/; max-age=86400`;
    
    // 이벤트 발생
    window.dispatchEvent(new Event('loginStateChanged'));
    
    // 약간의 지연 후 메인 페이지로 이동
    setTimeout(() => {
      window.location.href = '/';
    }, 500);
  } else {
    // 일반 브라우저에서는 바로 이동
    window.location.replace('/');
  }
}

/**
 * WebView에서 로그아웃 처리
 */
export function handleLogoutInWebView() {
  const isApp = typeof window !== 'undefined' && (window as any).isArataApp;
  
  // localStorage 삭제
  localStorage.removeItem('authToken');
  localStorage.removeItem('user');
  
  if (isApp) {
    // 쿠키도 삭제
    document.cookie = 'authToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    
    // 이벤트 발생
    window.dispatchEvent(new Event('loginStateChanged'));
    
    // 메인 페이지로 이동
    setTimeout(() => {
      window.location.href = '/';
    }, 500);
  } else {
    window.location.replace('/');
  }
}

/**
 * WebView에서 로딩 타임아웃 설정
 */
export function setLoadingTimeout(setLoading: (value: boolean) => void, timeout = 5000) {
  const timeoutId = setTimeout(() => {
    setLoading(false);
    console.log('Loading timeout - force disabled');
  }, timeout);
  
  return timeoutId;
}