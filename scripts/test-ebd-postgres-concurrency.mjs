import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createServer, createConnection } from 'node:net';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { initializeEbdFixture } from '../tests/fixtures/ebd-database.mjs';

// Manual opt-in: use only a task-private runtime installed under /tmp. There is
// intentionally no connection-string input and no dependency in the app lock.
const runtime = realpathSync(process.argv[2] || 'missing-temporary-runtime');
const temporaryRoot = realpathSync('/tmp');
assert.ok(runtime.startsWith(temporaryRoot + sep), 'Runtime must live under /tmp');
const requireRuntime = createRequire(join(runtime, 'package.json'));
const { Client } = requireRuntime('pg');
const native = join(runtime, 'node_modules/@embedded-postgres/darwin-arm64/native/bin');
const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = join(repo, 'docs/auditoria-responsividade/fundacao-checks');
mkdirSync(output, { recursive: true });
const cluster = mkdtempSync(join(runtime, 'cluster-'));
const data = join(cluster, 'data');
const socket = join(cluster, 'socket');
mkdirSync(socket, { mode: 0o700 });
const password = randomBytes(32).toString('hex');
const pwfile = join(cluster, 'password');
writeFileSync(pwfile, password, { mode: 0o600 });
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const port = await new Promise((resolve, reject) => {
  const probe = createServer();
  probe.once('error', reject);
  probe.listen(0, '127.0.0.1', () => { const { port } = probe.address(); probe.close(error => error ? reject(error) : resolve(port)); });
});
const report = { startedAt: new Date().toISOString(), host: process.platform, architecture: process.arch,
  version: execFileSync(join(native, 'postgres'), ['--version'], { encoding: 'utf8' }).trim(),
  runtimePackage: '@embedded-postgres/darwin-arm64@17.10.0-beta.17', clientPackage: 'pg@8.23.1',
  endpoint: { host: '127.0.0.1', port }, cluster, cases: [], shutdown: null };
const clients = new Set();
let started = false;
let observer;
let fixture;
const run = (binary, args) => execFileSync(join(native, binary), args, { encoding: 'utf8', timeout: 30_000 });
const connect = async label => {
  const client = new Client({ host: '127.0.0.1', port, user: 'ipnc_fixture', database: 'postgres', password,
    application_name: `ipnc-isolated-${label}`, connectionTimeoutMillis: 5000, statement_timeout: 10_000, lock_timeout: 5000 });
  client.on('error', () => {}); // Expected in the controlled response-loss test.
  await client.connect(); clients.add(client);
  return client;
};
const disconnect = async client => { clients.delete(client); await client.end().catch(() => {}); };
const begin = async (client, jwt = fixture.claims()) => {
  await client.query('begin isolation level read committed');
  await client.query('set local role authenticated');
  await client.query("select set_config('request.jwt.claims',$1,true)", [JSON.stringify(jwt)]);
};
const commit = client => client.query('commit');
const rollback = client => client.query('rollback');
const session = async (client, jwt, work) => {
  await begin(client, jwt);
  try { const result = await work(); await commit(client); return result; }
  catch (error) { await rollback(client); throw error; }
};
const write = (client, { pupil = fixture.ids.one, classId = fixture.ids.a, day = fixture.today, present = true, actor = fixture.ids.teacher } = {}) => client.query(
  `insert into ebd_attendance(student_id,class_id,date,present,marked_by) values($1,$2,$3,$4,$5)
   on conflict(student_id,date) do update set present=excluded.present,marked_by=excluded.marked_by returning id,present`,
  [pupil, classId, day, present, actor]);
const finalize = (client, status = 'finalizada', day = fixture.today) => client.query(
  "insert into ebd_call_status(class_id,date,status,changed_by) values($1,$2,$3,'Synthetic concurrency fixture') on conflict(class_id,date) do update set status=excluded.status returning status", [fixture.ids.a, day, status]);
const close = client => client.query('select ebd_close_day($1) value', [fixture.today]);
const reset = async () => {
  await observer.query('truncate ebd_attendance,ebd_class_visitor_entries,ebd_call_status,ebd_day_closures');
};
const pending = promise => {
  const state = { settled: false };
  state.result = promise.then(value => { state.settled = true; return { value }; }, error => { state.settled = true; return { error }; });
  return state;
};
const waitBlocked = async (blocked, blocker, operation) => {
  const deadline = Date.now() + 3000;
  while (Date.now() < deadline) {
    const result = await observer.query(`select l.pid,l.locktype,l.classid::text,l.objid::text,l.objsubid,l.granted,
      a.wait_event_type,a.wait_event,pg_blocking_pids(l.pid) blockers
      from pg_locks l join pg_stat_activity a on a.pid=l.pid
      where l.pid=$1 and l.locktype='advisory' and not l.granted`, [blocked.processID]);
    const lock = result.rows.find(item => item.classid === '1869639283' && item.blockers.includes(blocker.processID));
    if (lock) { assert.equal(operation.settled, false, 'Operation must still await the transaction lock'); return lock; }
    if (operation.settled) throw new Error('Expected advisory wait but second operation already completed');
    await delay(20);
  }
  throw new Error('Timed out observing second session waiting for advisory lock');
};
const result = async operation => { const settled = await operation.result; if (settled.error) throw settled.error; return settled.value; };
const denied = async (operation, expression) => {
  const settled = await operation.result;
  assert.ok(settled.error, 'Expected server rejection');
  assert.equal(settled.error.code, 'P0001');
  assert.match(settled.error.message, expression);
  return { code: settled.error.code, message: settled.error.message };
};
const record = (name, evidence = {}) => { report.cases.push({ name, passed: true, ...evidence }); console.log(`ok ${name}`); };

try {
  console.log(run('initdb', ['-D', data, '-U', 'ipnc_fixture', '--auth-host=scram-sha-256', '--auth-local=scram-sha-256', '--pwfile', pwfile, '--no-locale', '-E', 'UTF8']));
  rmSync(pwfile);
  // No launch agent/service, no external interface, no global installation.
  console.log(run('pg_ctl', ['-D', data, '-l', join(cluster, 'server.log'), '-o', `-h 127.0.0.1 -p ${port} -k ${socket} -c unix_socket_permissions=0700 -c wal_level=logical -c max_connections=12 -c shared_buffers=16MB`, '-w', 'start']));
  started = true;
  observer = await connect('observer');
  fixture = await initializeEbdFixture({ exec: sql => observer.query(sql), query: (sql, values) => observer.query(sql, values) });
  const a = await connect('A');
  const b = await connect('B');
  report.server = (await observer.query('select version(),current_setting(\'transaction_isolation\') isolation,current_setting(\'listen_addresses\') listen')).rows[0];
  const metadata = async () => (await observer.query("select oid,proowner,proacl,prosecdef,proconfig from pg_proc where oid='ipnc_private.guard_ebd_day()'::regprocedure")).rows;
  const original = await metadata();
  report.baseline = {
    guard: original,
    functionBodies: (await observer.query("select p.oid::regprocedure::text signature,md5(p.prosrc) body_md5 from pg_proc p where p.oid in ('ipnc_private.guard_ebd_day()'::regprocedure,'public.ebd_close_day(date)'::regprocedure,'public.ebd_reopen_day(date,uuid)'::regprocedure) order by signature")).rows,
    policies: (await observer.query("select tablename,policyname,permissive,roles::text[] roles,cmd,qual,with_check from pg_policies where schemaname='public' and tablename in ('ebd_attendance','ebd_class_visitor_entries','ebd_day_closures','ebd_call_status') order by tablename,policyname")).rows,
  };

  // Run identical real contention against baseline and then proposed body.
  for (const phase of ['baseline', 'proposal']) {
    if (phase === 'proposal') {
      await observer.query(readFileSync(join(repo, 'docs/auditoria-responsividade/propostas/guard-chamada-finalizada.sql'), 'utf8'));
      assert.deepEqual(await metadata(), original);
    }
    for (const abortFirst of [false, true]) {
      await reset();
      await begin(a); await finalize(a);
      await begin(b); const saving = pending(write(b));
      const lock = await waitBlocked(b, a, saving);
      await (abortFirst ? rollback(a) : commit(a));
      let rejection;
      if (phase === 'proposal' && !abortFirst) { rejection = await denied(saving, /Chamada finalizada/); await rollback(b); }
      else { assert.equal((await result(saving)).rows[0].present, true); await commit(b); }
      assert.equal((await observer.query('select count(*)::int value from ebd_attendance')).rows[0].value, phase === 'proposal' && !abortFirst ? 0 : 1);
      record(`${phase}/finalize-first/${abortFirst ? 'rollback' : 'commit'}`, { lock, rejection });

      await reset();
      await begin(a); await write(a);
      await begin(b); const finishing = pending(finalize(b));
      const finishLock = await waitBlocked(b, a, finishing);
      await (abortFirst ? rollback(a) : commit(a));
      await result(finishing); await commit(b);
      assert.equal((await observer.query('select count(*)::int value from ebd_attendance')).rows[0].value, abortFirst ? 0 : 1);
      assert.equal((await observer.query('select status from ebd_call_status')).rows[0].status, 'finalizada');
      record(`${phase}/write-before-finalize/${abortFirst ? 'rollback' : 'commit'}`, { lock: finishLock });

      await reset();
      await begin(a, fixture.adminClaims()); await close(a);
      await begin(b); const afterClose = pending(write(b));
      const closeLock = await waitBlocked(b, a, afterClose);
      await (abortFirst ? rollback(a) : commit(a));
      let closeRejection;
      if (abortFirst) { await result(afterClose); await commit(b); }
      else { closeRejection = await denied(afterClose, /Dia fechado/); await rollback(b); }
      assert.equal((await observer.query('select count(*)::int value from ebd_attendance')).rows[0].value, abortFirst ? 1 : 0);
      record(`${phase}/close-first/${abortFirst ? 'rollback' : 'commit'}`, { lock: closeLock, rejection: closeRejection });

      await reset();
      await begin(a); await write(a);
      await begin(b, fixture.adminClaims()); const closing = pending(close(b));
      const snapshotLock = await waitBlocked(b, a, closing);
      await (abortFirst ? rollback(a) : commit(a));
      const snapshot = (await result(closing)).rows[0].value; await commit(b);
      assert.equal(snapshot.present_students, abortFirst ? 0 : 1);
      assert.equal(snapshot.total_students, 3);
      record(`${phase}/write-before-close/${abortFirst ? 'rollback' : 'commit'}`, { lock: snapshotLock, present: snapshot.present_students, total: snapshot.total_students });
    }

    for (const closeFirst of [true, false]) {
      await reset();
      const visitor = client => client.query('insert into ebd_class_visitor_entries(date,class_id,name) values($1,$2,$3)', [fixture.today,fixture.ids.a,'Synthetic concurrent visitor']);
      await begin(a, fixture.adminClaims());
      await (closeFirst ? close(a) : visitor(a));
      await begin(b, fixture.adminClaims());
      const other = pending(closeFirst ? visitor(b) : close(b));
      const lock = await waitBlocked(b, a, other);
      await commit(a);
      if (closeFirst) { await denied(other, /Dia fechado/); await rollback(b); }
      else { assert.equal((await result(other)).rows[0].value.visitor_count, 1); await commit(b); }
      assert.equal((await observer.query('select count(*)::int value from ebd_class_visitor_entries')).rows[0].value, closeFirst ? 0 : 1);
      record(`${phase}/${closeFirst ? 'close-before-visitor' : 'visitor-before-close'}`, { lock });
    }

    // Real RLS/session policies in native PostgreSQL, using GUCs as gateway.
    await reset();
    await assert.rejects(() => session(b, fixture.claims(), () => write(b, { pupil: fixture.ids.other, classId: fixture.ids.b })), error => error.code === '42501');
    const expired = fixture.claims(); expired.app_metadata.ipnc_portal.issued_at -= 1000;
    await assert.rejects(() => session(b, expired, () => write(b)), error => error.code === '42501');
    const invalid = fixture.claims(); invalid.app_metadata.ipnc_portal.fingerprint = fixture.fingerprint('invalid-synthetic-hash');
    await assert.rejects(() => session(b, invalid, () => write(b)), error => error.code === '42501');
    await session(b, fixture.claims(), () => write(b));
    record(`${phase}/teacher-class-expiry-revocation-renewal`);

    await reset();
    await begin(a, fixture.adminClaims()); await write(a, { day: fixture.past, actor: fixture.ids.admin });
    await session(b, fixture.claims(), () => write(b));
    const extraLock = (await observer.query("select count(*)::int value from pg_locks where pid=$1 and locktype='advisory' and not granted", [b.processID])).rows[0].value;
    assert.equal(extraLock, 0); await commit(a);
    record(`${phase}/distinct-dates-do-not-block`);
  }

  // Three requests already sent by one UI versus a finalization in another UI.
  const thirdPupil = randomUUID();
  await observer.query("insert into ebd_students(id,class_id,name) values($1,$2,'Synthetic third pupil')", [thirdPupil,fixture.ids.a]);
  const c = await connect('C');
  const d = await connect('D');
  for (const finalizationFirst of [true, false]) {
    await reset();
    if (finalizationFirst) {
      await begin(a); await finalize(a);
      const actors = [b,c,d];
      const work = [];
      for (let i=0; i<actors.length; i++) {
        await begin(actors[i]);
        work.push(pending(write(actors[i], { pupil: [fixture.ids.one,fixture.ids.two,thirdPupil][i] })));
      }
      const locks = [];
      for (let i=0; i<actors.length; i++) locks.push(await waitBlocked(actors[i], a, work[i]));
      await commit(a);
      for (let i=0; i<actors.length; i++) { await denied(work[i], /Chamada finalizada/); await rollback(actors[i]); }
      assert.equal((await observer.query('select count(*)::int value from ebd_attendance')).rows[0].value, 0);
      record('proposal/three-in-flight-finalization-first', { locks });
    } else {
      await begin(a); await write(a);
      await begin(b); const second = pending(write(b, { pupil: fixture.ids.two }));
      const secondLock = await waitBlocked(b, a, second);
      await begin(c); const third = pending(write(c, { pupil: thirdPupil }));
      const thirdLock = await waitBlocked(c, a, third);
      await begin(d); const last = pending(finalize(d));
      const finalLock = await waitBlocked(d, a, last);
      await commit(a); await result(second); await commit(b); await result(third); await commit(c); await result(last); await commit(d);
      assert.equal((await observer.query('select count(*)::int value from ebd_attendance where present')).rows[0].value, 3);
      record('proposal/three-in-flight-writes-first', { locks: [secondLock,thirdLock,finalLock] });
    }
  }
  await disconnect(c); await disconnect(d);
  await reset();
  await observer.query('delete from ebd_students where id=$1',[thirdPupil]);

  // An application timeout never sends cancellation to PostgreSQL. The pending
  // query later commits; an authoritative read and repeated desired upsert must
  // keep one identity. Then sever a real socket after confirmed commit, before
  // handing any response to the simulated UI (controlled response loss).
  await reset();
  await begin(a); await finalize(a, 'aberta');
  await begin(b); const slow = pending(write(b));
  const timeoutLock = await waitBlocked(b, a, slow);
  const outcome = await Promise.race([slow.result.then(() => 'server-response'), delay(50).then(() => 'application-timeout')]);
  assert.equal(outcome, 'application-timeout'); assert.equal(slow.settled, false);
  await commit(a); const saved = (await result(slow)).rows[0]; await commit(b);
  const authoritative = await session(a, fixture.claims(), () => a.query('select id,present from ebd_attendance where student_id=$1 and date=$2', [fixture.ids.one,fixture.today]));
  assert.equal(authoritative.rows[0].id, saved.id); assert.equal(authoritative.rows[0].present, true);
  b.connection.stream.destroy(); await disconnect(b);
  const replacement = await connect('B-reconnected');
  const retry = await session(replacement, fixture.claims(), () => write(replacement));
  assert.equal(retry.rows[0].id, saved.id);
  assert.equal((await observer.query('select count(*)::int value from ebd_attendance')).rows[0].value, 1);
  record('proposal/application-timeout-no-cancel-socket-loss-read-desired-retry-unique', { lock: timeoutLock, oneRow: true, sameId: true, simulation: 'Application response discarded after server commit; socket then destroyed. Does not emulate PostgREST/TCP loss before COMMIT acknowledgement.' });

  // Day reopening preserves existing finalized statuses. Administrators need
  // explicit class reopening before changing that class. Existing open status
  // remains open; absent status is created finalized by the current function.
  await session(a, fixture.claims(), () => finalize(a));
  const snapshot = (await session(a, fixture.adminClaims(), () => close(a))).rows[0].value;
  await session(a, fixture.adminClaims(), () => a.query('select ebd_reopen_day($1,$2)', [fixture.today,snapshot.id]));
  await assert.rejects(() => session(replacement, fixture.claims(), () => write(replacement, { present: false })), /Chamada finalizada/);
  await session(a, fixture.adminClaims(), () => finalize(a, 'aberta'));
  await session(replacement, fixture.claims(), () => write(replacement, { present: false }));
  record('proposal/day-reopen-keeps-class-finalized-explicit-class-reopen-restores-write');

  const baselineBody = fixture.migration('20260927121700_ebd_historical_attendance.sql').split('as $$')[1].split('$$;')[0];
  await observer.query(readFileSync(join(repo, 'docs/auditoria-responsividade/propostas/rollback-guard-chamada-finalizada.sql'), 'utf8'));
  assert.deepEqual(await metadata(), original);
  assert.equal((await observer.query("select prosrc from pg_proc where oid='ipnc_private.guard_ebd_day()'::regprocedure")).rows[0].prosrc, baselineBody);
  record('rollback/exact-body-oid-owner-acl-security-search-path');
  report.passed = true;
} catch (error) {
  report.passed = false;
  report.failure = { message: error.message, stack: error.stack, code: error.code };
  process.exitCode = 1;
  console.error(error);
} finally {
  await Promise.all([...clients].map(disconnect));
  if (started) {
    try {
      const stop = run('pg_ctl', ['-D', data, '-m', 'fast', '-w', 'stop']);
      console.log(stop);
      const alive = await new Promise(resolve => {
        const probe = createConnection({ host:'127.0.0.1',port });
        probe.once('connect', () => { probe.destroy(); resolve(true); });
        probe.once('error', () => resolve(false));
      });
      report.shutdown = { stopped: !existsSync(join(data, 'postmaster.pid')), portClosed: !alive, mode: 'fast', completedAt: new Date().toISOString() };
      assert.equal(report.shutdown.stopped, true); assert.equal(report.shutdown.portClosed, true);
    } catch (error) { report.shutdown = { error: error.message }; process.exitCode = 1; report.passed = false; }
  }
  if (existsSync(pwfile)) rmSync(pwfile);
  writeFileSync(join(output, 'ebd-postgres-concurrency.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ passed:report.passed, cases:report.cases.length, shutdown:report.shutdown }));
}
