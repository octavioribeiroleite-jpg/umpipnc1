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
  const [refreshing, setRefreshing] = useState(false);
  const [snapshotHtml, setSnapshotHtml] = useState('');
  const [snapshotHeight, setSnapshotHeight] = useState(0);

  useEffect(() => {
    const element = contentRef.current;
    if (!element) return;

    const inspect = () => {
      const hasLoader = Boolean(element.querySelector('.animate-spin'));

      if (hasLoader) {
        if (lastStableHtmlRef.current) {
          setSnapshotHtml(lastStableHtmlRef.current);
          setSnapshotHeight(lastStableHeightRef.current);
          setRefreshing(true);
        }
        return;
      }

      lastStableHtmlRef.current = element.innerHTML;
      lastStableHeightRef.current = element.getBoundingClientRect().height;
      setRefreshing(false);
    };

    inspect();
    const observer = new MutationObserver(inspect);
    observer.observe(element, { childList: true, subtree: true, attributes: true });

    const resizeObserver = new ResizeObserver(() => {
      if (!element.querySelector('.animate-spin')) {
        lastStableHeightRef.current = element.getBoundingClientRect().height;
      }
    });
    resizeObserver.observe(element);

    return () => {
      observer.disconnect();
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div className={`relative ${className || ''}`} style={refreshing && snapshotHeight ? { minHeight: snapshotHeight } : undefined}>
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
