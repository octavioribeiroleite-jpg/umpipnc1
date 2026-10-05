import { createClient } from '@supabase/supabase-js';

// Treasury login does not inherit or replace the directory/EBD login.
// Closing the tab clears its persisted credentials; PINs are never persisted.
export const treasuryClient = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, {
  auth: { storageKey: 'ipnc-treasury-auth', storage: sessionStorage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
});
