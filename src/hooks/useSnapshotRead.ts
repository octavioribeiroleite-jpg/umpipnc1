import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { createSnapshotRead } from '@/lib/snapshot-read';

export function useSnapshotRead(scope: string) {
  // A different query scope must start without the previous scope’s snapshot.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const reader = useMemo(() => createSnapshotRead(), [scope]);
  const state = useSyncExternalStore(reader.subscribe, reader.getSnapshot, reader.getSnapshot);
  useEffect(() => { reader.resume(); return reader.dispose; }, [reader]);
  return { ...state, run: reader.run };
}
