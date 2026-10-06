import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/ebd-client';
import { createRefreshQueue } from '@/lib/refresh-queue';
import { markEbdDataChanged } from '@/lib/ebd-attendance-queue';

type SnapshotRead = (onSnapshotStart?: () => void) => Promise<unknown>;

export function useEbdSync(
  enabled: boolean,
  sessionKey: string,
  read: SnapshotRead,
  options: { coalesceBeforeSnapshot?: boolean } = {},
) {
  const coalesceBeforeSnapshot = options.coalesceBeforeSnapshot ?? false;
  const latest = useRef(read);
  latest.current = read;
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [syncError, setSyncError] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const { queue, startup } = useMemo(() => {
    const startup = {
      phase: 'idle' as 'idle' | 'validating' | 'snapshot' | 'settled',
      firstSubscriptionSeen: false,
      coalescedSubscription: false,
    };
    const queue = createRefreshQueue(async () => {
      const initialRead = startup.phase === 'idle';
      if (initialRead) startup.phase = 'validating';
      setSyncing(true);
      try {
        await latest.current(() => {
          if (initialRead) startup.phase = 'snapshot';
        });
        setLastSynced(new Date());
        setSyncError(false);
      } catch {
        setSyncError(true);
        if (initialRead && startup.coalescedSubscription) {
          // Preserve the subscription's follow-up if its initial read failed.
          // Request without awaiting the queue that is currently running us.
          startup.coalescedSubscription = false;
          void queue.request();
        }
      } finally {
        if (initialRead) startup.phase = 'settled';
        setSyncing(false);
      }
    });
    return { queue, startup };
  }, [enabled, sessionKey]);

  useEffect(() => {
    if (!enabled) return;
    queue.resume();
    const refresh = () => {
      if (document.visibilityState !== 'visible') return;
      void queue.request();
    };
    let debounce: ReturnType<typeof setTimeout>;
    const changed = () => {
      // An observed remote change invalidates reports before the deferred read.
      markEbdDataChanged();
      clearTimeout(debounce); debounce = setTimeout(refresh, 150);
    };
    const channel = supabase.channel(`ebd-sync-${crypto.randomUUID()}`);
    for (const table of ['ebd_students', 'ebd_classes', 'ebd_attendance', 'ebd_class_visitor_entries', 'ebd_day_closures', 'ebd_call_status']) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, changed);
    }
    refresh();
    channel.subscribe(status => {
      if (status !== 'SUBSCRIBED') return;
      const firstSubscription = !startup.firstSubscriptionSeen;
      startup.firstSubscriptionSeen = true;
      // Opt-in reads signal immediately before dispatching data queries. When
      // subscription precedes that signal, this snapshot already covers it.
      // Legacy reads, dispatched queries and reconnects need reconciliation.
      if (firstSubscription && coalesceBeforeSnapshot && startup.phase === 'validating') {
        startup.coalescedSubscription = true;
        return;
      }
      refresh();
    });
    // Reconcile missed events after reconnects, deletes hidden by RLS, or a
    // device whose network blocks WebSockets.
    const timer = window.setInterval(refresh, 10000);
    window.addEventListener('online', refresh);
    window.addEventListener('focus', refresh);
    window.addEventListener('ebd-data-changed', changed);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      queue.dispose();
      clearTimeout(debounce);
      window.clearInterval(timer);
      window.removeEventListener('online', refresh);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('ebd-data-changed', changed);
      document.removeEventListener('visibilitychange', refresh);
      void supabase.removeChannel(channel);
    };
  }, [enabled, sessionKey, queue, startup, coalesceBeforeSnapshot]);

  return { refresh: queue.request, lastSynced, syncError, syncing };
}
