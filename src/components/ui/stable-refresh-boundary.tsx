import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

interface StableRefreshBoundaryProps {
  children: ReactNode;
  className?: string;
}

export function StableRefreshBoundary({ children, className }: StableRefreshBoundaryProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const lastStableHtmlRef = useRef('');
  const lastStableHeightRef = useRef(0);
  const savedScrollYRef = useRef(0);
  const scrollLockUntilRef = useRef(0);
  const wasRefreshingRef = useRef(false);
  const [refreshing, setRefreshing] = useState(false);
  const [snapshotHtml, setSnapshotHtml] = useState('');
  const [stableHeight, setStableHeight] = useState(0);

  useEffect(() => {
    const element = contentRef.current;
    if (!element) return;

    const savePosition = () => {
      savedScrollYRef.current = window.scrollY;
      scrollLockUntilRef.current = Date.now() + 3500;
      const height = element.getBoundingClientRect().height;
      if (height > 0) {
        lastStableHeightRef.current = height;
        setStableHeight(height);
      }
    };

    const forceSavedPosition = () => {
      if (Date.now() > scrollLockUntilRef.current) return;
      const target = savedScrollYRef.current;
      if (Math.abs(window.scrollY - target) > 1) {
        window.scrollTo({ top: target, left: window.scrollX, behavior: 'auto' });
      }
    };

    const restoreRepeatedly = () => {
      let frames = 0;
      const restore = () => {
        forceSavedPosition();
        frames += 1;
        if (frames < 12 && Date.now() <= scrollLockUntilRef.current) {
          requestAnimationFrame(restore);
        }
      };
      requestAnimationFrame(restore);
    };

    const isRelevantAction = (target: EventTarget | null) => {
      const node = target instanceof Element ? target.closest('button,[role="button"]') : null;
      if (!node) return false;
      const title = node.getAttribute('title') || '';
      const text = node.textContent?.trim().toLowerCase() || '';
      return (
        title === 'Registrar pagamento' ||
        title === 'Marcar entregue' ||
        title === 'Desfazer entrega' ||
        text.includes('registrar pagamento') ||
        text === 'entregar' ||
        text === 'desfazer' ||
        text.includes('confirmar pagamento')
      );
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (isRelevantAction(event.target)) savePosition();
    };

    const inspect = () => {
      const hasLoader = Boolean(element.querySelector('.animate-spin'));

      if (hasLoader) {
        if (!wasRefreshingRef.current) {
          if (scrollLockUntilRef.current < Date.now()) savePosition();
          wasRefreshingRef.current = true;
        }

        if (lastStableHtmlRef.current) {
          setSnapshotHtml(lastStableHtmlRef.current);
          setRefreshing(true);
          restoreRepeatedly();
        }
        return;
      }

      const height = element.getBoundingClientRect().height;
      if (height > 0) {
        lastStableHtmlRef.current = element.innerHTML;
        lastStableHeightRef.current = height;
        setStableHeight(height);
      }
      setRefreshing(false);

      if (wasRefreshingRef.current) {
        wasRefreshingRef.current = false;
        restoreRepeatedly();
      }
    };

    inspect();
    document.addEventListener('pointerdown', handlePointerDown, true);
    window.addEventListener('scroll', forceSavedPosition, { passive: true });

    const observer = new MutationObserver(() => {
      inspect();
      forceSavedPosition();
    });
    observer.observe(element, { childList: true, subtree: true, attributes: true });

    const resizeObserver = new ResizeObserver(() => {
      if (!element.querySelector('.animate-spin')) {
        const height = element.getBoundingClientRect().height;
        if (height > 0) {
          lastStableHeightRef.current = height;
          setStableHeight(height);
        }
      }
      forceSavedPosition();
    });
    resizeObserver.observe(element);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
      window.removeEventListener('scroll', forceSavedPosition);
      observer.disconnect();
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div
      className={`relative ${className || ''}`}
      style={{
        minHeight: stableHeight || undefined,
        overflowAnchor: 'none',
      }}
    >
      {refreshing && snapshotHtml && (
        <div className="absolute inset-x-0 top-0 z-10 pointer-events-none select-none" aria-hidden="true">
          <div dangerouslySetInnerHTML={{ __html: snapshotHtml }} />
          <div className="absolute right-3 top-3 flex items-center gap-2 rounded-full border bg-background/95 px-3 py-1.5 text-xs font-semibold text-muted-foreground shadow-lg backdrop-blur">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Atualizando
          </div>
        </div>
      )}

      <div ref={contentRef} className={refreshing ? 'invisible' : undefined}>
        {children}
      </div>
    </div>
  );
}
