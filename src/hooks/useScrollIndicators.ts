import { RefObject, useCallback, useEffect, useState } from 'react';

export function useScrollIndicators(ref: RefObject<HTMLElement>) {
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;

    const maxScroll = el.scrollHeight - el.clientHeight;
    setCanScrollUp(el.scrollTop > 4);
    setCanScrollDown(maxScroll - el.scrollTop > 4);
  }, [ref]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    update();
    el.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);

    const observer = new ResizeObserver(update);
    observer.observe(el);

    return () => {
      el.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      observer.disconnect();
    };
  }, [ref, update]);

  const scrollUp = () => ref.current?.scrollBy({ top: -220, behavior: 'smooth' });
  const scrollDown = () => ref.current?.scrollBy({ top: 220, behavior: 'smooth' });

  return { canScrollUp, canScrollDown, scrollUp, scrollDown };
}