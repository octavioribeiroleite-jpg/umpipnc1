import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.89.0';
import { serverLimiter } from '../_shared/server-limiter.ts';
import { portalSession } from '../_shared/portal-account.ts';
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version' };
const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: cors });
Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method !== 'POST') return reply({ error: 'Método inválido' }, 405);
  try {
    const raw = await req.text();
    if (raw.length > 1024) return reply({ error: 'Dados inválidos' }, 400);
    const { fund_id, pin } = JSON.parse(raw);
    if (typeof fund_id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(fund_id) || typeof pin !== 'string' || !/^\d{6}$/.test(pin)) return reply({ error: 'Informe a sociedade e o PIN de 6 números.' }, 400);
    const rate = await serverLimiter(cors).pinAttempt({ mode: 'class', identifier: `treasury:${fund_id}` });
    if (!rate.allowed) return rate.response;
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
    const { data, error } = await admin.rpc('treasury_verify_pin', { p_fund_id: fund_id, p_pin: pin });
    if (error) return reply({ error: 'Não foi possível validar o acesso agora.' }, 503);
    if (!data) return reply({ error: 'PIN incorreto ou acesso desativado. Consulte o administrador.' }, 401);
    const session = await portalSession({ namespace: 'treasury', id: fund_id, name: `Tesouraria · ${data.name}`, credential: data.version, role: 'visualizador' });
    return reply({ session });
  } catch { return reply({ error: 'Não foi possível entrar. Tente novamente.' }, 400); }
});
