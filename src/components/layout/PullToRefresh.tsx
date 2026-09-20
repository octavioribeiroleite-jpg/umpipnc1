import { useState, useRef, useCallback, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { applyUpdateNow } from '@/lib/registerSW';
import { toast } from 'sonner';

const THRESHOLD = 80;
const MAX_PULL = 120;

export function PullToRefresh({ children }: { children: React.ReactNode }) {
  const [pulling, setPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const distanceRef = useRef(0);
  const refreshingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const canPull = useCallback(() => {
    // Only allow pull when scrolled to top
    return window.matchMedia('(max-width: 767px)').matches && window.scrollY <= 0;
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let active = false;

    const onTouchStart = (e: TouchEvent) => {
      if (refreshingRef.current || !canPull() || e.touches.length !== 1) return;
      if (document.querySelector('[role="dialog"], [role="alertdialog"]')) return;
      let target = e.target instanceof Element ? e.target : null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
      while (target && target !== container) {
        if (target.scrollTop > 0) return;
        target = target.parentElement;
      }
      startY.current = e.touches[0].clientY;
      distanceRef.current = 0;
      active = true;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!active || refreshingRef.current) return;
      const y = e.touches[0].clientY;
      const diff = y - startY.current;

      if (canPull()) {
        const distance = Math.min(Math.max(0, diff * 0.5), MAX_PULL);
        distanceRef.current = distance;
        setPulling(distance > 5);
        setPullDistance(distance);
        if (distance > 20) {
          e.preventDefault();
        }
      }
    };

    const onTouchEnd = () => {
      if (!active) return;
      active = false;

      if (distanceRef.current >= THRESHOLD && !refreshingRef.current) {
        refreshingRef.current = true;
        setRefreshing(true);
        setPullDistance(THRESHOLD * 0.6);
        void applyUpdateNow().catch(error => {
          toast.error(error instanceof Error ? error.message : 'Não foi possível atualizar. Tente novamente.');
          refreshingRef.current = false;
          setRefreshing(false);
          setPulling(false);
          setPullDistance(0);
        });
      } else {
        setPulling(false);
        setPullDistance(0);
      }
      distanceRef.current = 0;
    };
    const onTouchCancel = () => { active = false; distanceRef.current = 0; setPulling(false); setPullDistance(0); };

    container.addEventListener('touchstart', onTouchStart, { passive: true });
    container.addEventListener('touchmove', onTouchMove, { passive: false });
    container.addEventListener('touchend', onTouchEnd, { passive: true });
    container.addEventListener('touchcancel', onTouchCancel, { passive: true });

    return () => {
      container.removeEventListener('touchstart', onTouchStart);
      container.removeEventListener('touchmove', onTouchMove);
      container.removeEventListener('touchend', onTouchEnd);
      container.removeEventListener('touchcancel', onTouchCancel);
    };
  }, [canPull]);

  const progress = Math.min(pullDistance / THRESHOLD, 1);

  return (
    <div ref={containerRef} className="relative">
      {/* Pull indicator */}
      <div
        className="absolute left-0 right-0 flex items-center justify-center overflow-hidden z-50 pointer-events-none"
        style={{
          height: pulling || refreshing ? `${pullDistance}px` : 0,
          top: 0,
          transition: pulling ? 'none' : 'height 0.3s ease',
        }}
      >
        <div
          className={cn(
            'flex items-center gap-2 text-xs font-medium text-muted-foreground transition-opacity',
            progress > 0.3 ? 'opacity-100' : 'opacity-0'
          )}
        >
          <RefreshCw
            className={cn(
              'h-4 w-4 transition-transform',
              refreshing && 'animate-spin'
            )}
            style={{
              transform: refreshing ? undefined : `rotate(${progress * 360}deg)`,
            }}
          />
          <span>
            {refreshing
              ? 'Atualizando...'
              : progress >= 1
              ? 'Solte para atualizar'
              : 'Puxe para atualizar'}
          </span>
        </div>
      </div>

      {/* Content */}
      <div
        style={{
          transform: pulling || refreshing ? `translateY(${pullDistance}px)` : 'none',
          transition: pulling ? 'none' : 'transform 0.3s ease',
        }}
      >
        {children}
      </div>
    </div>
  );
}
