export interface SnapshotReadState {
  loading: boolean;
  hasSnapshot: boolean;
  error: boolean;
}

// A group of related reads is committed only when all succeeded. Failed reads
// never replace a confirmed snapshot with empty arrays or zero-valued totals.
export function createSnapshotRead() {
  let state: SnapshotReadState = { loading: true, hasSnapshot: false, error: false };
  let version = 0;
  let disposed = false;
  const listeners = new Set<() => void>();
  const publish = (next: SnapshotReadState) => { state = next; listeners.forEach(listener => listener()); };
  return {
    getSnapshot: () => state,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    resume: () => { disposed = false; },
    dispose: () => { disposed = true; version++; },
    run: async (load: () => Promise<() => void>) => {
      const request = ++version;
      publish({ ...state, loading: true });
      try {
        const commit = await load();
        if (disposed || request !== version) return;
        commit();
        publish({ loading: false, hasSnapshot: true, error: false });
      } catch {
        if (!disposed && request === version) publish({ ...state, loading: false, error: true });
      }
    },
  };
}
