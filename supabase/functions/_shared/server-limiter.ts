import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { createIpncLimiter } from "./rate-limit.ts";

/** Independent server client: never inherit the caller's Authorization header. */
export function serverLimiter(corsHeaders: Record<string, string>) {
  const issuer = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createIpncLimiter({
    client: createClient(issuer, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } }),
    issuer,
    secret: Deno.env.get("IPNC_RATE_LIMIT_SECRET") ?? serviceKey,
    corsHeaders,
  });
}
