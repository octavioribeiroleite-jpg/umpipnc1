import { useEffect, useRef, type PropsWithChildren } from 'react';
import { composeSurfaceColor } from '@/lib/app-shell-surface';

// The shell is independent of the router and session providers, so errors,
// public entries and future pages inherit the same edge-to-edge foundation.
export default function AppShell({ children }: PropsWithChildren) {
  const shell = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    const viewport = window.visualViewport;
    let frame = 0;
    const updateViewport = () => {
      // A focused keyboard must leave forms and their scroll area usable.
      // Without a keyboard CSS dvh follows the browser's own viewport.
      const editing = document.activeElement?.matches('input, textarea, [contenteditable="true"]');
      if (viewport && editing && viewport.height < window.innerHeight * .8) {
        root.style.setProperty('--app-viewport-height', `${Math.round(viewport.height)}px`);
        root.dataset.keyboardOpen = 'true';
      } else {
        root.style.removeProperty('--app-viewport-height');
        delete root.dataset.keyboardOpen;
      }
    };
    const updateSurface = () => {
      frame = 0;
      // Sample the visible upper surface, including fixed headers and portals.
      // Decorative SVG leaves have no opaque CSS background of their own.
      // Wide layouts have a small light logo plate in the left navigation; the
      // main upper surface represents the window chrome, rather than that plate.
      const sampleX = window.innerWidth >= 700 ? window.innerWidth / 2 : Math.min(24, window.innerWidth / 2);
      const candidates = document.elementsFromPoint(sampleX, 1);
      const backgrounds: string[] = [];
      for (const candidate of candidates) {
        if (candidate === root || candidate === document.body || candidate === shell.current || candidate.classList.contains('ipnc-route-stage') || candidate.closest('[data-sonner-toaster], .ipnc-toast-viewport')) continue;
        backgrounds.push(getComputedStyle(candidate).backgroundColor);
      }
      // Use the system base, not body/edge (which contains our previous sample),
      // so transparent headers and repeated scrim samples cannot feed back.
      const color = composeSurfaceColor(backgrounds, root.classList.contains('dark') ? [13, 18, 16] : [247, 251, 248]);
      const navHeight = Math.max(0, ...Array.from(document.querySelectorAll('nav')).map(nav => {
        const rect = nav.getBoundingClientRect();
        return getComputedStyle(nav).position === 'fixed' && rect.height > 0 && Math.abs(rect.bottom - window.innerHeight) < 2 ? rect.height : 0;
      }));
      const clearance = navHeight ? `${navHeight}px` : 'var(--safe-bottom)';
      if (root.style.getPropertyValue('--app-bottom-overlay-height') !== clearance) root.style.setProperty('--app-bottom-overlay-height', clearance);
      const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
      if (meta && meta.content !== color) meta.content = color;
      if (root.style.getPropertyValue('--app-edge-background') !== color) root.style.setProperty('--app-edge-background', color);
    };
    const scheduleSurface = () => { if (!frame) frame = requestAnimationFrame(updateSurface); };
    const resize = () => { updateViewport(); scheduleSurface(); };
    const observer = new MutationObserver(scheduleSurface);
    observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'style', 'data-state'] });
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    window.addEventListener('resize', resize);
    window.addEventListener('scroll', scheduleSurface, true);
    viewport?.addEventListener('resize', resize);
    document.addEventListener('focusin', resize);
    document.addEventListener('focusout', resize);
    resize();
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      window.removeEventListener('scroll', scheduleSurface, true);
      viewport?.removeEventListener('resize', resize);
      document.removeEventListener('focusin', resize);
      document.removeEventListener('focusout', resize);
      root.style.removeProperty('--app-viewport-height');
      root.style.removeProperty('--app-edge-background');
      root.style.removeProperty('--app-bottom-overlay-height');
      delete root.dataset.keyboardOpen;
    };
  }, []);

  return <div ref={shell} className="ipnc-app-shell"><div className="ipnc-route-stage">{children}</div></div>;
}
