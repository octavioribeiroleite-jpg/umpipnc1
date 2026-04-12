import { useState, useRef, useCallback, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

const THRESHOLD = 80;
const MAX_PULL = 120;

export function PullToRefresh({ children }: { children: React.ReactNode }) {
  const [pulling, setPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const canPull = useCallback(() => {
    // Only allow pull when scrolled to top
    return window.scrollY <= 0;
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let active = false;

    const onTouchStart = (e: TouchEvent) => {
      if (refreshing || !canPull()) return;
      startY.current = e.touches[0].clientY;
      active = true;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!active || refreshing) return;
      const y = e.touches[0].clientY;
      const diff = y - startY.current;

      if (diff > 10 && canPull()) {
        setPulling(true);
        const distance = Math.min(diff * 0.5, MAX_PULL);
        setPullDistance(distance);
        if (distance > 20) {
          e.preventDefault();
        }
      }
    };

    const onTouchEnd = () => {
      if (!active) return;
      active = false;

      if (pullDistance >= THRESHOLD && !refreshing) {
        setRefreshing(true);
        setPullDistance(THRESHOLD * 0.6);

        // Check for SW update + reload
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.getRegistrations().then(registrations => {
            const updatePromises = registrations.map(reg => reg.update().catch(() => {}));
            Promise.all(updatePromises).then(() => {
              setTimeout(() => {
                window.location.reload();
              }, 600);
            });
          });
        } else {
          setTimeout(() => window.location.reload(), 600);
        }
      } else {
        setPulling(false);
        setPullDistance(0);
      }
    };

    container.addEventListener('touchstart', onTouchStart, { passive: true });
    container.addEventListener('touchmove', onTouchMove, { passive: false });
    container.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', onTouchStart);
      container.removeEventListener('touchmove', onTouchMove);
      container.removeEventListener('touchend', onTouchEnd);
    };
  }, [pullDistance, refreshing, canPull]);

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
