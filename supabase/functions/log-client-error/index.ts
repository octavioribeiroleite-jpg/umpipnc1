import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const allowedContexts = ['EBD:relatorio-periodo', 'EBD:relatorio-trimestral'];
    const context = allowedContexts.includes(body?.context) ? body.context : 'unknown';
    const errorId = typeof body?.errorId === 'string' && /^[A-Z0-9]{6,14}-[A-Z0-9]{4}$/.test(body.errorId)
      ? body.errorId : 'unknown';
    // Never retain arbitrary exception text, stack traces, tokens or report data.
    if (context !== 'unknown' && errorId !== 'unknown') console.error('[CLIENT_ERROR]', { errorId, context });

    return new Response(JSON.stringify({ ok: true, errorId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('[log-client-error] invalid request');
    return new Response(JSON.stringify({ ok: false }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
