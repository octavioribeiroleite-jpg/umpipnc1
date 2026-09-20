import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/ebd-client';
import { createRefreshQueue } from '@/lib/refresh-queue';

export function useEbdSync(enabled: boolean, sessionKey: string, read: () => Promise<unknown>) {
  const latest = useRef(read);
  latest.current = read;
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [syncError, setSyncError] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const queue = useMemo(() => createRefreshQueue(async () => {
    setSyncing(true);
    try {
      await latest.current();
      setLastSynced(new Date());
      setSyncError(false);
    } catch {
      setSyncError(true);
    } finally { setSyncing(false); }
  }), [enabled, sessionKey]);

  useEffect(() => {
    if (!enabled) return;
    queue.resume();
    const refresh = () => { if (document.visibilityState === 'visible') void queue.request(); };
    let debounce: ReturnType<typeof setTimeout>;
    const changed = () => { clearTimeout(debounce); debounce = setTimeout(refresh, 150); };
    const channel = supabase.channel(`ebd-sync-${crypto.randomUUID()}`);
    for (const table of ['ebd_students', 'ebd_classes', 'ebd_attendance', 'ebd_class_visitor_entries', 'ebd_day_closures', 'ebd_call_status']) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, changed);
    }
    channel.subscribe(status => { if (status === 'SUBSCRIBED') refresh(); });
    refresh();
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
  }, [enabled, sessionKey, queue]);

  return { refresh: queue.request, lastSynced, syncError, syncing };
}
