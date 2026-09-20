import { supabase } from '@/integrations/supabase/ebd-client';
import { toast } from 'sonner';

export function notifyEbdChange() {
  window.dispatchEvent(new Event('ebd-data-changed'));
}

export async function ensureEbdSession() {
  const { data, error } = await supabase.rpc('ebd_session_valid' as never);
  if (error) throw new Error('Não foi possível confirmar o acesso. Confira a conexão e tente novamente.');
  if (!data) {
    window.dispatchEvent(new Event('ebd-session-expired'));
    throw new Error('Confirme novamente o PIN e repita a operação.');
  }
}

export async function reportEbdWriteError(error: unknown, fallback: string) {
  try { await ensureEbdSession(); }
  catch (sessionError) { toast.error((sessionError as Error).message); return; }
  const message = error && typeof error === 'object' && 'message' in error ? String(error.message) : fallback;
  toast.error(message || fallback);
  notifyEbdChange();
}
