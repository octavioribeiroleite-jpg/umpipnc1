import { createContext, useContext } from 'react';
import type { Session } from '@supabase/supabase-js';
import { treasuryClient } from '@/integrations/supabase/treasury-client';

// Directory entry uses its existing authenticated client without copying tokens,
// creating another session or changing the independent Home > Finanças login.
export const TreasuryConnectionContext = createContext<{
  client: typeof treasuryClient;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
} | null>(null);
export const useTreasuryConnection = () => useContext(TreasuryConnectionContext);
