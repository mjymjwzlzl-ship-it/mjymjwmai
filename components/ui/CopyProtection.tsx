'use client';

import { useEffect } from 'react';

export default function CopyProtection() {
  useEffect(() => {
    // 우클릭 방지
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    // 드래그 방지
    const handleDragStart = (e: DragEvent) => {
      e.preventDefault();
      return false;
    };

    // 텍스트 선택 방지
    const handleSelectStart = (e: Event) => {
      e.preventDefault();
      return false;
    };

    // 키보드 단축키 방지 (Ctrl+C, Ctrl+A, Ctrl+S, F12 등)
    const handleKeyDown = (e: KeyboardEvent) => {
      // F12 (개발자 도구)
      if (e.key === 'F12') {
        e.preventDefault();
        return false;
      }

      // Ctrl 키 조합들
      if (e.ctrlKey) {
        // Ctrl+C (복사)
        if (e.key === 'c' || e.key === 'C') {
          e.preventDefault();
          return false;
        }
        // Ctrl+A (전체 선택)
        if (e.key === 'a' || e.key === 'A') {
          e.preventDefault();
          return false;
        }
        // Ctrl+S (저장)
        if (e.key === 's' || e.key === 'S') {
          e.preventDefault();
          return false;
        }
        // Ctrl+P (인쇄)
        if (e.key === 'p' || e.key === 'P') {
          e.preventDefault();
          return false;
        }
        // Ctrl+U (소스 보기)
        if (e.key === 'u' || e.key === 'U') {
          e.preventDefault();
          return false;
        }
        // Ctrl+Shift+I (개발자 도구)
        if (e.shiftKey && (e.key === 'i' || e.key === 'I')) {
          e.preventDefault();
          return false;
        }
        // Ctrl+Shift+C (요소 검사)
        if (e.shiftKey && (e.key === 'c' || e.key === 'C')) {
          e.preventDefault();
          return false;
        }
        // Ctrl+Shift+J (콘솔)
        if (e.shiftKey && (e.key === 'j' || e.key === 'J')) {
          e.preventDefault();
          return false;
        }
      }
    };

    // 이미지 드래그 방지 특별 처리
    const handleImageDrag = (e: DragEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'IMG') {
        e.preventDefault();
        return false;
      }
    };

    // 개발자 도구 열기 감지 및 경고
    const detectDevTools = () => {
      const threshold = 160;
      
      setInterval(() => {
        if (window.outerHeight - window.innerHeight > threshold || 
            window.outerWidth - window.innerWidth > threshold) {
          console.clear();
          console.log('🚫 개발자 도구 사용이 감지되었습니다. 콘텐츠 보호를 위해 접근이 제한됩니다.');
        }
      }, 1000);
    };

    // 모든 이벤트 리스너 등록
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('dragstart', handleDragStart);
    document.addEventListener('selectstart', handleSelectStart);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('dragstart', handleImageDrag);

    // CSS 스타일로 추가 보호
    const style = document.createElement('style');
    style.textContent = `
      /* 입력 필드는 선택 가능하게 */
      input, textarea, [contenteditable="true"], button {
        -webkit-user-select: text !important;
        -moz-user-select: text !important;
        -ms-user-select: text !important;
        user-select: text !important;
      }

      /* 이미지 보호 - 드래그 방지하되 클릭은 가능하게 */
      img {
        -webkit-user-drag: none !important;
        -khtml-user-drag: none !important;
        -moz-user-drag: none !important;
        -o-user-drag: none !important;
        user-drag: none !important;
        -webkit-touch-callout: none !important;
        pointer-events: auto !important;
      }

      /* 비디오 보호 */
      video {
        -webkit-user-drag: none !important;
        -khtml-user-drag: none !important;
        -moz-user-drag: none !important;
        -o-user-drag: none !important;
        user-drag: none !important;
        -webkit-touch-callout: none !important;
      }

      /* 인쇄 방지 */
      @media print {
        * {
          display: none !important;
        }
        body::after {
          content: "콘텐츠 보호를 위해 인쇄가 제한됩니다.";
          display: block !important;
          text-align: center;
          font-size: 24px;
          margin-top: 100px;
        }
      }
    `;
    document.head.appendChild(style);

    // 개발자 도구 감지 시작
    detectDevTools();

    // 클린업 함수
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('dragstart', handleDragStart);
      document.removeEventListener('selectstart', handleSelectStart);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('dragstart', handleImageDrag);
      if (document.head.contains(style)) {
        document.head.removeChild(style);
      }
    };
  }, []);

  return null; // 이 컴포넌트는 UI를 렌더링하지 않음
}