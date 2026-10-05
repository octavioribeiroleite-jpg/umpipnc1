import { useSyncExternalStore } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Session } from '@supabase/supabase-js';
import { treasuryClient } from '@/integrations/supabase/treasury-client';
import { treasuryError } from '@/lib/treasury';

let state: { session: Session | null; loading: boolean } = { session: null, loading: true };
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
treasuryClient.auth.onAuthStateChange((_event, session) => { state = { session, loading: false }; listeners.forEach(fn => fn()); });
const getSnapshot = () => state;

export function useTreasuryIdentity() {
  const { session, loading } = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const access = useQuery({ queryKey: ['treasury', 'access', session?.user.id, session?.user.app_metadata?.ipnc_portal?.fingerprint], enabled: Boolean(session) && !loading,
    retry: false, staleTime: 0, refetchInterval: 30_000, refetchOnWindowFocus: true,
    queryFn: async ({ signal }) => {
      const { data, error } = await treasuryClient.rpc('treasury_access').abortSignal(signal);
      if (error) throw treasuryError(error);
      if (!data || typeof data.admin !== 'boolean' || !Array.isArray(data.fund_ids)) throw new Error('Não foi possível confirmar suas permissões.');
      return data as { admin: boolean; fund_ids: string[] };
    },
  });
  const canAccess = Boolean(session && !access.error && (access.data?.admin || access.data?.fund_ids.length));
  return { user: session?.user ?? null, loading: loading || (Boolean(session) && access.isPending), access, canAccess,
    isAdmin: canAccess && Boolean(access.data?.admin), signOut: async () => { const { error } = await treasuryClient.auth.signOut({ scope: 'local' }); if (error) throw error; } };
}
