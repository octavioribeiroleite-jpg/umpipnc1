import { useSyncExternalStore } from 'react';
import { pwaInstall } from '@/lib/pwaInstall';

export function usePWAInstall() {
  const state = useSyncExternalStore(pwaInstall.subscribe, pwaInstall.getSnapshot, pwaInstall.getSnapshot);
  return { ...state, open: pwaInstall.open, close: pwaInstall.close, install: pwaInstall.install };
}
