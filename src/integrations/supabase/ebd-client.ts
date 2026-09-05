import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// A PIN session for Secretaria never replaces the person's main application login.
export const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  { auth: { storageKey: 'ipnc-ebd-auth', storage: sessionStorage, persistSession: true, autoRefreshToken: false, detectSessionInUrl: false } },
);
