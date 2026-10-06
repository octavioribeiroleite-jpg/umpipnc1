import { useEffect, type RefObject } from 'react';

type NavigationContentHeight = '--mobile-header-content-height' | '--mobile-nav-content-height';

/** Measure controls only; the shared shell adds the safe area to each bar once. */
export function useNavigationHeight<T extends HTMLElement>(ref: RefObject<T>, property: NavigationContentHeight) {
  useEffect(() => {
    const content = ref.current;
    const shell = content?.closest<HTMLElement>('.ipnc-navigation-layout');
    if (!content || !shell) return;

    const measure = () => shell.style.setProperty(property, `${content.getBoundingClientRect().height}px`);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(content);

    return () => {
      observer.disconnect();
      shell.style.removeProperty(property);
    };
  }, [ref, property]);
}
