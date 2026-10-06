import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';

// Isolated synthetic database. Auth GUCs emulate a trusted gateway; these tests
// exercise SQL authorization, not JWT signatures or the production Auth service.
const db = new PGlite();
after(() => db.close());
await db.exec(`
create role anon; create role authenticated; create role service_role bypassrls;
create schema auth; create schema ipnc_private; create schema extensions;
create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
create function auth.uid() returns uuid language sql stable as $$ select nullif(auth.jwt()->>'sub','')::uuid $$;
create table auth.sessions(id uuid primary key,user_id uuid not null,created_at timestamptz);
create function extensions.digest(value text,algorithm text) returns bytea language sql as $$ select sha256(convert_to(value,'UTF8')) $$;
create type public.app_role as enum('admin','diretoria','pastor','visualizador');
create table profiles(user_id uuid primary key,active boolean not null,society_id uuid);
create table user_roles(user_id uuid,role public.app_role);
create table societies(id uuid primary key,slug text unique,active boolean not null);
create table settings(key text primary key,value text not null);
create table ebd_classes(id uuid primary key,active boolean not null);
create table ebd_class_passwords(class_id uuid primary key,pin_hash text not null,active boolean not null);
grant usage on schema public,auth,ipnc_private to authenticated,service_role;
grant usage on schema public,auth to anon;
`);
const migration = name => readFileSync(new URL(`../supabase/migrations/${name}`, import.meta.url), 'utf8');
const baseline = migration('20260905111555_portal_sessions_and_compatibility.sql');
const boundary = baseline.indexOf('create or replace function public.ebd_session_valid()');
assert.ok(boundary > 0);
await db.exec(baseline.slice(0, boundary) + '\ncommit;');
// Retain the current actor boundary, including the separate EBD and Treasury
// namespaces. The new migration must not replace this helper.
const treasuryActor = migration('20261005142735_treasury_society_pin_access.sql').match(/create or replace function ipnc_private\.actor_active\(\)[\s\S]+?\$\$;/i)?.[0];
assert.ok(treasuryActor);
await db.exec(treasuryActor);
await db.exec(`
alter table settings enable row level security;
grant select on settings to anon;
grant select,insert,update,delete on settings to authenticated;
create policy ipnc_pix on settings for select to anon,authenticated using (key=any(array['pix_key','pix_key_type','pix_beneficiary','pix_instructions']));
create policy ipnc_settings_admin on settings for all to authenticated using (ipnc_private.actor_has_role('admin')) with check (ipnc_private.actor_has_role('admin'));
`);
const ids = Object.fromEntries(['admin','a','b','pastor','inactive','empty','dead','invalid','teacher','ebdClass','societyA','societyB','societyEmpty','societyDead','societyInvalid'].map(key => [key, randomUUID()]));
await db.query(`insert into societies(id,slug,active) values($1,'a',true),($2,'b',true),($3,'empty',true),($4,'dead',false),($5,'invalid',true)`, [ids.societyA, ids.societyB, ids.societyEmpty, ids.societyDead, ids.societyInvalid]);
await db.query(`insert into profiles(user_id,active,society_id) values($1,true,null),($2,true,$9),($3,true,$10),($4,true,null),($5,false,$9),($6,true,$11),($7,true,$12),($8,true,$13),($14,true,null)`, [ids.admin,ids.a,ids.b,ids.pastor,ids.inactive,ids.empty,ids.dead,ids.invalid,ids.societyA,ids.societyB,ids.societyEmpty,ids.societyDead,ids.societyInvalid,ids.teacher]);
await db.query(`insert into user_roles values($1,'admin'),($2,'diretoria'),($3,'diretoria'),($4,'pastor'),($5,'admin')`, [ids.admin,ids.a,ids.b,ids.pastor,ids.inactive]);
await db.exec(`insert into settings values('diretoria_pin_a','100001'),('diretoria_pin_b','100002'),('diretoria_pin_pastor','100003'),('diretoria_pin_dead','100004'),('diretoria_pin_invalid','1234'),('diretoria_pin_geral','909090'),('secretaria_admin_password','synthetic-ebd-admin-secret'),('pix_key','synthetic-public-pix');`);
await db.query('insert into ebd_classes values($1,true)', [ids.ebdClass]);
await db.query("insert into ebd_class_passwords values($1,'synthetic-class-hash',true)", [ids.ebdClass]);
const fingerprint = value => createHash('sha256').update(`IPNC:PIN:v1:${value}`).digest('hex');
const sessionIds = Object.fromEntries([ids.admin,ids.teacher].map(id => [id,randomUUID()]));
for (const [userId,sessionId] of Object.entries(sessionIds)) await db.query('insert into auth.sessions values($1,$2,now())',[sessionId,userId]);
const claims = (userId, id, credential, namespace = 'diretoria') => ({ sub: userId, role: 'authenticated', session_id: sessionIds[userId], app_metadata: { ipnc_portal: { namespace, id, fingerprint: fingerprint(credential), issued_at: Math.floor(Date.now()/1000) } } });
const regular = userId => ({ sub: userId, role: 'authenticated', app_metadata: {} });
const as = async (jwt, work) => {
  await db.exec(`begin; set local role ${jwt ? 'authenticated' : 'anon'};`);
  await db.query("select set_config('request.jwt.claims',$1,true)", [JSON.stringify(jwt ?? {})]);
  try { const result = await work(); await db.exec('commit'); return result; }
  catch (error) { await db.exec('rollback'); throw error; }
};
const valid = async jwt => (await as(jwt, () => db.query("select ipnc_private.portal_valid('diretoria') value"))).rows[0].value;
const metadata = async () => (await db.query("select oid,proowner,proacl,prosecdef,provolatile,proconfig from pg_proc where oid='ipnc_private.portal_valid(text)'::regprocedure")).rows;
const beforeMetadata = await metadata();
const actorBefore = (await db.query("select pg_get_functiondef('ipnc_private.actor_active()'::regprocedure) value")).rows[0].value;
await db.exec(migration('20261006135357_diretoria_society_pin_validation.sql'));
await db.exec(migration('20261006162230_ebd_auth_session_expiry.sql'));

test('the replacement keeps function identity, privileges, ownership and the EBD/Treasury actor boundary unchanged', async () => {
  assert.deepEqual(await metadata(), beforeMetadata);
  assert.equal((await db.query("select pg_get_functiondef('ipnc_private.actor_active()'::regprocedure) value")).rows[0].value, actorBefore);
  await assert.rejects(() => as(null, () => db.query("select ipnc_private.portal_valid('diretoria')")), error => error.code === '42501');
});

test('individual Diretoria and Pastor credentials authorize only their server profile and active society', async () => {
  assert.equal(await valid(claims(ids.a,'a','100001')), true);
  assert.equal(await valid(claims(ids.b,'b','100002')), true);
  assert.equal(await valid(claims(ids.pastor,'pastor','100003')), true);
  for (const jwt of [
    claims(ids.a,'a','909090'), claims(ids.a,'a','100002'), claims(ids.a,'b','100002'),
    claims(ids.a,'pastor','100003'), claims(ids.pastor,'a','100001'), claims(ids.inactive,'a','100001'),
    claims(ids.dead,'dead','100004'), claims(ids.empty,'empty','909090'), claims(ids.invalid,'invalid','1234'),
    claims(ids.a,'geral','909090'), claims(ids.a,'unknown','100001'), claims(ids.a,'a/../b','100001'),
  ]) assert.equal(await valid(jwt), false);
});

test('equal numeric credentials cannot bypass the society/profile binding', async () => {
  await db.exec("update settings set value='100001' where key='diretoria_pin_b'");
  try {
    assert.equal(await valid(claims(ids.a,'b','100001')), false);
    assert.equal(await valid(claims(ids.b,'b','100001')), true);
  } finally { await db.exec("update settings set value='100002' where key='diretoria_pin_b'"); }
});

test('rotating one individual PIN revokes its old fingerprint while other societies remain authorized', async () => {
  await db.exec("update settings set value='100005' where key='diretoria_pin_a'");
  try {
    assert.equal(await valid(claims(ids.a,'a','100001')), false);
    assert.equal(await valid(claims(ids.a,'a','100005')), true);
    assert.equal(await valid(claims(ids.b,'b','100002')), true);
  } finally { await db.exec("update settings set value='100001' where key='diretoria_pin_a'"); }
});

test('EBD administrator, class credentials, expiry and Treasury separation retain their original behavior', async () => {
  const ebdValid = jwt => as(jwt, () => db.query("select ipnc_private.portal_valid('ebd') value,ipnc_private.actor_active() actor"));
  for (const jwt of [claims(ids.admin,'admin','synthetic-ebd-admin-secret','ebd'), claims(ids.teacher,ids.ebdClass,'synthetic-class-hash','ebd')]) {
    const result = (await ebdValid(jwt)).rows[0];
    assert.equal(result.value, true);
    assert.equal(result.actor, false);
  }
  const expired = claims(ids.teacher,ids.ebdClass,'synthetic-class-hash','ebd');
  await db.query("update auth.sessions set created_at=now()-interval '1000 seconds' where id=$1", [expired.session_id]);
  try { assert.equal((await ebdValid(expired)).rows[0].value, false); }
  finally { await db.query('update auth.sessions set created_at=now() where id=$1', [expired.session_id]); }
  const treasury = claims(ids.admin,randomUUID(),'synthetic-treasury-version','treasury');
  assert.equal((await as(treasury, () => db.query('select ipnc_private.actor_active() value'))).rows[0].value, false);
});

test('EBD session expiry preserves the prior Diretoria/Pastor policy for old, future and absent metadata timestamps', async () => {
  const cases = [];
  for (const issuedAt of [1, Math.floor(Date.now()/1000)+31, undefined]) {
    for (const jwt of [claims(ids.a,'a','100001'), claims(ids.pastor,'pastor','100003')]) {
      jwt.app_metadata.ipnc_portal.issued_at = issuedAt;
      cases.push(jwt);
    }
  }
  const actual = [];
  for (const jwt of cases) actual.push(await valid(jwt));
  // Compare with the actual previous definition, rather than inventing a new
  // 15-minute renewal policy for Diretoria, which has no such existing guard.
  await db.exec(migration('20261006135357_diretoria_society_pin_validation.sql'));
  try {
    const baseline = [];
    for (const jwt of cases) baseline.push(await valid(jwt));
    assert.deepEqual(actual, baseline);
    assert.ok(actual.every(Boolean));
  } finally { await db.exec(migration('20261006162230_ebd_auth_session_expiry.sql')); }
});

test('settings RLS reveals PINs only to an active administrator and keeps anonymous Pix settings public', async () => {
  const keys = jwt => as(jwt, () => db.query("select key from settings where key like 'diretoria_pin_%' order by key"));
  assert.equal((await keys(null)).rows.length, 0);
  assert.equal((await keys(regular(ids.a))).rows.length, 0);
  assert.equal((await keys(claims(ids.a,'a','100001'))).rows.length, 0);
  assert.equal((await keys(claims(ids.pastor,'pastor','100003'))).rows.length, 0);
  assert.equal((await keys(regular(ids.inactive))).rows.length, 0);
  assert.equal((await keys(regular(ids.admin))).rows.length, 6);
  assert.deepEqual((await as(null, () => db.query('select key from settings'))).rows, [{ key: 'pix_key' }]);
});

test('an administrator can create, read, update and delete a configured PIN while other actors cannot write it', async () => {
  const admin = regular(ids.admin);
  await as(admin, () => db.query("insert into settings values('diretoria_pin_fixture','100006')"));
  assert.equal((await as(admin, () => db.query("select value from settings where key='diretoria_pin_fixture'"))).rows[0].value, '100006');
  assert.equal((await as(admin, () => db.query("update settings set value='100007' where key='diretoria_pin_fixture' returning key"))).rows.length, 1);
  for (const jwt of [null,regular(ids.a),claims(ids.a,'a','100001'),claims(ids.pastor,'pastor','100003'),regular(ids.inactive)]) {
    await assert.rejects(() => as(jwt, () => db.query("insert into settings values('diretoria_pin_denied','100008')")), error => error.code === '42501');
    if (jwt) {
      assert.equal((await as(jwt, () => db.query("update settings set value='100008' where key='diretoria_pin_fixture' returning key"))).rows.length, 0);
      assert.equal((await as(jwt, () => db.query("delete from settings where key='diretoria_pin_fixture' returning key"))).rows.length, 0);
    }
  }
  assert.equal((await as(admin, () => db.query("delete from settings where key='diretoria_pin_fixture' returning key"))).rows.length, 1);
});
