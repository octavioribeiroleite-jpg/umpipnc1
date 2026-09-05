import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.89.0';
import { serverLimiter } from '../_shared/server-limiter.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};
const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: cors });

// Resolve the username privately. Never expose the account email or change credentials.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method !== 'POST') return reply({ error: 'Método inválido' }, 405);
  try {
    const raw = await req.text();
    if (raw.length > 4096) return reply({ error: 'Dados inválidos' }, 400);
    const { username, password } = JSON.parse(raw);
    if (typeof username !== 'string' || typeof password !== 'string' || username.length > 100 || password.length > 256) return reply({ error: 'Dados inválidos' }, 400);
    const normalized = username.toLowerCase().replace(/\s+/g, '');
    const rate = await serverLimiter(cors).pinAttempt({ mode: 'admin', identifier: `account:${normalized}` });
    if (!rate.allowed) return rate.response;
    const url = Deno.env.get('SUPABASE_URL')!;
    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: profile, error } = await admin.from('profiles').select('user_id,email,active').eq('username', normalized).maybeSingle();
    // The same Auth request and generic response for missing/inactive accounts.
    const login = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error: loginError } = await login.auth.signInWithPassword({
      email: !error && profile?.active ? profile.email : 'invalid-login@ipnc.local', password,
    });
    if (error || !profile?.active || loginError || !data.session || data.user?.id !== profile.user_id) return reply({ error: 'Usuário ou senha incorretos' }, 401);
    return reply({ session: { access_token: data.session.access_token, refresh_token: data.session.refresh_token } });
  } catch { return reply({ error: 'Não foi possível entrar. Tente novamente.' }, 400); }
});
