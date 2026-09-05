/** Server-only proposal. No DB/network/secrets are accessed by this module.
 * Caller supplies validated principal and CURRENT DB credential only AFTER checking PIN.
 * A custom capability token, NOT a Supabase JWT. Send in request body ebd_ai_token.
 */
export type EbdPrincipal = { kind: "admin"; id: "secretaria" } | { kind: "class"; id: string };
export type EbdBirthdayClaims = {
  v: 1; iss: string; aud: "ipnc-birthday-ai"; scope: "birthday:generate";
  principal: EbdPrincipal; iat: number; exp: number; jti: string; credential_stamp: string;
};
type Options = { secret: string; issuer: string; now?: () => number; ttlSeconds?: number };
const encoder = new TextEncoder();
const decoder = new TextDecoder();

function encode(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function decode(value: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw Error("Invalid encoding");
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const bytes = Uint8Array.from(atob(base64 + "=".repeat((4 - base64.length % 4) % 4)), c => c.charCodeAt(0));
  if (encode(bytes) !== value) throw Error("Noncanonical encoding");
  return bytes;
}
function validPrincipal(value: any): value is EbdPrincipal {
  return value?.kind === "admin" ? value.id === "secretaria" :
    value?.kind === "class" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.id);
}

export function createEbdBirthdayTokens(options: Options) {
  if (options.secret.length < 32 || !options.issuer) throw Error("Server signing configuration missing");
  const ttl = options.ttlSeconds ?? 900;
  if (!Number.isInteger(ttl) || ttl < 1 || ttl > 900) throw Error("Invalid capability lifetime");
  const now = () => Math.floor((options.now?.() ?? Date.now()) / 1000);
  // Domain-separated derived key: credential signatures cannot be mistaken for token signatures.
  const keyPromise = (async () => {
    const root = await crypto.subtle.importKey("raw", encoder.encode(options.secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const derived = await crypto.subtle.sign("HMAC", root, encoder.encode(`IPNC:EBD:BIRTHDAY_AI:KEY:v1\0${options.issuer}`));
    return crypto.subtle.importKey("raw", derived, { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
  })();
  const bytesForCredential = (principal: EbdPrincipal, credential: string) =>
    encoder.encode(`credential\0${principal.kind}\0${principal.id}\0${credential}`);
  return {
    async issue(principal: EbdPrincipal, currentCredential: string): Promise<{ token: string; expiresAt: string }> {
      if (!validPrincipal(principal) || !currentCredential) throw Error("Invalid validated principal");
      const key = await keyPromise;
      const iat = now();
      const claims: EbdBirthdayClaims = {
        v: 1, iss: options.issuer, aud: "ipnc-birthday-ai", scope: "birthday:generate",
        principal, iat, exp: iat + ttl, jti: crypto.randomUUID(),
        // HMAC, not bare PIN hash: visible token must not become an offline six-digit PIN oracle.
        credential_stamp: encode(new Uint8Array(await crypto.subtle.sign("HMAC", key, bytesForCredential(principal, currentCredential)))),
      };
      const payload = encode(encoder.encode(JSON.stringify(claims)));
      const signature = encode(new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(`token\0${payload}`))));
      return { token: `ebdai1.${payload}.${signature}`, expiresAt: new Date(claims.exp * 1000).toISOString() };
    },
    async verify(token: unknown, resolveCurrentCredential: (principal: EbdPrincipal) => Promise<string | null>): Promise<EbdBirthdayClaims | null> {
      try {
        if (typeof token !== "string" || token.length > 2048) return null;
        const parts = token.split(".");
        if (parts.length !== 3 || parts[0] !== "ebdai1") return null;
        const key = await keyPromise;
        const signature = decode(parts[2]);
        if (signature.byteLength !== 32 || !await crypto.subtle.verify("HMAC", key, signature, encoder.encode(`token\0${parts[1]}`))) return null;
        const claims = JSON.parse(decoder.decode(decode(parts[1]))) as EbdBirthdayClaims;
        const seconds = now();
        if (claims.v !== 1 || claims.iss !== options.issuer || claims.aud !== "ipnc-birthday-ai" || claims.scope !== "birthday:generate" ||
            !validPrincipal(claims.principal) || typeof claims.jti !== "string" || !claims.jti ||
            !Number.isInteger(claims.iat) || !Number.isInteger(claims.exp) || claims.iat > seconds + 30 ||
            claims.exp <= seconds || claims.exp <= claims.iat || claims.exp - claims.iat > 900) return null;
        // DB lookup MUST filter active=true for classes; null denies a disabled/deleted principal.
        const currentCredential = await resolveCurrentCredential(claims.principal);
        if (!currentCredential) return null;
        const stamp = decode(claims.credential_stamp);
        if (stamp.byteLength !== 32 || !await crypto.subtle.verify("HMAC", key, stamp, bytesForCredential(claims.principal, currentCredential))) return null;
        return claims;
      } catch { return null; }
    },
  };
}
