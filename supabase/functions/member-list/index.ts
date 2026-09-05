const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

Deno.serve((req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers });
  return Response.json({ error: 'Portal dos membros ainda não liberado.', code: 'MEMBER_PORTAL_CLOSED' }, { status: 410, headers });
});
