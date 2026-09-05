import type { Actor as AiActor } from "./ai-auth-policy.ts";

/** Accept only a server-verified Auth user; never trust user_metadata for roles. */
export async function resolveAiActor(client: any, authorization: string | null): Promise<(AiActor & { userId: string }) | null> {
  if (!authorization?.startsWith("Bearer ") || authorization.length > 8192) return null;
  try {
    const { data, error } = await client.auth.getUser(authorization.slice(7));
    if (error || !data?.user?.id) return null;
    const encoded = authorization.slice(7).split('.')[1];
    let portal: any;
    try { portal = JSON.parse(atob(encoded.replace(/-/g, '+').replace(/_/g, '/')))?.app_metadata?.ipnc_portal; } catch { /* getUser already verified the JWT; reject malformed portal claims below */ }
    const accountPortal = data.user.app_metadata?.ipnc_portal;
    if (accountPortal && (!portal || accountPortal.namespace !== portal.namespace || accountPortal.id !== portal.id)) return null;
    if (portal?.namespace === 'ebd') return null;
    if (portal?.namespace === 'diretoria') {
      const setting = await client.from('settings').select('value').eq('key','diretoria_pin_geral').maybeSingle();
      if (setting.error || !setting.data?.value) return null;
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
    return { userId, roles: (roles.data ?? []).map((r: {role:string}) => r.role), societyId: profile.data.society_id ?? null };
  } catch { return null; }
}
