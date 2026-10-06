import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { initializeEbdFixture } from './fixtures/ebd-database.mjs';
import { portalFixture } from './fixtures/portal-session-backend.mjs';

// No HTTP Auth, real users, credentials or production database. Auth's issuer
// is modeled explicitly: refresh preserves session_id and uses user metadata.
const policyName = '20261006162230_ebd_auth_session_expiry.sql';
async function fixture(t, { legacy = false } = {}) {
  const db = new PGlite();
  t.after(() => db.close());
  const f = await initializeEbdFixture(db);
  await db.exec(f.migration('20261006135357_diretoria_society_pin_validation.sql'));
  const apply = () => db.exec(f.migration(policyName));
  if (!legacy) await apply();
  const as = async (jwt, work) => {
    await db.exec(`begin; set local role ${jwt ? 'authenticated' : 'anon'};`);
    await db.query("select set_config('request.jwt.claims',$1,true)", [JSON.stringify(jwt ?? {})]);
    try { const result = await work(); await db.exec('commit'); return result; }
    catch (error) { await db.exec('rollback'); throw error; }
  };
  const valid = async jwt => (await as(jwt, () => db.query('select ebd_session_valid() valid'))).rows[0].valid;
  const age = (id, seconds) => db.query("update auth.sessions set created_at=now()-$2*interval '1 second' where id=$1", [id, seconds]);
  const addSession = async (userId, seconds = 0) => {
    const id = randomUUID();
    await db.query("insert into auth.sessions values($1,$2,now()-$3*interval '1 second')", [id, userId, seconds]);
    return id;
  };
  return { ...f, db, apply, as, valid, age, addSession };
}

test('another warm PIN login cannot revive an expired teacher or administrator session on refresh', async t => {
  for (const kind of ['teacher', 'admin']) {
    const f = await fixture(t, { legacy: true });
    const { db, ids, sessionIds } = f;
    const now = Math.floor(Date.now() / 1000);
    const p = portalFixture({ id: kind === 'admin' ? 'admin' : ids.a,
      credential: kind === 'admin' ? f.adminSecret : f.secret, userId: ids[kind], now: now - 1000 });
    await f.age(sessionIds[kind], 1000);
    await p.run();
    const old = { sub: ids[kind], role: 'authenticated', session_id: sessionIds[kind], app_metadata: structuredClone(p.state.user.app_metadata) };
    assert.equal(await f.valid(old), false);
    p.reset(); p.state.now = now; await p.run();
    assert.equal(p.calls.some(call => call.kind === 'auth-update-password'), false);
    const refreshedOld = { ...old, app_metadata: structuredClone(p.state.user.app_metadata), iat: now };
    assert.equal(await f.valid(refreshedOld), true, 'reproduce the former shared-metadata expiry gap');
    await f.apply();
    assert.equal(await f.valid(refreshedOld), false, 'the old Auth session stays expired after refresh');
    await assert.rejects(() => f.as(refreshedOld, () => db.query(
      'insert into ebd_attendance(student_id,class_id,date,present,marked_by) values($1,$2,$3,true,$4)',
      [ids.one, ids.a, f.today, ids[kind]],
    )), error => error.code === '42501');
    const newSession = await f.addSession(ids[kind]);
    const renewed = { ...refreshedOld, session_id: newSession };
    assert.equal(await f.valid(renewed), true, 'the session that entered the correct PIN is authorized');
  }
});

test('simultaneous warm sessions remain independent and no password rehash or extra login query is added', async t => {
  const f = await fixture(t);
  const p = portalFixture({ id: f.ids.a, userId: f.ids.teacher, credential: f.secret });
  await p.run(); p.reset(); await p.run();
  assert.deepEqual(p.calls.map(call => call.kind), ['profile-read', 'auth-get', 'auth-update-metadata', 'sign-in']);
  const a = { ...f.claims(), app_metadata: structuredClone(p.state.user.app_metadata) };
  const b = { ...a, session_id: await f.addSession(f.ids.teacher) };
  assert.equal(await f.valid(a), true);
  assert.equal(await f.valid(b), true);
  await f.age(a.session_id, 901);
  assert.equal(await f.valid({ ...a, iat: Math.floor(Date.now() / 1000) }), false);
  assert.equal(await f.valid(b), true);
});

test('expiry uses Auth creation time, including the exact 900-second boundary and timezone independence', async t => {
  const f = await fixture(t);
  await f.db.exec("begin; set local timezone='Pacific/Auckland';");
  try {
    await f.db.query("select set_config('request.jwt.claims',$1,true)", [JSON.stringify(f.claims())]);
    for (const [seconds, expected] of [[899.999, true], [900, false], [900.001, false], [-30, true], [-30.001, false]]) {
      await f.age(f.sessionIds.teacher, seconds);
      assert.equal((await f.db.query('select ebd_session_valid() valid')).rows[0].valid, expected, `age=${seconds}`);
    }
  } finally { await f.db.exec('rollback'); }
  // Metadata and JWT timestamps cannot renew the creation time or veto a
  // legitimate fresh session after another device updates account metadata.
  const jwt = f.claims(); jwt.iat = 1; jwt.app_metadata.ipnc_portal.issued_at = 1;
  assert.equal(await f.valid(jwt), true);
});

test('missing, malformed, unknown, foreign, revoked and null-age sessions fail closed', async t => {
  const f = await fixture(t);
  for (const session_id of [undefined, null, '', 'not-a-uuid', randomUUID(), f.sessionIds.admin]) {
    assert.equal(await f.valid(f.claims({ session_id })), false);
  }
  assert.equal(await f.valid(f.adminClaims()), true);
  // Correct session_id with a different subject must fail even with otherwise
  // current portal metadata. The gateway remains responsible for JWT signatures.
  assert.equal(await f.valid(f.claims({ sub: f.ids.admin, session_id: f.sessionIds.teacher })), false);
  await f.db.query('update auth.sessions set created_at=null where id=$1', [f.sessionIds.teacher]);
  assert.equal(await f.valid(f.claims()), false);
  await f.db.query('delete from auth.sessions where id=$1', [f.sessionIds.teacher]);
  assert.equal(await f.valid(f.claims()), false);
});

test('PIN rotation, class/profile deactivation, namespace and own-class/current-day RLS remain authoritative', async t => {
  const f = await fixture(t);
  assert.equal(await f.valid(f.claims()), true);
  assert.equal(await f.valid(f.adminClaims()), true);
  const portal = f.claims().app_metadata.ipnc_portal;
  for (const replacement of [{ ...portal, fingerprint: 'wrong' }, { ...portal, namespace: 'treasury' }, { ...portal, id: randomUUID() }]) {
    assert.equal(await f.valid(f.claims({ app_metadata: { ipnc_portal: replacement } })), false);
  }
  assert.equal(await f.valid(f.claims({ sub: f.ids.inactive })), false);
  await f.db.query('update ebd_classes set active=false where id=$1', [f.ids.a]);
  assert.equal(await f.valid(f.claims()), false);
  await f.db.query('update ebd_classes set active=true where id=$1', [f.ids.a]);
  await f.db.query('update ebd_class_passwords set pin_hash=$1 where class_id=$2', ['rotated-synthetic-hash', f.ids.a]);
  assert.equal(await f.valid(f.claims()), false);
  await f.db.query('update ebd_class_passwords set pin_hash=$1,active=false where class_id=$2', [f.secret, f.ids.a]);
  assert.equal(await f.valid(f.claims()), false);
  await f.db.query('update ebd_class_passwords set active=true where class_id=$1', [f.ids.a]);
  assert.equal((await f.as(f.claims(), () => f.db.query('select id from ebd_classes'))).rows.length, 1);
  for (const [student, classId, date] of [[f.ids.other, f.ids.b, f.today], [f.ids.one, f.ids.a, f.past]]) {
    await assert.rejects(() => f.as(f.claims(), () => f.db.query('insert into ebd_attendance(student_id,class_id,date,present,marked_by) values($1,$2,$3,true,$4)',
      [student, classId, date, f.ids.teacher])), error => error.code === '42501');
  }
});

test('replacement preserves function owner/ACL/OID/security attributes and never grants Auth session access', async t => {
  const f = await fixture(t, { legacy: true });
  const metadata = async () => (await f.db.query("select oid,proowner,proacl,prosecdef,provolatile,proconfig from pg_proc where oid='ipnc_private.portal_valid(text)'::regprocedure")).rows;
  const rows = (await f.db.query('select * from auth.sessions order by id')).rows;
  const before = await metadata();
  await f.apply(); await f.apply();
  assert.deepEqual(await metadata(), before);
  assert.deepEqual((await f.db.query('select * from auth.sessions order by id')).rows, rows);
  await assert.rejects(() => f.as(f.claims(), () => f.db.query('select * from auth.sessions')), error => error.code === '42501');
  await assert.rejects(() => f.as(f.claims(), () => f.db.query('update auth.sessions set created_at=now()')), error => error.code === '42501');
  await assert.rejects(() => f.as(null, () => f.db.query('select ebd_session_valid()')), error => error.code === '42501');
});

test('migration aborts atomically for an absent/incompatible Auth registry or a guard owner without read access', async t => {
  for (const incompatible of ['absent', 'schema', 'privilege']) {
    const f = await fixture(t, { legacy: true });
    if (incompatible === 'absent') await f.db.exec('drop table auth.sessions');
    else if (incompatible === 'schema') await f.db.exec('alter table auth.sessions drop column created_at');
    else await f.db.exec('create role synthetic_guard_owner; alter function ipnc_private.portal_valid(text) owner to synthetic_guard_owner;');
    const body = (await f.db.query("select prosrc from pg_proc where oid='ipnc_private.portal_valid(text)'::regprocedure")).rows[0].prosrc;
    await assert.rejects(() => f.apply(), /EBD expiry requires/);
    await f.db.exec('rollback');
    assert.equal((await f.db.query("select prosrc from pg_proc where oid='ipnc_private.portal_valid(text)'::regprocedure")).rows[0].prosrc, body);
  }
});
