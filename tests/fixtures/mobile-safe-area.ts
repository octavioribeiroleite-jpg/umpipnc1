// Fixture-only geometry. This does not emulate a physical notch or installed PWA.
export function applyFixtureSafeAreas(params = new URLSearchParams(location.search)) {
  if (params.get('font') === '200') document.documentElement.style.fontSize = '200%';
  const insets = params.get('safe') === 'landscape' ? { top: 0, bottom: 21, left: 44, right: 0 }
    : params.get('safe') === '1' ? { top: 44, bottom: 34, left: 18, right: 18 } : null;
  if (!insets) return;
  for (const [side, value] of Object.entries(insets)) {
    document.documentElement.style.setProperty(`--safe-${side}`, `${value}px`);
  }
}
