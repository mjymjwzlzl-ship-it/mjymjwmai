'use client';

import { useEffect, useRef } from 'react';

export function useDragScroll<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    let dragging = false;
    let startX = 0;
    let startScrollLeft = 0;
    let moved = false;

    const finishDrag = () => {
      dragging = false;
      element.classList.remove('cursor-grabbing', 'select-none');
    };

    const handleMouseDown = (event: MouseEvent) => {
      if (event.button !== 0) return;
      dragging = true;
      startX = event.clientX;
      startScrollLeft = element.scrollLeft;
      moved = false;
      element.classList.add('cursor-grabbing', 'select-none');
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (!dragging) return;
      const distance = event.clientX - startX;
      if (Math.abs(distance) > 4) moved = true;
      if (!moved) return;
      event.preventDefault();
      element.scrollLeft = startScrollLeft - distance;
    };

    const handleClickCapture = (event: MouseEvent) => {
      if (!moved) return;
      event.preventDefault();
      event.stopPropagation();
      moved = false;
    };

    const handleDragStart = (event: DragEvent) => event.preventDefault();
    const handleWheel = (event: WheelEvent) => {
      if (element.scrollWidth <= element.clientWidth) return;
      const horizontalDelta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      if (!horizontalDelta) return;
      event.preventDefault();
      element.scrollLeft += horizontalDelta;
    };

    element.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', finishDrag);
    element.addEventListener('click', handleClickCapture, true);
    element.addEventListener('dragstart', handleDragStart);
    element.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      element.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', finishDrag);
      element.removeEventListener('click', handleClickCapture, true);
      element.removeEventListener('dragstart', handleDragStart);
      element.removeEventListener('wheel', handleWheel);
    };
  }, []);

  return ref;
}
