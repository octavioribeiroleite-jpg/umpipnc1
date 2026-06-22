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
    const {
      errorId = 'unknown',
      context = 'unknown',
      message = '',
      stack = '',
      details = null,
    } = body ?? {};

    // Structured server-side log (visible in edge function logs)
    console.error(
      `[CLIENT_ERROR] id=${errorId} context=${context} message=${message}`,
      JSON.stringify({ errorId, context, message, stack, details }, null, 2),
    );

    return new Response(JSON.stringify({ ok: true, errorId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('[log-client-error] failed to process log:', e);
    return new Response(JSON.stringify({ ok: false }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});