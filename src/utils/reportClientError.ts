import { supabase } from '@/integrations/supabase/client';

/**
 * Logs an error to the browser console (full detail) and forwards a structured
 * payload to the server (edge function) so failures are traceable end-to-end.
 * Returns a short error ID that can be shown to the user for support.
 */
export async function reportClientError(
  context: string,
  error: unknown,
  details?: Record<string, unknown>,
): Promise<string> {
  const errorId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`.toUpperCase();
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack ?? '' : '';

  // Console log (visible in the browser dev tools)
  console.error(`[${context}] (id=${errorId})`, error, details ?? {});

  // Server log (visible in the edge function logs) — fire and forget, never throws
  try {
    await supabase.functions.invoke('log-client-error', {
      body: { errorId, context, message, stack, details: details ?? null },
    });
  } catch (logErr) {
    console.warn(`[${context}] falha ao registrar erro no servidor`, logErr);
  }

  return errorId;
}