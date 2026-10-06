import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { resolveAiActor } from '../supabase/functions/_shared/ai-actor.ts';

const fingerprint = value => createHash('sha256').update(`IPNC:PIN:v1:${value}`).digest('hex');
const societyId = '11111111-1111-4111-8111-111111111111';
const userId = '22222222-2222-4222-8222-222222222222';
function fixture(options = {}) {
  const portal = options.portal === null ? null : { namespace: 'diretoria', id: 'a', fingerprint: fingerprint('100001'), ...options.portal };
  const accountPortal = options.accountPortal === undefined ? portal : options.accountPortal;
  const authorization = `Bearer fixture.${Buffer.from(JSON.stringify({ app_metadata: { ipnc_portal: portal } })).toString('base64url')}.verified-by-stub`;
  const calls = [];
  const settings = { diretoria_pin_a: '100001', diretoria_pin_b: '100002', diretoria_pin_pastor: '100003', diretoria_pin_geral: '909090', ...options.settings };
  const profile = { active: true, society_id: societyId, ...options.profile };
  const client = {
    auth: { async getUser() { calls.push({ table: 'auth' }); return options.authError ? { data: null, error: options.authError } : { data: { user: { id: userId, app_metadata: { ipnc_portal: accountPortal } } }, error: null }; } },
    from(table) {
      const filters = {};
      const result = () => {
        calls.push({ table, filters: { ...filters } });
        if (table === 'settings') return { data: typeof settings[filters.key] === 'string' ? { value: settings[filters.key] } : null, error: options.settingError ?? null };
        if (table === 'profiles') return { data: profile, error: null };
        if (table === 'user_roles') return { data: (options.roles ?? ['diretoria']).map(role => ({ role })), error: null };
        return { data: options.societyInactive || !['a', 'b'].includes(filters.slug) ? null : { id: options.societyId ?? societyId }, error: options.societyError ?? null };
      };
      const query = { select() { return query; }, eq(key, value) { filters[key] = value; return query; }, maybeSingle: async () => result(), then: (resolve, reject) => Promise.resolve(result()).then(resolve, reject) };
      return query;
    },
  };
  return { calls, authorization, client, settings, resolve: () => resolveAiActor(client, authorization) };
}

test('AI actor accepts a verified society PIN claim using only its individual credential and profile scope', async () => {
  const p = fixture();
  assert.deepEqual(await p.resolve(), { userId, roles: ['diretoria'], societyId });
  assert.deepEqual(p.calls.filter(call => call.table === 'settings').map(call => call.filters.key), ['diretoria_pin_a']);
  assert.equal(p.calls.find(call => call.table === 'societies').filters.active, true);
});

test('general, other society and rotated credentials cannot authorize AI requests', async () => {
  for (const credential of ['909090', '100002']) assert.equal(await fixture({ portal: { fingerprint: fingerprint(credential) } }).resolve(), null);
  const p = fixture();
  p.settings.diretoria_pin_a = '100004';
  assert.equal(await p.resolve(), null);
});

test('missing and malformed individual PINs never inherit the general credential', async () => {
  for (const credential of [undefined, '', '1234', 'abcdef']) {
    const p = fixture({ settings: { diretoria_pin_a: credential }, portal: { fingerprint: fingerprint('909090') } });
    assert.equal(await p.resolve(), null);
    assert.deepEqual(p.calls.filter(call => call.table === 'settings').map(call => call.filters.key), ['diretoria_pin_a']);
  }
});

test('society claims must match an active society and the server profile even when two societies share a PIN', async () => {
  assert.equal(await fixture({ societyInactive: true }).resolve(), null);
  assert.equal(await fixture({ societyId: '33333333-3333-4333-8333-333333333333' }).resolve(), null);
  assert.equal(await fixture({ portal: { id: 'b' }, settings: { diretoria_pin_b: '100001' }, societyId: '33333333-3333-4333-8333-333333333333' }).resolve(), null);
  assert.equal(await fixture({ profile: { active: false } }).resolve(), null);
});

test('a Pastor claim uses its dedicated credential and requires a profile with no society', async () => {
  const options = { portal: { id: 'pastor', fingerprint: fingerprint('100003') }, roles: ['pastor'] };
  const p = fixture({ ...options, profile: { society_id: null } });
  assert.deepEqual(await p.resolve(), { userId, roles: ['pastor'], societyId: null });
  assert.equal(p.calls.some(call => call.table === 'societies'), false);
  assert.equal(await fixture(options).resolve(), null);
  assert.equal(await fixture({ ...options, profile: { society_id: null }, portal: { id: 'pastor', fingerprint: fingerprint('909090') } }).resolve(), null);
});

test('malformed identities, account mismatch and database errors fail closed', async () => {
  for (const id of ['geral', '', 'a/../b', null]) {
    const p = fixture({ portal: { id } });
    assert.equal(await p.resolve(), null);
    assert.equal(p.calls.some(call => call.table === 'settings'), false);
  }
  assert.equal(await fixture({ accountPortal: { namespace: 'diretoria', id: 'b' } }).resolve(), null);
  assert.equal(await fixture({ settingError: { message: 'synthetic private failure' } }).resolve(), null);
  assert.equal(await fixture({ societyError: { message: 'synthetic private failure' } }).resolve(), null);
});

test('server user verification remains mandatory; regular administrator and EBD behavior is preserved', async () => {
  const denied = fixture({ authError: { message: 'unverified token' } });
  assert.equal(await denied.resolve(), null);
  assert.deepEqual(denied.calls.map(call => call.table), ['auth']);
  const admin = fixture({ portal: null, roles: ['admin'], profile: { society_id: null } });
  assert.deepEqual(await admin.resolve(), { userId, roles: ['admin'], societyId: null });
  assert.equal(admin.calls.some(call => call.table === 'settings'), false);
  assert.equal(await fixture({ portal: { namespace: 'ebd' } }).resolve(), null);
  assert.equal(await resolveAiActor(admin.client, null), null);
});
