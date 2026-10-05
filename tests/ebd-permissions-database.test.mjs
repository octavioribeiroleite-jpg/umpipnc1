import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { initializeEbdFixture } from './fixtures/ebd-database.mjs';
import { PGlite } from '@electric-sql/pglite';

// Isolated PostgreSQL only. Auth claims below emulate the trusted gateway; no
// network, credentials, production data or migration-history writes are used.
const db = new PGlite();
const { ids, secret, fingerprint, today, past, claims, adminClaims, migration } = await initializeEbdFixture(db);
const session = async (jwt, work) => {
  await db.exec(`begin; set local role ${jwt ? 'authenticated' : 'anon'};`);
  await db.query("select set_config('request.jwt.claims',$1,true)", [JSON.stringify(jwt || {})]);
  try { const result = await work(); await db.exec('commit'); return result; }
  catch (error) { await db.exec('rollback'); throw error; }
};
const write = (pupil = ids.one, classId = ids.a, day = today, present = true, actor = ids.teacher) => db.query(
  `insert into ebd_attendance(student_id,class_id,date,present,marked_by) values($1,$2,$3,$4,$5)
   on conflict(student_id,date) do update set present=excluded.present,marked_by=excluded.marked_by returning *`,
  [pupil, classId, day, present, actor],
);
const denied = work => assert.rejects(work, error => error.code === '42501');
after(() => db.close());

test('EBD policies retain RLS, deny anonymous access and restrict teacher reads/writes to own class and current day', async () => {
  await denied(() => session(null, () => db.query('select * from ebd_attendance')));
  await denied(() => session(null, () => db.query('select ebd_session_valid()')));
  const classes = await session(claims(), () => db.query('select id from ebd_classes'));
  assert.deepEqual(classes.rows.map(item => item.id), [ids.a]);
  const own = await session(claims(), () => write());
  assert.equal(own.rows[0].marked_by, ids.teacher);
  await denied(() => session(claims(), () => write(ids.other, ids.b)));
  await denied(() => session(claims(), () => write(ids.two, ids.a, past)));
  await session(adminClaims(), () => write(ids.other, ids.b, today, true, ids.admin));
  assert.equal((await session(claims(), () => db.query('select * from ebd_attendance where class_id=$1', [ids.b]))).rows.length, 0);
  assert.equal((await session(claims(), () => db.query('update ebd_attendance set present=false where class_id=$1 returning id', [ids.b]))).rows.length, 0);
  await denied(() => session(claims(), () => db.query('select ebd_close_day($1)', [today])));
});

test('expired, mismatched, revoked, inactive and wrong-namespace sessions cannot save attendance', async () => {
  const baseline = claims();
  const portal = baseline.app_metadata.ipnc_portal;
  for (const replacement of [
    { ...portal, issued_at: portal.issued_at - 1000 },
    { ...portal, fingerprint: fingerprint('wrong-synthetic-pin-hash') },
    { ...portal, namespace: 'diretoria' },
    { ...portal, id: ids.b },
  ]) {
    const jwt = claims({ app_metadata: { ipnc_portal: replacement } });
    await denied(() => session(jwt, () => write(ids.two)));
  }
  await denied(() => session(claims({ sub: ids.inactive }), () => write(ids.two)));
  const noSession = claims({ app_metadata: {}, user_metadata: { ipnc_portal: portal } });
  await denied(() => session(noSession, () => write(ids.two)));
  await db.query('update ebd_class_passwords set pin_hash=$1 where class_id=$2', ['rotated-synthetic-hash', ids.a]);
  try {
    assert.equal((await session(baseline, () => db.query('select ebd_session_valid() valid'))).rows[0].valid, false);
    await denied(() => session(baseline, () => write(ids.two)));
    const renewed = claims({ app_metadata: { ipnc_portal: { ...portal, issued_at: Math.floor(Date.now()/1000), fingerprint: fingerprint('rotated-synthetic-hash') } } });
    await session(renewed, () => write(ids.two));
    await denied(() => session(renewed, () => write(ids.other, ids.b)));
  } finally { await db.query('update ebd_class_passwords set pin_hash=$1 where class_id=$2', [secret, ids.a]); }
  await db.query('update ebd_class_passwords set active=false where class_id=$1', [ids.a]);
  try { await denied(() => session(claims(), () => write(ids.two))); }
  finally { await db.query('update ebd_class_passwords set active=true where class_id=$1', [ids.a]); }
});

test('repeated desired-state upsert is unique and guarded identity cannot move between pupil/date/class', async () => {
  const first = (await session(claims(), () => write())).rows[0];
  const again = (await session(claims(), () => write())).rows[0];
  assert.equal(first.id, again.id);
  assert.equal((await session(claims(), () => db.query('select * from ebd_attendance where student_id=$1 and date=$2', [ids.one, today]))).rows.length, 1);
  for (const sql of [
    'update ebd_attendance set class_id=$2 where id=$1',
    'update ebd_attendance set student_id=$2 where id=$1',
  ]) await assert.rejects(() => session(adminClaims(), () => db.query(sql, [first.id, ids.b])), /mover|Aluno não pode/);
  await assert.rejects(() => session(adminClaims(), () => db.query('update ebd_attendance set date=$2 where id=$1', [first.id, past])), /mover/);
});

test('closed day rejects delayed writes, preserves snapshot totals, and only matching admin reopen resumes writes', async () => {
  const closed = (await session(adminClaims(), () => db.query('select ebd_close_day($1) value', [today]))).rows[0].value;
  assert.equal(closed.total_students, 3);
  assert.equal(closed.present_students, 3);
  await assert.rejects(() => session(claims(), () => write(ids.one, ids.a, today, false)), /Dia fechado/);
  await assert.rejects(() => session(adminClaims(), () => write(ids.one, ids.a, today, false, ids.admin)), /Dia fechado/);
  const teacherClosure = (await session(claims(), () => db.query('select ebd_closure($1) value', [today]))).rows[0].value;
  assert.deepEqual(Object.keys(teacherClosure).sort(), ['date', 'id', 'visitor_count']);
  await denied(() => session(claims(), () => db.query('select ebd_reopen_day($1,$2)', [today, closed.id])));
  await assert.rejects(() => session(adminClaims(), () => db.query('select ebd_reopen_day($1,$2)', [today, randomUUID()])), /fechamento mudou/);
  await session(adminClaims(), () => db.query('select ebd_reopen_day($1,$2)', [today, closed.id]));
  const changed = await session(claims(), () => write(ids.one, ids.a, today, false));
  assert.equal(changed.rows[0].present, false);
});

test('documents current backend limitation: finalized class alone does not reject a direct authorized attendance write', async () => {
  await session(claims(), () => db.query(`insert into ebd_call_status(class_id,date,status,changed_by) values($1,$2,'finalizada','Fixture') on conflict(class_id,date) do update set status='finalizada'`, [ids.a, today]));
  const result = await session(claims(), () => write(ids.one, ids.a, today, true));
  assert.equal(result.rows[0].present, true, 'Existing guard protects a closed day, not finalized class status; do not claim stronger backend coverage');
});

test('isolated proposed guard rejects delayed attendance and visitors after class finalization for teacher and administrator', async () => {
  const metadata = () => db.query(`select oid,proowner,proacl,prosecdef,proconfig from pg_proc where oid='ipnc_private.guard_ebd_day()'::regprocedure`);
  const before = (await metadata()).rows;
  await db.exec(readFileSync(new URL('../docs/auditoria-responsividade/propostas/guard-chamada-finalizada.sql', import.meta.url), 'utf8'));
  assert.deepEqual((await metadata()).rows, before, 'CREATE OR REPLACE retains function OID, owner, ACL, SECURITY DEFINER and pinned search_path');
  await assert.rejects(() => session(claims(), () => write()), /Chamada finalizada/);
  await assert.rejects(() => session(adminClaims(), () => write(ids.one, ids.a, today, false, ids.admin)), /Chamada finalizada/);
  await assert.rejects(() => session(claims(), () => db.query('insert into ebd_class_visitor_entries(date,class_id,name) values($1,$2,$3)', [today, ids.a, 'Visitante sintético'])), /Chamada finalizada/);
  await session(claims(), () => db.query("update ebd_call_status set status='aberta' where class_id=$1 and date=$2", [ids.a, today]));
  assert.equal((await session(claims(), () => write(ids.one, ids.a, today, false))).rows[0].present, false);
  await session(claims(), () => db.query('insert into ebd_class_visitor_entries(date,class_id,name) values($1,$2,$3)', [today, ids.a, 'Visitante sintético']));
  await session(claims(), () => db.query("update ebd_call_status set status='finalizada' where class_id=$1 and date=$2", [ids.a, today]));
  await assert.rejects(() => session(claims(), () => db.query('delete from ebd_class_visitor_entries where class_id=$1 and date=$2', [ids.a, today])), /Chamada finalizada/);
});

test('proposed guard preserves explicit class reopening, historical correction and closed-day snapshots', async () => {
  await session(adminClaims(), () => db.query("update ebd_call_status set status='aberta' where class_id=$1 and date=$2", [ids.a, today]));
  await session(adminClaims(), () => write(ids.one, ids.a, past, true, ids.admin));
  await db.query('update ebd_students set active=false,class_id=$1 where id=$2', [ids.b, ids.one]);
  try {
    const correction = await session(adminClaims(), () => db.query('update ebd_attendance set present=false where student_id=$1 and date=$2 returning class_id', [ids.one, past]));
    assert.equal(correction.rows[0].class_id, ids.a);
    await assert.rejects(() => session(claims(), () => write(ids.one)), /Aluno indisponível/);
  } finally { await db.query('update ebd_students set active=true,class_id=$1 where id=$2', [ids.a, ids.one]); }
  // Both serialization orders are exercised sequentially. PGlite has one
  // connection; this does not claim a simultaneous multi-session lock test.
  await session(claims(), () => write(ids.one, ids.a, today, true));
  const snapshot = (await session(adminClaims(), () => db.query('select ebd_close_day($1) value', [today]))).rows[0].value;
  assert.equal(snapshot.present_students, 3);
  assert.equal(snapshot.visitor_count, 1);
  await assert.rejects(() => session(claims(), () => write(ids.two, ids.a, today, false)), /Dia fechado/);
  assert.equal((await session(adminClaims(), () => db.query('select ebd_close_day($1) value', [today]))).rows[0].value.id, snapshot.id);
});

test('isolated rollback restores exactly the baseline guard body without changing its privileges or day records', async () => {
  const metadata = () => db.query(`select oid,proowner,proacl,prosecdef,proconfig from pg_proc where oid='ipnc_private.guard_ebd_day()'::regprocedure`);
  const before = (await metadata()).rows;
  const recordsBefore = (await db.query('select jsonb_agg(to_jsonb(c) order by c.id) value from ebd_day_closures c')).rows;
  const baseline = migration('20260927121700_ebd_historical_attendance.sql');
  const body = baseline.split('as $$')[1].split('$$;')[0];
  await db.exec(readFileSync(new URL('../docs/auditoria-responsividade/propostas/rollback-guard-chamada-finalizada.sql', import.meta.url), 'utf8'));
  assert.deepEqual((await metadata()).rows, before);
  assert.equal((await db.query("select prosrc from pg_proc where oid='ipnc_private.guard_ebd_day()'::regprocedure")).rows[0].prosrc, body);
  assert.deepEqual((await db.query('select jsonb_agg(to_jsonb(c) order by c.id) value from ebd_day_closures c')).rows, recordsBefore);
});
