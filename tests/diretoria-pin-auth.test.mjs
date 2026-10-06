import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { transform } from 'esbuild';

const source = await transform(readFileSync(new URL('../supabase/functions/validate-diretoria-pin/index.ts', import.meta.url), 'utf8'), { loader: 'ts', format: 'esm' });
const code = source.code.replace(/^import .*;$/gm, '');
const societyA = { id: '11111111-1111-4111-8111-111111111111', name: 'Sociedade sintética A', active: true };
const societyB = { id: '22222222-2222-4222-8222-222222222222', name: 'Sociedade sintética B', active: true };
const syntheticPins = { diretoria_pin_a: '100001', diretoria_pin_b: '100002', diretoria_pin_pastor: '100003', diretoria_pin_geral: '909090' };

function fixture(options = {}) {
  let handler;
  const calls = [];
  const pins = { ...syntheticPins, ...options.pins };
  const societies = { a: societyA, b: societyB, inactive: { ...societyB, active: false } };
  const Deno = { env: { get: () => 'test-only-config' }, serve: fn => { handler = fn; } };
  const createClient = () => ({ from(table) {
    const filters = {};
    const query = {
      select() { return query; },
      eq(key, value) { filters[key] = value; return query; },
      async maybeSingle() {
        calls.push({ kind: table, filters: { ...filters } });
        if (table === 'settings') return { data: typeof pins[filters.key] === 'string' ? { value: pins[filters.key] } : null, error: options.settingsError ?? null };
        const society = societies[filters.slug];
        return { data: society?.active === filters.active ? society : null, error: options.societyError ?? null };
      },
    };
    return query;
  } });
  const serverLimiter = () => ({ pinAttempt: async input => { calls.push({ kind: 'limit', input }); return options.rate ?? { allowed: true }; } });
  const portalSession = async input => { calls.push({ kind: 'session', input }); return { access_token: 'fixture-access', refresh_token: 'fixture-refresh' }; };
  new Function('Deno', 'createClient', 'serverLimiter', 'portalSession', code)(Deno, createClient, serverLimiter, portalSession);
  return { calls, request: body => handler(new Request('https://fixture.test/login', { method: 'POST', body: JSON.stringify(body) })), raw: (body, method = 'POST') => handler(new Request('https://fixture.test/login', { method, ...(method === 'POST' ? { body } : {}) })) };
}

test('society selection and exactly six numeric digits are mandatory before any lookup or rate reservation', async () => {
  const p = fixture();
  for (const body of [
    { pin: '100001' }, { society_slug: 'a', pin: '100001', validate_only: true },
    { society_slug: 'geral', pin: '909090' }, { society_slug: 'a/../b', pin: '100001' },
    { society_slug: 'a', pin: '10000' }, { society_slug: 'a', pin: 'abcdef' }, { society_slug: 'a', pin: 100001 },
  ]) assert.equal((await p.request(body)).status, 400);
  assert.equal((await p.raw('{')).status, 400);
  assert.equal((await p.raw('x'.repeat(2049))).status, 400);
  assert.equal(p.calls.length, 0);
});

test('server rate denial blocks every society lookup, credential read and session creation', async () => {
  const p = fixture({ rate: { allowed: false, response: new Response('limited', { status: 429 }) } });
  assert.equal((await p.request({ society_slug: 'a', pin: '100001' })).status, 429);
  assert.deepEqual(p.calls.map(call => call.kind), ['limit']);
});

test('unknown and inactive societies cannot obtain a session even with a configured credential', async () => {
  const p = fixture({ pins: { diretoria_pin_inactive: '100001', diretoria_pin_unknown: '100001' } });
  for (const society_slug of ['unknown', 'inactive']) assert.equal((await p.request({ society_slug, pin: '100001' })).status, 404);
  assert.deepEqual(p.calls.map(call => call.kind), ['limit', 'societies', 'limit', 'societies']);
});

test('a society accepts only its own PIN; general and another society PIN never fall back or mint sessions', async () => {
  for (const pin of ['909090', '100002']) {
    const p = fixture();
    const response = await p.request({ society_slug: 'a', pin });
    assert.equal(response.status, 401);
    assert.deepEqual(p.calls.map(call => call.kind), ['limit', 'societies', 'settings']);
    assert.equal(p.calls[2].filters.key, 'diretoria_pin_a');
    assert.doesNotMatch(await response.text(), /909090|100001|100002/);
  }
});

test('missing, blank or invalid society configuration fails closed even when the general PIN matches', async () => {
  for (const value of [undefined, '', '1234', 'abcdef']) {
    const p = fixture({ pins: { diretoria_pin_a: value } });
    assert.equal((await p.request({ society_slug: 'a', pin: '909090' })).status, 401);
    assert.equal(p.calls.some(call => call.kind === 'session'), false);
    assert.equal(p.calls.filter(call => call.kind === 'settings').length, 1);
  }
});

test('database failures are sanitized and cannot create a portal account', async () => {
  for (const options of [{ societyError: { message: 'private database detail' } }, { settingsError: { message: 'private database detail' } }]) {
    const p = fixture(options);
    const response = await p.request({ society_slug: 'a', pin: '100001' });
    assert.equal(response.status, 503);
    assert.equal(p.calls.some(call => call.kind === 'session'), false);
    assert.doesNotMatch(await response.text(), /private database detail|100001/);
  }
});

test('validated credentials create only the chosen society role and scope, ignoring caller role injection', async () => {
  const p = fixture();
  const response = await p.request({ society_slug: 'a', pin: '100001', role: 'admin', namespace: 'treasury', society_id: societyB.id });
  assert.equal(response.status, 200);
  assert.deepEqual(p.calls.map(call => call.kind), ['limit', 'societies', 'settings', 'session']);
  assert.deepEqual(p.calls.at(-1).input, { namespace: 'diretoria', id: 'a', name: 'Diretoria Sociedade sintética A', credential: '100001', societyId: societyA.id, role: 'diretoria' });
  assert.deepEqual(await response.json(), { success: true, session: { access_token: 'fixture-access', refresh_token: 'fixture-refresh' } });
});

test('Pastor uses the dedicated Pastor credential and keeps its null society scope', async () => {
  const p = fixture();
  assert.equal((await p.request({ society_slug: 'pastor', pin: '909090' })).status, 401);
  assert.equal((await p.request({ society_slug: 'pastor', pin: '100003' })).status, 200);
  assert.equal(p.calls.some(call => call.kind === 'societies'), false);
  assert.deepEqual(p.calls.at(-1).input, { namespace: 'diretoria', id: 'pastor', name: 'Pastor', credential: '100003', societyId: null, role: 'pastor' });
});

test('preflight and wrong HTTP methods do not inspect credentials', async () => {
  const p = fixture();
  assert.equal((await p.raw('', 'OPTIONS')).status, 200);
  assert.equal((await p.raw('', 'GET')).status, 405);
  assert.equal(p.calls.length, 0);
});
