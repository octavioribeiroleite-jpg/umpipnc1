import type { Actor as AiActor } from "./ai-auth-policy.ts";
import type { SupabaseClient, User } from 'https://esm.sh/@supabase/supabase-js@2.89.0';

type PortalClaim = { namespace?: unknown; id?: unknown; fingerprint?: unknown };

/** verifiedUser is server-only: it must be the successful getUser() result for
 * this exact Authorization header. Never accept it from a request body or JWT decode. */
export async function resolveAiActor(client: SupabaseClient, authorization: string | null, verifiedUser?: User): Promise<(AiActor & { userId: string }) | null> {
  if (!authorization?.startsWith("Bearer ") || authorization.length > 8192) return null;
  try {
    const { data, error } = verifiedUser
      ? { data: { user: verifiedUser }, error: null }
      : await client.auth.getUser(authorization.slice(7));
    if (error || !data?.user?.id) return null;
    const encoded = authorization.slice(7).split('.')[1];
    let portal: PortalClaim | undefined;
    try { portal = JSON.parse(atob(encoded.replace(/-/g, '+').replace(/_/g, '/')))?.app_metadata?.ipnc_portal; } catch { /* getUser already verified the JWT; reject malformed portal claims below */ }
    const accountPortal = data.user.app_metadata?.ipnc_portal;
    if (accountPortal && (!portal || accountPortal.namespace !== portal.namespace || accountPortal.id !== portal.id)) return null;
    if (portal?.namespace === 'ebd') return null;
    if (portal?.namespace === 'diretoria') {
      if (typeof portal.id !== 'string' || !/^[a-z0-9-]{1,40}$/.test(portal.id) || portal.id === 'geral') return null;
      const setting = await client.from('settings').select('value').eq('key',`diretoria_pin_${portal.id}`).maybeSingle();
      if (setting.error || typeof setting.data?.value !== 'string' || !/^[0-9]{6}$/.test(setting.data.value)) return null;
      const digest = await crypto.subtle.digest('SHA-256',new TextEncoder().encode('IPNC:PIN:v1:'+setting.data.value));
      const fingerprint = Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
      if (portal.fingerprint !== fingerprint) return null;
    }
    const userId = data.user.id;
    const [roles, profile] = await Promise.all([
      client.from("user_roles").select("role").eq("user_id", userId),
      client.from("profiles").select("society_id,active").eq("user_id", userId).maybeSingle(),
    ]);
    if (roles.error || profile.error || !profile.data?.active) return null;
    if (portal?.namespace === 'diretoria') {
      if (portal.id === 'pastor') {
        if (profile.data.society_id !== null) return null;
      } else {
        const society = await client.from('societies').select('id').eq('slug',portal.id).eq('active',true).maybeSingle();
        if (society.error || !society.data?.id || society.data.id !== profile.data.society_id) return null;
      }
    }
    return { userId, roles: (roles.data ?? []).map((r: {role:string}) => r.role), societyId: profile.data.society_id ?? null };
  } catch { return null; }
}
