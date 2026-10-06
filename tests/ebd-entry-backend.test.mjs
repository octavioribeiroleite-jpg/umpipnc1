import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createEbdBirthdayTokens } from '../supabase/functions/_shared/ebd-birthday-token.ts';
import { resolveAiActor } from '../supabase/functions/_shared/ai-actor.ts';
import { loadEdgeSource, portalFixture } from './fixtures/portal-session-backend.mjs';

const sources = Object.fromEntries(await Promise.all(['ebd-class-login', 'manage-ebd-class-password'].map(async slug => [slug, await loadEdgeSource(`${slug}/index.ts`)])));
const classId = '22222222-2222-4222-8222-222222222222';
const classPin = '123456', adminPin = '654321';
const syntheticAnonJwt = 'eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiYW5vbiJ9.synthetic-signature';
const hash = pin => createHash('sha256').update(`ebd_class_pin:${pin}`).digest('hex');

function fixture(slug, options = {}) {
  const teacher = slug === 'ebd-class-login';
  const portal = portalFixture({ id: teacher ? classId : 'admin', credential: teacher ? hash(classPin) : adminPin, ...options.portal });
  const calls = [];
  const verifiedUser = options.user === undefined ? { id: '33333333-3333-4333-8333-333333333333', app_metadata: {} } : options.user;
  const anonKey = options.anonKey ?? 'synthetic-anon';
  const authorization = options.authorization ?? `Bearer ${anonKey}`;
  let handler;
  const client = {
    auth: { async getUser() { calls.push('actor-auth-get'); return { data: { user: verifiedUser }, error: options.authError ?? null }; } },
    from(table) {
      const filters = {};
      let write;
      const result = () => {
        calls.push(table + (write ? '-write' : '-read'));
        if (write) return { data: null, error: null };
        if (table === 'settings') return { data: { value: options.setting ?? adminPin }, error: options.settingError ?? null };
        if (table === 'ebd_class_passwords') return { data: filters.pin_hash === hash(classPin) && !options.invalidClass
          ? { class_id: classId, active: true, ebd_classes: { name: 'Synthetic class', active: options.classActive ?? true } } : null, error: null };
        if (table === 'profiles') return { data: { active: options.profileActive ?? true, society_id: null }, error: null };
        if (table === 'user_roles') return { data: (options.roles ?? ['admin']).map(role => ({ role })), error: null };
        throw Error(`Unexpected synthetic table ${table}`);
      };
      const query = { select() { return query; }, eq(key, value) { filters[key] = value; return query; },
        insert(payload) { write = payload; calls.push({ audit: structuredClone(payload) }); return query; },
        async maybeSingle() { return result(); }, then(resolve, reject) { return Promise.resolve(result()).then(resolve, reject); } };
      return query;
    },
  };
  const userClient = {
    auth: { async getUser() { calls.push('jwt-auth-get'); return { data: { user: verifiedUser }, error: options.authError ?? null }; } },
    async rpc(name) { calls.push(name); return { data: options.ebdAdmin ?? false, error: null }; },
  };
  const createClient = (_url, _key, config) => config?.global ? userClient : client;
  const env = { SUPABASE_URL: portal.state.url, SUPABASE_SERVICE_ROLE_KEY: portal.state.secret, SUPABASE_ANON_KEY: anonKey };
  const Deno = { env: { get: name => env[name] }, serve: value => { handler = value; } };
  const serverLimiter = () => ({ async pinAttempt(input) {
    calls.push({ limit: input });
    return options.rate ?? { allowed: true };
  } });
  const session = async input => { calls.push('portal'); return portal.portalSession(input); };
  new Function('Deno', 'createClient', 'createEbdBirthdayTokens', 'serverLimiter', 'portalSession', 'resolveAiActor', sources[slug])(
    Deno, createClient, createEbdBirthdayTokens, serverLimiter, session, resolveAiActor,
  );
  const request = body => handler(new Request('https://synthetic.test/login', { method: 'POST', headers: { Authorization: authorization }, body: JSON.stringify(body) }));
  return { calls, portal, request };
}

test('Secretaria PIN entry reads its setting once and returns a renewed EBD session and 15-minute capability', async () => {
  const p = fixture('manage-ebd-class-password');
  const response = await p.request({ action: 'birthday-ai-session', admin_pin: adminPin });
  assert.equal(response.status, 200);
  assert.equal(p.calls.filter(call => call === 'settings-read').length, 1);
  assert.deepEqual(p.calls.find(call => call?.limit)?.limit, { mode: 'admin', identifier: 'secretaria' });
  assert.ok(p.calls.findIndex(call => call?.limit) < p.calls.indexOf('settings-read'));
  const data = await response.json();
  assert.deepEqual(Object.keys(data.session).sort(), ['access_token', 'refresh_token']);
  const capability = await createEbdBirthdayTokens({ issuer: p.portal.state.url, secret: p.portal.state.secret }).verify(data.birthday_ai_token, async () => adminPin);
  assert.equal(capability.principal.kind, 'admin');
  assert.equal(capability.exp - capability.iat, 900);
});

test('warm Secretaria entry performs one setting read and no password/profile rewrite', async () => {
  const p = fixture('manage-ebd-class-password');
  await p.request({ action: 'birthday-ai-session', admin_pin: adminPin });
  p.calls.length = 0; p.portal.reset(); p.portal.state.now += 60;
  assert.equal((await p.request({ action: 'birthday-ai-session', admin_pin: adminPin })).status, 200);
  assert.equal(p.calls.filter(call => call === 'settings-read').length, 1);
  assert.deepEqual(p.portal.calls.map(call => call.kind), ['profile-read', 'auth-get', 'auth-update-metadata', 'sign-in']);
});

test('Secretaria rate denial and wrong PIN still block setting/session and do not expose the configured PIN', async () => {
  const limited = fixture('manage-ebd-class-password', { rate: { allowed: false, response: new Response('limited', { status: 429 }) } });
  assert.equal((await limited.request({ action: 'birthday-ai-session', admin_pin: adminPin })).status, 429);
  assert.equal(limited.calls.includes('settings-read'), false);
  assert.equal(limited.calls.includes('portal'), false);
  const wrong = fixture('manage-ebd-class-password');
  const response = await wrong.request({ action: 'birthday-ai-session', admin_pin: '111111' });
  assert.equal(response.status, 403);
  assert.equal(wrong.calls.includes('portal'), false);
  assert.doesNotMatch(await response.text(), new RegExp(adminPin));
});

test('the exact configured public anon JWT skips user Auth/roles but still requires a valid rate-limited PIN', async () => {
  for (const scenario of [
    { body: { action: 'birthday-ai-session' }, status: 403, limit: false, setting: false },
    { body: { action: 'birthday-ai-session', admin_pin: '111111' }, status: 403, limit: true, setting: true },
    { body: { action: 'birthday-ai-session', admin_pin: adminPin }, status: 200, limit: true, setting: true },
    { body: { action: 'birthday-ai-session', admin_pin: adminPin }, rate: { allowed: false, response: new Response('limited', { status: 429 }) }, status: 429, limit: true, setting: false },
  ]) {
    const p = fixture('manage-ebd-class-password', { anonKey: syntheticAnonJwt, rate: scenario.rate });
    assert.equal((await p.request(scenario.body)).status, scenario.status);
    assert.equal(p.calls.includes('jwt-auth-get'), false);
    assert.equal(p.calls.includes('actor-auth-get'), false);
    assert.equal(p.calls.includes('user_roles-read'), false);
    assert.equal(p.calls.includes('profiles-read'), false);
    assert.equal(p.calls.includes('ebd_is_admin'), false);
    assert.equal(p.calls.some(call => call?.limit), scenario.limit);
    assert.equal(p.calls.includes('settings-read'), scenario.setting);
    assert.equal(p.calls.includes('portal'), scenario.status === 200);
  }
});

test('a different bearer cannot gain the anon shortcut by declaring the anon role in a decoded payload', async () => {
  const p = fixture('manage-ebd-class-password', { anonKey: syntheticAnonJwt, authorization: `Bearer ${syntheticAnonJwt}-different`, user: null });
  assert.equal((await p.request({ action: 'birthday-ai-session', admin_pin: adminPin })).status, 200);
  assert.equal(p.calls.filter(call => call === 'jwt-auth-get').length, 1);
  assert.equal(p.calls.includes('user_roles-read'), false);
  assert.equal(p.calls.some(call => call?.limit), true);
});

test('a management JWT reuses the exact Auth-verified user while preserving PIN fallback priority', async () => {
  const token = `Bearer fixture.${Buffer.from(JSON.stringify({ app_metadata: {} })).toString('base64url')}.verified-by-stub`;
  const p = fixture('manage-ebd-class-password', { authorization: token, anonKey: syntheticAnonJwt });
  assert.equal((await p.request({ action: 'birthday-ai-session', admin_pin: 'wrong' })).status, 200);
  assert.equal(p.calls.filter(call => call === 'jwt-auth-get').length, 1);
  assert.equal(p.calls.filter(call => call === 'actor-auth-get').length, 0);
  assert.equal(p.calls.some(call => call?.limit), false, 'already authorized management JWT still precedes PIN fallback');
  assert.equal(p.calls.filter(call => call === 'settings-read').length, 1, 'JWT path still loads the current configured credential');
  assert.equal(p.calls.includes('ebd_is_admin'), true);
});

test('unverified JWT never reaches actor role reads and still falls back to the rate-limited PIN', async () => {
  for (const options of [{ user: null }, { authError: { message: 'synthetic verification failure' } }]) {
    const p = fixture('manage-ebd-class-password', { authorization: 'Bearer synthetic-expired', ...options });
    assert.equal((await p.request({ action: 'birthday-ai-session', admin_pin: adminPin })).status, 200);
    assert.equal(p.calls.filter(call => call === 'jwt-auth-get').length, 1);
    assert.equal(p.calls.includes('user_roles-read'), false);
    assert.equal(p.calls.includes('actor-auth-get'), false);
    assert.equal(p.calls.some(call => call?.limit), true);
  }
});

test('an EBD-admin JWT alone still cannot mint birthday login access through the management fallback', async () => {
  const claim = { namespace: 'ebd', id: 'admin' };
  const token = `Bearer fixture.${Buffer.from(JSON.stringify({ app_metadata: { ipnc_portal: claim } })).toString('base64url')}.verified-by-stub`;
  const p = fixture('manage-ebd-class-password', { authorization: token, user: { id: 'synthetic-user', app_metadata: { ipnc_portal: claim } }, ebdAdmin: true });
  assert.equal((await p.request({ action: 'birthday-ai-session' })).status, 403);
  assert.equal(p.calls.includes('portal'), false);
  assert.equal(p.calls.includes('user_roles-read'), false);
});

test('Professor login retains the server limiter, valid class selection, trimmed name and awaited access audit', async () => {
  const p = fixture('ebd-class-login');
  const response = await p.request({ pin: classPin, name: '  Synthetic Teacher  ' });
  assert.equal(response.status, 200);
  assert.deepEqual(p.calls.find(call => call?.limit)?.limit, { mode: 'class', identifier: classPin });
  assert.ok(p.calls.findIndex(call => call?.limit) < p.calls.indexOf('ebd_class_passwords-read'));
  assert.ok(p.calls.indexOf('portal') < p.calls.indexOf('ebd_class_logins-write'));
  assert.deepEqual(p.calls.find(call => call?.audit).audit, { class_id: classId, teacher_name: 'Synthetic Teacher' });
  const data = await response.json();
  assert.deepEqual(data.teacher, { name: 'Synthetic Teacher', class_id: classId, class_name: 'Synthetic class' });
  assert.equal(data.success, true);
  assert.equal(p.portal.state.user.app_metadata.ipnc_portal.id, classId);
});

test('an inactive EBD class with a still-active password cannot create a session, capability or access audit', async () => {
  const p = fixture('ebd-class-login', { classActive: false });
  const response = await p.request({ pin: classPin, name: 'Synthetic Teacher' });
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: 'Senha incorreta' });
  assert.equal(p.calls.includes('portal'), false);
  assert.equal(p.calls.some(call => call?.audit), false);
  assert.equal(p.portal.calls.length, 0);
});

test('Professor warm entry reduces account work while keeping the audit; invalid PIN and rate denial never mint a session', async () => {
  const p = fixture('ebd-class-login');
  await p.request({ pin: classPin, name: 'Synthetic Teacher' });
  p.calls.length = 0; p.portal.reset();
  assert.equal((await p.request({ pin: classPin, name: 'Synthetic Teacher' })).status, 200);
  assert.deepEqual(p.portal.calls.map(call => call.kind), ['profile-read', 'auth-get', 'auth-update-metadata', 'sign-in']);
  assert.equal(p.calls.filter(call => call === 'ebd_class_logins-write').length, 1);
  for (const options of [{}, { rate: { allowed: false, response: new Response('limited', { status: 429 }) } }]) {
    const denied = fixture('ebd-class-login', options);
    assert.equal((await denied.request({ pin: '111111', name: 'Synthetic Teacher' })).status, options.rate ? 429 : 401);
    assert.equal(denied.calls.includes('portal'), false);
    assert.equal(denied.calls.includes('ebd_class_logins-write'), false);
  }
});
