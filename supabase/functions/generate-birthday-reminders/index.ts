import { createClient } from "jsr:@supabase/supabase-js@2";
const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers });
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!key || req.headers.get('Authorization') !== 'Bearer ' + key) return Response.json({ error: 'Não autorizado' }, { status: 401, headers });
  const client = createClient(Deno.env.get('SUPABASE_URL')!, key);
  const { data, error } = await client.rpc('generate_ipnc_birthday_reminders');
  if (error) return Response.json({ error: 'Não foi possível gerar os lembretes' }, { status: 500, headers });
  return Response.json({ success: true, added: data }, { headers });
});
