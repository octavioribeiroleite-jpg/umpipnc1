# Gemini integration validation — 2026-09-05

User chose Gemini by saving its key after discussing the provider change.
User explicitly confirmed the key's project has paid billing enabled.
Supabase dashboard verified the secret NAME "Gemini API Key"; value not read,
copied or printed. Adapter also accepts the canonical GEMINI_API_KEY name.

## Results

- Real synthetic plain-text generation: HTTP200.
- Real synthetic JSON-object response: HTTP200.
- Real synthetic forced extract_tasks function call: HTTP200, correct title/date.
- One earlier JSON request returned a sanitized provider5xx; a separate bounded
  validation succeeded. No automatic retry or provider fallback in application.
-26offline tests pass. Existing TypeScript/build checks pass.
-9AI Edge Functions redeployed ACTIVE using direct Google compatibility endpoint
  and gemini-3.1-flash-lite. No Lovable gateway, key or OpenAI-key fallback.
-Temporary ipnc-ai-validation function was replaced by an inert HTTP410 handler
  with JWT verification enabled; no nonce, secrets access or model calls remain.
-Only fictitious text was sent in these tests. No church records were used.
-No Site publication or sharing change yet. This validates the provider adapter,
  not every integrated business workflow or overall migration readiness.

## Data handling

Google paid-services terms apply based on owner confirmation. Recheck before
changing keys/projects; unpaid services must not receive church member data.
Existing Auth, authorization and persistent rate limits precede all app AI calls.
Limits:25sec timeout,128KiB input,4096default/8192maxoutputtokens, no automaticretry.
Sources: https://ai.google.dev/gemini-api/docs/openai
https://ai.google.dev/gemini-api/terms?authuser=00
