import { supabase } from '@/integrations/supabase/client';

/**
 * Sends only a support reference and an allowlisted operation to the server.
 * Returns a short error ID that can be shown to the user for support.
 */
export async function reportClientError(
  context: string,
  error: unknown,
  details?: Record<string, unknown>,
): Promise<string> {
  const errorId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`.toUpperCase();
  console.error(`[${context}] (id=${errorId})`);

  // Server log (visible in the edge function logs) — fire and forget, never throws
  try {
    await supabase.functions.invoke('log-client-error', {
      body: { errorId, context },
    });
  } catch (logErr) {
    console.warn(`[${context}] falha ao registrar erro no servidor`, logErr);
  }

  return errorId;
}
