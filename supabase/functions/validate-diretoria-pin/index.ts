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
    if (raw.length > 2048) return reply({ error: 'Dados inválidos' }, 400);
    const { society_slug, pin, validate_only } = JSON.parse(raw);
    if (validate_only !== undefined || typeof society_slug !== 'string' || !/^[a-z0-9-]{1,40}$/.test(society_slug) || society_slug === 'geral') return reply({ error: 'Sociedade inválida' }, 400);
    if (typeof pin !== 'string' || !/^[0-9]{6}$/.test(pin)) return reply({ error: 'PIN inválido' }, 400);
    const rate = await serverLimiter(cors).pinAttempt({ mode: 'admin', identifier: 'diretoria' });
    if (!rate.allowed) return rate.response;
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const isPastor = society_slug === 'pastor';
    const { data: society, error: societyError } = isPastor ? { data: null, error: null } : await admin.from('societies').select('id,name').eq('slug', society_slug).eq('active', true).maybeSingle();
    if (societyError) return reply({ error: 'Não foi possível validar o acesso. Tente novamente.' }, 503);
    if (!isPastor && !society) return reply({ error: 'Sociedade indisponível' }, 404);
    // Never inherit the general PIN: the selected society owns its credential.
    const { data: setting, error } = await admin.from('settings').select('value').eq('key', `diretoria_pin_${society_slug}`).maybeSingle();
    if (error) return reply({ error: 'Não foi possível validar o acesso. Tente novamente.' }, 503);
    if (!setting?.value || !/^[0-9]{6}$/.test(setting.value) || setting.value !== pin) return reply({ error: 'PIN incorreto' }, 401);
    const session = await portalSession({ namespace: 'diretoria', id: society_slug, name: isPastor ? 'Pastor' : 'Diretoria ' + society!.name,
      credential: pin, societyId: society?.id ?? null, role: isPastor ? 'pastor' : 'diretoria' });
    return reply({ success: true, session });
  } catch { return reply({ error: 'Não foi possível entrar. Tente novamente.' }, 400); }
});
