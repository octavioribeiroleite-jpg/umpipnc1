export const SYSTEM_THEME_QUERY = '(prefers-color-scheme: dark)';
export const SYSTEM_THEME_COLORS = { light: '#f7fbf8', dark: '#0d1210' } as const;

/** Follow the device preference without saving an override or touching sessions. */
export function startSystemTheme(win: Window = window, doc: Document = document) {
  const media = typeof win.matchMedia === 'function' ? win.matchMedia(SYSTEM_THEME_QUERY) : null;
  const apply = () => {
    const dark = media?.matches === true;
    const mode = dark ? 'dark' : 'light';
    const root = doc.documentElement;
    // A resume event must not overwrite chrome sampled from the current header.
    if (root.dataset.ipncTheme === mode && root.classList.contains('dark') === dark) return;
    root.classList.toggle('dark', dark);
    root.dataset.ipncTheme = mode;
    root.style.colorScheme = mode;
    root.style.setProperty('--ipnc-boot-background', SYSTEM_THEME_COLORS[mode]);
    root.style.setProperty('--app-edge-background', SYSTEM_THEME_COLORS[mode]);
    const meta = doc.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (meta) meta.content = SYSTEM_THEME_COLORS[mode];
  };
  const resume = () => { if (doc.visibilityState === 'visible') apply(); };
  apply();
  if (media?.addEventListener) media.addEventListener('change', apply);
  else media?.addListener(apply);
  win.addEventListener('pageshow', apply);
  doc.addEventListener('visibilitychange', resume);
  return () => {
    if (media?.removeEventListener) media.removeEventListener('change', apply);
    else media?.removeListener(apply);
    win.removeEventListener('pageshow', apply);
    doc.removeEventListener('visibilitychange', resume);
  };
}
