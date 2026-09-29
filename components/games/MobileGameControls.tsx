'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, RotateCw, ArrowDown, Square } from 'lucide-react';

interface MobileGameControlsProps {
  onMove: (direction: 'left' | 'right' | 'up' | 'down') => void;
  onAction?: (action: 'rotate' | 'drop' | 'action1' | 'action2') => void;
  gameType?: 'tetris' | 'snake' | 'pacman' | 'pong' | 'breakout' | 'flappy' | '2048' | 'memory' | 'sudoku';
  className?: string;
}

export default function MobileGameControls({ 
  onMove, 
  onAction,
  gameType = 'tetris',
  className = ''
}: MobileGameControlsProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [isPressed, setIsPressed] = useState<string | null>(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleTouchStart = useCallback((action: string) => (e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsPressed(action);
    
    if (action.startsWith('move-')) {
      const direction = action.replace('move-', '') as 'left' | 'right' | 'up' | 'down';
      onMove(direction);
      
      // 연속 이동을 위한 interval
      const interval = setInterval(() => {
        onMove(direction);
      }, 100);
      
      // touchend 이벤트 리스너
      const handleTouchEnd = () => {
        clearInterval(interval);
        setIsPressed(null);
        document.removeEventListener('touchend', handleTouchEnd);
      };
      document.addEventListener('touchend', handleTouchEnd);
    } else if (onAction) {
      onAction(action as any);
    }
  }, [onMove, onAction]);

  if (!isMobile) return null;

  // 게임별 버튼 구성
  const getActionButtons = () => {
    switch (gameType) {
      case 'tetris':
        return (
          <>
            <button
              className={`touch-button ${isPressed === 'rotate' ? 'pressed' : ''}`}
              onTouchStart={handleTouchStart('rotate')}
            >
              <RotateCw className="w-6 h-6" />
            </button>
            <button
              className={`touch-button ${isPressed === 'drop' ? 'pressed' : ''}`}
              onTouchStart={handleTouchStart('drop')}
            >
              <ArrowDown className="w-6 h-6" />
            </button>
          </>
        );
      case 'flappy':
        return (
          <button
            className={`touch-button large ${isPressed === 'action1' ? 'pressed' : ''}`}
            onTouchStart={handleTouchStart('action1')}
          >
            <ChevronUp className="w-8 h-8" />
          </button>
        );
      case 'pacman':
      case 'snake':
        return null; // 방향키만 필요
      case 'pong':
      case 'breakout':
        return (
          <>
            <button
              className={`touch-button ${isPressed === 'action1' ? 'pressed' : ''}`}
              onTouchStart={handleTouchStart('action1')}
            >
              A
            </button>
            <button
              className={`touch-button ${isPressed === 'action2' ? 'pressed' : ''}`}
              onTouchStart={handleTouchStart('action2')}
            >
              B
            </button>
          </>
        );
      default:
        return (
          <button
            className={`touch-button ${isPressed === 'action1' ? 'pressed' : ''}`}
            onTouchStart={handleTouchStart('action1')}
          >
            <Square className="w-6 h-6" />
          </button>
        );
    }
  };

  const needsDPad = gameType !== 'flappy' && gameType !== 'memory' && gameType !== 'sudoku';

  return (
    <div className={`mobile-controls ${className}`}>
      {needsDPad && (
        <div className="dpad-container">
          <div className="dpad">
            <button
              className={`dpad-button up ${isPressed === 'move-up' ? 'pressed' : ''}`}
              onTouchStart={handleTouchStart('move-up')}
            >
              <ChevronUp className="w-6 h-6" />
            </button>
            <div className="dpad-horizontal">
              <button
                className={`dpad-button left ${isPressed === 'move-left' ? 'pressed' : ''}`}
                onTouchStart={handleTouchStart('move-left')}
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <div className="dpad-center" />
              <button
                className={`dpad-button right ${isPressed === 'move-right' ? 'pressed' : ''}`}
                onTouchStart={handleTouchStart('move-right')}
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>
            <button
              className={`dpad-button down ${isPressed === 'move-down' ? 'pressed' : ''}`}
              onTouchStart={handleTouchStart('move-down')}
            >
              <ChevronDown className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}
      
      <div className="action-buttons">
        {getActionButtons()}
      </div>

      <style jsx>{`
        .mobile-controls {
          position: fixed;
          bottom: 20px;
          left: 0;
          right: 0;
          display: flex;
          justify-content: space-between;
          padding: 0 20px;
          pointer-events: none;
          z-index: 100;
        }

        .dpad-container, .action-buttons {
          pointer-events: auto;
        }

        .dpad {
          position: relative;
          width: 150px;
          height: 150px;
        }

        .dpad-button {
          position: absolute;
          width: 50px;
          height: 50px;
          background: rgba(139, 92, 246, 0.8);
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          transition: all 0.1s;
          backdrop-filter: blur(10px);
        }

        .dpad-button.up {
          top: 0;
          left: 50%;
          transform: translateX(-50%);
        }

        .dpad-button.down {
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
        }

        .dpad-horizontal {
          position: absolute;
          top: 50%;
          left: 0;
          right: 0;
          transform: translateY(-50%);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .dpad-button.left {
          position: relative;
        }

        .dpad-button.right {
          position: relative;
        }

        .dpad-center {
          width: 40px;
          height: 40px;
          background: rgba(75, 85, 99, 0.5);
          border-radius: 50%;
          backdrop-filter: blur(10px);
        }

        .dpad-button.pressed {
          background: rgba(168, 85, 247, 1);
          transform: scale(0.95);
          box-shadow: 0 0 20px rgba(168, 85, 247, 0.6);
        }

        .dpad-button.up.pressed {
          transform: translateX(-50%) scale(0.95);
        }

        .dpad-button.down.pressed {
          transform: translateX(-50%) scale(0.95);
        }

        .action-buttons {
          display: flex;
          gap: 20px;
          align-items: center;
        }

        .touch-button {
          width: 60px;
          height: 60px;
          background: rgba(239, 68, 68, 0.8);
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 18px;
          transition: all 0.1s;
          backdrop-filter: blur(10px);
        }

        .touch-button.large {
          width: 80px;
          height: 80px;
        }

        .touch-button.pressed {
          background: rgba(239, 68, 68, 1);
          transform: scale(0.95);
          box-shadow: 0 0 20px rgba(239, 68, 68, 0.6);
        }

        @media (max-width: 480px) {
          .dpad {
            width: 120px;
            height: 120px;
          }

          .dpad-button {
            width: 40px;
            height: 40px;
          }

          .touch-button {
            width: 50px;
            height: 50px;
          }

          .touch-button.large {
            width: 70px;
            height: 70px;
          }
        }
      `}</style>
    </div>
  );
}