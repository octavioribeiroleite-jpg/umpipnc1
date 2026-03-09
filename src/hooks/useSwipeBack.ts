import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Adds swipe-right-to-go-back gesture on mobile.
 * Swipe must start within 30px of the left edge and travel at least 80px.
 */
export function useSwipeBack() {
  const navigate = useNavigate();
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (touch.clientX <= 30) {
        touchStartX.current = touch.clientX;
        touchStartY.current = touch.clientY;
      } else {
        touchStartX.current = -1;
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (touchStartX.current < 0) return;
      const touch = e.changedTouches[0];
      const dx = touch.clientX - touchStartX.current;
      const dy = Math.abs(touch.clientY - touchStartY.current);
      // Must swipe mostly horizontal and at least 80px
      if (dx > 80 && dy < dx * 0.5) {
        navigate(-1);
      }
      touchStartX.current = -1;
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [navigate]);
}
