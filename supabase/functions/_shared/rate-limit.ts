/** Server-only helper. Supply a service-role client that does not inherit the caller Authorization. */
type RpcClient = { rpc(name: string, args: Record<string, unknown>): PromiseLike<{ data: unknown; error: unknown }> };
type Bucket = { policy: string; key: string; units: number };
export type RateResult = { allowed: true } | { allowed: false; response: Response };
type Options = { client: RpcClient; secret: string; issuer: string; corsHeaders?: Record<string, string> };

export function createIpncLimiter({ client, secret, issuer, corsHeaders = {} }: Options) {
  if (secret.length < 32 || !issuer) throw Error('Missing server limiter configuration');
  const encoder = new TextEncoder();
  const key = crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  async function hash(namespace: string, value: string): Promise<string> {
    const digest = await crypto.subtle.sign('HMAC', await key, encoder.encode(`IPNC:RATE_LIMIT:v1\0${issuer}\0${namespace}\0${value}`));
    return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
  }
  function failure(status: number, code: string, message: string, retry?: number): RateResult {
    return { allowed: false, response: Response.json({ error: message, code, ...(retry ? { retry_after_seconds: retry } : {}) }, {
      status,
      headers: { ...corsHeaders, ...(retry ? { 'Retry-After': String(retry), 'Access-Control-Expose-Headers': 'Retry-After' } : {}) },
    }) };
  }
  async function reserve(buckets: Bucket[]): Promise<RateResult> {
    try {
      const { data, error } = await client.rpc('consume_ipnc_limits', { p_requests: buckets });
      const result = data as { allowed?: unknown; retry_after_seconds?: unknown } | null;
      if (error || !result || typeof result.allowed !== 'boolean' || !Number.isInteger(result.retry_after_seconds)) {
        return failure(503, 'rate_limit_unavailable', 'Não foi possível validar o limite agora. Tente novamente em instantes.');
      }
      if (result.allowed === true && result.retry_after_seconds === 0) return { allowed: true };
      const retry = result.retry_after_seconds as number;
      if (result.allowed === false && retry > 0 && retry <= 86400) {
        return failure(429, 'rate_limit_exceeded', `Limite temporário atingido. Aguarde ${retry} segundos e tente novamente.`, retry);
      }
      return failure(503, 'rate_limit_unavailable', 'Não foi possível validar o limite agora.');
    } catch {
      return failure(503, 'rate_limit_unavailable', 'Não foi possível validar o limite agora. Tente novamente em instantes.');
    }
  }
  return {
    /** BEFORE credential verification/minting. trustedOrigin must come from an independently
     * verified gateway extraction, never req.headers.get('x-forwarded-for') directly.
     * With no trusted origin, a shared fallback remains protected by identifier AND global.
     * identifier examples: 'admin:secretaria'; 'class-pin:'+submittedPin (HMAC only; never logged).
     * Attacker-chosen identifier is supplementary: changing it cannot escape global/origin limits.
     */
    async pinAttempt(input: { mode: 'admin' | 'class'; identifier: string; trustedOrigin?: string | null }): Promise<RateResult> {
      if (!input.identifier || input.identifier.length > 256 || (input.mode !== 'admin' && input.mode !== 'class')) {
        return failure(400, 'invalid_pin_request', 'Dados de acesso inválidos.');
      }
      const origin = input.trustedOrigin?.trim().slice(0, 128) || 'unverified-shared-origin';
      return reserve([
        { policy: 'pin_origin', key: await hash('pin-origin', origin), units: 1 },
        { policy: 'pin_identifier', key: await hash('pin-identifier', `${input.mode}:${input.identifier}`), units: 1 },
        { policy: 'pin_global', key: await hash('pin-global', 'project'), units: 1 },
      ]);
    },
    /** AFTER verified JWT/HMAC and resource authz, BEFORE ANY model request or business writes.
     * actor is server-derived: user:<UUID>, ebd-class:<UUID>, ebd-admin:secretaria.
     * modelCalls=5 reserves the auto-process workflow upfront; all other current actions=1.
     * One reservation covers exactly that workflow: do not reserve again inside its wrapper.
     */
    async aiGeneration(input: { actor: string; modelCalls?: number }): Promise<RateResult> {
      const units = input.modelCalls ?? 1;
      if (!/^((user|ebd-class):[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|ebd-admin:secretaria)$/i.test(input.actor) ||
          !Number.isInteger(units) || units < 1 || units > 5) {
        return failure(400, 'invalid_ai_principal', 'Solicitação de IA inválida.');
      }
      const actorKey = await hash('ai-principal', input.actor);
      const globalKey = await hash('ai-global', 'project');
      return reserve([
        { policy: 'ai_principal_minute', key: actorKey, units },
        { policy: 'ai_principal_hour', key: actorKey, units },
        { policy: 'ai_global_minute', key: globalKey, units },
        { policy: 'ai_global_day', key: globalKey, units },
      ]);
    },
  };
}
