import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createEbdNavigation, type EbdScreen } from '@/lib/ebd-navigation';

export function useSecretariaNavigation(owner: string | null, onExit: () => void, intercept: () => boolean) {
  const [screen, setScreen] = useState<EbdScreen>({ view: 'home' });
  const latest = useRef({ onExit, intercept });
  latest.current = { onExit, intercept };
  const controller = useMemo(() => owner ? createEbdNavigation(window, [sessionStorage, localStorage], owner, {
    change: setScreen, exit: () => latest.current.onExit(), intercept: () => latest.current.intercept(),
  }) : null, [owner]);
  useEffect(() => { controller?.start(); return () => controller?.stop(); }, [controller]);
  return useMemo(() => ({ screen, open: (next: EbdScreen) => controller?.open(next), back: () => controller?.back(), backTo: (matches: (next: EbdScreen) => boolean) => controller?.backTo(matches), clear: () => controller?.clear() }), [screen, controller]);
}
export const EbdNavigationContext = createContext<ReturnType<typeof useSecretariaNavigation> | null>(null);
export const useEbdNavigation = () => useContext(EbdNavigationContext);
