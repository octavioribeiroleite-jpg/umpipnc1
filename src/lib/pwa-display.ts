export const INSTALLED_DISPLAY_QUERIES = [
  '(display-mode: fullscreen)',
  '(display-mode: standalone)',
  '(display-mode: minimal-ui)',
] as const;

export function isInstalledDisplayMode(browser: {
  matchMedia?: (query: string) => { matches: boolean };
  navigator?: { standalone?: boolean };
}): boolean {
  return Boolean(browser.navigator?.standalone) ||
    INSTALLED_DISPLAY_QUERIES.some(query => browser.matchMedia?.(query).matches);
}
