/** Composite the visible stack, so a portaled scrim also updates browser chrome. */
export function composeSurfaceColor(backgrounds: string[], fallback = [247, 251, 248]): string {
  const result = [0, 0, 0];
  let remaining = 1;
  for (const background of backgrounds) {
    const match = background.match(/^rgba?\(\s*(\d+)[, ]+\s*(\d+)[, ]+\s*(\d+)(?:\s*[,/]\s*([\d.]+))?\s*\)$/);
    if (!match) continue;
    const alpha = Math.max(0, Math.min(1, match[4] === undefined ? 1 : Number(match[4])));
    for (let channel = 0; channel < 3; channel++) result[channel] += Number(match[channel + 1]) * alpha * remaining;
    remaining *= 1 - alpha;
    if (remaining === 0) break;
  }
  return `#${result.map((value, channel) => Math.round(value + fallback[channel] * remaining).toString(16).padStart(2, '0')).join('')}`;
}
