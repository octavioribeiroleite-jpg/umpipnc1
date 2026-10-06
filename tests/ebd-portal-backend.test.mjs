import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { initializeEbdFixture } from './fixtures/ebd-database.mjs';
import { portalFixture, syntheticCosts } from './fixtures/portal-session-backend.mjs';

const kinds = fixture => fixture.calls.map(call => call.kind);
const update = fixture => fixture.calls.find(call => call.kind.startsWith('auth-update'))?.payload;

test('a legacy EBD account verifies its identity and upgrades the marker without changing the session contract', async () => {
  const p = portalFixture();
  const session = await p.run();
  assert.deepEqual(kinds(p), ['profile-read', 'auth-get', 'auth-update-password', 'sign-in']);
  assert.equal(p.calls[0].columns, 'user_id,active,society_id');
  assert.deepEqual(Object.keys(session).sort(), ['access_token', 'refresh_token']);
  assert.equal(update(p).app_metadata.ipnc_portal.issued_at, p.state.now);
  assert.match(update(p).app_metadata.ipnc_portal.account_version, /^[0-9a-f]{64}$/);
});

test('a repeated EBD login skips password rehash and unchanged profile writes while always renewing issued_at', async () => {
  const p = portalFixture();
  await p.run();
  const initial = structuredClone(p.state.user.app_metadata.ipnc_portal);
  p.reset(); p.state.now += 1000;
  await p.run();
  assert.deepEqual(kinds(p), ['profile-read', 'auth-get', 'auth-update-metadata', 'sign-in']);
  assert.equal('password' in update(p), false);
  assert.equal(update(p).app_metadata.ipnc_portal.issued_at, p.state.now);
  assert.equal(update(p).app_metadata.ipnc_portal.account_version, initial.account_version);
  assert.equal(update(p).app_metadata.ipnc_portal.fingerprint, initial.fingerprint);
});

test('credential, server secret and project rotation force password renewal; the marker is not a password or its digest', async () => {
  for (const rotation of ['credential', 'secret', 'url']) {
    const p = portalFixture();
    await p.run();
    const previous = p.state.user.app_metadata.ipnc_portal.account_version;
    const password = p.state.user.password;
    assert.notEqual(previous, password.slice(0, 64));
    assert.notEqual(previous, createHash('sha256').update(password).digest('hex'));
    p.reset();
    if (rotation === 'secret') p.state.secret += '-rotated';
    if (rotation === 'url') p.state.url = 'https://other-synthetic-project.test';
    await p.run(rotation === 'credential' ? { credential: 'rotated-credential' } : {});
    assert.equal(p.calls.filter(call => call.kind === 'auth-update-password').length, 1);
    assert.notEqual(update(p).app_metadata.ipnc_portal.account_version, previous);
  }
});

test('both the independent marker and credential fingerprint must match before omitting password renewal', async () => {
  for (const field of ['account_version', 'fingerprint']) {
    const p = portalFixture(); await p.run(); p.reset();
    p.state.user.app_metadata.ipnc_portal[field] = 'mismatch';
    await p.run();
    assert.equal(p.calls.some(call => call.kind === 'auth-update-password'), true);
  }
});

test('an account marker cannot be reused by another class even when its credential is identical', async () => {
  const a = portalFixture({ id: 'synthetic-class-a' }), b = portalFixture({ id: 'synthetic-class-b' });
  await a.run(); await b.run();
  const markerA = a.state.user.app_metadata.ipnc_portal.account_version;
  const markerB = b.state.user.app_metadata.ipnc_portal.account_version;
  assert.notEqual(markerA, markerB);
  a.state.user.app_metadata.ipnc_portal.account_version = markerB; a.reset();
  await a.run();
  assert.equal(a.calls.some(call => call.kind === 'auth-update-password'), true);
  assert.equal(update(a).app_metadata.ipnc_portal.account_version, markerA);
});

test('reserved-account collisions are denied before any account/profile mutation or session creation', async () => {
  for (const collision of [
    user => { user.email = 'another-account@synthetic.test'; },
    user => { user.app_metadata.ipnc_portal.namespace = 'diretoria'; },
    user => { user.app_metadata.ipnc_portal.id = 'other-class'; },
    user => { user.app_metadata = {}; },
  ]) {
    const p = portalFixture(); collision(p.state.user);
    await assert.rejects(() => p.run(), /Conta reservada indisponível/);
    assert.deepEqual(kinds(p), ['profile-read', 'auth-get']);
  }
});

test('new, inactive and mismatched-scope EBD profiles keep the original preparation behavior', async () => {
  for (const options of [{ newAccount: true }, { profile: { active: false } }, { profile: { society_id: 'synthetic-society' } }]) {
    const p = portalFixture(options);
    await p.run();
    assert.equal(p.calls.filter(call => call.kind === 'profile-write').length, 1);
    assert.equal(p.state.profile.active, true);
    assert.equal(p.state.profile.society_id, null);
    assert.ok(kinds(p).indexOf('profile-write') < kinds(p).indexOf('sign-in'));
  }
});

test('lookup, Auth, creation and profile failures never return a session, and login failure is still reported', async () => {
  for (const fail of ['lookup', 'auth-get', 'auth-update', 'profile-write', 'auth-create', 'sign-in']) {
    const p = portalFixture({ fail, ...(fail === 'profile-write' ? { profile: { active: false } } : {}), ...(fail === 'auth-create' ? { newAccount: true } : {}) });
    await assert.rejects(() => p.run());
    if (fail !== 'sign-in') assert.equal(p.calls.some(call => call.kind === 'sign-in'), false, fail);
  }
});

test('Diretoria and Treasury preserve their previous password/profile/role writes and claims', async () => {
  for (const namespace of ['diretoria', 'treasury']) {
    const p = portalFixture({ namespace, input: { role: 'visualizador' } });
    for (let i = 0; i < 2; i++) {
      p.reset(); await p.run();
      assert.deepEqual(kinds(p), ['profile-read', 'auth-get', 'auth-update-password', 'profile-write', 'role-upsert', 'sign-in']);
      assert.equal(p.calls[0].columns, 'user_id');
      assert.equal('account_version' in update(p).app_metadata.ipnc_portal, false);
    }
  }
});

test('synthetic operation cost drops on warm EBD entry without skipping Auth identity or token creation', async () => {
  const p = portalFixture(); await p.run(); p.reset(); await p.run();
  const baseline = ['profile-read', 'auth-get', 'auth-update-password', 'profile-write', 'sign-in'];
  const baselineCost = baseline.reduce((sum, kind) => sum + syntheticCosts[kind], 0);
  assert.equal(baselineCost, 660);
  assert.equal(p.cost(), 400);
  assert.equal(p.calls.length, 4);
  assert.ok(p.cost() < baselineCost);
  // This is the fixture's cost model. No production speed claim follows from it.
});

test('warm helper claims pass the session-bound SQL guard and still expire after 15 minutes', async () => {
  const db = new PGlite();
  try {
    const { ids, sessionIds, secret, migration } = await initializeEbdFixture(db);
    await db.exec(migration('20261006135357_diretoria_society_pin_validation.sql'));
    await db.exec(migration('20261006162230_ebd_auth_session_expiry.sql'));
    const p = portalFixture({ id: ids.a, credential: secret, userId: ids.teacher, now: Math.floor(Date.now() / 1000) - 1000 });
    await p.run(); p.reset(); p.state.now = Math.floor(Date.now() / 1000); await p.run();
    assert.equal('password' in update(p), false);
    const jwt = { sub: ids.teacher, role: 'authenticated', session_id: sessionIds.teacher, app_metadata: p.state.user.app_metadata };
    const valid = async claims => {
      await db.query("select set_config('request.jwt.claims',$1,false)", [JSON.stringify(claims)]);
      return (await db.query("select ipnc_private.portal_valid('ebd') valid")).rows[0].valid;
    };
    assert.equal(await valid(jwt), true);
    await db.query("update auth.sessions set created_at=now()-interval '901 seconds' where id=$1", [sessionIds.teacher]);
    assert.equal(await valid(jwt), false);
    await db.query('update auth.sessions set created_at=now() where id=$1', [sessionIds.teacher]);
    const wrongNamespace = structuredClone(jwt); wrongNamespace.app_metadata.ipnc_portal.namespace = 'treasury';
    assert.equal(await valid(wrongNamespace), false);
  } finally { await db.close(); }
});
