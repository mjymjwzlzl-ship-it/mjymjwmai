import { useEffect, useRef } from 'react';

export function useDragScroll<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let isDown = false;
    let startX = 0;
    let startLeft = 0;

    const getX = (e: MouseEvent | TouchEvent) =>
      'touches' in e ? e.touches[0].pageX : (e as MouseEvent).pageX;

    const onDown = (e: MouseEvent | TouchEvent) => {
      isDown = true;
      startX = getX(e) - el.offsetLeft;
      startLeft = el.scrollLeft;
      e.preventDefault();
    };
    const onUp = () => {
      isDown = false;
    };
    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!isDown) return;
      const x = getX(e) - el.offsetLeft;
      const walk = x - startX;
      el.scrollLeft = startLeft - walk;
      e.preventDefault();
    };

    el.addEventListener('mousedown', onDown);
    el.addEventListener('touchstart', onDown, { passive: false });
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchend', onUp);
    el.addEventListener('mousemove', onMove);
    el.addEventListener('touchmove', onMove, { passive: false });

    return () => {
      el.removeEventListener('mousedown', onDown);
      el.removeEventListener('touchstart', onDown);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchend', onUp);
      el.removeEventListener('mousemove', onMove);
      el.removeEventListener('touchmove', onMove);
    };
  }, []);

  return ref;
}


