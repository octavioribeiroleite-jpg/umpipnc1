import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.89.0';

/** Reserved PIN accounts. Never changes a member's personal credentials. */
export async function portalSession(input: {
  namespace: 'ebd' | 'diretoria'; id: string; name: string; credential: string;
  societyId?: string | null; role?: 'diretoria' | 'pastor';
}) {
  const url = Deno.env.get('SUPABASE_URL')!;
  const secret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const digest = await crypto.subtle.sign('HMAC', key, enc.encode(`IPNC:PORTAL:v1:${url}:${input.namespace}:${input.id}:${input.credential}`));
  const password = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('') + '!aA1';
  const fingerprint = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(`IPNC:PIN:v1:${input.credential}`))), b => b.toString(16).padStart(2, '0')).join('');
  const username = `portal-${input.namespace}-${input.id}`;
  const email = `${username}@ipnc.local`;
  const claims = { namespace: input.namespace, id: input.id, fingerprint, issued_at: Math.floor(Date.now() / 1000) };
  const { data: profile, error: lookupError } = await admin.from('profiles').select('user_id').eq('username', username).maybeSingle();
  if (lookupError) throw Error('Não foi possível validar o acesso.');
  let userId = profile?.user_id;
  if (userId) {
    const { data, error } = await admin.auth.admin.getUserById(userId);
    if (error || data.user?.email !== email || data.user.app_metadata?.ipnc_portal?.namespace !== input.namespace || data.user.app_metadata?.ipnc_portal?.id !== input.id) throw Error('Conta reservada indisponível.');
    const updated = await admin.auth.admin.updateUserById(userId, { password, app_metadata: { ipnc_portal: claims } });
    if (updated.error) throw Error('Não foi possível renovar o acesso.');
  } else {
    const created = await admin.auth.admin.createUser({ email, password, email_confirm: true,
      user_metadata: { username, full_name: input.name }, app_metadata: { ipnc_portal: claims } });
    if (created.error || !created.data.user) throw Error('Não foi possível preparar o acesso. Tente novamente.');
    userId = created.data.user.id;
  }
  const updated = await admin.from('profiles').update({ society_id: input.societyId ?? null, active: true }).eq('user_id', userId).select('user_id').single();
  if (updated.error) throw Error('Não foi possível preparar o perfil.');
  if (input.role) {
    const assigned = await admin.from('user_roles').upsert({ user_id: userId, role: input.role }, { onConflict: 'user_id,role' });
    if (assigned.error) throw Error('Não foi possível validar a permissão.');
  }
  const login = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await login.auth.signInWithPassword({ email, password });
  if (error || !data.session) throw Error('Não foi possível entrar.');
  return { access_token: data.session.access_token, refresh_token: data.session.refresh_token };
}
