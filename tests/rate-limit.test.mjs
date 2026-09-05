import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createIpncLimiter } from '../supabase/functions/_shared/rate-limit.ts';
const actor = 'user:11111111-1111-4111-8111-111111111111';
const options = { secret: 'FAKE-LOCAL-RATE-LIMITER-SECRET-32-PLUS', issuer: 'https://test-project.invalid', corsHeaders: { 'Access-Control-Allow-Origin': 'https://test-app.invalid' } };
let captured;
const client = { async rpc(name, args) { captured = { name, args }; return { data: { allowed: true, retry_after_seconds: 0 }, error: null }; } };

test('PIN reservation uses HMAC-only identifiers and includes independent global guard', async () => {
  const limiter = createIpncLimiter({ ...options, client });
  assert.deepEqual(await limiter.pinAttempt({ mode: 'class', identifier: '123456', trustedOrigin: '192.0.2.12' }), { allowed: true });
  assert.equal(captured.name, 'consume_ipnc_limits');
  assert.equal(captured.args.p_requests.length, 3);
  const payload = JSON.stringify(captured.args);
  assert.ok(!payload.includes('123456')); assert.ok(!payload.includes('192.0.2.12'));
  for (const bucket of captured.args.p_requests) assert.match(bucket.key, /^[0-9a-f]{64}$/);
  const originalGlobal = captured.args.p_requests.find(x => x.policy === 'pin_global').key;
  await limiter.pinAttempt({ mode: 'class', identifier: '654321', trustedOrigin: '198.51.100.1' });
  assert.equal(captured.args.p_requests.find(x => x.policy === 'pin_global').key, originalGlobal);
});
test('unknown source is shared, not a user-chosen header loophole', async () => {
  const limiter = createIpncLimiter({ ...options, client });
  await limiter.pinAttempt({ mode: 'admin', identifier: 'secretaria' });
  const first = captured.args.p_requests.find(x => x.policy === 'pin_origin').key;
  await limiter.pinAttempt({ mode: 'class', identifier: '654321' });
  assert.equal(captured.args.p_requests.find(x => x.policy === 'pin_origin').key, first);
});
test('five-model workflow reserves principal and global limits together', async () => {
  const limiter = createIpncLimiter({ ...options, client });
  assert.deepEqual(await limiter.aiGeneration({ actor, modelCalls: 5 }), { allowed: true });
  assert.equal(captured.args.p_requests.length, 4);
  assert.ok(captured.args.p_requests.every(x => x.units === 5));
  assert.ok(!JSON.stringify(captured.args).includes(actor));
});
test('429 carries wait hint, CORS and Retry-After; no bypass on malformed/failed RPC', async () => {
  const limited = createIpncLimiter({ ...options, client: { rpc: async () => ({ data: { allowed: false, retry_after_seconds: 17 }, error: null }) } });
  const denied = await limited.aiGeneration({ actor });
  assert.equal(denied.allowed, false); assert.equal(denied.response.status, 429);
  assert.equal(denied.response.headers.get('Retry-After'), '17');
  assert.equal(denied.response.headers.get('Access-Control-Allow-Origin'), options.corsHeaders['Access-Control-Allow-Origin']);
  for (const bad of [{ data: null, error: null }, { data: { allowed: true, retry_after_seconds: 12 }, error: null }, { data: {}, error: 'private diagnostic' }]) {
    const limiter = createIpncLimiter({ ...options, client: { rpc: async () => bad } });
    const result = await limiter.aiGeneration({ actor });
    assert.equal(result.allowed, false); assert.equal(result.response.status, 503);
    assert.ok(!(await result.response.text()).includes('private diagnostic'));
  }
});
