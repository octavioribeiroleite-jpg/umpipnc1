// Only the Provider's React hook scheduler is replaced. The production JSX,
// effect bodies, SDK event handlers, auth guards and query-cache code execute.
// SSR below verifies child mounting/HTML; browser evidence verifies DOM state.
export let currentHarness;
const sameDeps = (a, b) => a && b && a.length === b.length && a.every((value, i) => Object.is(value, b[i]));
export function beginRender(harness) { currentHarness = harness; harness.cursor = 0; }
export function useState(initial) {
  const harness = currentHarness, index = harness.cursor++;
  if (!(index in harness.slots)) harness.slots[index] = typeof initial === 'function' ? initial() : initial;
  const setState = next => { const value = typeof next === 'function' ? next(harness.slots[index]) : next; if (!Object.is(harness.slots[index], value)) { harness.slots[index] = value; harness.dirty = true; } };
  return [harness.slots[index], setState];
}
export function useRef(initial) { const harness = currentHarness, index = harness.cursor++; return harness.slots[index] ??= {current: initial}; }
export function useMemo(factory, deps) { const harness = currentHarness, index = harness.cursor++, slot = harness.slots[index]; if (!slot || !sameDeps(slot.deps, deps)) harness.slots[index] = {value: factory(), deps}; return harness.slots[index].value; }
export function useCallback(callback, deps) { return useMemo(() => callback, deps); }
export function useEffect(effect, deps) {
  const harness = currentHarness, index = harness.cursor++, prior = harness.slots[index];
  if (!prior || !sameDeps(prior.deps, deps)) { harness.slots[index] = {deps, cleanup: prior?.cleanup}; harness.effects.push(() => { harness.slots[index].cleanup?.(); harness.slots[index].cleanup = effect(); }); }
}
export function cleanupHarness(harness) { for (const slot of harness.slots) slot?.cleanup?.(); }
